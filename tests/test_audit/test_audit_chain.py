"""Tests for Audit Log Hash-Chain Service and Verification Endpoint (§14.3, FR-11)."""

import pytest
from sqlalchemy import select

from src.audit.chain import (
    GENESIS_HASH,
    record_audit_event,
    verify_audit_chain,
)
from src.db import models as db_models
from src.db.session import get_session_factory


class DummyActor:
    def __init__(self, id: int, role: str):
        self.id = id
        self.role = role


async def _login(client, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/sessions",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_hash_chain_computes_and_verifies_integrity():
    """Kiểm tra chuỗi hash liên kết tất định và kiểm chứng tính toàn vẹn."""
    session_factory = get_session_factory()
    with session_factory() as db:
        # Xóa sự kiện cũ nếu có để kiểm tra chuỗi từ đầu
        db.query(db_models.AuditEvent).delete()
        db.commit()

        actor = DummyActor(id=1, role="DPO")

        # 1. Ghi event 1 (phải bắt đầu từ GENESIS_HASH)
        e1 = record_audit_event(
            db,
            actor=actor,
            action="login",
            entity_type="session",
            entity_id="sess-01",
            reason="User logged in",
        )
        db.commit()
        db.refresh(e1)
        assert e1.prev_hash == GENESIS_HASH
        assert len(e1.entry_hash) == 64

        # 2. Ghi event 2 (phải nối tiếp entry_hash của e1)
        e2 = record_audit_event(
            db,
            actor=actor,
            action="create_run",
            entity_type="run",
            entity_id="1",
            reason="Scan started",
        )
        db.commit()
        db.refresh(e2)
        assert e2.prev_hash == e1.entry_hash
        assert len(e2.entry_hash) == 64

        # 3. Ghi event 3 (phải nối tiếp entry_hash của e2)
        e3 = record_audit_event(
            db,
            actor=actor,
            action="save_decisions",
            entity_type="run",
            entity_id="1",
            reason="DPO approved",
        )
        db.commit()
        db.refresh(e3)
        assert e3.prev_hash == e2.entry_hash

        # 4. Xác minh chuỗi còn nguyên vẹn
        res = verify_audit_chain(db)
        assert res["valid"] is True
        assert res["total_events"] == 3
        assert res["head_hash"] == e3.entry_hash
        assert res["broken_at_id"] is None


def test_hash_chain_detects_tampering():
    """Kiểm tra tính năng Tamper-evident: Sửa đổi dữ liệu trong DB sẽ bị phát hiện ngay lập tức."""
    session_factory = get_session_factory()
    with session_factory() as db:
        events = db.scalars(select(db_models.AuditEvent).order_by(db_models.AuditEvent.id.asc())).all()
        assert len(events) >= 2
        tampered_event = events[1]

        original_reason = tampered_event.reason
        # Giả lập kẻ gian sửa trộm lý do trong CSDL
        tampered_event.reason = "TAMPERED_MALICIOUS_RECORD"
        db.commit()

        # Kiểm chứng chuỗi băm
        verification = verify_audit_chain(db)
        assert verification["valid"] is False
        assert verification["broken_at_id"] == tampered_event.id
        assert "mismatch" in verification["error"].lower()

        # Khôi phục lại
        tampered_event.reason = original_reason
        db.commit()


@pytest.mark.asyncio
async def test_audit_api_endpoints_dpo_and_verify(client):
    """Kiểm tra API GET /api/v1/audit và GET /api/v1/audit/verify."""
    dpo_token = await _login(client, "dpo", "dpo123")
    analyst_token = await _login(client, "analyst", "analyst123")

    # 1. Analyst bị từ chối truy cập (403)
    res_forbidden = await client.get("/api/v1/audit", headers=_auth(analyst_token))
    assert res_forbidden.status_code == 403

    # 2. DPO đọc danh sách audit logs
    res_list = await client.get("/api/v1/audit?limit=10", headers=_auth(dpo_token))
    assert res_list.status_code == 200
    events = res_list.json()
    assert isinstance(events, list)
    if events:
        first = events[0]
        assert "prev_hash" in first
        assert "entry_hash" in first
        assert "action" in first
        assert "actor_id" in first

    # 3. DPO gọi endpoint verify chuỗi băm
    res_verify = await client.get("/api/v1/audit/verify", headers=_auth(dpo_token))
    assert res_verify.status_code == 200
    verify_data = res_verify.json()
    assert "valid" in verify_data
    assert "total_events" in verify_data
    assert verify_data["valid"] is True


def test_hash_chain_multiple_events_in_same_transaction():
    """Kiểm tra 2 sự kiện được ghi trong cùng 1 transaction không bị trùng prev_hash."""
    session_factory = get_session_factory()
    with session_factory() as db:
        actor = DummyActor(id=1, role="DPO")
        # Ghi 2 sự kiện liên tiếp mà không commit ở giữa
        e1 = record_audit_event(
            db, actor=actor, action="act1", entity_type="test", entity_id="1", reason="r1"
        )
        e2 = record_audit_event(
            db, actor=actor, action="act2", entity_type="test", entity_id="2", reason="r2"
        )
        assert e2.prev_hash == e1.entry_hash
        db.commit()

        res = verify_audit_chain(db)
        assert res["valid"] is True

