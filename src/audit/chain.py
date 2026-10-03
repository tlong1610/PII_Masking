"""Audit Log Hash-Chain Service (§14.3, FR-11).

Provides tamper-evident cryptographic hash chaining for audit logs:
    entry_hash = SHA256(prev_hash : canonical_json)

Guarantees detection of unauthorized insertions, modifications, or deletions
in the audit log table.
"""

from __future__ import annotations

import hashlib
import json
import threading
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db.models import AuditEvent

GENESIS_HASH = "0" * 64
_audit_lock = threading.Lock()


def format_canonical_timestamp(dt: datetime | None) -> str:
    """Format datetime deterministically in UTC without microsecond/timezone drift."""
    if dt is None:
        return ""
    if dt.tzinfo is not None:
        dt = dt.astimezone(UTC)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def compute_entry_hash(
    *,
    prev_hash: str,
    actor_id: int,
    role: str,
    action: str,
    entity_type: str,
    entity_id: str,
    reason: str,
    timestamp_str: str,
    request_id: str = "",
    client_ip: str = "",
) -> str:
    """Compute deterministic SHA-256 entry hash over canonical JSON and previous hash."""
    payload: dict[str, Any] = {
        "action": action,
        "actor_id": actor_id,
        "entity_id": str(entity_id),
        "entity_type": entity_type,
        "reason": reason,
        "role": role,
        "timestamp": timestamp_str,
    }
    if request_id:
        payload["request_id"] = request_id
    if client_ip:
        payload["client_ip"] = client_ip

    canonical_payload = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
    )
    raw_to_hash = f"{prev_hash}:{canonical_payload}".encode()
    return hashlib.sha256(raw_to_hash).hexdigest()


def record_audit_event(
    db: Session,
    *,
    actor: Any,
    action: str,
    entity_type: str,
    entity_id: str,
    reason: str = "",
    request_id: str | None = None,
    client_ip: str | None = None,
) -> AuditEvent:
    """Append a new tamper-evident chained audit event to the database with serialization lock."""
    with _audit_lock:
        # Flush session so any previously added AuditEvent in the same transaction
        # receives an ID and is visible in the session query
        try:
            db.flush()
        except Exception:
            pass

        # Find latest event to chain from
        latest = db.scalars(select(AuditEvent).order_by(AuditEvent.id.desc())).first()
        prev_hash = latest.entry_hash if (latest and latest.entry_hash) else GENESIS_HASH

        now = datetime.now(UTC)
        t_str = format_canonical_timestamp(now)
        req_id_str = str(request_id or "")
        client_ip_str = str(client_ip or "")
        entry_hash = compute_entry_hash(
            prev_hash=prev_hash,
            actor_id=actor.id,
            role=actor.role,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            reason=reason,
            timestamp_str=t_str,
            request_id=req_id_str,
            client_ip=client_ip_str,
        )

        event = AuditEvent(
            actor_id=actor.id,
            role=actor.role,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            reason=reason,
            created_at=now,
            prev_hash=prev_hash,
            entry_hash=entry_hash,
            request_id=request_id,
            client_ip=client_ip,
        )
        db.add(event)
        try:
            db.flush()
        except Exception:
            pass
        return event


def verify_audit_chain(db: Session) -> dict[str, Any]:
    """Verify the entire audit trail hash chain integrity from beginning to head.

    Returns:
        dict with valid status, total_events verified, head_hash, and any broken_at_id.
    """
    events = db.scalars(select(AuditEvent).order_by(AuditEvent.id.asc())).all()
    if not events:
        return {
            "valid": True,
            "total_events": 0,
            "head_hash": GENESIS_HASH,
            "broken_at_id": None,
            "error": None,
        }

    expected_prev = GENESIS_HASH
    for event in events:
        if not event.entry_hash:
            return {
                "valid": False,
                "total_events": len(events),
                "broken_at_id": event.id,
                "error": f"Missing entry_hash at ID {event.id}",
                "head_hash": None,
            }

        if event.prev_hash != expected_prev:
            return {
                "valid": False,
                "total_events": len(events),
                "broken_at_id": event.id,
                "error": f"Broken chain link: prev_hash {event.prev_hash} != expected {expected_prev} at ID {event.id}",
                "head_hash": None,
            }

        t_str = format_canonical_timestamp(event.created_at)
        recomputed = compute_entry_hash(
            prev_hash=event.prev_hash,
            actor_id=event.actor_id,
            role=event.role,
            action=event.action,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            reason=event.reason,
            timestamp_str=t_str,
            request_id=getattr(event, "request_id", "") or "",
            client_ip=getattr(event, "client_ip", "") or "",
        )

        if recomputed != event.entry_hash:
            return {
                "valid": False,
                "total_events": len(events),
                "broken_at_id": event.id,
                "error": f"Tampered record payload: entry_hash mismatch at ID {event.id}",
                "head_hash": None,
            }

        expected_prev = event.entry_hash

    return {
        "valid": True,
        "total_events": len(events),
        "head_hash": expected_prev,
        "broken_at_id": None,
        "error": None,
    }
