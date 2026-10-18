"""End-to-end API flow against the seeded docker MongoDB (skipped when unavailable)."""

import json
import os
import re
from pathlib import Path

import pytest
from pymongo import MongoClient

from src.config import get_settings

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DB = "piiguard_test_mongo_snapshot"
CCCD_RELATION = "orders.pii_ext.customer_cccd->customers.identity.cccd"
CUSTOMER_ID_RELATION = "orders.customer_id->customers._id"


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
def mongo_env(live_mongo, monkeypatch):
    uri = os.getenv("MONGO_URI", "mongodb://admin:admin@localhost:27017/?authSource=admin")
    source_db = os.getenv("MONGO_DB", "mydatabase")
    monkeypatch.setenv("ENABLE_MONGO", "true")
    monkeypatch.setenv("ENABLE_AI_SCAN", "false")
    monkeypatch.setenv("MONGO_URI", uri)
    monkeypatch.setenv("MONGO_DB", source_db)
    monkeypatch.setenv("MONGO_SNAPSHOT_DB", SNAPSHOT_DB)
    get_settings.cache_clear()
    client = MongoClient(uri, serverSelectionTimeoutMS=2000)
    yield client, source_db
    get_settings.cache_clear()
    # Snapshots are written per run (<db>_run<id>); drop every one this test created.
    for name in client.list_database_names():
        if name.startswith(f"{SNAPSHOT_DB}_run"):
            client.drop_database(name)
    client.close()


@pytest.mark.asyncio
async def test_live_mongo_run_build_preserves_lookups(client, mongo_env):
    mongo, source_db = mongo_env
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs", headers=_auth(token), json={"source_id": "nosql-demo"}
    )
    assert created.status_code == 201
    run = created.json()
    assert run["status"] == "REVIEW_REQUIRED"
    paths = {(p["source_path"], p["field_path"]) for p in run["field_profiles"]}
    assert {("customers", "identity.cccd"), ("orders", "pii_ext.customer_cccd")} <= paths
    assert {p["coverage_status"] for p in run["field_profiles"]} != {"stub"}

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
    assert body["run"]["status"] == "VERIFIED", checks

    source = mongo[source_db]
    total_orders = source.orders.count_documents({})
    for relation in (CCCD_RELATION, CUSTOMER_ID_RELATION):
        matched = checks[f"lookup_matched:{relation}"]
        assert matched["baseline_value"] == matched["actual_value"]
        unmatched = checks[f"lookup_unmatched:{relation}"]
        assert int(matched["actual_value"]) + int(unmatched["actual_value"]) == total_orders

    expected = json.loads((ROOT / "eval" / "expected_downstream.json").read_text("utf-8"))
    if total_orders == expected["mongo_lookup_cccd"]["baseline"]["total_orders"]:
        assert checks[f"lookup_matched:{CCCD_RELATION}"]["actual_value"] == str(
            expected["mongo_lookup_cccd"]["baseline"]["matched_rows"]
        )

    snap = mongo[f"{SNAPSHOT_DB}_run{run['id']}"]
    raw_cccd = {
        d["identity"]["cccd"]
        for d in source.customers.find({}, {"identity.cccd": 1})
        if d.get("identity", {}).get("cccd")
    }
    snap_cccd = [d["identity"]["cccd"] for d in snap.customers.find({}, {"identity.cccd": 1})]
    assert all(re.fullmatch(r"[0-9a-f]{64}", v) for v in snap_cccd)
    assert raw_cccd.isdisjoint(snap_cccd)
    blob = json.dumps(body)
    assert not any(v in blob for v in list(raw_cccd)[:20])
