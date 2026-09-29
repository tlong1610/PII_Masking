"""API flow for the PostgreSQL source with the connector/pipeline mocked (no live DB)."""

import pytest

from src.config import get_settings
from src.verifier.sql_verifier import CheckResult

SOURCE_URL = "postgresql://postgres:postgres@localhost:5432/mydatabase"
SNAPSHOT_URL = "postgresql://postgres:postgres@localhost:5432/snapshot_out"


async def _login(client, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/sessions",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _spec(table, field, classification, taxonomy, action, coverage="full"):
    return {
        "source_path": table,
        "field_path": field,
        "data_type": "varchar",
        "profile_summary": "mocked scan",
        "classification": classification,
        "taxonomy_id": taxonomy,
        "detector_source": "rule",
        "coverage_status": coverage,
        "recommended_action": action,
    }


FAKE_SPECS = [
    _spec("customers", "cccd", "PERSONAL_BASIC", "CCCD", "HMAC"),
    _spec("customers", "phone", "PERSONAL_BASIC", "PHONE", "MASK"),
    _spec("orders", "customer_cccd", "PERSONAL_BASIC", "CCCD", "HMAC"),
    _spec("orders", "order_notes", "UNKNOWN", None, "DROP", coverage="partial"),
]


def _check(name: str, status: str) -> CheckResult:
    return CheckResult(
        check_name=name,
        status=status,
        baseline_value="matched=830;unmatched=0",
        actual_value="matched=830;unmatched=0" if status == "PASSED" else "matched=0;unmatched=830",
        tolerance="0",
        details="mocked",
    )


@pytest.fixture
def pg_live(monkeypatch):
    monkeypatch.setenv("ENABLE_PG_SNAPSHOT", "true")
    monkeypatch.setenv("SOURCE_DATABASE_URL", SOURCE_URL)
    monkeypatch.setenv("SNAPSHOT_DATABASE_URL", SNAPSHOT_URL)
    monkeypatch.setenv("ENABLE_AI_SCAN", "false")
    get_settings.cache_clear()
    calls: dict = {}

    async def fake_scan(url: str, **kwargs):
        calls["scan"] = {"url": url, **kwargs}
        return [dict(s) for s in FAKE_SPECS]

    monkeypatch.setattr("src.services.run_scanner.scan_postgres_source", fake_scan)
    yield calls
    get_settings.cache_clear()


def _mock_pipeline(monkeypatch, calls: dict, statuses: tuple[str, str]) -> None:
    def fake_pipeline(**kwargs):
        calls["pipeline"] = kwargs
        written = {t: f"piiguard_snapshot.{t}" for t in kwargs["table_actions"]}
        checks = [
            _check("sql_join_hmac", statuses[0]),
            _check("sql_aggregate_revenue", statuses[1]),
        ]
        return written, checks

    monkeypatch.setattr(
        "src.transform.pg_pipeline.run_protected_postgres_pipeline", fake_pipeline
    )


async def _create_and_decide(client, token: str) -> dict:
    created = await client.post(
        "/api/v1/runs", headers=_auth(token), json={"source_id": "sql-demo"}
    )
    assert created.status_code == 201
    run = created.json()
    decisions = [
        {"field_profile_id": p["id"], "action": p["recommended_action"], "reason": "reviewed"}
        for p in run["field_profiles"]
    ]
    saved = await client.put(
        f"/api/v1/runs/{run['id']}/decisions",
        headers=_auth(token),
        json={"decisions": decisions},
    )
    assert saved.status_code == 200
    assert saved.json()["status"] == "READY_TO_BUILD"
    return run


def _checks(body: dict) -> dict[str, dict]:
    return {r["check_name"]: r for r in body["verifier_results"]}


@pytest.mark.asyncio
async def test_sql_source_status_follows_pg_config(client, monkeypatch):
    token = await _login(client, "dpo", "dpo123")
    listed = await client.get("/api/v1/sources", headers=_auth(token))
    sql = next(s for s in listed.json() if s["id"] == "sql-demo")
    assert sql["status"] == "demo_stub"

    monkeypatch.setenv("ENABLE_PG_SNAPSHOT", "true")
    monkeypatch.setenv("SOURCE_DATABASE_URL", SOURCE_URL)
    monkeypatch.setenv("SNAPSHOT_DATABASE_URL", SNAPSHOT_URL)
    get_settings.cache_clear()
    listed = await client.get("/api/v1/sources", headers=_auth(token))
    get_settings.cache_clear()
    sql = next(s for s in listed.json() if s["id"] == "sql-demo")
    assert sql["status"] == "ready"
    assert "postgres:postgres" not in listed.text


@pytest.mark.asyncio
async def test_create_run_uses_rule_scanner_without_ai(client, pg_live):
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs", headers=_auth(token), json={"source_id": "sql-demo"}
    )
    assert created.status_code == 201
    run = created.json()
    assert run["status"] == "REVIEW_REQUIRED"
    assert pg_live["scan"]["url"] == SOURCE_URL
    assert pg_live["scan"]["use_ai"] is False
    assert pg_live["scan"]["schema_name"] == "public"
    assert pg_live["scan"]["tables"] is None
    assert {p["coverage_status"] for p in run["field_profiles"]} != {"stub"}
    assert {p["field_path"] for p in run["field_profiles"]} == {
        "cccd",
        "phone",
        "customer_cccd",
        "order_notes",
    }


