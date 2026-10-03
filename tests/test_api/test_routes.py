import pytest


async def _login(client, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/sessions",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_agent_status_requires_auth(client):
    # Unauthenticated -> 401
    unauth = await client.get("/api/v1/status")
    assert unauth.status_code == 401

    # Authenticated -> 200
    token = await _login(client, "analyst", "analyst123")
    auth_res = await client.get("/api/v1/status", headers=_auth(token))
    assert auth_res.status_code == 200
    assert auth_res.json()["status"] == "ready"
    assert auth_res.json()["user"] == "analyst"


@pytest.mark.asyncio
async def test_chat_requires_auth(client):
    # Unauthenticated -> 401
    unauth = await client.post("/api/v1/chat", json={"message": "hello"})
    assert unauth.status_code == 401
