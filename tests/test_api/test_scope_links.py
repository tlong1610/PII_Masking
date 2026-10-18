"""Scope selection on user sources: URL schema, allowlist, link tables and joins that leave the scope."""

import json
from pathlib import Path

import mongomock
import pytest
from cryptography.fernet import Fernet

from src.config import get_settings
from src.models.schemas import ColumnProfile, DatabaseProfile, TableProfile, TableRelation
from src.services.source_validation import SourceUrlError, parse_source_url
from src.verifier.sql_verifier import CheckResult

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "data" / "fixtures" / "mongo"
PASSWORD = "S3cretPw!"
PG_URL = f"postgresql://corp:{PASSWORD}@pg.corp.example:5432/corpdb"
MONGO_URL = f"mongodb://corp:{PASSWORD}@db.corp.example:27017/corpdb"
SNAPSHOT_URL = "postgresql://snap:snap@snapshot.example:5432/snap"

USER_ROLES = [
    ("user_roles", "user_id", "users", "id"),
    ("user_roles", "role_id", "roles", "id"),
]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _login(client) -> str:
    r = await client.post("/api/v1/sessions", json={"username": "dpo", "password": "dpo123"})
    assert r.status_code == 200
    return r.json()["access_token"]


def _spec(table: str, field: str, action: str, classification: str = "NON_PERSONAL") -> dict:
    return {
        "source_path": table,
        "field_path": field,
        "data_type": "varchar",
        "profile_summary": "mocked scan",
        "classification": classification,
        "taxonomy_id": None,
        "detector_source": "rule",
        "coverage_status": "full",
        "recommended_action": action,
    }


ALL_SPECS = [
    _spec("users", "id", "KEEP"),
    _spec("users", "full_name", "MASK", "PERSONAL_BASIC"),
    _spec("roles", "id", "KEEP"),
    _spec("roles", "role_name", "KEEP"),
    _spec("user_roles", "user_id", "KEEP"),
    _spec("user_roles", "role_id", "KEEP"),
    _spec("user_roles", "granted_by", "KEEP"),
]


