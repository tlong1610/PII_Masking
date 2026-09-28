"""End-to-end API flow for the MongoDB source (mongomock seeded with the real fixtures)."""

import json
import re
from pathlib import Path

import mongomock
import pytest

from src.config import get_settings

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "data" / "fixtures" / "mongo"
SOURCE_DB = "piiguard_test_src"
SNAPSHOT_DB = "piiguard_test_snapshot"
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


def _load_fixture(name: str) -> list[dict]:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


@pytest.fixture
def mongo(monkeypatch):
    monkeypatch.setenv("ENABLE_MONGO", "true")
    monkeypatch.setenv("MONGO_URI", "mongodb://mock:27017")
    monkeypatch.setenv("MONGO_DB", SOURCE_DB)
    monkeypatch.setenv("MONGO_SNAPSHOT_DB", SNAPSHOT_DB)
    get_settings.cache_clear()
    mongo_client = mongomock.MongoClient()
    monkeypatch.setattr("src.api.runs.mongo_client", lambda: mongo_client)
    yield mongo_client
    get_settings.cache_clear()


def _seed(mongo_client, customers: list[dict], orders: list[dict]) -> None:
    db = mongo_client[SOURCE_DB]
    db.customers.drop()
    db.orders.drop()
    db.customers.insert_many(customers)
    db.orders.insert_many(orders)


def _accept_recommendations(run: dict) -> list[dict]:
    decisions = []
    for p in run["field_profiles"]:
        action = p["recommended_action"]
        if p["classification"] == "UNKNOWN" and action == "KEEP":
            action = "DROP"
        decisions.append({"field_profile_id": p["id"], "action": action, "reason": "reviewed"})
    return decisions


async def _create_run(client, token: str) -> dict:
    created = await client.post(
        "/api/v1/runs", headers=_auth(token), json={"source_id": "nosql-demo"}
    )
    assert created.status_code == 201
    return created.json()


async def _save(client, token: str, run_id: int, decisions: list[dict]) -> None:
    saved = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={"decisions": decisions},
    )
    assert saved.status_code == 200
    assert saved.json()["status"] == "READY_TO_BUILD"


def _checks(body: dict) -> dict[str, dict]:
    return {r["check_name"]: r for r in body["verifier_results"]}


@pytest.mark.asyncio
async def test_fixture_flow_verifies_830_matched_and_publishes(client, mongo):
    customers = _load_fixture("seed_customers.json")
    orders = _load_fixture("seed_orders.json")
    _seed(mongo, customers, orders)
    token = await _login(client, "dpo", "dpo123")

    sources = await client.get("/api/v1/sources", headers=_auth(token))
    nosql = next(s for s in sources.json() if s["id"] == "nosql-demo")
    assert nosql["status"] == "ready"
    assert "://" not in str(nosql)

    run = await _create_run(client, token)
    assert run["status"] == "REVIEW_REQUIRED"
    paths = {(p["source_path"], p["field_path"]) for p in run["field_profiles"]}
    assert ("customers", "identity.cccd") in paths
    assert ("orders", "pii_ext.customer_cccd") in paths
    raw_cccd = customers[0]["identity"]["cccd"]
    assert raw_cccd not in json.dumps(run)
    by_path = {(p["source_path"], p["field_path"]): p for p in run["field_profiles"]}
    assert by_path[("customers", "identity.cccd")]["recommended_action"] == "HMAC"
    order_cccd = by_path[("orders", "pii_ext.customer_cccd")]
    assert (order_cccd["recommended_action"], order_cccd["classification"]) == (
        "HMAC",
        by_path[("customers", "identity.cccd")]["classification"],
    )
    assert by_path[("customers", "contact.email")]["recommended_action"] == "MASK"

    await _save(client, token, run["id"], _accept_recommendations(run))
    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert built.status_code == 200
    body = built.json()
    checks = _checks(body)
    assert body["dataset"]["status"] == "VERIFIED", checks
    assert body["dataset"]["output_location"] == f"mongodb://{SNAPSHOT_DB}/customers,orders"

    expected = json.loads((ROOT / "eval" / "expected_downstream.json").read_text("utf-8"))
    cccd_baseline = expected["mongo_lookup_cccd"]["baseline"]
    id_baseline = expected["mongo_lookup"]["baseline"]
    assert checks[f"lookup_matched:{CCCD_RELATION}"]["actual_value"] == str(
        cccd_baseline["matched_rows"]
    )
    assert checks[f"lookup_unmatched:{CCCD_RELATION}"]["actual_value"] == str(
        cccd_baseline["unmatched_orders"]
    )
    assert checks[f"lookup_matched:{CUSTOMER_ID_RELATION}"]["actual_value"] == str(
        id_baseline["matched_orders"]
    )
    assert checks["doc_count:orders"]["actual_value"] == str(cccd_baseline["total_orders"])
    assert raw_cccd not in json.dumps(body)

    snap = mongo[SNAPSHOT_DB]
    protected = snap.customers.find_one({"company.name": customers[0]["company"]["name"]})
    assert re.fullmatch(r"[0-9a-f]{64}", protected["identity"]["cccd"])
    assert "***" in protected["contact"]["email"]
    assert snap.customers.count_documents({"identity.cccd": raw_cccd}) == 0

    published = await client.post(
        f"/api/v1/datasets/{body['dataset']['id']}/publish", headers=_auth(token)
    )
    assert published.status_code == 200
    analyst = await _login(client, "analyst", "analyst123")
    listed = await client.get("/api/v1/datasets", headers=_auth(analyst))
    assert body["dataset"]["id"] in {d["id"] for d in listed.json()}


