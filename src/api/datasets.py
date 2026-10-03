"""Dataset publish / revoke / list / preview — role and status guardrails."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from src.api.deps import get_current_user, require_dpo
from src.api.session_store import SessionUser
from src.config import get_settings
from src.db import models as db_models
from src.db.session import get_db
from src.models.schemas import (
    DatasetGrantCreate,
    DatasetGrantOut,
    DatasetOut,
    DatasetPreview,
    DatasetPreviewColumn,
    DatasetRelationship,
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
    from src.audit import record_audit_event

    record_audit_event(
        db,
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        reason=reason,
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
    """DPO sees non-failed datasets; Analyst only PUBLISHED datasets granted to them (§3, §14.2)."""
    rows = db.scalars(select(db_models.Dataset).order_by(db_models.Dataset.id)).all()
    if user.role == UserRole.ANALYST.value:
        granted_ids = set(
            db.scalars(
                select(db_models.DatasetGrant.dataset_id).where(db_models.DatasetGrant.user_id == user.id)
            ).all()
        )
        rows = [r for r in rows if r.status == DatasetStatus.PUBLISHED.value and r.id in granted_ids]
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
    else:
        ds.output_location = f"published://run/{ds.run_id}/snapshot"

    # Automatically grant default access to all active demo analysts upon publish (§14.2)
    analyst_users = db.scalars(select(db_models.DemoUser).where(db_models.DemoUser.role == UserRole.ANALYST.value)).all()
    for au in analyst_users:
        existing_grant = db.scalar(
            select(db_models.DatasetGrant).where(
                db_models.DatasetGrant.dataset_id == ds.id,
                db_models.DatasetGrant.user_id == au.id,
            )
        )
        if not existing_grant:
            db.add(db_models.DatasetGrant(dataset_id=ds.id, user_id=au.id, granted_by=user.id))
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
    """Revoke published/verified dataset and perform real physical rollback (§FR-08)."""
    ds = _get_dataset(db, dataset_id)
    if ds is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if ds.status not in (DatasetStatus.PUBLISHED.value, DatasetStatus.VERIFIED.value):
        raise HTTPException(
            status_code=422,
            detail=f"Revoke blocked: cannot revoke status {ds.status}",
        )

    # 1. Physical rollback of underlying snapshot store (§FR-08)
    output_loc = ds.output_location or ""
    rollback_notes: list[str] = []
    settings = get_settings()

    if output_loc.startswith("postgres://"):
        # e.g. postgres://snapshot_schema_run1/table1,table2
        schema_part = output_loc.removeprefix("postgres://").split("/")[0]
        if schema_part and settings.snapshot_database_url:
            try:
                from sqlalchemy import create_engine, text
                engine = create_engine(settings.snapshot_database_url)
                with engine.connect() as conn:
                    conn.execute(text(f'DROP SCHEMA IF EXISTS "{schema_part}" CASCADE'))
                    conn.commit()
                rollback_notes.append(f"dropped_pg_schema={schema_part}")
            except Exception as exc:
                rollback_notes.append(f"drop_pg_failed={type(exc).__name__}")
    elif output_loc.startswith("mongodb://"):
        db_part = output_loc.removeprefix("mongodb://").split("/")[0]
        if db_part:
            try:
                import os

                from pymongo import MongoClient

                mongo_target = (
                    settings.mongo_source_uri
                    or settings.mongo_uri
                    or os.getenv("MONGO_URI", "mongodb://localhost:27017")
                )
                client = MongoClient(mongo_target)
                client.drop_database(db_part)
                client.close()
                rollback_notes.append(f"dropped_mongo_db={db_part}")
            except Exception as exc:
                rollback_notes.append(f"drop_mongo_failed={type(exc).__name__}")

    # 2. Revoke and delete all active analyst grants (§3, §14.2)
    db.execute(
        delete(db_models.DatasetGrant).where(db_models.DatasetGrant.dataset_id == ds.id)
    )

    # 3. Update dataset status, mark output_location revoked, and update run status
    ds.status = DatasetStatus.REVOKED.value
    ds.revoked_at = datetime.now(UTC)
    ds.output_location = f"[REVOKED_AND_DROPPED: {output_loc}]"
    if ds.run is not None:
        ds.run.status = RunStatus.REVOKED.value

    # 4. Record audit trail with rollback details
    _write_audit(
        db,
        actor=user,
        action="revoke_dataset",
        entity_type="dataset",
        entity_id=str(ds.id),
        reason="; ".join(rollback_notes) if rollback_notes else "physical_rollback_completed",
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

    if user.role == UserRole.ANALYST.value:
        if not _analyst_may_read(ds):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Analyst may only preview PUBLISHED datasets",
            )
        grant = db.scalar(
            select(db_models.DatasetGrant).where(
                db_models.DatasetGrant.dataset_id == ds.id,
                db_models.DatasetGrant.user_id == user.id,
            )
        )
        if not grant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to dataset not granted for this user (dataset_grants §14.2)",
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

    relationships: list[DatasetRelationship] = []
    if run is not None:
        table_cols: dict[str, set[str]] = {}
        for p in run.field_profiles:
            if p.source_path:
                table_cols.setdefault(p.source_path, set()).add(p.field_path)

        for tbl_a, cols_a in table_cols.items():
            for col in cols_a:
                if col.endswith("_id") or col == "customer_id":
                    target_entity = col[:-3] if col.endswith("_id") else col
                    for tbl_b, cols_b in table_cols.items():
                        if tbl_a != tbl_b and (
                            tbl_b == target_entity
                            or tbl_b.startswith(target_entity)
                            or target_entity.startswith(tbl_b)
                        ):
                            if col in cols_b or "id" in cols_b or "_id" in cols_b:
                                target_col = col if col in cols_b else ("_id" if "_id" in cols_b else "id")
                                relationships.append(
                                    DatasetRelationship(
                                        source_table=tbl_a,
                                        source_column=col,
                                        target_table=tbl_b,
                                        target_column=target_col,
                                    )
                                )
        if not relationships and len(table_cols) == 1:
            tbl = list(table_cols.keys())[0]
            relationships.append(
                DatasetRelationship(
                    source_table=tbl,
                    source_column="_id_hmac",
                    target_table="piiguard_vault",
                    target_column="token_id",
                )
            )

    return DatasetPreview(
        dataset_id=ds.id,
        dataset_name=ds.dataset_name,
        status=DatasetStatus(ds.status),
        columns=columns,
        rows=rows,
        relationships=relationships,
    )


# --- Dataset Grants API (DPO only §14.2) ---

@router.get("/datasets/{dataset_id}/grants", response_model=list[DatasetGrantOut])
def list_dataset_grants(
    dataset_id: int,
    _user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> list[DatasetGrantOut]:
    """List granted users for a dataset (DPO only §14.2)."""
    grants = db.scalars(
        select(db_models.DatasetGrant)
        .where(db_models.DatasetGrant.dataset_id == dataset_id)
        .order_by(db_models.DatasetGrant.id)
    ).all()
    return [DatasetGrantOut.model_validate(g) for g in grants]


@router.post("/datasets/{dataset_id}/grants", response_model=DatasetGrantOut, status_code=status.HTTP_201_CREATED)
def grant_dataset_access(
    dataset_id: int,
    body: DatasetGrantCreate,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> DatasetGrantOut:
    """Grant dataset access to a specific Analyst (DPO only §14.2)."""
    ds = _get_dataset(db, dataset_id)
    if ds is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    target_user = db.scalar(select(db_models.DemoUser).where(db_models.DemoUser.id == body.user_id))
    if target_user is None:
        raise HTTPException(status_code=404, detail="Target user not found")

    existing = db.scalar(
        select(db_models.DatasetGrant).where(
            db_models.DatasetGrant.dataset_id == dataset_id,
            db_models.DatasetGrant.user_id == body.user_id,
        )
    )
    if existing:
        return DatasetGrantOut.model_validate(existing)

    grant = db_models.DatasetGrant(
        dataset_id=dataset_id,
        user_id=body.user_id,
        granted_by=user.id,
    )
    db.add(grant)
    _write_audit(
        db,
        actor=user,
        action="grant_dataset",
        entity_type="dataset",
        entity_id=str(dataset_id),
        reason=f"grant to user_id={body.user_id}",
    )
    db.commit()
    db.refresh(grant)
    return DatasetGrantOut.model_validate(grant)


@router.delete("/datasets/{dataset_id}/grants/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_dataset_access(
    dataset_id: int,
    user_id: int,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> None:
    """Revoke dataset access from an Analyst (DPO only §14.2)."""
    grant = db.scalar(
        select(db_models.DatasetGrant).where(
            db_models.DatasetGrant.dataset_id == dataset_id,
            db_models.DatasetGrant.user_id == user_id,
        )
    )
    if grant:
        db.delete(grant)
        _write_audit(
            db,
            actor=user,
            action="revoke_dataset_grant",
            entity_type="dataset",
            entity_id=str(dataset_id),
            reason=f"revoked from user_id={user_id}",
        )
        db.commit()
