"""Tests for run cancellation API endpoint (FR-03)."""

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
async def test_cancel_active_run_succeeds(client):
    dpo_token = await _login(client, "dpo", "dpo123")

    # 1. Tạo run mới
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(dpo_token),
        json={"source_id": "sql-demo"},
    )
    assert created.status_code == 201
    run_id = created.json()["id"]
    assert created.json()["status"] == "REVIEW_REQUIRED"

    # 2. Hủy run
    cancel_res = await client.post(
        f"/api/v1/runs/{run_id}/cancel",
        headers=_auth(dpo_token),
    )
    assert cancel_res.status_code == 200
    cancelled_run = cancel_res.json()
    assert cancelled_run["status"] == "CANCELLED"

    # 3. Lấy lại run kiểm tra trạng thái
    got = await client.get(f"/api/v1/runs/{run_id}", headers=_auth(dpo_token))
    assert got.status_code == 200
    assert got.json()["status"] == "CANCELLED"

    # 4. Hủy lần 2 (đã ở terminal state CANCELLED) -> phải bị từ chối 400
    double_cancel = await client.post(
        f"/api/v1/runs/{run_id}/cancel",
        headers=_auth(dpo_token),
    )
    assert double_cancel.status_code == 400
    assert "Cannot cancel run in terminal state" in double_cancel.json()["detail"]


@pytest.mark.asyncio
async def test_analyst_cannot_cancel_run(client):
    dpo_token = await _login(client, "dpo", "dpo123")
    analyst_token = await _login(client, "analyst", "analyst123")

    created = await client.post(
        "/api/v1/runs",
        headers=_auth(dpo_token),
        json={"source_id": "sql-demo"},
    )
    run_id = created.json()["id"]

    # Analyst gọi cancel -> 403 Forbidden
    res = await client.post(
        f"/api/v1/runs/{run_id}/cancel",
        headers=_auth(analyst_token),
    )
    assert res.status_code == 403
    assert "DPO role required" in res.json()["detail"]