@pytest.mark.asyncio
async def test_create_run_passes_table_allowlist(client, pg_live, monkeypatch):
    monkeypatch.setenv("PG_SCAN_TABLES", "customers, orders")
    get_settings.cache_clear()
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs", headers=_auth(token), json={"source_id": "sql-demo"}
    )
    assert created.status_code == 201
    assert pg_live["scan"]["tables"] == ("customers", "orders")


@pytest.mark.asyncio
async def test_build_runs_real_pipeline_with_dpo_decisions(client, pg_live, monkeypatch):
    _mock_pipeline(monkeypatch, pg_live, ("PASSED", "PASSED"))
    token = await _login(client, "dpo", "dpo123")
    run = await _create_and_decide(client, token)

    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert built.status_code == 200
    body = built.json()
    assert body["run"]["status"] == "VERIFIED"
    assert body["dataset"]["status"] == "VERIFIED"
    assert body["dataset"]["output_location"].startswith("postgres://piiguard_snapshot/")

    checks = _checks(body)
    assert set(checks) == {"policy_complete", "sql_join_hmac", "sql_aggregate_revenue"}
    assert "demo_stub_downstream" not in checks

    pipeline = pg_live["pipeline"]
    assert pipeline["source_url"] == SOURCE_URL
    assert pipeline["snapshot_url"] == SNAPSHOT_URL
    assert pipeline["default_action"] == "DROP"
    assert pipeline["table_actions"] == {
        "customers": {"cccd": "HMAC", "phone": "MASK"},
        "orders": {"customer_cccd": "HMAC", "order_notes": "DROP"},
    }
    assert "sample" not in str(body).lower()


@pytest.mark.asyncio
async def test_build_failed_verifier_marks_dataset_failed(client, pg_live, monkeypatch):
    _mock_pipeline(monkeypatch, pg_live, ("FAILED", "PASSED"))
    token = await _login(client, "dpo", "dpo123")
    run = await _create_and_decide(client, token)

    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert built.status_code == 200
    body = built.json()
    assert body["run"]["status"] == "FAILED"
    assert body["dataset"]["status"] == "FAILED"
    assert _checks(body)["sql_join_hmac"]["status"] == "FAILED"


@pytest.mark.asyncio
async def test_build_pipeline_error_marks_failed(client, pg_live, monkeypatch):
    def boom(**_kwargs):
        raise RuntimeError("snapshot db down")

    monkeypatch.setattr("src.transform.pg_pipeline.run_protected_postgres_pipeline", boom)
    token = await _login(client, "dpo", "dpo123")
    run = await _create_and_decide(client, token)

    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    body = built.json()
    assert body["run"]["status"] == "FAILED"
    check = _checks(body)["postgres_snapshot_pipeline"]
    assert check["status"] == "FAILED"
    assert check["details"] == "Pipeline error: RuntimeError"


@pytest.mark.asyncio
async def test_scanned_run_never_verifies_via_stub(client, pg_live, monkeypatch):
    token = await _login(client, "dpo", "dpo123")
    run = await _create_and_decide(client, token)

    monkeypatch.setenv("ENABLE_PG_SNAPSHOT", "false")
    get_settings.cache_clear()
    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    body = built.json()
    assert body["run"]["status"] == "FAILED"
    assert body["dataset"]["status"] == "FAILED"
    checks = _checks(body)
    assert "demo_stub_downstream" not in checks
    assert checks["postgres_snapshot_pipeline"]["actual_value"] == "not_configured"


@pytest.mark.asyncio
async def test_pg_build_blocked_when_join_key_action_mismatch(client, pg_live, monkeypatch):
    """Build must return 422 when one end of a PG join-key uses a different action."""
    token = await _login(client, "dpo", "dpo123")

    # Scan produces FAKE_SPECS: customers.cccd=HMAC, orders.customer_cccd=HMAC
    created = await client.post(
        "/api/v1/runs", headers=_auth(token), json={"source_id": "sql-demo"}
    )
    assert created.status_code == 201
    run = created.json()

    # DPO reviews: set customers.cccd to MASK while orders.customer_cccd stays HMAC
    decisions = []
    for p in run["field_profiles"]:
        action = p["recommended_action"]
        if p["source_path"] == "customers" and p["field_path"] == "cccd":
            action = "MASK"  # deliberate mismatch with orders.customer_cccd=HMAC
        decisions.append({"field_profile_id": p["id"], "action": action, "reason": "reviewed"})

    saved = await client.put(
        f"/api/v1/runs/{run['id']}/decisions",
        headers=_auth(token),
        json={"decisions": decisions},
    )
    assert saved.status_code == 200

    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert built.status_code == 422
    detail = built.json()["detail"]
    assert "join_key_violations" in detail
    violations = detail["join_key_violations"]
    assert any(
        v["from"] == "orders.customer_cccd" and v["to"] == "customers.cccd"
        for v in violations
    )
    # No dataset should have been created
    run_after = await client.get(f"/api/v1/runs/{run['id']}", headers=_auth(token))
    assert run_after.json()["datasets"] == []

