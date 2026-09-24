"""In-memory opaque session tokens (demo auth)."""

from __future__ import annotations

import secrets
from dataclasses import dataclass


@dataclass(frozen=True)
class SessionUser:
    id: int
    username: str
    role: str


_token_store: dict[str, SessionUser] = {}


def create_session(user: SessionUser) -> str:
    token = secrets.token_urlsafe(32)
    _token_store[token] = user
    return token


def get_session_user(token: str) -> SessionUser | None:
    return _token_store.get(token)


def clear_sessions() -> None:
    """Clear all tokens (tests / shutdown)."""
    _token_store.clear()
