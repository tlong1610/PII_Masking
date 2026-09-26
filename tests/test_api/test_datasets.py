"""Tests for datasets publish / revoke / list / preview guardrails."""

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


async def _build_verified_dataset(client, dpo_token: str) -> dict:
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(dpo_token),
        json={"source_id": "sql-demo"},
    )
    assert created.status_code == 201
    run = created.json()
    decisions = []
    for p in run["field_profiles"]:
        action = "DROP" if p["classification"] == "UNKNOWN" else p["recommended_action"]
        decisions.append(
            {"field_profile_id": p["id"], "action": action, "reason": "ok"}
        )
    saved = await client.put(
        f"/api/v1/runs/{run['id']}/decisions",
        headers=_auth(dpo_token),
        json={"decisions": decisions},
    )
    assert saved.status_code == 200
    built = await client.post(
        f"/api/v1/runs/{run['id']}/build",
        headers=_auth(dpo_token),
    )
    assert built.status_code == 200
    return built.json()["dataset"]


@pytest.mark.asyncio
async def test_publish_requires_verified(client):
    dpo = await _login(client, "dpo", "dpo123")
    # Create STAGING-like by building then manually we only have VERIFIED from stub.
    # Reject publish of non-existent and verify 422 path via forging status:
    # Build yields VERIFIED; create another run and don't build — no dataset.
    # Use verified then revoke? Better: publish when VERIFIED works; test 422 by
    # publishing twice after revoke won't work. Insert FAILED via second approach:
    ds = await _build_verified_dataset(client, dpo)
    # Force status via revoke then try publish
    revoked = await client.post(
        f"/api/v1/datasets/{ds['id']}/revoke",
        headers=_auth(dpo),
    )
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "REVOKED"
    again = await client.post(
        f"/api/v1/datasets/{ds['id']}/publish",
        headers=_auth(dpo),
    )
    assert again.status_code == 422


@pytest.mark.asyncio
async def test_publish_verified_and_analyst_list_filter(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    ds = await _build_verified_dataset(client, dpo)

    before = await client.get("/api/v1/datasets", headers=_auth(analyst))
    assert before.status_code == 200
    assert all(item["status"] == "PUBLISHED" for item in before.json())
    assert ds["id"] not in {item["id"] for item in before.json()}

    published = await client.post(
        f"/api/v1/datasets/{ds['id']}/publish",
        headers=_auth(dpo),
    )
    assert published.status_code == 200
    assert published.json()["status"] == "PUBLISHED"

    after = await client.get("/api/v1/datasets", headers=_auth(analyst))
    ids = {item["id"] for item in after.json()}
    assert ds["id"] in ids
    assert all(item["status"] == "PUBLISHED" for item in after.json())

    dpo_list = await client.get("/api/v1/datasets", headers=_auth(dpo))
    assert dpo_list.status_code == 200
    assert any(item["id"] == ds["id"] for item in dpo_list.json())


@pytest.mark.asyncio
async def test_analyst_cannot_publish(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    ds = await _build_verified_dataset(client, dpo)
    response = await client.post(
        f"/api/v1/datasets/{ds['id']}/publish",
        headers=_auth(analyst),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_analyst_cannot_preview_unverified(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    ds = await _build_verified_dataset(client, dpo)

    blocked = await client.get(
        f"/api/v1/datasets/{ds['id']}/preview",
        headers=_auth(analyst),
    )
    assert blocked.status_code == 403

    await client.post(f"/api/v1/datasets/{ds['id']}/publish", headers=_auth(dpo))
    preview = await client.get(
        f"/api/v1/datasets/{ds['id']}/preview",
        headers=_auth(analyst),
    )
    assert preview.status_code == 200
    body = preview.json()
    blob = str(body).lower()
    assert "sample" not in blob
    assert "password" not in blob
    assert "[redacted]" in blob or "hmac_stub_" in blob
    for col in body["columns"]:
        assert col["transform"] in ("MASK", "HMAC", "KEEP", "DROPPED")


@pytest.mark.asyncio
async def test_revoke_hides_from_analyst(client):
    dpo = await _login(client, "dpo", "dpo123")
    analyst = await _login(client, "analyst", "analyst123")
    ds = await _build_verified_dataset(client, dpo)
    await client.post(f"/api/v1/datasets/{ds['id']}/publish", headers=_auth(dpo))
    await client.post(f"/api/v1/datasets/{ds['id']}/revoke", headers=_auth(dpo))

    listed = await client.get("/api/v1/datasets", headers=_auth(analyst))
    assert ds["id"] not in {item["id"] for item in listed.json()}

    preview = await client.get(
        f"/api/v1/datasets/{ds['id']}/preview",
        headers=_auth(analyst),
    )
    assert preview.status_code == 403
