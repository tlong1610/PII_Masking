"""Tests for GET /sources (DPO only, no credentials)."""

import pytest


async def _login(client, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/sessions",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_dpo_lists_sources_without_credentials(client):
    token = await _login(client, "dpo", "dpo123")
    response = await client.get(
        "/api/v1/sources",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    types = {item["source_type"] for item in data}
    assert "SQL" in types
    assert "NOSQL" in types
    engines = {item["engine"] for item in data}
    assert "postgresql" in engines
    assert "mongodb" in engines
    for item in data:
        assert "id" in item and "name" in item
        assert item["source_type"] in ("SQL", "NOSQL")
        assert item["engine"]
        blob = str(item).lower()
        assert "password" not in blob
        assert "credential" not in blob
        assert "://" not in blob


@pytest.mark.asyncio
async def test_analyst_cannot_list_sources(client):
    token = await _login(client, "analyst", "analyst123")
    response = await client.get(
        "/api/v1/sources",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_sources_requires_auth(client):
    response = await client.get("/api/v1/sources")
    assert response.status_code == 401
