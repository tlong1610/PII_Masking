"""Canary Test Suite for Zero Raw-PII Egress (§6.3, §18).

Injects canary strings into fixtures / data profiles and asserts that
raw values NEVER leak into:
1. LLM Prompts (data shape inspection replaces raw samples)
2. Application logs (stdout / stderr / caplog)
3. API response payloads
4. Operational Metadata DB records (profile_summary, audit_events)
5. Compliance Reports (HTML and JSON)
"""

import json
import logging

import pytest
from sqlalchemy import select

from src.agents.nodes.scanner_nodes import tier3_hybrid_node, tier3_llm_node
from src.agents.state import AgentState
from src.db import models as db_models
from src.db.session import get_session_factory
from src.detection.rule_engine import RuleBasedScanner
from src.models.schemas import ColumnProfile, FieldScanResult
from src.services.report_generator import build_report_data, render_html_report
from src.services.run_scanner import field_profile_spec

CANARY_CCCD = "079099887766"
CANARY_TOKEN = "CANARY_SECRET_RAW_PII_TOKEN_XYZ987"
CANARY_PHONE = "0989998888"
CANARY_EMAIL = "canary_confidential_999@enterprise-corp.vn"

CANARIES = [CANARY_CCCD, CANARY_TOKEN, CANARY_PHONE, CANARY_EMAIL]


async def _login(client, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/sessions",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_canary_not_in_data_shapes_or_llm_prompt(monkeypatch):
    """Vector 1: Chuỗi canary tuyệt đối không đi vào prompt LLM (đã biến đổi thành Data Shape)."""
    samples = [CANARY_CCCD, CANARY_PHONE, CANARY_EMAIL, CANARY_TOKEN]
    data_shapes = RuleBasedScanner.transform_to_data_shape(samples)

    # 1. Khẳng định trong data_shapes chỉ chứa ký tự X, C, ký tự đặc biệt, KHÔNG chứa raw canaries
    shapes_str = json.dumps(data_shapes)
    for c in CANARIES:
        assert c not in shapes_str, f"Canary {c} leaked into data shapes!"

    # 2. Khẳng định trong prompt template LLM không chứa raw canary
    captured_prompts = []

    class MockLLM:
        def invoke(self, messages):
            text = str(messages)
            captured_prompts.append(text)
            class MockResponse:
                content = json.dumps({
                    "field_name": "identity_card",
                    "inferred_pii_type": "CCCD",
                    "recommended_action": "HMAC",
                    "confidence": 0.99,
                    "reasoning": "Detected via shape",
                    "tier": "TIER_3_LLM"
                })
            return MockResponse()

    monkeypatch.setattr("src.services.llm.get_llm", lambda: MockLLM())

    col_profile = ColumnProfile(
        table_name="patients",
        column_name="c2_secret_col",
        data_type="varchar",
        is_primary_key=False,
        is_foreign_key=False,
        samples=samples,
    )

    state: AgentState = {
        "column_profile": col_profile,
        "bm25_score": 0.5,
    }

    hybrid_out = tier3_hybrid_node(state)
    state.update(hybrid_out)

    llm_out = tier3_llm_node(state)
    assert "tier3_result" in llm_out

    # Kiểm tra toàn bộ prompt đã gửi đến LLM
    assert len(captured_prompts) > 0
    for prompt_text in captured_prompts:
        for c in CANARIES:
            assert c not in prompt_text, f"Canary {c} leaked into LLM prompt!"


def test_canary_not_in_logging_or_stderr(caplog):
    """Vector 2: Log stdout/stderr không in dòng dữ liệu chứa canary."""
    logger = logging.getLogger("src")
    caplog.set_level(logging.DEBUG)

    # Giả lập quét cột chứa canary
    col_profile = ColumnProfile(
        table_name="customers",
        column_name="phone_field",
        data_type="varchar",
        is_primary_key=False,
        is_foreign_key=False,
        samples=[CANARY_PHONE],
    )

    result = FieldScanResult(
        field_name="phone_field",
        inferred_pii_type="PHONE",
        recommended_action="MASK",
        confidence=0.98,
        reasoning="Pattern matched phone prefix",
        tier="TIER_1_REGEX",
    )

    # Chạy hàm tạo metadata spec
    spec = field_profile_spec(table="customers", column=col_profile, result=result)

    # Log sự kiện quét
    logger.info("Scanned column %s with summary %s", spec["field_path"], spec["profile_summary"])

    for record in caplog.records:
        for c in CANARIES:
            assert c not in record.message, f"Canary {c} leaked into log record: {record.message}"


@pytest.mark.asyncio
async def test_canary_not_in_api_response_body(client):
    """Vector 3: Toàn bộ API response JSON không chứa canary raw value."""
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    assert created.status_code == 201
    run_id = created.json()["id"]

    # 1. GET /runs/{run_id}
    res_run = await client.get(f"/api/v1/runs/{run_id}", headers=_auth(token))
    assert res_run.status_code == 200
    body_text = res_run.text
    for c in CANARIES:
        assert c not in body_text, f"Canary {c} found in GET /runs/{run_id} response!"

    # 2. GET /sources
    res_sources = await client.get("/api/v1/sources", headers=_auth(token))
    assert res_sources.status_code == 200
    for c in CANARIES:
        assert c not in res_sources.text


def test_canary_not_in_operational_metadata_db():
    """Vector 4: DB vận hành (profile_summary, field_decisions, audit_events) không chứa raw canary."""
    session_factory = get_session_factory()
    with session_factory() as db:
        # Check all profile summaries
        profiles = db.scalars(select(db_models.FieldProfile)).all()
        for p in profiles:
            for c in CANARIES:
                assert c not in p.profile_summary, f"Canary {c} leaked into FieldProfile.profile_summary"
                assert c not in (p.taxonomy_id or ""), f"Canary {c} leaked into taxonomy_id"

        # Check all audit events
        audits = db.scalars(select(db_models.AuditEvent)).all()
        for a in audits:
            for c in CANARIES:
                assert c not in a.reason, f"Canary {c} leaked into AuditEvent.reason"


def test_canary_not_in_reports_html_and_json():
    """Vector 5: Báo cáo tuân thủ HTML + JSON tuyệt đối không chứa raw canary."""
    session_factory = get_session_factory()
    with session_factory() as db:
        # Lấy một run bất kỳ hoặc run giả lập
        run = db.scalar(select(db_models.Run))
        if run:
            report_data = build_report_data(run=run, db=db, requester_name="dpo")
            report_json_str = json.dumps(report_data)
            for c in CANARIES:
                assert c not in report_json_str, f"Canary {c} found in report JSON data!"

            html = render_html_report(report_data)
            for c in CANARIES:
                assert c not in html, f"Canary {c} found in report HTML document!"
