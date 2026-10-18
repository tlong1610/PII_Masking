"""Analyst read-only SQL login to their published datasets (see src/services/analyst_sql.py)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import get_current_user
from src.api.session_store import SessionUser
from src.db import models as db_models
from src.db.session import get_db
from src.models.schemas import DatasetStatus, SqlAccessDataset, SqlAccessOut, UserRole
from src.services import analyst_sql

logger = logging.getLogger(__name__)

router = APIRouter(tags=["sql-access"])


def readable_pg_datasets(db: Session, user_id: int) -> list[db_models.Dataset]:
    """Published, granted datasets of this Analyst that live in the Postgres snapshot store."""
    rows = db.scalars(
        select(db_models.Dataset)
        .join(db_models.DatasetGrant, db_models.DatasetGrant.dataset_id == db_models.Dataset.id)
        .where(
            db_models.DatasetGrant.user_id == user_id,
            db_models.Dataset.status == DatasetStatus.PUBLISHED.value,
        )
        .order_by(db_models.Dataset.id)
    ).all()
    return [ds for ds in rows if analyst_sql.snapshot_location(ds.output_location or "")]


def prepare_views(conn, db: Session, user_id: int) -> list[db_models.Dataset]:
    """Views exist for every dataset the Analyst may read; returns those whose snapshot is still there."""
    ready = []
    for ds in readable_pg_datasets(db, user_id):
        schema, tables = analyst_sql.snapshot_location(ds.output_location or "") or ("", [])
        if analyst_sql.publish_views(conn, ds.id, schema, tables):
            ready.append(ds)
    return ready


def sync_analyst(conn, db: Session, user_id: int) -> list[db_models.Dataset]:
    """Prepare the views, then make the Analyst's role (if any) read exactly those."""
    ready = prepare_views(conn, db, user_id)
    analyst_sql.sync_role(conn, user_id, [ds.id for ds in ready])
    return ready


def _require_analyst(user: SessionUser) -> None:
    if user.role != UserRole.ANALYST.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Analyst role required")


def _out(
    user_id: int, ready: list[db_models.Dataset], *, has_credentials: bool, password: str | None = None
) -> SqlAccessOut:
    info = analyst_sql.connection_info()
    datasets = []
    for ds in ready:
        _, tables = analyst_sql.snapshot_location(ds.output_location or "") or ("", [])
        datasets.append(
            SqlAccessDataset(
                dataset_id=ds.id,
                dataset_name=ds.dataset_name,
                schema_name=analyst_sql.dataset_schema(ds.id),
                tables=tables,
            )
        )
    return SqlAccessOut(
        enabled=True,
        has_credentials=has_credentials,
        host=info.host,
        port=info.port,
        database=info.database,
        username=analyst_sql.role_name(user_id),
        sslmode=info.sslmode,
        password=password,
        datasets=datasets,
    )


def _store_unreachable(exc: Exception) -> HTTPException:
    logger.warning("Analyst SQL store unreachable: %s", type(exc).__name__)
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Không kết nối được kho dữ liệu đã bảo vệ ({type(exc).__name__}).",
    )


@router.get("/sql-access", response_model=SqlAccessOut)
def get_sql_access(
    user: SessionUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SqlAccessOut:
    _require_analyst(user)
    if not analyst_sql.enabled():
        return SqlAccessOut(enabled=False)
    try:
        with analyst_sql.connect() as conn:
            has_role = analyst_sql.role_exists(conn, user.id)
            ready = sync_analyst(conn, db, user.id)
    except Exception as exc:
        raise _store_unreachable(exc) from exc
    return _out(user.id, ready, has_credentials=has_role)


@router.post("/sql-access/credentials", response_model=SqlAccessOut)
def issue_sql_credentials(
    user: SessionUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SqlAccessOut:
    """New password (creates the login on first use). Shown once; Postgres keeps only its hash."""
    _require_analyst(user)
    if not analyst_sql.enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SQL access is not enabled")
    try:
        with analyst_sql.connect() as conn:
            password = analyst_sql.issue_password(conn, user.id)
            ready = sync_analyst(conn, db, user.id)
    except Exception as exc:
        raise _store_unreachable(exc) from exc

    from src.api.datasets import _write_audit

    _write_audit(
        db,
        actor=user,
        action="issue_sql_credentials",
        entity_type="user",
        entity_id=str(user.id),
        reason=f"role={analyst_sql.role_name(user.id)}",
    )
    db.commit()
    return _out(user.id, ready, has_credentials=True, password=password)
