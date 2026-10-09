"""Tests for Enterprise RBAC, Fine-Grained Dataset Grants, and Separation of Duties (§3, §14.2, §17.4)."""

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
async def test_dataset_grants_access_and_revocation(client):
    """Analyst chỉ thấy và preview các dataset được cấp quyền cụ thể qua dataset_grants (§14.2)."""
    dpo_token = await _login(client, "dpo", "dpo123")
    analyst_token = await _login(client, "analyst", "analyst123")

    # Lấy ID của user analyst
    me_res = await client.get("/api/v1/me", headers=_auth(analyst_token))
    analyst_id = me_res.json()["id"]

    # 1. DPO build & publish dataset
    ds = await _build_verified_dataset(client, dpo_token)
    pub_res = await client.post(f"/api/v1/datasets/{ds['id']}/publish", headers=_auth(dpo_token))
    assert pub_res.status_code == 200

    # 2. Ban đầu Analyst thấy dataset (do auto-grant khi publish)
    list_res1 = await client.get("/api/v1/datasets", headers=_auth(analyst_token))
    assert any(d["id"] == ds["id"] for d in list_res1.json())

    # Analyst preview thành công
    prev_res1 = await client.get(f"/api/v1/datasets/{ds['id']}/preview", headers=_auth(analyst_token))
    assert prev_res1.status_code == 200

    # 3. DPO thu hồi quyền truy cập của Analyst (DELETE grant)
    del_res = await client.delete(
        f"/api/v1/datasets/{ds['id']}/grants/{analyst_id}",
        headers=_auth(dpo_token),
    )
    assert del_res.status_code == 204

    # 4. Khi bị thu hồi:
    # a. Không xuất hiện trong danh sách dataset của Analyst
    list_res2 = await client.get("/api/v1/datasets", headers=_auth(analyst_token))
    assert not any(d["id"] == ds["id"] for d in list_res2.json())

    # b. Preview bị chặn với mã lỗi 403 Forbidden
    prev_res2 = await client.get(f"/api/v1/datasets/{ds['id']}/preview", headers=_auth(analyst_token))
    assert prev_res2.status_code == 403
    assert "dataset_grants" in prev_res2.json()["detail"]

    # 5. DPO cấp lại quyền (POST grant)
    grant_res = await client.post(
        f"/api/v1/datasets/{ds['id']}/grants",
        headers=_auth(dpo_token),
        json={"user_id": analyst_id},
    )
    assert grant_res.status_code in (200, 201)

    # Analyst lại thấy và preview được
    list_res3 = await client.get("/api/v1/datasets", headers=_auth(analyst_token))
    assert any(d["id"] == ds["id"] for d in list_res3.json())


@pytest.mark.asyncio
async def test_separation_of_duties_blocks_self_approval(client, monkeypatch):
    """Khi self_approval_allowed = False, người tạo yêu cầu quét bị chặn không được tự duyệt (§3, §17.4)."""
    from src.config import get_settings

    dpo_token = await _login(client, "dpo", "dpo123")

    # Tạo run bởi DPO
    created = await client.post(
        "/api/v1/runs",
        headers=_auth(dpo_token),
        json={"source_id": "sql-demo"},
    )
    assert created.status_code == 201
    run_id = created.json()["id"]

    # Tắt cấu hình self_approval_allowed (bật quy tắc SoD nghiêm ngặt)
    settings = get_settings()
    monkeypatch.setattr(settings, "self_approval_allowed", False)

    # Thử nộp quyết định phê duyệt bởi chính DPO đã tạo run
    dec_res = await client.put(
        f"/api/v1/runs/{run_id}/decisions",
        headers=_auth(dpo_token),
        json={"decisions": [{"field_profile_id": 1, "action": "MASK", "reason": "Self-decision"}]},
    )
    assert dec_res.status_code == 403
    assert "phân tách nhiệm vụ" in dec_res.json()["detail"]

    # Thử build bởi chính DPO đã tạo run
    build_res = await client.post(
        f"/api/v1/runs/{run_id}/build",
        headers=_auth(dpo_token),
    )
    assert build_res.status_code == 403
    assert "phân tách nhiệm vụ" in build_res.json()["detail"]


@pytest.mark.asyncio
async def test_analyst_self_audit_log_isolation(client):
    """Analyst chỉ được xem audit log của chính mình qua /audit/my; /audit toàn hệ thống chỉ dành cho DPO (§3, §14.2)."""
    dpo_token = await _login(client, "dpo", "dpo123")
    analyst_token = await _login(client, "analyst", "analyst123")

    # Analyst gọi API để phát sinh sự kiện audit (ví dụ gọi /datasets)
    await client.get("/api/v1/datasets", headers=_auth(analyst_token))

    # 1. Analyst bị từ chối truy cập /audit toàn hệ thống (403)
    forbidden_logs = await client.get("/api/v1/audit", headers=_auth(analyst_token))
    assert forbidden_logs.status_code == 403

    # 2. Analyst truy vấn self-audit log qua /audit/my -> Thành công (200) và chỉ thấy log của chính mình
    analyst_logs = await client.get("/api/v1/audit/my", headers=_auth(analyst_token))
    assert analyst_logs.status_code == 200
    me_res = await client.get("/api/v1/me", headers=_auth(analyst_token))
    analyst_id = me_res.json()["id"]

    for event in analyst_logs.json():
        assert event["actor_id"] == analyst_id

    # 3. Analyst không có quyền gọi xác thực toàn vẹn chuỗi băm (/audit/verify)
    verify_res = await client.get("/api/v1/audit/verify", headers=_auth(analyst_token))
    assert verify_res.status_code == 403

    # 4. DPO truy cập /audit toàn hệ thống và xác thực chuỗi băm thành công
    dpo_logs = await client.get("/api/v1/audit", headers=_auth(dpo_token))
    assert dpo_logs.status_code == 200
    dpo_verify = await client.get("/api/v1/audit/verify", headers=_auth(dpo_token))
    assert dpo_verify.status_code == 200
    assert dpo_verify.json()["valid"] is True
