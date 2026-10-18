"""SQL access API guards and helpers that need no database."""

import pytest

from src.config import get_settings
from src.services import analyst_sql


async def _token(client, username: str, password: str) -> str:
    response = await client.post("/api/v1/sessions", json={"username": username, "password": password})
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_sql_access_is_off_by_default_and_analyst_only(client, monkeypatch):
    monkeypatch.delenv("ENABLE_ANALYST_SQL", raising=False)
    get_settings.cache_clear()
    analyst = await _token(client, "analyst", "analyst123")
    dpo = await _token(client, "dpo", "dpo123")

    off = await client.get("/api/v1/sql-access", headers={"Authorization": f"Bearer {analyst}"})
    assert off.status_code == 200 and off.json()["enabled"] is False
    issue = await client.post("/api/v1/sql-access/credentials", headers={"Authorization": f"Bearer {analyst}"})
    assert issue.status_code == 404
    denied = await client.get("/api/v1/sql-access", headers={"Authorization": f"Bearer {dpo}"})
    assert denied.status_code == 403


def test_snapshot_location_only_for_postgres_snapshots():
    assert analyst_sql.snapshot_location("postgres://piiguard_snapshot_run7/customers,orders") == (
        "piiguard_snapshot_run7",
        ["customers", "orders"],
    )
    assert analyst_sql.snapshot_location("mongodb://corp_protected_run7/customers") is None
    assert analyst_sql.snapshot_location("[REVOKED_AND_DROPPED: postgres://x/y]") is None


def test_connection_info_prefers_the_public_host(monkeypatch):
    monkeypatch.setenv("SNAPSHOT_DATABASE_URL", "postgresql://app:secret@dpg-internal-a/piiguard")
    monkeypatch.setenv("ANALYST_SQL_HOST", "dpg-internal-a.virginia-postgres.render.com")
    get_settings.cache_clear()
    try:
        info = analyst_sql.connection_info()
    finally:
        get_settings.cache_clear()
    assert (info.host, info.port, info.database, info.sslmode) == (
        "dpg-internal-a.virginia-postgres.render.com",
        5432,
        "piiguard",
        "require",
    )
    assert "secret" not in repr(info)
