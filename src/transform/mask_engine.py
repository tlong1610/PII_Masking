"""Apply MASK / DROP / HMAC / KEEP to row values — no raw PII logging."""

from __future__ import annotations

from typing import Any

from src.transform.hmac_hasher import hash_value

MASK_PLACEHOLDER = "***"


def apply_action(
    value: Any,
    action: str,
    *,
    secret: str,
    key_version: str,
) -> tuple[bool, Any]:
    """Return (keep_column, new_value). DROP => keep_column False."""
    action_u = (action or "").upper()
    if action_u == "DROP":
        return False, None
    if action_u == "MASK":
        if value is None:
            return True, None
        return True, MASK_PLACEHOLDER
    if action_u == "HMAC":
        return True, hash_value(value, secret=secret, key_version=key_version)
    # KEEP and unknown treated as KEEP
    return True, value


def transform_row(
    row: dict[str, Any],
    column_actions: dict[str, str],
    *,
    secret: str,
    key_version: str,
) -> dict[str, Any]:
    """Transform one row. Columns not listed in column_actions are kept."""
    out: dict[str, Any] = {}
    for col, value in row.items():
        action = column_actions.get(col, "KEEP")
        keep, new_val = apply_action(value, action, secret=secret, key_version=key_version)
        if keep:
            out[col] = new_val
    return out


def transform_rows(
    rows: list[dict[str, Any]],
    column_actions: dict[str, str],
    *,
    secret: str,
    key_version: str,
) -> list[dict[str, Any]]:
    return [
        transform_row(r, column_actions, secret=secret, key_version=key_version) for r in rows
    ]


def filter_columns(columns: list[str], column_actions: dict[str, str]) -> list[str]:
    """Columns present after DROP."""
    return [c for c in columns if column_actions.get(c, "KEEP").upper() != "DROP"]
