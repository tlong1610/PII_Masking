"""User-registered sources: encrypted URL storage, no secret leakage, run flow on a custom Mongo DB."""

import json
from pathlib import Path

import mongomock
import pytest
from cryptography.fernet import Fernet

from src.config import get_settings
from src.services.source_validation import SourceUrlError

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "data" / "fixtures" / "mongo"
PASSWORD = "S3cretPw!"
MONGO_URL = f"mongodb://corp:{PASSWORD}@db.corp.example:27017/corpdb"
PG_URL = f"postgresql://corp:{PASSWORD}@pg.corp.example:5432/corpdb"


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _login(client, username: str, password: str) -> str:
    r = await client.post("/api/v1/sessions", json={"username": username, "password": password})
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture
def enc(monkeypatch):
    monkeypatch.setenv("SOURCE_ENCRYPTION_KEY", Fernet.generate_key().decode())
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def reachable(monkeypatch):
    monkeypatch.setattr("src.api.sources.probe_connection", lambda url, engine: None)
    monkeypatch.setattr("src.api.sources.probe_namespace", lambda url, engine, namespace: None)
    monkeypatch.setattr("src.api.sources.list_namespaces", lambda url, engine, default="": [default] if default else [])


@pytest.mark.asyncio
async def test_create_source_never_returns_or_stores_plaintext_url(client, enc, reachable):
    token = await _login(client, "dpo", "dpo123")
    r = await client.post(
        "/api/v1/sources", headers=_auth(token), json={"name": "Corp Mongo", "url": MONGO_URL}
    )
    assert r.status_code == 201
    body = r.json()
    assert body["id"].startswith("usr-")
    assert (body["engine"], body["source_type"]) == ("mongodb", "NOSQL")
    assert PASSWORD not in json.dumps(body) and "corp:" not in json.dumps(body)

    listed = await client.get("/api/v1/sources", headers=_auth(token))
    assert PASSWORD not in listed.text
    assert any(s["id"] == body["id"] for s in listed.json())

    from src.db import models
    from src.db.session import get_session_factory

    with get_session_factory()() as db:
        row = db.get(models.DataSource, body["id"])
        assert PASSWORD not in row.encrypted_url
        audit = " ".join(a.reason for a in db.query(models.AuditEvent).all())
        assert PASSWORD not in audit


@pytest.mark.asyncio
async def test_create_source_requires_encryption_key(client, monkeypatch, reachable):
    monkeypatch.setenv("SOURCE_ENCRYPTION_KEY", "")
    get_settings.cache_clear()
    token = await _login(client, "dpo", "dpo123")
    r = await client.post("/api/v1/sources", headers=_auth(token), json={"name": "x", "url": PG_URL})
    assert r.status_code == 422
    assert PASSWORD not in r.text
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_unsupported_scheme_and_unreachable_are_rejected_without_secrets(client, enc, monkeypatch):
    token = await _login(client, "dpo", "dpo123")
    bad = await client.post(
        "/api/v1/sources", headers=_auth(token), json={"name": "x", "url": f"mysql://u:{PASSWORD}@h/db"}
    )
    assert bad.status_code == 422

    def boom(url, engine):
        raise SourceUrlError("Cannot connect to source (OperationalError)")

    monkeypatch.setattr("src.api.sources.probe_connection", boom)
    down = await client.post("/api/v1/sources", headers=_auth(token), json={"name": "x", "url": PG_URL})
    assert down.status_code == 422
    assert PASSWORD not in down.text

    tested = await client.post("/api/v1/sources/test", headers=_auth(token), json={"name": "x", "url": PG_URL})
    assert tested.json()["ok"] is False
    assert PASSWORD not in tested.text


@pytest.mark.asyncio
async def test_analyst_cannot_manage_sources(client, enc, reachable):
    token = await _login(client, "analyst", "analyst123")
    r = await client.post("/api/v1/sources", headers=_auth(token), json={"name": "x", "url": PG_URL})
    assert r.status_code == 403
    assert (await client.delete("/api/v1/sources/usr-abc", headers=_auth(token))).status_code == 403


