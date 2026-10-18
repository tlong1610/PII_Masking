"""End-to-end API flow against the seeded docker PostgreSQL (skipped when unavailable)."""

import psycopg
import pytest

from src.config import get_settings

SNAPSHOT_SCHEMA = "piiguard_test_snapshot"


async def _login(client, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/sessions",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _accept_recommendations(run: dict) -> list[dict]:
    decisions = []
    for p in run["field_profiles"]:
        action = p["recommended_action"]
        if p["classification"] == "UNKNOWN" and action == "KEEP":
            action = "DROP"
        decisions.append({"field_profile_id": p["id"], "action": action, "reason": "reviewed"})
    return decisions


@pytest.fixture
def pg_env(live_postgres, monkeypatch):
    monkeypatch.setenv("ENABLE_PG_SNAPSHOT", "true")
    monkeypatch.setenv("ENABLE_AI_SCAN", "false")
    monkeypatch.setenv("SOURCE_DATABASE_URL", live_postgres["source"])
    monkeypatch.setenv("SNAPSHOT_DATABASE_URL", live_postgres["snapshot"])
    monkeypatch.setenv("SNAPSHOT_SCHEMA", SNAPSHOT_SCHEMA)
    get_settings.cache_clear()
    yield live_postgres
    get_settings.cache_clear()
    # Snapshots are written per run (<schema>_run<id>); drop every one this test created.
    with psycopg.connect(live_postgres["snapshot"]) as conn:
        schemas = conn.execute(
            "SELECT nspname FROM pg_namespace WHERE nspname LIKE %s", (f"{SNAPSHOT_SCHEMA}_run%",)
        ).fetchall()
        for (schema,) in schemas:
            conn.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE')


@pytest.mark.asyncio
async def test_live_postgres_run_build_preserves_join_and_aggregate(client, pg_env):
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs", headers=_auth(token), json={"source_id": "sql-demo"}
    )
    assert created.status_code == 201
    run = created.json()
    assert run["status"] == "REVIEW_REQUIRED"
    tables = {p["source_path"] for p in run["field_profiles"]}
    assert {"customers", "orders", "order_details", "kyc_documents"} <= tables

    saved = await client.put(
        f"/api/v1/runs/{run['id']}/decisions",
        headers=_auth(token),
        json={"decisions": _accept_recommendations(run)},
    )
    assert saved.status_code == 200

    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert built.status_code == 200
    body = built.json()
    checks = {r["check_name"]: r for r in body["verifier_results"]}
    assert checks["sql_join_hmac"]["status"] == "PASSED", checks["sql_join_hmac"]
    assert checks["sql_aggregate_revenue"]["status"] == "PASSED", checks["sql_aggregate_revenue"]
    assert body["run"]["status"] == "VERIFIED"
    run_schema = f"{SNAPSHOT_SCHEMA}_run{run['id']}"
    assert body["dataset"]["output_location"].startswith(f"postgres://{run_schema}/")

    with psycopg.connect(pg_env["source"]) as src, psycopg.connect(pg_env["snapshot"]) as snap:
        raw_cccd = {r[0] for r in src.execute("SELECT cccd FROM customers WHERE cccd IS NOT NULL")}
        snap_cccd = {
            r[0] for r in snap.execute(f"SELECT cccd FROM {run_schema}.customers")
        }
        assert raw_cccd.isdisjoint(snap_cccd)
        assert all(v is None or len(v) == 64 for v in snap_cccd)
        raw_blob = str(body)
        assert not any(v in raw_blob for v in list(raw_cccd)[:20])
