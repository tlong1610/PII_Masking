"""Unit and integration tests validating fixes from codebase audit report (FR-08, FR-13, §4.1, §4.5, §5)."""

import pytest
from sqlalchemy import select

from src.api.session_store import SessionUser
from src.db import models as db_models
from src.db.session import get_session_factory, seed_demo_users
from src.services.report_generator import build_report_data, render_html_report
from src.services.risk_scorer import resolve_sensitivity_level
from src.transform.mask_engine import (
    apply_action,
    generalize_value,
    partial_mask,
)
from src.vault.service import (
    detokenize_value,
    get_vault_key,
)


async def _login(client, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/sessions",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# 1. §4.1: Production Guard & Demo User Seeding Protection
# ---------------------------------------------------------------------------

def test_production_guard_rejects_default_secrets(monkeypatch):
    """Production guard blocks startup when insecure default secrets are present (§4.1)."""
    import asyncio

    from fastapi import FastAPI

    from src.config import Settings
    from src.main import lifespan

    # Mock settings to production with default secret
    prod_settings = Settings(
        app_env="production",
        hmac_secret="dev-hmac-secret-change-me",
        secret_key="insecure-dev-secret-key-change-me",
    )
    monkeypatch.setattr("src.main.get_settings", lambda: prod_settings)

    app = FastAPI()
    with pytest.raises(RuntimeError) as exc_info:
        async def _run():
            async with lifespan(app):
                pass
        asyncio.run(_run())

    assert "CRITICAL SECURITY" in str(exc_info.value)
    assert "hmac_secret" in str(exc_info.value)


def test_seed_demo_users_skipped_in_production(monkeypatch):
    """Demo users must never be seeded in production mode (§4.1)."""
    from src.config import Settings

    prod_settings = Settings(app_env="production")
    monkeypatch.setattr("src.db.session.get_settings", lambda: prod_settings)

    session_factory = get_session_factory()
    with session_factory() as db:
        # Count demo users before
        users_before = db.scalars(select(db_models.DemoUser)).all()
        seed_demo_users(db)
        users_after = db.scalars(select(db_models.DemoUser)).all()
        assert len(users_before) == len(users_after)


# ---------------------------------------------------------------------------
# 2. §4.1 & §4.2: Vault Detokenize Audit & Error Sanitization & Key Rotation
# ---------------------------------------------------------------------------

def test_vault_key_version_derivation():
    """Key derivation produces distinct keys across key versions (§4.1)."""
    k_v1 = get_vault_key(key_version="v1")
    k_v2 = get_vault_key(key_version="v2")
    assert len(k_v1) == 32
    assert len(k_v2) == 32
    assert k_v1 != k_v2


def test_detokenize_audit_logging_and_error_sanitization():
    """Failed detokenization attempts record audit events and never leak raw exceptions (§4.1, §3)."""
    session_factory = get_session_factory()
    actor = SessionUser(id=1, username="dpo", role="DPO")

    with session_factory() as db:
        # 1. Invalid reason length (<5 chars) -> Audit DETOKENIZE_REJECTED
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc1:
            detokenize_value(db, "tok_fake_001", reason="bad", actor=actor)
        assert exc1.value.status_code == 400
        ev1 = db.scalars(
            select(db_models.AuditEvent)
            .where(db_models.AuditEvent.action == "DETOKENIZE_REJECTED")
            .order_by(db_models.AuditEvent.id.desc())
        ).first()
        assert ev1 is not None
        assert ev1.entity_id == "tok_fake_001"

        # 2. Token not found -> Audit DETOKENIZE_NOT_FOUND
        with pytest.raises(HTTPException) as exc2:
            detokenize_value(db, "tok_non_existent_9999", reason="Valid audit justification", actor=actor)
        assert exc2.value.status_code == 404
        ev2 = db.scalars(
            select(db_models.AuditEvent)
            .where(db_models.AuditEvent.action == "DETOKENIZE_NOT_FOUND")
            .order_by(db_models.AuditEvent.id.desc())
        ).first()
        assert ev2 is not None
        assert ev2.entity_id == "tok_non_existent_9999"


# ---------------------------------------------------------------------------
# 3. §4.2 & §9.1: Masking Transformations (PARTIAL, GENERALIZE, TOKENIZE, REDACT, NULLIFY)
# ---------------------------------------------------------------------------

def test_mask_engine_partial():
    """Test partial masking for email, phone, and text."""
    # Email
    assert partial_mask("nguyen.van.a@example.com") == "n***a@example.com"
    assert partial_mask("j@test.vn") == "j***@test.vn"
    # Phone
    assert partial_mask("0912345678") == "091***678"
    assert partial_mask("0987654321") == "098***321"
    # None
    assert partial_mask(None) is None


def test_mask_engine_generalize():
    """Test generalization / bucketization."""
    # Date
    assert generalize_value("1995-08-24") == "1995-01-01"
    # Age
    assert generalize_value("25") == "20-29"
    assert generalize_value("68") == "60-69"
    # Large numbers
    assert generalize_value("15000000") == "15M-16M"
    # Address with commas
    assert generalize_value("Số 12, Đường Nguyễn Huệ, Quận 1, TP Hồ Chí Minh") == "TP Hồ Chí Minh"
    assert generalize_value(None) is None


def test_apply_action_all_policy_actions():
    """apply_action handles MASK, HMAC, TOKENIZE, PARTIAL, GENERALIZE, REDACT, NULLIFY, DROP, KEEP."""
    secret = "test-secret"
    ver = "v1"

    # NULLIFY
    keep, val = apply_action("sensitive_data", "NULLIFY", secret=secret, key_version=ver)
    assert keep is True and val is None

    # REDACT
    keep, val = apply_action("secret_text", "REDACT", secret=secret, key_version=ver)
    assert keep is True and val == "[REDACTED]"

    # PARTIAL
    keep, val = apply_action("0912345678", "PARTIAL", secret=secret, key_version=ver)
    assert keep is True and val == "091***678"

    # GENERALIZE
    keep, val = apply_action("1990-12-05", "GENERALIZE", secret=secret, key_version=ver)
    assert keep is True and val == "1990-01-01"

    # DROP
    keep, val = apply_action("dropped_col", "DROP", secret=secret, key_version=ver)
    assert keep is False

    # TOKENIZE
    keep, val = apply_action("079201001234", "TOKENIZE", secret=secret, key_version=ver)
    assert keep is True
    assert val.startswith("tok_")


# ---------------------------------------------------------------------------
# 4. §4.5: Sensitivity Overfitting Word Boundary
# ---------------------------------------------------------------------------

def test_sensitivity_resolution_word_boundaries_no_false_positives():
    """Ensure product_name, filename, velocity are classified as L0 without false L2/L1 positives (§4.5)."""
    assert resolve_sensitivity_level(field_path="product_name") == "L0"
    assert resolve_sensitivity_level(field_path="filename") == "L0"
    assert resolve_sensitivity_level(field_path="velocity") == "L0"
    assert resolve_sensitivity_level(field_path="capacity") == "L0"
    assert resolve_sensitivity_level(field_path="table_name") == "L0"

    # Real PII fields correctly classified
    assert resolve_sensitivity_level(field_path="full_name") == "L2"
    assert resolve_sensitivity_level(field_path="customer_name") == "L2"
    assert resolve_sensitivity_level(field_path="phone") == "L2"
    assert resolve_sensitivity_level(field_path="cccd") == "L2"


# ---------------------------------------------------------------------------
# 5. §5: Analyst Request Workflow & Self-Approval Flag
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyst_request_run_endpoint(client):
    """Analyst can request a scan run via POST /api/v1/runs/request (§3, §5.1)."""
    analyst_token = await _login(client, "analyst", "analyst123")
    res = await client.post(
        "/api/v1/runs/request",
        headers=_auth(analyst_token),
        json={"source_id": "sql-demo"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "REVIEW_REQUIRED"
    assert len(data["field_profiles"]) >= 3


def test_report_is_self_approved_flag_and_banner():
    """When creator approves own run, report flags is_self_approved and renders SoD banner (§3, §5.2)."""
    session_factory = get_session_factory()
    with session_factory() as db:
        # Create a mock run where created_by == decided_by
        run = db_models.Run(
            source_id="test-source",
            source_type="SQL",
            source_name="Test Source",
            engine="postgresql",
            status="VERIFIED",
            created_by=1,  # User 1
        )
        db.add(run)
        db.flush()

        profile = db_models.FieldProfile(
            run_id=run.id,
            source_path="users",
            field_path="email",
            data_type="varchar",
            classification="PERSONAL_BASIC",
            taxonomy_id="EMAIL",
            recommended_action="MASK",
        )
        db.add(profile)
        db.flush()

        decision = db_models.FieldDecision(
            run_id=run.id,
            field_profile_id=profile.id,
            action="MASK",
            reason="Protection",
            decided_by=1,  # Same user!
        )
        db.add(decision)
        db.commit()

        # Build report data
        rep_data = build_report_data(run, db)
        assert rep_data["is_self_approved"] is True

        # Render HTML
        html = render_html_report(rep_data)
        assert "Cảnh báo phân tách nhiệm vụ" in html
        assert "cùng một người yêu cầu và phê duyệt" in html
