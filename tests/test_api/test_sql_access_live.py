"""Analyst read-only SQL login against the live snapshot Postgres (skipped when unavailable)."""

from urllib.parse import urlsplit

import psycopg
import pytest

from src.config import get_settings
from src.services import analyst_sql

SNAPSHOT_SCHEMA = "piiguard_test_sqlaccess"


async def _login(client, username: str, password: str) -> str:
    response = await client.post("/api/v1/sessions", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _published_dataset(client, dpo: str) -> dict:
    run = (await client.post("/api/v1/runs", headers=_auth(dpo), json={"source_id": "sql-demo"})).json()
    decisions = []
    for p in run["field_profiles"]:
        action = p["recommended_action"]
        if p["classification"] == "UNKNOWN" and action == "KEEP":
            action = "DROP"
        decisions.append({"field_profile_id": p["id"], "action": action, "reason": "reviewed"})
    saved = await client.put(f"/api/v1/runs/{run['id']}/decisions", headers=_auth(dpo), json={"decisions": decisions})
    assert saved.status_code == 200
    built = await client.post(f"/api/v1/runs/{run['id']}/build", headers=_auth(dpo))
    dataset = built.json()["dataset"]
    assert dataset["status"] == "VERIFIED", built.json()["verifier_results"]
    published = await client.post(f"/api/v1/datasets/{dataset['id']}/publish", headers=_auth(dpo))
    assert published.status_code == 200
    return dataset


def _connect_as(snapshot_url: str, access: dict) -> psycopg.Connection:
    parts = urlsplit(snapshot_url)
    return psycopg.connect(
        host=parts.hostname,
        port=parts.port or 5432,
        dbname=access["database"],
        user=access["username"],
        password=access["password"],
        connect_timeout=5,
        autocommit=True,
    )


@pytest.fixture
def sql_env(live_postgres, monkeypatch):
    monkeypatch.setenv("ENABLE_PG_SNAPSHOT", "true")
    monkeypatch.setenv("ENABLE_AI_SCAN", "false")
    monkeypatch.setenv("ENABLE_ANALYST_SQL", "true")
    monkeypatch.setenv("SOURCE_DATABASE_URL", live_postgres["source"])
    monkeypatch.setenv("SNAPSHOT_DATABASE_URL", live_postgres["snapshot"])
    monkeypatch.setenv("SNAPSHOT_SCHEMA", SNAPSHOT_SCHEMA)
    get_settings.cache_clear()
    # On Render the app's own tables share this database (public schema); stand one in for them.
    with psycopg.connect(live_postgres["snapshot"], autocommit=True) as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS public.piiguard_app_private (secret text)")
    yield live_postgres
    get_settings.cache_clear()
    with psycopg.connect(live_postgres["snapshot"], autocommit=True) as conn:
        conn.execute("DROP TABLE IF EXISTS public.piiguard_app_private")
        for (schema,) in conn.execute(
            "SELECT nspname FROM pg_namespace WHERE nspname LIKE %s OR nspname ~ '^ds_[0-9]+$'",
            (f"{SNAPSHOT_SCHEMA}_run%",),
        ).fetchall():
            conn.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE')
        for (role,) in conn.execute(
            "SELECT rolname FROM pg_roles WHERE rolname LIKE %s", (f"{analyst_sql.ROLE_PREFIX}%",)
        ).fetchall():
            conn.execute(f'DROP OWNED BY "{role}"')
            conn.execute(f'DROP ROLE "{role}"')


@pytest.mark.asyncio
async def test_analyst_reads_only_granted_views_and_loses_them_on_revoke(client, sql_env):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    dataset = await _published_dataset(client, dpo)
    schema = f"ds_{dataset['id']}"

    before = (await client.get("/api/v1/sql-access", headers=_auth(analyst))).json()
    assert before["enabled"] is True and before["has_credentials"] is False
    assert before["password"] is None
    # Other tests may have published datasets too; this one must be listed.
    assert schema in [d["schema_name"] for d in before["datasets"]]

    issued = await client.post("/api/v1/sql-access/credentials", headers=_auth(analyst))
    assert issued.status_code == 200
    access = issued.json()
    assert access["password"] and access["username"].startswith(analyst_sql.ROLE_PREFIX)
    again = (await client.get("/api/v1/sql-access", headers=_auth(analyst))).json()
    assert again["has_credentials"] is True and again["password"] is None

    snapshot_schema = dataset["output_location"].removeprefix("postgres://").split("/")[0]
    with _connect_as(sql_env["snapshot"], access) as conn:
        assert conn.execute(f'SELECT count(*) FROM "{schema}".customers').fetchone()[0] > 0
        # Same rows as the protected snapshot, nothing raw.
        cccd = conn.execute(f'SELECT cccd FROM "{schema}".customers WHERE cccd IS NOT NULL LIMIT 5').fetchall()
        assert cccd and all(len(row[0]) == 64 for row in cccd)
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute(f'SELECT 1 FROM "{snapshot_schema}".customers LIMIT 1')
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute("SELECT 1 FROM public.piiguard_app_private LIMIT 1")
        # No write privilege at all, and every session is read-only on top of that.
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute(f'DELETE FROM "{schema}".customers')
        assert conn.execute("SHOW default_transaction_read_only").fetchone()[0] == "on"
        with pytest.raises(psycopg.errors.ReadOnlySqlTransaction):
            conn.execute("CREATE TEMP TABLE scratch (x int)")

    analyst_id = (await client.get("/api/v1/me", headers=_auth(analyst))).json()["id"]
    removed = await client.delete(f"/api/v1/datasets/{dataset['id']}/grants/{analyst_id}", headers=_auth(dpo))
    assert removed.status_code == 204
    with _connect_as(sql_env["snapshot"], access) as conn:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute(f'SELECT 1 FROM "{schema}".customers LIMIT 1')


@pytest.mark.asyncio
async def test_revoking_the_dataset_removes_its_sql_views(client, sql_env):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    dataset = await _published_dataset(client, dpo)
    access = (await client.post("/api/v1/sql-access/credentials", headers=_auth(analyst))).json()

    revoked = await client.post(f"/api/v1/datasets/{dataset['id']}/revoke", headers=_auth(dpo))
    assert revoked.status_code == 200
    with _connect_as(sql_env["snapshot"], access) as conn:
        with pytest.raises(psycopg.errors.UndefinedTable):
            conn.execute(f'SELECT 1 FROM "ds_{dataset["id"]}".customers LIMIT 1')
    after = (await client.get("/api/v1/sql-access", headers=_auth(analyst))).json()
    assert f"ds_{dataset['id']}" not in [d["schema_name"] for d in after["datasets"]]
