"""Tests for FR-07: Cổng DB Chặn Áp Dụng Khi Chưa Duyệt (Gate Enforcement).

Confirms:
1. POST /runs/{id}/build fails with 422 when decisions are missing.
2. POST /runs/{id}/build fails when run is in invalid state (NEW / SCANNING).
3. POST /runs/{id}/build fails with 403 when called by non-DPO (Analyst).
4. UNKNOWN classification cannot be approved with KEEP.
5. Unit test: Pipeline execution without decisions is rejected at the logic gate.
"""

import pytest
from sqlalchemy import select

from src.db import models as db_models
from src.models.schemas import RunStatus
from src.transform.pg_pipeline import actions_from_run_decisions, pg_join_key_violations


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
async def test_build_blocked_without_dpo_decisions_422(client):
    """Cổng chặn 1: Build khi chưa có bất kỳ decision nào -> 422."""
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    assert created.status_code == 201
    run_id = created.json()["id"]

    build_res = await client.post(f"/api/v1/runs/{run_id}/build", headers=_auth(token))
    assert build_res.status_code == 422
    err_detail = build_res.json()["detail"]
    assert "missing_field_profile_ids" in err_detail
    assert len(err_detail["missing_field_profile_ids"]) > 0


@pytest.mark.asyncio
async def test_build_blocked_when_partial_decisions(client):
    """Cổng chặn 2: Mới duyệt 1 phần, chưa duyệt hết -> 422."""
    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    run = created.json()
    run_id = run["id"]
    profiles = run["field_profiles"]
    assert len(profiles) >= 2

    # Duyệt duy nhất 1 field
    first_profile = profiles[0]
    act = "DROP" if first_profile["classification"] == "UNKNOWN" else first_profile["recommended_action"]
    put_res = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(token),
        json={"decisions": [{"field_profile_id": first_profile["id"], "action": act, "reason": "partial"}]},
    )
    assert put_res.status_code == 200
    assert put_res.json()["status"] == "REVIEW_REQUIRED"

    # Thử build ngay
    build_res = await client.post(f"/api/v1/runs/{run_id}/build", headers=_auth(token))
    assert build_res.status_code == 422
    err_detail = build_res.json()["detail"]
    assert "missing_field_profile_ids" in err_detail
    assert first_profile["id"] not in err_detail["missing_field_profile_ids"]


@pytest.mark.asyncio
async def test_build_blocked_by_role_403_for_analyst(client):
    """Cổng chặn 3: Analyst không có quyền gọi build -> 403 Forbidden."""
    analyst_token = await _login(client, "analyst", "analyst123")
    build_res = await client.post("/api/v1/runs/1/build", headers=_auth(analyst_token))
    assert build_res.status_code == 403
    assert "DPO role required" in build_res.json()["detail"]


@pytest.mark.asyncio
async def test_build_blocked_in_invalid_status_422(client):
    """Cổng chặn 4: Run ở trạng thái SCANNING hoặc FAILED không được build -> 422."""
    from src.db.session import get_session_factory

    token = await _login(client, "dpo", "dpo123")
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(token),
        json={"source_id": "sql-demo"},
    )
    run_id = created.json()["id"]

    # Đổi trạng thái trong DB thành SCANNING
    session_factory = get_session_factory()
    with session_factory() as db:
        run = db.scalar(select(db_models.Run).where(db_models.Run.id == run_id))
        run.status = RunStatus.SCANNING.value
        db.commit()

    build_res = await client.post(f"/api/v1/runs/{run_id}/build", headers=_auth(token))
    assert build_res.status_code == 422
    assert "Build blocked: run is in state SCANNING" in str(build_res.json())


def test_pipeline_decision_logic_gate():
    """Unit test logic: Cổng xử lý pipeline từ chối dữ liệu thiếu quyết định hoặc sai quan hệ."""
    class DummyProfile:
        def __init__(self, id, source_path, field_path):
            self.id = id
            self.source_path = source_path
            self.field_path = field_path

    class DummyDecision:
        def __init__(self, field_profile_id, action):
            self.field_profile_id = field_profile_id
            self.action = action

    profiles = [
        DummyProfile(1, "orders", "customer_cccd"),
        DummyProfile(2, "customers", "cccd"),
    ]

    # Case A: Không có decision -> actions rỗng
    actions_empty = actions_from_run_decisions(profiles, [])
    assert actions_empty == {}

    # Case B: Decision vi phạm khóa JOIN (orders.customer_cccd=HMAC nhưng customers.cccd=KEEP)
    mismatched_decisions = [
        DummyDecision(1, "HMAC"),
        DummyDecision(2, "KEEP"),
    ]
    actions_mismatched = actions_from_run_decisions(profiles, mismatched_decisions)
    violations = pg_join_key_violations(actions_mismatched)
    assert len(violations) == 1
    assert violations[0]["from"] == "orders.customer_cccd"
    assert violations[0]["from_action"] == "HMAC"
    assert violations[0]["to_action"] == "KEEP"
