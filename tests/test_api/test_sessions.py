"""Tests for POST /sessions and Bearer auth deps."""

import pytest


@pytest.mark.asyncio
async def test_login_dpo_returns_role_and_token(client):
    response = await client.post(
        "/api/v1/sessions",
        json={"username": "dpo", "password": "dpo123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "dpo"
    assert data["role"] == "DPO"
    assert data["token_type"] == "bearer"
    assert data["access_token"]


@pytest.mark.asyncio
async def test_login_analyst_returns_analyst_role(client):
    response = await client.post(
        "/api/v1/sessions",
        json={"username": "analyst", "password": "analyst123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "ANALYST"
    assert data["username"] == "analyst"


@pytest.mark.asyncio
async def test_login_wrong_password_is_401(client):
    response = await client.post(
        "/api/v1/sessions",
        json={"username": "dpo", "password": "wrong"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_user_is_401(client):
    response = await client.post(
        "/api/v1/sessions",
        json={"username": "nobody", "password": "x"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_bearer_token(client):
    response = await client.get("/api/v1/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_with_valid_token(client):
    login = await client.post(
        "/api/v1/sessions",
        json={"username": "dpo", "password": "dpo123"},
    )
    token = login.json()["access_token"]
    response = await client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["role"] == "DPO"


@pytest.mark.asyncio
async def test_analyst_cannot_call_dpo_endpoint(client):
    login = await client.post(
        "/api/v1/sessions",
        json={"username": "analyst", "password": "analyst123"},
    )
    token = login.json()["access_token"]
    response = await client.get(
        "/api/v1/dpo-check",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_client_cannot_choose_role_via_body(client):
    """Even if client sends extra role field, server uses DB role only."""
    response = await client.post(
        "/api/v1/sessions",
        json={"username": "analyst", "password": "analyst123", "role": "DPO"},
    )
    assert response.status_code == 200
    assert response.json()["role"] == "ANALYST"
