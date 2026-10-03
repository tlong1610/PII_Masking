"""Tests for Controlled Detokenization Endpoint and Vault Crypto (FR-13, §9.5)."""

import pytest
from sqlalchemy import select

from src.db import models as db_models
from src.db.session import get_session_factory
from src.vault.service import (
    compute_blind_index,
    decrypt_aes_gcm,
    encrypt_aes_gcm,
    get_vault_rate_limiter,
    tokenize_value,
)


async def _login(client, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/sessions",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_vault_crypto_aes_gcm_roundtrip():
    """Kiểm tra mã hóa và giải mã AES-256-GCM bảo toàn nội dung gốc."""
    secret_text = "012345678901"  # CCCD mẫu
    ciphertext1 = encrypt_aes_gcm(secret_text)
    ciphertext2 = encrypt_aes_gcm(secret_text)

    # Do nonce ngẫu nhiên (12 bytes), 2 lần mã hóa cùng dữ liệu phải ra ciphertext khác nhau
    assert ciphertext1 != ciphertext2

    # Giải mã thành công cả 2
    assert decrypt_aes_gcm(ciphertext1) == secret_text
    assert decrypt_aes_gcm(ciphertext2) == secret_text


def test_vault_blind_index_deterministic():
    """Kiểm tra blind index là tất định cho cùng một giá trị PII (§9.5)."""
    val1 = "0912345678"
    val2 = "0912345678"
    val3 = "0987654321"

    b1 = compute_blind_index(val1)
    b2 = compute_blind_index(val2)
    b3 = compute_blind_index(val3)

    assert b1 == b2
    assert b1 != b3
    assert len(b1) == 64  # SHA-256 hex


def test_tokenize_value_creates_or_reuses_token():
    """Kiểm tra hàm tokenize_value lưu token vào DB và tái sử dụng token khi trùng blind index."""
    session_factory = get_session_factory()
    with session_factory() as db:
        tok1 = tokenize_value(db, "nguyenvana@example.com", entity_type="EMAIL")
        assert tok1.token.startswith("tok_")
        assert tok1.entity_type == "EMAIL"

        # Dữ liệu lưu trong DB phải là ciphertext, KHÔNG được chứa plaintext (Zero Raw PII)
        assert "nguyenvana@example.com" not in tok1.encrypted_value

        # Tokenize lại cùng giá trị phải trả về token cũ
        tok2 = tokenize_value(db, "nguyenvana@example.com", entity_type="EMAIL")
        assert tok2.token == tok1.token


@pytest.mark.asyncio
async def test_detokenize_endpoint_success_by_dpo(client):
    """DPO giải mã token thành công khi cung cấp lý do hợp lệ."""
    get_vault_rate_limiter().reset()
    dpo_token = await _login(client, "dpo", "dpo123")

    # Tạo trước 1 token trong DB
    raw_cccd = "079201004567"
    session_factory = get_session_factory()
    with session_factory() as db:
        vault_rec = tokenize_value(db, raw_cccd, entity_type="VI_CITIZEN_ID")
        target_token = vault_rec.token

    # DPO gọi giải mã (hỗ trợ cả /api/v1/vault/detokenize và root /vault/detokenize)
    response = await client.post(
        "/api/v1/vault/detokenize",
        headers=_auth(dpo_token),
        json={
            "token": target_token,
            "reason": "Phục vụ thanh tra an toàn thông tin theo yêu cầu cơ quan có thẩm quyền",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["token"] == target_token
    assert data["raw_value"] == raw_cccd
    assert data["entity_type"] == "VI_CITIZEN_ID"
    assert "decrypted_at" in data

    # Gọi qua root endpoint /vault/detokenize
    res_root = await client.post(
        "/vault/detokenize",
        headers=_auth(dpo_token),
        json={
            "token": target_token,
            "reason": "Thanh tra đột xuất của cơ quan quản lý nhà nước",
        },
    )
    assert res_root.status_code == 200
    assert res_root.json()["raw_value"] == raw_cccd

    # Kiểm tra Audit Log được ghi nhận
    with session_factory() as db:
        audit_event = db.scalars(
            select(db_models.AuditEvent)
            .where(
                db_models.AuditEvent.action == "DETOKENIZE",
                db_models.AuditEvent.entity_id == target_token,
            )
            .order_by(db_models.AuditEvent.id.desc())
        ).first()
        assert audit_event is not None
        assert audit_event.role == "DPO"
        assert "Thanh tra đột xuất" in audit_event.reason
        assert audit_event.entry_hash != ""


@pytest.mark.asyncio
async def test_detokenize_rejects_non_dpo(client):
    """Analyst hoặc người dùng chưa đăng nhập không có quyền giải mã (401/403)."""
    # 1. Unauthenticated
    res1 = await client.post(
        "/api/v1/vault/detokenize",
        json={"token": "tok_123456", "reason": "Thanh tra nghiệp vụ"},
    )
    assert res1.status_code == 401

    # 2. Analyst role -> 403 Forbidden
    analyst_token = await _login(client, "analyst", "analyst123")
    res2 = await client.post(
        "/api/v1/vault/detokenize",
        headers=_auth(analyst_token),
        json={"token": "tok_123456", "reason": "Thanh tra nghiệp vụ"},
    )
    assert res2.status_code == 403
    assert "DPO role required" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_detokenize_requires_mandatory_reason(client):
    """Giải mã bắt buộc phải có lý do (tối thiểu 5 ký tự)."""
    get_vault_rate_limiter().reset()
    dpo_token = await _login(client, "dpo", "dpo123")

    # Thiếu reason (empty string hoặc < 5 chars)
    res = await client.post(
        "/api/v1/vault/detokenize",
        headers=_auth(dpo_token),
        json={"token": "tok_123456", "reason": "abc"},
    )
    assert res.status_code in (400, 422)


@pytest.mark.asyncio
async def test_detokenize_token_not_found(client):
    """Nếu token không tồn tại, trả về 404 Not Found."""
    get_vault_rate_limiter().reset()
    dpo_token = await _login(client, "dpo", "dpo123")

    res = await client.post(
        "/api/v1/vault/detokenize",
        headers=_auth(dpo_token),
        json={"token": "tok_non_existent_9999", "reason": "Thanh tra định kỳ hàng quý"},
    )
    assert res.status_code == 404
    assert "không tồn tại" in res.json()["detail"]


@pytest.mark.asyncio
async def test_detokenize_rate_limiting_exceeded(client):
    """Vượt quá giới hạn tần suất gọi detokenize phải trả về HTTP 429 Too Many Requests."""
    limiter = get_vault_rate_limiter()
    limiter.reset()
    # Tạm thời đặt max_requests nhỏ để test
    old_max = limiter.max_requests
    limiter.max_requests = 3

    dpo_token = await _login(client, "dpo", "dpo123")

    session_factory = get_session_factory()
    with session_factory() as db:
        rec = tokenize_value(db, "0901234567", entity_type="PHONE")
        tok = rec.token

    try:
        # Gọi 3 lần đầu thành công
        for _ in range(3):
            r = await client.post(
                "/api/v1/vault/detokenize",
                headers=_auth(dpo_token),
                json={"token": tok, "reason": "Kiểm toán nghiệp vụ định kỳ"},
            )
            assert r.status_code == 200

        # Lần thứ 4 phải bị Rate Limited (429)
        r_blocked = await client.post(
            "/api/v1/vault/detokenize",
            headers=_auth(dpo_token),
            json={"token": tok, "reason": "Kiểm toán nghiệp vụ định kỳ"},
        )
        assert r_blocked.status_code == 429
        assert "tần suất" in r_blocked.json()["detail"]
    finally:
        limiter.max_requests = old_max
        limiter.reset()
