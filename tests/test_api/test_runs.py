"""Tests for runs / decisions / build guardrails."""

import pytest


async def _login(client, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/sessions",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_and_get_run_has_profiles_no_raw(client):
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    assert created.status_code == 201
    data = created.json()
    assert data["status"] == "REVIEW_REQUIRED"
    assert data["source_type"] == "SQL"
    assert len(data["field_profiles"]) >= 3
    blob = str(data).lower()
    assert "sample" not in blob
    assert "password" not in blob

    got = await client.get(f"/api/v1/runs/{data['id']}", headers=_auth(token))
    assert got.status_code == 200
    assert got.json()["id"] == data["id"]


@pytest.mark.asyncio
async def test_analyst_cannot_create_run(client):
    token = await _login(client, "analyst", "analyst123")
    response = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_build_blocked_when_decisions_missing(client):
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    run_id = created.json()["id"]
    response = await client.post(f"/api/v1/runs/{run_id}/build", headers=_auth(token))
    assert response.status_code == 422
    assert "missing_field_profile_ids" in response.json()["detail"]


@pytest.mark.asyncio
async def test_unknown_cannot_keep_and_full_build_succeeds(client):
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    run = created.json()
    run_id = run["id"]
    unknown = next(p for p in run["field_profiles"] if p["classification"] == "UNKNOWN")

    bad = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={
            "decisions": [
                {
                    "field_profile_id": unknown["id"],
                    "action": "KEEP",
                    "reason": "skip",
                }
            ]
        },
    )
    assert bad.status_code == 422

    decisions = []
    for p in run["field_profiles"]:
        action = "DROP" if p["classification"] == "UNKNOWN" else p["recommended_action"]
        decisions.append(
            {
                "field_profile_id": p["id"],
                "action": action,
                "reason": "reviewed",
            }
        )

    saved = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={"decisions": decisions},
    )
    assert saved.status_code == 200
    assert saved.json()["status"] == "READY_TO_BUILD"

    built = await client.post(f"/api/v1/runs/{run_id}/build", headers=_auth(token))
    assert built.status_code == 200
    body = built.json()
    assert body["run"]["status"] == "VERIFIED"
    assert body["dataset"]["status"] == "VERIFIED"
    assert body["dataset"]["output_location"].startswith("staging://")
    assert len(body["verifier_results"]) >= 3
    assert all(r["status"] == "PASSED" for r in body["verifier_results"])
    names = {r["check_name"] for r in body["verifier_results"]}
    assert "policy_complete" in names
    blob = str(body["verifier_results"]).lower()
    assert "sample" not in blob
    assert "password" not in blob


async def _create_stub_run(client, token: str) -> dict:
    created = await client.post("/api/v1/runs", headers=_auth(token), json={"source_id": "sql-demo"})
    assert created.status_code == 201
    return created.json()


async def _put_one(client, token: str, run_id: int, decision: dict):
    return await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={"decisions": [decision]},
    )


@pytest.mark.asyncio
async def test_dpo_can_confirm_unknown_is_not_personal_and_keep(client):
    token = await _login(client, "dpo", "dpo123")
    run = await _create_stub_run(client, token)
    unknown = next(p for p in run["field_profiles"] if p["classification"] == "UNKNOWN")
    base = {"field_profile_id": unknown["id"], "action": "KEEP", "classification_override": "NON_PERSONAL"}

    no_reason = await _put_one(client, token, run["id"], {**base, "reason": "  "})
    assert no_reason.status_code == 422
    assert no_reason.json()["detail"]["field_profile_id"] == unknown["id"]
    assert no_reason.json()["detail"]["field_path"].endswith(unknown["field_path"])

    saved = await _put_one(client, token, run["id"], {**base, "reason": "Product status, not personal"})
    assert saved.status_code == 200
    profile = next(p for p in saved.json()["field_profiles"] if p["id"] == unknown["id"])
    assert profile["classification"] == "NON_PERSONAL"
    assert profile["taxonomy_id"] == "NOT_PERSONAL_DATA"
    assert profile["detector_source"] == "dpo"
    decision = next(d for d in saved.json()["field_decisions"] if d["field_profile_id"] == unknown["id"])
    assert decision["action"] == "KEEP"


