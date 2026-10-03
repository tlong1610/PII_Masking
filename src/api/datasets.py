"""Dataset publish / revoke / list / preview — role and status guardrails."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.api.deps import get_current_user, require_dpo
from src.api.session_store import SessionUser
from src.db import models as db_models
from src.db.session import get_db
from src.models.schemas import (
    DatasetOut,
    DatasetPreview,
    DatasetPreviewColumn,
    DatasetStatus,
    PolicyAction,
    RunStatus,
    UserRole,
)

router = APIRouter(tags=["datasets"])


def _write_audit(
    db: Session,
    *,
    actor: SessionUser,
    action: str,
    entity_type: str,
    entity_id: str,
    reason: str = "",
) -> None:
    db.add(
        db_models.AuditEvent(
            actor_id=actor.id,
            role=actor.role,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            reason=reason,
        )
    )


def _dataset_out(ds: db_models.Dataset) -> DatasetOut:
    return DatasetOut(
        id=ds.id,
        run_id=ds.run_id,
        dataset_name=ds.dataset_name,
        status=DatasetStatus(ds.status),
        output_location=ds.output_location,
    )


def _get_dataset(db: Session, dataset_id: int) -> db_models.Dataset | None:
    return db.scalar(
        select(db_models.Dataset)
        .where(db_models.Dataset.id == dataset_id)
        .options(
            selectinload(db_models.Dataset.run).selectinload(db_models.Run.field_profiles),
            selectinload(db_models.Dataset.run).selectinload(db_models.Run.field_decisions),
        )
    )


def _analyst_may_read(ds: db_models.Dataset) -> bool:
    return ds.status == DatasetStatus.PUBLISHED.value


def _preview_columns_from_run(run: db_models.Run) -> list[DatasetPreviewColumn]:
    decisions = {d.field_profile_id: d for d in run.field_decisions}
    columns: list[DatasetPreviewColumn] = []
    for profile in run.field_profiles:
        decision = decisions.get(profile.id)
        action = decision.action if decision else profile.recommended_action
        transform = "DROPPED" if action == PolicyAction.DROP.value else action
        columns.append(
            DatasetPreviewColumn(
                name=profile.field_path,
                source_path=profile.source_path,
                data_type="string" if action in (PolicyAction.MASK.value, PolicyAction.HMAC.value) else profile.data_type,
                transform=transform,
            )
        )
    return columns


def _preview_from_postgres_snapshot(
    *,
    output_location: str,
    columns: list[DatasetPreviewColumn],
) -> list[dict[str, Any]] | None:
    if not output_location.startswith("postgres://"):
        return None
    from psycopg import sql
    from psycopg.rows import dict_row

    from src.config import get_settings

    settings = get_settings()
    location = output_location.removeprefix("postgres://")
    schema, table_csv = location.split("/", 1)
    tables = [item for item in table_csv.split(",") if item]
    first_table = tables[0] if tables else None
    if not first_table:
        return []

    table_columns = [
        column.name
        for column in columns
        if column.source_path == first_table and column.transform != "DROPPED"
    ]
    if not table_columns:
        return []

    with __import__("psycopg").connect(
        settings.snapshot_database_url,
        row_factory=dict_row,
    ) as conn:
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL("SELECT {} FROM {} LIMIT 1").format(
                    sql.SQL(", ").join(sql.Identifier(column) for column in table_columns),
                    sql.Identifier(schema, first_table),
                )
            )
            row = cur.fetchone()
    return [dict(row)] if row else []


@router.get("/datasets", response_model=list[DatasetOut])
def list_datasets(
    user: SessionUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DatasetOut]:
    """DPO sees non-failed datasets; Analyst only PUBLISHED."""
    rows = db.scalars(select(db_models.Dataset).order_by(db_models.Dataset.id)).all()
    if user.role == UserRole.ANALYST.value:
        rows = [r for r in rows if r.status == DatasetStatus.PUBLISHED.value]
    else:
        # DPO: hide nothing critical except do not pretend FAILED is usable for Analyst
        rows = [r for r in rows if r.status != DatasetStatus.FAILED.value]
    return [_dataset_out(r) for r in rows]


@router.post("/datasets/{dataset_id}/publish", response_model=DatasetOut)
def publish_dataset(
    dataset_id: int,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> DatasetOut:
    ds = _get_dataset(db, dataset_id)
    if ds is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if ds.status != DatasetStatus.VERIFIED.value:
        raise HTTPException(
            status_code=422,
            detail=f"Publish blocked: dataset must be VERIFIED (current={ds.status})",
        )

    ds.status = DatasetStatus.PUBLISHED.value
    ds.published_at = datetime.now(UTC)
    if ds.run is not None:
        ds.run.status = RunStatus.PUBLISHED.value
    if ds.output_location.startswith("staging://"):
        ds.output_location = f"published://run/{ds.run_id}/snapshot"
    _write_audit(
        db,
        actor=user,
        action="publish_dataset",
        entity_type="dataset",
        entity_id=str(ds.id),
    )
    db.commit()
    db.refresh(ds)
    return _dataset_out(ds)


@router.post("/datasets/{dataset_id}/revoke", response_model=DatasetOut)
def revoke_dataset(
    dataset_id: int,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> DatasetOut:
    ds = _get_dataset(db, dataset_id)
    if ds is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if ds.status not in (DatasetStatus.PUBLISHED.value, DatasetStatus.VERIFIED.value):
        raise HTTPException(
            status_code=422,
            detail=f"Revoke blocked: cannot revoke status {ds.status}",
        )

    ds.status = DatasetStatus.REVOKED.value
    ds.revoked_at = datetime.now(UTC)
    if ds.run is not None:
        ds.run.status = RunStatus.REVOKED.value
    _write_audit(
        db,
        actor=user,
        action="revoke_dataset",
        entity_type="dataset",
        entity_id=str(ds.id),
    )
    db.commit()
    db.refresh(ds)
    return _dataset_out(ds)


@router.get("/datasets/{dataset_id}/preview", response_model=DatasetPreview)
def preview_dataset(
    dataset_id: int,
    user: SessionUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DatasetPreview:
    """Return processed output shape only — never raw source values or samples."""
    ds = _get_dataset(db, dataset_id)
    if ds is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if user.role == UserRole.ANALYST.value and not _analyst_may_read(ds):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analyst may only preview PUBLISHED datasets",
        )
    if ds.status in (DatasetStatus.STAGING.value, DatasetStatus.FAILED.value):
        raise HTTPException(
            status_code=403,
            detail="Staging/FAILED datasets are not available for preview",
        )
    if ds.status == DatasetStatus.REVOKED.value:
        raise HTTPException(status_code=403, detail="Dataset has been revoked")

    run = ds.run
    columns: list[DatasetPreviewColumn] = []
    rows: list[dict[str, Any]] = []
    if run is not None:
        columns = _preview_columns_from_run(run)
        snapshot_rows = _preview_from_postgres_snapshot(
            output_location=ds.output_location,
            columns=columns,
        )
        if snapshot_rows is not None:
            rows = snapshot_rows
        else:
            fallback_row: dict[str, Any] = {}
            for column in columns:
                if column.transform == "DROPPED":
                    continue
                if column.transform == PolicyAction.MASK.value:
                    fallback_row[column.name] = "[REDACTED]"
                elif column.transform == PolicyAction.HMAC.value:
                    fallback_row[column.name] = f"hmac_stub_{column.name}"
                else:
                    fallback_row[column.name] = f"<{column.data_type}>"
            rows = [fallback_row] if fallback_row else []

    return DatasetPreview(
        dataset_id=ds.id,
        dataset_name=ds.dataset_name,
        status=DatasetStatus(ds.status),
        columns=columns,
        rows=rows,
    )
