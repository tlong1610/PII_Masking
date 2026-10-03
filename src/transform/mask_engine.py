"""Apply MASK / DROP / HMAC / TOKENIZE / PARTIAL / GENERALIZE / REDACT / NULLIFY / KEEP to row values — no raw PII logging."""

from __future__ import annotations

import hashlib
from typing import Any

from src.transform.hmac_hasher import hash_value

MASK_PLACEHOLDER = "***"


def partial_mask(value: Any) -> Any:
    """Partially mask value while preserving contextual shape (e.g. j***@example.com, 091***789)."""
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return s
    if "@" in s:
        parts = s.split("@", 1)
        u = parts[0]
        domain = parts[1]
        if len(u) <= 1:
            u_masked = u + "***"
        else:
            u_masked = u[0] + "***" + (u[-1] if len(u) > 2 else "")
        return f"{u_masked}@{domain}"
    if s.isdigit():
        if len(s) >= 9:
            return f"{s[:3]}***{s[-3:]}"
        elif len(s) >= 4:
            return f"{s[:2]}***{s[-2:]}"
        return "***"
    if len(s) <= 4:
        return "***"
    return f"{s[:2]}***{s[-2:]}"


def generalize_value(value: Any) -> Any:
    """Generalize / bucketize values (e.g. date to YYYY, numbers to intervals)."""
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return s
    # Date / timestamp e.g. YYYY-MM-DD
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        return f"{s[:4]}-01-01"
    # Pure numeric
    try:
        n = float(s)
        if 0 < n < 120 and "." not in s:  # Age
            bin_start = int(n // 10) * 10
            return f"{bin_start}-{bin_start + 9}"
        if n >= 1000000:
            return f"{int(n // 1000000)}M-{int(n // 1000000 + 1)}M"
        if n >= 1000:
            return f"{int(n // 1000)}k-{int(n // 1000 + 1)}k"
    except (ValueError, TypeError):
        pass
    # Address with commas
    if "," in s:
        return s.split(",")[-1].strip()
    return s[: len(s) // 2] + "..." if len(s) > 6 else s


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
    if action_u == "NULLIFY":
        return True, None
    if action_u == "REDACT":
        if value is None:
            return True, None
        return True, "[REDACTED]"
    if action_u == "MASK":
        if value is None:
            return True, None
        return True, MASK_PLACEHOLDER
    if action_u == "PARTIAL":
        return True, partial_mask(value)
    if action_u == "GENERALIZE":
        return True, generalize_value(value)
    if action_u == "HMAC":
        return True, hash_value(value, secret=secret, key_version=key_version)
    if action_u == "TOKENIZE":
        if value is None:
            return True, None
        try:
            from src.db.session import get_session_factory
            from src.vault.service import tokenize_value

            session_factory = get_session_factory()
            with session_factory() as db:
                tok_rec = tokenize_value(db, str(value), entity_type="PII")
                return True, tok_rec.token
        except Exception:
            tok = f"tok_{hashlib.sha256(f'{secret}:{value}'.encode()).hexdigest()[:16]}"
            return True, tok
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