@pytest.mark.asyncio
async def test_pii_field_cannot_be_reclassified_only_excepted(client):
    token = await _login(client, "dpo", "dpo123")
    run = await _create_stub_run(client, token)
    pii = next(p for p in run["field_profiles"] if p["classification"].startswith("PERSONAL"))

    reclassified = await _put_one(
        client,
        token,
        run["id"],
        {"field_profile_id": pii["id"], "action": "KEEP", "classification_override": "NON_PERSONAL", "reason": "x"},
    )
    assert reclassified.status_code == 422

    no_deadline = await _put_one(
        client,
        token,
        run["id"],
        {"field_profile_id": pii["id"], "action": "KEEP", "is_exception": True, "reason": "Approved study"},
    )
    assert no_deadline.status_code == 422

    excepted = await _put_one(
        client,
        token,
        run["id"],
        {
            "field_profile_id": pii["id"],
            "action": "KEEP",
            "is_exception": True,
            "reason": "Approved study",
            "exception_until": "2099-01-01T00:00:00Z",
        },
    )
    assert excepted.status_code == 200


@pytest.mark.asyncio
async def test_join_keys_lists_only_scanned_relations(client, monkeypatch):
    from src.api import runs as runs_module

    monkeypatch.setattr(
        runs_module,
        "_postgres_join_relations",
        lambda conn: [
            ("orders", "customer_id", "customers", "customer_id"),
            ("orders", "customer_id", "customers", "customer_id"),
            ("orders", "product_id", "products", "product_id"),
        ],
    )
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo", "selected_scope": ["customers", "orders"]},
    )
    assert created.status_code == 201

    keys = await client.get(f"/api/v1/runs/{created.json()['id']}/join-keys", headers=_auth(token))
    assert keys.status_code == 200
    assert keys.json() == [
        {"from_table": "orders", "from_column": "customer_id", "to_table": "customers", "to_column": "customer_id"}
    ]

    analyst = await _login(client, "analyst", "analyst123")
    forbidden = await client.get(f"/api/v1/runs/{created.json()['id']}/join-keys", headers=_auth(analyst))
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_create_run_ai_scan_path(client, monkeypatch):
    """When ENABLE_AI_SCAN is on, create_run uses scanner (mocked) not stub."""
    from src.config import get_settings

    monkeypatch.setattr("src.api.sources.pg_live_enabled", lambda: bool(get_settings().enable_pg_snapshot))
    monkeypatch.setenv("ENABLE_AI_SCAN", "true")
    monkeypatch.setenv("ENABLE_PG_SNAPSHOT", "true")
    monkeypatch.setenv(
        "SOURCE_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/mydatabase",
    )
    monkeypatch.setenv(
        "SNAPSHOT_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/snapshot_out",
    )
    get_settings.cache_clear()

    async def fake_scan(_url: str, **_kwargs):
        return [
            {
                "source_path": "customers",
                "field_path": "phone",
                "data_type": "varchar",
                "profile_summary": "mocked scan",
                "classification": "PERSONAL_BASIC",
                "taxonomy_id": "PHONE",
                "detector_source": "rule",
                "coverage_status": "full",
                "recommended_action": "MASK",
            }
        ]

    monkeypatch.setattr(
        "src.services.run_scanner.scan_postgres_source",
        fake_scan,
    )

    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    get_settings.cache_clear()
    assert created.status_code == 201
    data = created.json()
    assert data["status"] == "REVIEW_REQUIRED"
    assert len(data["field_profiles"]) == 1
    profile = data["field_profiles"][0]
    assert profile["coverage_status"] == "full"
    assert profile["taxonomy_id"] == "PHONE"
    assert profile["field_path"] == "phone"
    assert "sample" not in str(data).lower()