@pytest.mark.asyncio
async def test_private_hosts_blocked_when_disabled(client, enc, reachable, monkeypatch):
    monkeypatch.setenv("ALLOW_PRIVATE_SOURCE_HOSTS", "false")
    get_settings.cache_clear()
    token = await _login(client, "dpo", "dpo123")
    r = await client.post(
        "/api/v1/sources", headers=_auth(token), json={"name": "x", "url": "postgresql://u:p@127.0.0.1/db"}
    )
    assert r.status_code == 422
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_run_and_build_on_user_mongo_source(client, enc, reachable, monkeypatch):
    monkeypatch.setenv("ENABLE_MONGO", "false")  # demo flags must not matter for user sources
    get_settings.cache_clear()
    mongo = mongomock.MongoClient()
    monkeypatch.setattr("src.api.runs.mongo_client", lambda: mongo)
    db = mongo["corpdb"]
    db.customers.insert_many(json.loads((FIXTURES / "seed_customers.json").read_text(encoding="utf-8")))
    db.orders.insert_many(json.loads((FIXTURES / "seed_orders.json").read_text(encoding="utf-8")))

    token = await _login(client, "dpo", "dpo123")
    src = (
        await client.post("/api/v1/sources", headers=_auth(token), json={"name": "Corp", "url": MONGO_URL})
    ).json()

    run = (await client.post("/api/v1/runs", headers=_auth(token), json={"source_id": src["id"]})).json()
    assert run["status"] == "REVIEW_REQUIRED"
    assert PASSWORD not in json.dumps(run)
    paths = {(p["source_path"], p["field_path"]) for p in run["field_profiles"]}
    assert ("customers", "identity.cccd") in paths  # real scan, not stub profiles
    assert all(p["coverage_status"] != "stub" for p in run["field_profiles"])

    decisions = []
    for p in run["field_profiles"]:
        action = p["recommended_action"]
        if p["classification"] == "UNKNOWN" and action == "KEEP":
            action = "DROP"
        decisions.append({"field_profile_id": p["id"], "action": action, "reason": "reviewed"})
    saved = await client.put(
        f"/api/v1/runs/{run['id']}/decisions", headers=_auth(token), json={"decisions": decisions}
    )
    assert saved.status_code == 200

    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert built.status_code == 200
    body = built.json()
    assert PASSWORD not in json.dumps(body)
    assert body["dataset"]["output_location"].startswith(f"mongodb://corpdb_protected_run{run['id']}/")
    assert body["dataset"]["status"] == "VERIFIED", body["verifier_results"]
    # Source DB untouched; snapshot written to a per-run database.
    assert f"corpdb_protected_run{run['id']}" in mongo.list_database_names()
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_delete_source_blocked_while_runs_exist(client, enc, reachable, monkeypatch):
    mongo = mongomock.MongoClient()
    mongo["corpdb"].customers.insert_one({"_id": 1, "name": "x"})
    monkeypatch.setattr("src.api.runs.mongo_client", lambda: mongo)
    token = await _login(client, "dpo", "dpo123")
    src = (await client.post("/api/v1/sources", headers=_auth(token), json={"name": "C", "url": MONGO_URL})).json()
    unused = (await client.post("/api/v1/sources", headers=_auth(token), json={"name": "D", "url": MONGO_URL})).json()
    await client.post("/api/v1/runs", headers=_auth(token), json={"source_id": src["id"]})

    assert (await client.delete(f"/api/v1/sources/{src['id']}", headers=_auth(token))).status_code == 409
    assert (await client.delete(f"/api/v1/sources/{unused['id']}", headers=_auth(token))).status_code == 204
    assert (await client.delete("/api/v1/sources/sql-demo", headers=_auth(token))).status_code == 404


@pytest.mark.asyncio
async def test_user_postgres_scan_is_live_even_without_snapshot_target(client, enc, reachable, monkeypatch):
    """Regression: a user source must never silently fall back to stub profiles."""
    monkeypatch.setenv("SNAPSHOT_DATABASE_URL", "")
    monkeypatch.setenv("ENABLE_PG_SNAPSHOT", "false")
    get_settings.cache_clear()
    seen = {}

    async def fake_scan(url, *, use_ai, schema_name, tables):
        seen.update(url=url, schema=schema_name, tables=tables)
        return [
            {
                "source_path": "customers",
                "field_path": "email",
                "data_type": "varchar",
                "profile_summary": "email-like",
                "classification": "PERSONAL_CONTEXT",
                "taxonomy_id": None,
                "detector_source": "rule",
                "coverage_status": "full",
                "recommended_action": "MASK",
            }
        ]

    monkeypatch.setattr("src.services.run_scanner.scan_postgres_source", fake_scan)
    token = await _login(client, "dpo", "dpo123")
    src = (
        await client.post(
            "/api/v1/sources",
            headers=_auth(token),
            json={"name": "Corp PG", "url": PG_URL, "namespace": "sales", "tables": ["customers"]},
        )
    ).json()
    run = (await client.post("/api/v1/runs", headers=_auth(token), json={"source_id": src["id"]})).json()
    assert run["status"] == "REVIEW_REQUIRED"
    assert seen == {"url": PG_URL, "schema": "sales", "tables": ("customers",)}
    assert [p["coverage_status"] for p in run["field_profiles"]] == ["full"]
    assert PASSWORD not in json.dumps(run)
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_connection_test_offers_namespaces_to_pick(client, enc, reachable, monkeypatch):
    """The DPO cannot know schema names before connecting: the test call lists them."""
    monkeypatch.setattr(
        "src.api.sources.list_namespaces", lambda url, engine, default="": ["public", "sales", "hr"]
    )
    token = await _login(client, "dpo", "dpo123")
    tested = await client.post("/api/v1/sources/test", headers=_auth(token), json={"name": "x", "url": PG_URL})
    body = tested.json()
    assert body["ok"] is True
    assert body["namespaces"] == ["public", "sales", "hr"]
    assert body["default_namespace"] == "public"
    assert PASSWORD not in tested.text


def test_list_namespaces_hides_system_and_snapshot_namespaces(monkeypatch):
    from src.services import source_validation

    client = mongomock.MongoClient()
    for name in ("corpdb", "crm", "admin", "local", "config", "mydatabase_protected_run3", "corpdb_protected_run7"):
        client[name]["probe"].insert_one({"x": 1})
    monkeypatch.setattr("pymongo.MongoClient", lambda *a, **k: client)
    get_settings.cache_clear()
    names = source_validation.list_namespaces(MONGO_URL, "mongodb", "corpdb")
    assert names == ["corpdb", "crm"]


def test_list_namespaces_falls_back_to_url_namespace_when_listing_fails(monkeypatch):
    from src.services import source_validation

    def denied(*args, **kwargs):
        raise PermissionError("not authorized to listDatabases")

    monkeypatch.setattr("pymongo.MongoClient", denied)
    assert source_validation.list_namespaces(MONGO_URL, "mongodb", "corpdb") == ["corpdb"]
