"""User directory for DPO grant management — ids, usernames and roles only."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import require_dpo
from src.api.session_store import SessionUser
from src.db import models as db_models
from src.db.session import get_db
from src.models.schemas import UserOut, UserRole

router = APIRouter(tags=["users"])


@router.get("/users", response_model=list[UserOut])
def list_users(
    role: UserRole | None = Query(default=None, description="Lọc theo vai trò (DPO | ANALYST)"),
    _user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> list[UserOut]:
    """List users so the DPO can pick who receives a dataset grant (never returns passwords)."""
    stmt = select(db_models.DemoUser).order_by(db_models.DemoUser.username)
    if role is not None:
        stmt = stmt.where(db_models.DemoUser.role == role.value)
    return [UserOut(id=u.id, username=u.username, role=UserRole(u.role)) for u in db.scalars(stmt).all()]