@pytest.mark.asyncio
async def test_create_run_ai_scan_failure_marks_failed(client, monkeypatch):
    from src.config import get_settings

    monkeypatch.setattr("src.api.sources.pg_live_enabled", lambda: bool(get_settings().enable_pg_snapshot))
    monkeypatch.setenv("ENABLE_AI_SCAN", "true")
    monkeypatch.setenv("ENABLE_PG_SNAPSHOT", "true")
    monkeypatch.setenv(
        "SOURCE_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/mydatabase",
    )
    monkeypatch.setenv(
        "SNAPSHOT_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/snapshot_out",
    )
    get_settings.cache_clear()

    async def boom(_url: str, **_kwargs):
        raise RuntimeError("connector down")

    monkeypatch.setattr(
        "src.services.run_scanner.scan_postgres_source",
        boom,
    )

    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    get_settings.cache_clear()
    assert created.status_code == 201
    assert created.json()["status"] == "FAILED"
    assert created.json()["field_profiles"] == []


@pytest.mark.asyncio
async def test_orchestrate_run_endpoint_rbac_and_execution(client):
    dpo_token = await _login(client, "dpo", "dpo123")
    analyst_token = await _login(client, "analyst", "analyst123")

    # 1. Create run
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(dpo_token),
        json={"source_id": "sql-demo"},
    )
    assert created.status_code == 201
    run_id = created.json()["id"]

    # 2. Unauthenticated -> 401
    res_no_auth = await client.post(f"/api/v1/runs/{run_id}/orchestrate")
    assert res_no_auth.status_code == 401

    # 3. Analyst -> 403 (DPO only)
    res_analyst = await client.post(
        f"/api/v1/runs/{run_id}/orchestrate",
        headers=_auth(analyst_token),
    )
    assert res_analyst.status_code == 403

    # 4. Save compliant decisions for run
    profiles = created.json()["field_profiles"]
    decisions = []
    for p in profiles:
        act = "DROP" if p["classification"] == "UNKNOWN" else ("HMAC" if "id" in p["field_path"] else "MASK")
        decisions.append({
            "field_profile_id": p["id"],
            "action": act,
            "reason": "Standard DPO approved policy",
            "is_exception": False,
        })
    put_res = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(dpo_token),
        json={"decisions": decisions},
    )
    assert put_res.status_code == 200

    # 5. DPO calls orchestrator -> 200, executes 8-node pipeline
    res_orch = await client.post(
        f"/api/v1/runs/{run_id}/orchestrate",
        headers=_auth(dpo_token),
    )
    assert res_orch.status_code == 200
    orch_data = res_orch.json()
    assert orch_data["run_id"] == run_id
    assert orch_data["status"] == "COMPLETED"
    assert orch_data["verification"]["passed"] is True
    assert orch_data["verification"]["zero_raw_pii_leaks"] is True
    assert orch_data["risk"]["score"] is not None
    assert orch_data["applied_count"] == len(profiles)



@pytest.mark.asyncio
async def test_quasi_identifier_can_be_kept_without_exception(client):
    from src.db import models as db_models
    from src.db.session import get_session_factory

    token = await _login(client, "dpo", "dpo123")
    run = await _create_stub_run(client, token)
    field = run["field_profiles"][0]
    with get_session_factory()() as db:
        profile = db.get(db_models.FieldProfile, field["id"])
        profile.classification = "QUASI_IDENTIFIER"
        profile.taxonomy_id = "CITY"
        profile.field_path = "ship_city"
        db.commit()

    kept = await _put_one(client, token, run["id"], {"field_profile_id": field["id"], "action": "KEEP", "reason": "x"})
    assert kept.status_code == 200
