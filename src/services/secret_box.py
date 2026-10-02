"""Fernet encryption for user-supplied connection strings (never stored or logged in plaintext)."""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from src.config import get_settings


class SecretBoxError(RuntimeError):
    """Encryption is unavailable or the ciphertext cannot be decrypted. Message never carries secrets."""


def _fernet() -> Fernet:
    key = get_settings().source_encryption_key.strip()
    if not key:
        raise SecretBoxError("SOURCE_ENCRYPTION_KEY is not configured")
    try:
        return Fernet(key.encode())
    except (ValueError, TypeError) as exc:
        raise SecretBoxError("SOURCE_ENCRYPTION_KEY is not a valid Fernet key") from exc


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        raise SecretBoxError("Stored source URL cannot be decrypted (key changed?)") from None
