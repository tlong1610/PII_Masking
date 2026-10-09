"""Vault Service for AES-256-GCM encryption, blind indexing, rate-limiting and detokenization (§9.5, FR-13).

Provides:
- AES-256-GCM symmetric encryption / decryption with random nonce
- Blind index computation via HMAC-SHA256 for deterministic token lookups
- Thread-safe sliding window rate limiting for detokenization requests
- Controlled detokenization with mandatory justification reason and audit logging
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import threading
import time

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.session_store import SessionUser
from src.audit.chain import record_audit_event
from src.config import get_settings
from src.db.models import VaultToken


class SlidingWindowRateLimiter:
    """In-memory thread-safe sliding window rate limiter."""

    def __init__(self, max_requests: int = 10, window_seconds: float = 60.0):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._lock = threading.Lock()
        self._requests: dict[int, list[float]] = {}

    def check(self, actor_id: int) -> None:
        now = time.time()
        cutoff = now - self.window_seconds
        with self._lock:
            timestamps = self._requests.get(actor_id, [])
            timestamps = [t for t in timestamps if t > cutoff]
            if len(timestamps) >= self.max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Giới hạn tần suất giải mã bị vượt quá: tối đa {self.max_requests} "
                        f"lần trong {int(self.window_seconds)} giây. Vui lòng thử lại sau."
                    ),
                )
            timestamps.append(now)
            self._requests[actor_id] = timestamps

    def reset(self) -> None:
        """Reset history (mainly for test suites)."""
        with self._lock:
            self._requests.clear()


# Default singleton rate limiter initialized with settings
_rate_limiter: SlidingWindowRateLimiter | None = None


def get_vault_rate_limiter() -> SlidingWindowRateLimiter:
    global _rate_limiter
    if _rate_limiter is None:
        settings = get_settings()
        _rate_limiter = SlidingWindowRateLimiter(
            max_requests=settings.vault_rate_limit_per_minute,
            window_seconds=60.0,
        )
    return _rate_limiter


def get_vault_key(override: bytes | None = None, key_version: str | None = None) -> bytes:
    """Retrieve or derive 32-byte AES-256 key with key rotation support (§4.1, §9.5)."""
    if override is not None:
        if len(override) != 32:
            return hashlib.sha256(override).digest()
        return override

    settings = get_settings()
    k_ver = key_version or settings.vault_key_version
    if settings.vault_encryption_key:
        raw = settings.vault_encryption_key.strip()
        try:
            decoded = base64.b64decode(raw)
            if len(decoded) == 32:
                if k_ver and k_ver != "v1":
                    return hashlib.sha256(decoded + f":{k_ver}".encode()).digest()
                return decoded
        except Exception:
            pass
        if k_ver and k_ver != "v1":
            return hashlib.sha256(f"{raw}:{k_ver}".encode()).digest()
        return hashlib.sha256(raw.encode("utf-8")).digest()

    # Deterministic default key derived from hmac_secret + key_version
    if k_ver and k_ver != "v1":
        return hashlib.sha256(f"vault-aes256-key:{settings.hmac_secret}:{k_ver}".encode()).digest()
    return hashlib.sha256(f"vault-aes256-key:{settings.hmac_secret}".encode()).digest()


def get_blind_key(override: bytes | None = None) -> bytes:
    """Retrieve or derive 32-byte HMAC blind index key."""
    if override is not None:
        if len(override) != 32:
            return hashlib.sha256(override).digest()
        return override

    settings = get_settings()
    if settings.vault_blind_key:
        raw = settings.vault_blind_key.strip()
        try:
            decoded = base64.b64decode(raw)
            if len(decoded) == 32:
                return decoded
        except Exception:
            pass
        return hashlib.sha256(raw.encode("utf-8")).digest()

    return hashlib.sha256(f"vault-blind-key:{settings.hmac_secret}".encode()).digest()


def encrypt_aes_gcm(plaintext: str, key: bytes | None = None, key_version: str | None = None) -> str:
    """Encrypt UTF-8 plaintext using AES-256-GCM, returning base64(12-byte-nonce + ciphertext+tag)."""
    k = get_vault_key(key, key_version=key_version)
    aesgcm = AESGCM(k)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt_aes_gcm(ciphertext_b64: str, key: bytes | None = None, key_version: str | None = None) -> str:
    """Decrypt base64(12-byte-nonce + ciphertext+tag) using AES-256-GCM."""
    k = get_vault_key(key, key_version=key_version)
    raw = base64.b64decode(ciphertext_b64)
    if len(raw) < 12 + 16:
        raise ValueError("Invalid ciphertext length for AES-GCM")
    nonce = raw[:12]
    ct = raw[12:]
    aesgcm = AESGCM(k)
    plaintext_bytes = aesgcm.decrypt(nonce, ct, None)
    return plaintext_bytes.decode("utf-8")


def compute_blind_index(raw_value: str, blind_key: bytes | None = None) -> str:
    """Compute HMAC-SHA256 blind index for deterministic exact-match token lookups (§9.5)."""
    bk = get_blind_key(blind_key)
    return hmac.new(bk, raw_value.encode("utf-8"), hashlib.sha256).hexdigest()


def tokenize_value(
    db: Session,
    raw_value: str,
    entity_type: str = "PII",
    key_version: str | None = None,
) -> VaultToken:
    """Tokenize a raw PII value: store encrypted in vault, return existing or newly generated VaultToken."""
    settings = get_settings()
    k_ver = key_version or settings.vault_key_version
    blind_idx = compute_blind_index(raw_value)

    # Check for existing token with identical blind index and entity type
    existing = db.scalars(
        select(VaultToken).where(
            VaultToken.blind_index == blind_idx,
            VaultToken.entity_type == entity_type,
        )
    ).first()
    if existing is not None:
        return existing

    token_str = f"tok_{secrets.token_hex(16)}"
    enc_value = encrypt_aes_gcm(raw_value, key_version=k_ver)

    vault_token = VaultToken(
        token=token_str,
        encrypted_value=enc_value,
        blind_index=blind_idx,
        key_version=k_ver,
        entity_type=entity_type,
    )
    db.add(vault_token)
    db.commit()
    db.refresh(vault_token)
    return vault_token


def detokenize_value(
    db: Session,
    token: str,
    reason: str,
    actor: SessionUser,
) -> tuple[str, VaultToken]:
    """Controlled detokenization of a token by DPO with mandatory reason, rate limit, and audit logging."""
    clean_reason = reason.strip() if reason else ""
    if len(clean_reason) < 5:
        record_audit_event(
            db=db,
            actor=actor,
            action="DETOKENIZE_REJECTED",
            entity_type="VAULT_TOKEN",
            entity_id=token,
            reason=f"Lý do giải mã không hợp lệ: '{clean_reason}'",
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lý do giải mã bắt buộc và phải có ít nhất 5 ký tự (FR-13, §9.5).",
        )

    # Rate limiting
    limiter = get_vault_rate_limiter()
    try:
        limiter.check(actor.id)
    except HTTPException as exc:
        record_audit_event(
            db=db,
            actor=actor,
            action="DETOKENIZE_RATE_LIMIT_EXCEEDED",
            entity_type="VAULT_TOKEN",
            entity_id=token,
            reason=clean_reason,
        )
        db.commit()
        raise exc

    # Token lookup
    token_rec = db.scalars(select(VaultToken).where(VaultToken.token == token)).first()
    if token_rec is None:
        record_audit_event(
            db=db,
            actor=actor,
            action="DETOKENIZE_NOT_FOUND",
            entity_type="VAULT_TOKEN",
            entity_id=token,
            reason=clean_reason,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Token '{token}' không tồn tại trong Vault.",
        )

    try:
        raw_value = decrypt_aes_gcm(token_rec.encrypted_value, key_version=token_rec.key_version)
    except Exception:
        record_audit_event(
            db=db,
            actor=actor,
            action="DETOKENIZE_FAILED",
            entity_type="VAULT_TOKEN",
            entity_id=token,
            reason=f"{clean_reason} (Giải mã thất bại)",
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi nội bộ khi giải mã token trong Vault.",
        )

    # Record tamper-evident audit event
    record_audit_event(
        db=db,
        actor=actor,
        action="DETOKENIZE",
        entity_type="VAULT_TOKEN",
        entity_id=token,
        reason=clean_reason,
    )
    db.commit()

    return raw_value, token_rec