@pytest.mark.asyncio
async def test_other_dataset_baseline_is_measured_not_hardcoded(client, mongo):
    customers = [
        {
            "_id": f"C{i}",
            "identity": {"cccd": f"0010900000{i:02d}"},
            "contact": {"email": f"user{i}@example.vn"},
        }
        for i in range(5)
    ]
    orders = []
    for i in range(12):
        cust = i % 5 if i < 10 else 99
        orders.append(
            {
                "_id": i,
                "customer_id": f"C{cust}",
                "pii_ext": {"customer_cccd": f"0010900000{cust:02d}"},
            }
        )
    _seed(mongo, customers, orders)
    token = await _login(client, "dpo", "dpo123")

    run = await _create_run(client, token)
    await _save(client, token, run["id"], _accept_recommendations(run))
    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    body = built.json()
    checks = _checks(body)

    assert body["dataset"]["status"] == "VERIFIED", checks
    matched = checks[f"lookup_matched:{CCCD_RELATION}"]
    unmatched = checks[f"lookup_unmatched:{CCCD_RELATION}"]
    assert (matched["baseline_value"], matched["actual_value"]) == ("10", "10")
    assert (unmatched["baseline_value"], unmatched["actual_value"]) == ("2", "2")
    assert checks["doc_count:orders"]["actual_value"] == "12"


@pytest.mark.asyncio
async def test_join_key_with_mismatched_actions_blocks_build(client, mongo):
    _seed(mongo, _load_fixture("seed_customers.json"), _load_fixture("seed_orders.json"))
    token = await _login(client, "dpo", "dpo123")
    run = await _create_run(client, token)

    decisions = _accept_recommendations(run)
    cccd = next(
        p for p in run["field_profiles"]
        if (p["source_path"], p["field_path"]) == ("customers", "identity.cccd")
    )
    for d in decisions:
        if d["field_profile_id"] == cccd["id"]:
            d["action"] = "MASK"
    await _save(client, token, run["id"], decisions)

    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert built.status_code == 422
    violations = built.json()["detail"]["join_key_violations"]
    assert {"from": "orders.pii_ext.customer_cccd", "from_action": "HMAC",
            "to": "customers.identity.cccd", "to_action": "MASK"} in violations

    got = await client.get(f"/api/v1/runs/{run['id']}", headers=_auth(token))
    assert got.json()["datasets"] == []


@pytest.mark.asyncio
async def test_failed_verification_blocks_publish(client, mongo, monkeypatch):
    _seed(mongo, _load_fixture("seed_customers.json"), _load_fixture("seed_orders.json"))

    def broken_pipeline(**_kwargs):
        return {"customers": 91, "orders": 830}, [
            {
                "check_name": f"lookup_matched:{CCCD_RELATION}",
                "status": "FAILED",
                "baseline_value": "830",
                "actual_value": "829",
                "tolerance": "0",
                "details": "mismatch",
            }
        ]

    monkeypatch.setattr(
        "src.transform.mongo_pipeline.run_protected_mongo_pipeline", broken_pipeline
    )
    token = await _login(client, "dpo", "dpo123")
    run = await _create_run(client, token)
    await _save(client, token, run["id"], _accept_recommendations(run))

    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    body = built.json()
    assert body["dataset"]["status"] == "FAILED"
    assert body["run"]["status"] == "FAILED"

    published = await client.post(
        f"/api/v1/datasets/{body['dataset']['id']}/publish", headers=_auth(token)
    )
    assert published.status_code == 422