@pytest.fixture
def user_pg(monkeypatch):
    monkeypatch.setenv("SOURCE_ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("SNAPSHOT_DATABASE_URL", SNAPSHOT_URL)
    monkeypatch.setenv("ENABLE_AI_SCAN", "false")
    get_settings.cache_clear()
    monkeypatch.setattr("src.api.sources.probe_connection", lambda url, engine: None)
    monkeypatch.setattr("src.api.sources.probe_namespace", lambda url, engine, namespace: None)
    monkeypatch.setattr(
        "src.connectors.postgres_connector.PostgresConnector.list_relations",
        lambda self, schema_name="public": list(USER_ROLES),
    )
    calls: dict = {}

    async def fake_scan(url, *, use_ai, schema_name, tables):
        calls["tables"] = tables
        wanted = set(tables) if tables else None
        return [dict(s) for s in ALL_SPECS if wanted is None or s["source_path"] in wanted]

    monkeypatch.setattr("src.services.run_scanner.scan_postgres_source", fake_scan)
    yield calls
    get_settings.cache_clear()


async def _create_source(client, token: str, **extra) -> dict:
    r = await client.post(
        "/api/v1/sources", headers=_auth(token), json={"name": "Corp PG", "url": PG_URL, **extra}
    )
    assert r.status_code == 201, r.text
    return r.json()


def _audit_reasons() -> str:
    from src.db import models
    from src.db.session import get_session_factory

    with get_session_factory()() as db:
        return " ".join(a.reason for a in db.query(models.AuditEvent).all())


def _actions(run: dict) -> dict[tuple[str, str], str]:
    return {(p["source_path"], p["field_path"]): p["recommended_action"] for p in run["field_profiles"]}


# --- URL schema --------------------------------------------------------------


@pytest.mark.parametrize(
    ("url", "schema"),
    [
        ("postgresql://u:p@pg.corp.example/db?options=-csearch_path%3Dsales", "sales"),
        ("postgresql://u:p@pg.corp.example/db?options=-c%20search_path%3D%22%24user%22,crm", "crm"),
        ("postgresql://u:p@pg.corp.example/db?currentSchema=crm", "crm"),
        ("postgresql://u:p@pg.corp.example/db", "public"),
    ],
)
def test_parse_source_url_reads_schema_from_query(url, schema):
    assert parse_source_url(url).default_namespace == schema


@pytest.mark.asyncio
async def test_missing_schema_is_rejected_at_registration(client, user_pg, monkeypatch):
    def missing(url, engine, namespace):
        raise SourceUrlError(f"Schema '{namespace}' not found in source")

    monkeypatch.setattr("src.api.sources.probe_namespace", missing)
    token = await _login(client)
    r = await client.post(
        "/api/v1/sources", headers=_auth(token), json={"name": "x", "url": PG_URL, "namespace": "nope"}
    )
    assert r.status_code == 422
    assert "nope" in r.text and PASSWORD not in r.text


# --- Allowlist ---------------------------------------------------------------


@pytest.mark.asyncio
async def test_selection_outside_allowlist_is_rejected(client, user_pg):
    token = await _login(client)
    src = await _create_source(client, token, tables=["users"])
    r = await client.post(
        "/api/v1/runs", headers=_auth(token), json={"source_id": src["id"], "selected_scope": ["roles"]}
    )
    assert r.status_code == 422
    assert r.json()["detail"]["tables"] == ["roles"]


@pytest.mark.asyncio
async def test_scope_lists_only_allowlisted_tables(client, user_pg, monkeypatch):
    def overview(self, schema_name="public"):
        col = ColumnProfile(column_name="id", data_type="int", is_primary_key=True, is_foreign_key=False, samples=[])
        links = [
            TableRelation(from_column="user_id", to_table="users", to_column="id"),
            TableRelation(from_column="role_id", to_table="roles", to_column="id"),
        ]
        tables = [
            TableProfile(table_name=t, relations=links if t == "user_roles" else [], columns=[col])
            for t in ("users", "roles", "user_roles")
        ]
        return DatabaseProfile(database_name="corpdb", tables=tables)

    monkeypatch.setattr("src.connectors.postgres_connector.PostgresConnector.extract_schema_overview", overview)
    token = await _login(client)
    src = await _create_source(client, token, tables=["users", "roles"])
    scope = (await client.get(f"/api/v1/sources/{src['id']}/scope", headers=_auth(token))).json()
    assert [i["name"] for i in scope["items"]] == ["users", "roles"]
    assert scope["relationships"] == []  # both joins go through user_roles, which is not allowed


# --- Link tables and cut joins ----------------------------------------------


@pytest.mark.asyncio
async def test_link_table_keeps_only_hmac_join_keys(client, user_pg):
    token = await _login(client)
    src = await _create_source(client, token)
    r = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": src["id"], "selected_scope": ["users", "roles"], "link_scope": ["user_roles"]},
    )
    assert r.status_code == 201
    run = r.json()
    assert user_pg["tables"] == ("users", "roles", "user_roles")
    actions = _actions(run)
    assert actions[("user_roles", "user_id")] == "HMAC"
    assert actions[("user_roles", "role_id")] == "HMAC"
    assert actions[("user_roles", "granted_by")] == "DROP"
    assert actions[("users", "id")] == "HMAC"  # other end matches so the snapshot still joins
    assert actions[("roles", "id")] == "HMAC"
    assert actions[("roles", "role_name")] == "KEEP"  # selected tables keep scanner proposals
    assert "link_tables=user_roles" in _audit_reasons()


@pytest.mark.asyncio
async def test_skipping_bridge_table_is_audited_as_cut_links(client, user_pg):
    token = await _login(client)
    src = await _create_source(client, token)
    r = await client.post(
        "/api/v1/runs", headers=_auth(token), json={"source_id": src["id"], "selected_scope": ["users", "roles"]}
    )
    assert r.status_code == 201
    reasons = _audit_reasons()
    assert "cut_links=user_roles.role_id->roles.id,user_roles.user_id->users.id" in reasons


@pytest.mark.asyncio
async def test_join_to_unselected_table_does_not_block_build(client, user_pg, monkeypatch):
    seen: dict = {}

    def fake_pipeline(**kwargs):
        seen.update(kwargs)
        written = {t: f"snap.{t}" for t in kwargs["table_actions"]}
        ok = CheckResult("row_count_user_roles", "PASSED", "3", "3", "0", "mocked")
        return written, [ok]

    monkeypatch.setattr("src.transform.pg_pipeline.run_protected_postgres_pipeline", fake_pipeline)
    token = await _login(client)
    src = await _create_source(client, token)
    run = (
        await client.post(
            "/api/v1/runs", headers=_auth(token), json={"source_id": src["id"], "selected_scope": ["user_roles"]}
        )
    ).json()
    # HMAC on the FK while users/roles are absent used to be a violation (missing end defaulted to KEEP).
    decisions = [
        {"field_profile_id": p["id"], "action": "HMAC" if p["field_path"] != "granted_by" else "DROP", "reason": "r"}
        for p in run["field_profiles"]
    ]
    saved = await client.put(f"/api/v1/runs/{run['id']}/decisions", headers=_auth(token), json={"decisions": decisions})
    assert saved.status_code == 200, saved.text
    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert built.status_code == 200, built.text
    assert seen["relations"] == ()


