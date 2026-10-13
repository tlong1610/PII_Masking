"""Audit Log API router with hash-chain verification (FR-11, §14.3)."""

from __future__ import annotations

from collections.abc import Sequence

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import require_analyst_or_dpo, require_dpo
from src.api.session_store import SessionUser
from src.audit.chain import verify_audit_chain
from src.db import models as db_models
from src.db.session import get_db
from src.models.schemas import AuditEventOut, AuditVerifyResponse

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditEventOut])
def get_audit_logs(
    actor_id: int | None = Query(None, description="Lọc theo ID người dùng"),
    action: str | None = Query(None, description="Lọc theo hành động"),
    entity_type: str | None = Query(None, description="Lọc theo loại thực thể (run, dataset, source)"),
    entity_id: str | None = Query(None, description="Lọc theo ID thực thể (kết hợp với entity_type)"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> list[AuditEventOut]:
    """Retrieve system-wide audit log events (DPO only §14.2)."""
    stmt = select(db_models.AuditEvent).order_by(db_models.AuditEvent.id.desc())
    if actor_id is not None:
        stmt = stmt.where(db_models.AuditEvent.actor_id == actor_id)
    if action is not None:
        stmt = stmt.where(db_models.AuditEvent.action == action)
    if entity_type is not None:
        stmt = stmt.where(db_models.AuditEvent.entity_type == entity_type)
    if entity_id is not None:
        stmt = stmt.where(db_models.AuditEvent.entity_id == entity_id)

    stmt = stmt.offset(offset).limit(limit)
    rows = db.scalars(stmt).all()
    return _with_usernames(db, rows)


def _with_usernames(db: Session, rows: Sequence[db_models.AuditEvent]) -> list[AuditEventOut]:
    actor_ids = {r.actor_id for r in rows}
    usernames: dict[int, str] = {}
    if actor_ids:
        usernames = dict(
            db.execute(
                select(db_models.DemoUser.id, db_models.DemoUser.username).where(
                    db_models.DemoUser.id.in_(actor_ids)
                )
            ).all()
        )
    return [
        AuditEventOut.model_validate(r).model_copy(update={"actor_username": usernames.get(r.actor_id)})
        for r in rows
    ]


@router.get("/my", response_model=list[AuditEventOut])
def get_my_audit_logs(
    action: str | None = Query(None, description="Lọc theo hành động"),
    entity_type: str | None = Query(None, description="Lọc theo loại thực thể (run, dataset, source)"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: SessionUser = Depends(require_analyst_or_dpo),
    db: Session = Depends(get_db),
) -> list[AuditEventOut]:
    """Self-audit trail: users (Analyst or DPO) can inspect only their own recorded actions (§3)."""
    stmt = (
        select(db_models.AuditEvent)
        .where(db_models.AuditEvent.actor_id == user.id)
        .order_by(db_models.AuditEvent.id.desc())
    )
    if action is not None:
        stmt = stmt.where(db_models.AuditEvent.action == action)
    if entity_type is not None:
        stmt = stmt.where(db_models.AuditEvent.entity_type == entity_type)

    stmt = stmt.offset(offset).limit(limit)
    rows = db.scalars(stmt).all()
    return _with_usernames(db, rows)


@router.get("/verify", response_model=AuditVerifyResponse)
def verify_audit_log_chain(
    _user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> AuditVerifyResponse:
    """Cryptographically verify the tamper-evident hash chain across all audit events."""
    result = verify_audit_chain(db)
    return AuditVerifyResponse(
        valid=result["valid"],
        total_events=result["total_events"],
        head_hash=result.get("head_hash"),
        broken_at_id=result.get("broken_at_id"),
        error=result.get("error"),
    )