@pytest.mark.asyncio
async def test_scanned_run_never_verifies_via_stub(client, mongo, monkeypatch):
    _seed(mongo, _load_fixture("seed_customers.json"), _load_fixture("seed_orders.json"))
    token = await _login(client, "dpo", "dpo123")
    run = await _create_run(client, token)
    await _save(client, token, run["id"], _accept_recommendations(run))

    monkeypatch.setenv("ENABLE_MONGO", "false")
    get_settings.cache_clear()
    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    body = built.json()
    checks = _checks(body)
    assert body["run"]["status"] == "FAILED"
    assert body["dataset"]["status"] == "FAILED"
    assert "demo_stub_downstream" not in checks
    assert checks["mongo_snapshot_pipeline"]["actual_value"] == "not_configured"


@pytest.mark.asyncio
async def test_unprofiled_fields_never_reach_snapshot(client, mongo):
    customers = _load_fixture("seed_customers.json")
    orders = _load_fixture("seed_orders.json")
    _seed(mongo, customers, orders)
    token = await _login(client, "dpo", "dpo123")
    run = await _create_run(client, token)
    await _save(client, token, run["id"], _accept_recommendations(run))

    # Fields that appear after the scan (or outside the sampled documents) have no decision.
    raw_phone = "0987654321"
    mongo[SOURCE_DB].customers.update_many(
        {}, {"$set": {"late_pii": raw_phone, "kyc": {"scan": {"ocr": {"text": raw_phone}}}}}
    )
    mongo[SNAPSHOT_DB].leftover.insert_one({"raw": raw_phone})

    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    body = built.json()
    assert body["dataset"]["status"] == "VERIFIED", _checks(body)

    snap = mongo[SNAPSHOT_DB]
    assert sorted(snap.list_collection_names()) == ["customers", "orders"]
    assert snap.customers.count_documents({"late_pii": {"$exists": True}}) == 0
    assert snap.customers.count_documents({"kyc": {"$exists": True}}) == 0
    decided = {
        p["field_path"] for p in run["field_profiles"] if p["source_path"] == "customers"
    }
    for doc in snap.customers.find({}).limit(5):
        top_level = {k for k in doc if k != "_id"}
        assert top_level <= {path.split(".")[0] for path in decided}


@pytest.mark.asyncio
async def test_build_response_has_counts_only_no_raw_values(client, mongo):
    customers = _load_fixture("seed_customers.json")
    orders = _load_fixture("seed_orders.json")
    _seed(mongo, customers, orders)
    token = await _login(client, "dpo", "dpo123")
    run = await _create_run(client, token)
    await _save(client, token, run["id"], _accept_recommendations(run))
    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    body = built.json()

    raw_values = set()
    for c in customers[:20]:
        raw_values |= {c["identity"]["cccd"], c["contact"]["email"], c["contact"]["phone"]}
    for o in orders[:20]:
        raw_values |= {o["pii_ext"]["customer_cccd"], o["pii_ext"]["ship_phone"]}
    blob = json.dumps(body) + json.dumps(run)
    assert not [v for v in raw_values if v and v in blob]
    for check in body["verifier_results"]:
        if check["check_name"].startswith(("lookup_", "doc_count:")):
            assert check["baseline_value"].isdigit()
            assert check["actual_value"].isdigit()


@pytest.mark.asyncio
async def test_mongo_disabled_falls_back_to_stub(client):
    token = await _login(client, "dpo", "dpo123")
    sources = await client.get("/api/v1/sources", headers=_auth(token))
    nosql = next(s for s in sources.json() if s["id"] == "nosql-demo")
    assert nosql["status"] == "demo_stub"
    run = await _create_run(client, token)
    assert run["status"] == "REVIEW_REQUIRED"
    assert {p["coverage_status"] for p in run["field_profiles"]} == {"stub"}
