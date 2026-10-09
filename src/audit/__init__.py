"""Audit module package (§14.3, FR-11)."""

from src.audit.chain import (
    GENESIS_HASH,
    compute_entry_hash,
    record_audit_event,
    verify_audit_chain,
)

__all__ = [
    "GENESIS_HASH",
    "compute_entry_hash",
    "record_audit_event",
    "verify_audit_chain",
]
