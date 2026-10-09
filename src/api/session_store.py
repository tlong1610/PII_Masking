"""In-memory opaque session tokens with TTL expiration and logout support (§4.1, §14.2)."""

from __future__ import annotations

import secrets
import time
from dataclasses import dataclass


@dataclass(frozen=True)
class SessionUser:
    id: int
    username: str
    role: str


@dataclass(frozen=True)
class SessionRecord:
    user: SessionUser
    expires_at: float


DEFAULT_TTL_SECONDS = 86400  # 24 hours
_token_store: dict[str, SessionRecord] = {}


def create_session(user: SessionUser, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> str:
    """Create a new session token with TTL expiration."""
    token = secrets.token_urlsafe(32)
    _token_store[token] = SessionRecord(user=user, expires_at=time.time() + ttl_seconds)
    return token


def get_session_user(token: str) -> SessionUser | None:
    """Retrieve session user, enforcing expiration check."""
    record = _token_store.get(token)
    if record is None:
        return None
    if time.time() > record.expires_at:
        _token_store.pop(token, None)
        return None
    return record.user


def invalidate_session(token: str) -> bool:
    """Invalidate / revoke a specific token (logout)."""
    return _token_store.pop(token, None) is not None


def clear_sessions() -> None:
    """Clear all tokens (tests / shutdown)."""
    _token_store.clear()