@pytest.mark.asyncio
async def test_in_scope_join_mismatch_still_blocks_build(client, user_pg):
    token = await _login(client)
    src = await _create_source(client, token)
    run = (
        await client.post(
            "/api/v1/runs",
            headers=_auth(token),
            json={"source_id": src["id"], "selected_scope": ["users", "user_roles"]},
        )
    ).json()
    decisions = []
    for p in run["field_profiles"]:
        action = {"user_id": "HMAC", "id": "KEEP", "full_name": "MASK"}.get(p["field_path"], "DROP")
        decisions.append({"field_profile_id": p["id"], "action": action, "reason": "r"})
    saved = await client.put(f"/api/v1/runs/{run['id']}/decisions", headers=_auth(token), json={"decisions": decisions})
    assert saved.status_code == 200, saved.text
    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert built.status_code == 422
    assert built.json()["detail"]["join_key_violations"] == [
        {"from": "user_roles.user_id", "from_action": "HMAC", "to": "users.id", "to_action": "KEEP"}
    ]


@pytest.mark.asyncio
async def test_mongo_subset_without_parent_collection_verifies(client, monkeypatch):
    monkeypatch.setenv("SOURCE_ENCRYPTION_KEY", Fernet.generate_key().decode())
    get_settings.cache_clear()
    monkeypatch.setattr("src.api.sources.probe_connection", lambda url, engine: None)
    monkeypatch.setattr("src.api.sources.probe_namespace", lambda url, engine, namespace: None)
    mongo = mongomock.MongoClient()
    monkeypatch.setattr("src.api.runs.mongo_client", lambda: mongo)
    db = mongo["corpdb"]
    db.customers.insert_many(json.loads((FIXTURES / "seed_customers.json").read_text(encoding="utf-8")))
    db.orders.insert_many(json.loads((FIXTURES / "seed_orders.json").read_text(encoding="utf-8")))

    token = await _login(client)
    src = (
        await client.post("/api/v1/sources", headers=_auth(token), json={"name": "Corp", "url": MONGO_URL})
    ).json()
    run = (
        await client.post(
            "/api/v1/runs", headers=_auth(token), json={"source_id": src["id"], "selected_scope": ["orders"]}
        )
    ).json()
    assert {p["source_path"] for p in run["field_profiles"]} == {"orders"}
    decisions = []
    for p in run["field_profiles"]:
        action = p["recommended_action"]
        if p["classification"] == "UNKNOWN" and action == "KEEP":
            action = "DROP"
        decisions.append({"field_profile_id": p["id"], "action": action, "reason": "reviewed"})
    await client.put(f"/api/v1/runs/{run['id']}/decisions", headers=_auth(token), json={"decisions": decisions})
    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(token))
    assert built.status_code == 200, built.text
    body = built.json()
    assert body["dataset"]["status"] == "VERIFIED", body["verifier_results"]
    assert not any(r["check_name"].startswith("lookup_") for r in body["verifier_results"])
    assert "cut_links=" in _audit_reasons()
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_scope_reads_relations_with_the_overview_in_one_connection(client, user_pg, monkeypatch):
    def overview(self, schema_name="public"):
        col = ColumnProfile(column_name="id", data_type="int", is_primary_key=True, is_foreign_key=False, samples=[])
        orders = TableProfile(
            table_name="orders",
            relations=[TableRelation(from_column="user_id", to_table="users", to_column="id")],
            columns=[col],
        )
        return DatabaseProfile(
            database_name="corpdb", tables=[TableProfile(table_name="users", relations=[], columns=[col]), orders]
        )

    def no_second_connection(self, schema_name="public"):
        raise AssertionError("scope must reuse the FOREIGN KEYs it already read")

    monkeypatch.setattr("src.connectors.postgres_connector.PostgresConnector.extract_schema_overview", overview)
    monkeypatch.setattr("src.connectors.postgres_connector.PostgresConnector.list_relations", no_second_connection)
    token = await _login(client)
    src = await _create_source(client, token)
    scope = (await client.get(f"/api/v1/sources/{src['id']}/scope", headers=_auth(token))).json()
    assert {"source_table": "orders", "source_column": "user_id", "target_table": "users", "target_column": "id"} in [
        {k: r[k] for k in ("source_table", "source_column", "target_table", "target_column")}
        for r in scope["relationships"]
    ]


@pytest.mark.asyncio
async def test_unreadable_scope_is_a_clear_502_without_secrets(client, user_pg, monkeypatch):
    def down(self, schema_name="public"):
        raise ConnectionError(f"could not connect to postgresql://corp:{PASSWORD}@pg.corp.example")

    monkeypatch.setattr("src.connectors.postgres_connector.PostgresConnector.extract_schema_overview", down)
    token = await _login(client)
    src = await _create_source(client, token)
    r = await client.get(f"/api/v1/sources/{src['id']}/scope", headers=_auth(token))
    assert r.status_code == 502
    assert "ConnectionError" in r.json()["detail"]
    assert PASSWORD not in r.text
