"""Dataset publish / revoke / list / preview — role and status guardrails."""

from __future__ import annotations

import csv
import io
import re
import unicodedata
import zipfile
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from src.api.deps import get_current_user, require_dpo
from src.api.session_store import SessionUser
from src.config import get_settings
from src.db import models as db_models
from src.db.session import get_db
from src.models.schemas import (
    DatasetDetailOut,
    DatasetGrantCreate,
    DatasetGrantOut,
    DatasetOut,
    DatasetPreview,
    DatasetPreviewColumn,
    DatasetRelationship,
    DatasetRename,
    DatasetStatus,
    DatasetVerification,
    PolicyAction,
    RunStatus,
    UserRole,
    VerifierResultOut,
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


def _dataset_fields(ds: db_models.Dataset, grant_count: int | None = None) -> dict[str, Any]:
    run = ds.run
    return {
        "id": ds.id,
        "run_id": ds.run_id,
        "dataset_name": ds.dataset_name,
        "status": DatasetStatus(ds.status),
        "output_location": ds.output_location,
        "created_at": ds.created_at,
        "published_at": ds.published_at,
        "revoked_at": ds.revoked_at,
        "source_id": run.source_id if run is not None else None,
        "source_name": run.source_name if run is not None else None,
        "engine": run.engine if run is not None else None,
        "grant_count": grant_count,
    }


def _dataset_out(ds: db_models.Dataset, grant_count: int | None = None) -> DatasetOut:
    return DatasetOut(**_dataset_fields(ds, grant_count))


def _grant_counts(db: Session, dataset_ids: list[int]) -> dict[int, int]:
    if not dataset_ids:
        return {}
    rows = db.execute(
        select(db_models.DatasetGrant.dataset_id, func.count(db_models.DatasetGrant.id))
        .where(db_models.DatasetGrant.dataset_id.in_(dataset_ids))
        .group_by(db_models.DatasetGrant.dataset_id)
    ).all()
    return {dataset_id: count for dataset_id, count in rows}


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


PREVIEW_DEFAULT_LIMIT = 20
PREVIEW_MAX_LIMIT = 200


def _snapshot_tables(output_location: str, columns: list[DatasetPreviewColumn]) -> list[str]:
    """Tables/collections physically written to the snapshot, else the profiled ones (demo stub)."""
    for prefix in ("postgres://", "mongodb://"):
        if output_location.startswith(prefix):
            _, _, table_csv = output_location.removeprefix(prefix).partition("/")
            return [item for item in table_csv.split(",") if item]
    seen: list[str] = []
    for column in columns:
        if column.source_path and column.source_path not in seen:
            seen.append(column.source_path)
    return seen


def _visible_columns(columns: list[DatasetPreviewColumn], table: str) -> list[str]:
    return [c.name for c in columns if c.source_path == table and c.transform != "DROPPED"]


def _preview_value(value: Any) -> str | int | float | bool | None:
    """Snapshot values are already protected; stringify anything non-JSON (ObjectId, datetime...)."""
    if value is None or isinstance(value, str | int | float | bool):
        return value
    return str(value)


def _preview_from_postgres_snapshot(
    *, schema: str, table: str, table_columns: list[str], limit: int | None
) -> list[dict]:
    """``limit=None`` reads the whole table (export); preview always passes a limit."""
    from psycopg import connect, sql
    from psycopg.rows import dict_row

    settings = get_settings()
    with connect(settings.snapshot_database_url, row_factory=dict_row) as conn, conn.cursor() as cur:
        cur.execute(
            sql.SQL("SELECT {} FROM {} LIMIT %s").format(
                sql.SQL(", ").join(sql.Identifier(column) for column in table_columns),
                sql.Identifier(schema, table),
            ),
            (limit,),
        )
        return [{k: _preview_value(v) for k, v in row.items()} for row in cur.fetchall()]


def _mongo_uri_for_run(run: db_models.Run, db: Session) -> str:
    """User sources keep the protected DB on their own cluster; demo sources use .env."""
    import os

    from src.api.sources import get_source_by_id, resolve_connection

    source = get_source_by_id(run.source_id, db)
    if source is not None:
        conn = resolve_connection(source, db)
        if conn.url:
            return conn.url
    settings = get_settings()
    return settings.mongo_source_uri or settings.mongo_uri or os.getenv("MONGO_URI", "mongodb://localhost:27017")


def _preview_from_mongo_snapshot(
    *, uri: str, database: str, collection: str, table_columns: list[str], limit: int | None
) -> list[dict]:
    from pymongo import MongoClient

    projection: dict[str, int] = {column: 1 for column in table_columns}
    if "_id" not in table_columns:
        projection["_id"] = 0
    client: MongoClient = MongoClient(uri, serverSelectionTimeoutMS=5000)
    try:
        docs = list(client[database][collection].find({}, projection).limit(limit or 0))
    finally:
        client.close()

    rows: list[dict] = []
    for doc in docs:
        row: dict[str, Any] = {}
        for column in table_columns:
            value: Any = doc
            for part in column.split("."):
                value = value.get(part) if isinstance(value, dict) else None
            row[column] = _preview_value(value)
        rows.append(row)
    return rows


def _stub_preview_rows(columns: list[DatasetPreviewColumn], table: str, limit: int) -> list[dict]:
    """Demo-stub sources have no physical snapshot: illustrate the protected shape only."""
    rows: list[dict] = []
    for index in range(1, min(limit, 3) + 1):
        row: dict[str, Any] = {}
        for column in columns:
            if column.source_path != table or column.transform == "DROPPED":
                continue
            if column.transform == PolicyAction.MASK.value:
                row[column.name] = "[REDACTED]"
            elif column.transform == PolicyAction.HMAC.value:
                row[column.name] = f"hmac_stub_{column.name}_{index}"
            else:
                row[column.name] = f"<{column.data_type}>"
        if row:
            rows.append(row)
    return rows


def _snapshot_rows(
    ds: db_models.Dataset,
    run: db_models.Run,
    db: Session,
    columns: list[DatasetPreviewColumn],
    table: str,
    limit: int | None,
) -> list[dict]:
    """Protected rows of one snapshot table, visible columns only; ``limit=None`` reads them all."""
    table_columns = _visible_columns(columns, table)
    location = ds.output_location
    if not location.startswith(("postgres://", "mongodb://")):
        return _stub_preview_rows(columns, table, limit or 3)
    if not table_columns:
        return []
    if location.startswith("postgres://"):
        schema = location.removeprefix("postgres://").split("/", 1)[0]
        return _preview_from_postgres_snapshot(schema=schema, table=table, table_columns=table_columns, limit=limit)
    database = location.removeprefix("mongodb://").split("/", 1)[0]
    return _preview_from_mongo_snapshot(
        uri=_mongo_uri_for_run(run, db),
        database=database,
        collection=table,
        table_columns=table_columns,
        limit=limit,
    )


@router.get("/datasets", response_model=list[DatasetOut])
def list_datasets(
    status_filter: DatasetStatus | None = Query(default=None, alias="status", description="Lọc theo trạng thái"),
    user: SessionUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DatasetOut]:
    """DPO sees non-failed datasets; Analyst only PUBLISHED datasets granted to them (§3, §14.2)."""
    stmt = select(db_models.Dataset).options(selectinload(db_models.Dataset.run)).order_by(db_models.Dataset.id)
    if status_filter is not None:
        stmt = stmt.where(db_models.Dataset.status == status_filter.value)
    rows = db.scalars(stmt).all()
    if user.role == UserRole.ANALYST.value:
        granted_ids = set(
            db.scalars(
                select(db_models.DatasetGrant.dataset_id).where(db_models.DatasetGrant.user_id == user.id)
            ).all()
        )
        rows = [r for r in rows if r.status == DatasetStatus.PUBLISHED.value and r.id in granted_ids]
    else:
        # DPO: FAILED builds are hidden unless explicitly requested via ?status=FAILED
        if status_filter is None:
            rows = [r for r in rows if r.status != DatasetStatus.FAILED.value]
        counts = _grant_counts(db, [r.id for r in rows])
        return [_dataset_out(r, counts.get(r.id, 0)) for r in rows]
    return [_dataset_out(r) for r in rows]


@router.get("/datasets/{dataset_id}", response_model=DatasetDetailOut)
def get_dataset(
    dataset_id: int,
    _user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> DatasetDetailOut:
    """Dataset detail for DPO: verifier checks and column counts per action — metadata only."""
    ds = _get_dataset(db, dataset_id)
    if ds is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    verifier_rows = db.scalars(
        select(db_models.VerifierResult)
        .where(db_models.VerifierResult.dataset_id == ds.id)
        .order_by(db_models.VerifierResult.id)
    ).all()
    action_counts: dict[str, int] = {}
    if ds.run is not None:
        for column in _preview_columns_from_run(ds.run):
            action = "DROP" if column.transform == "DROPPED" else column.transform
            action_counts[action] = action_counts.get(action, 0) + 1
    return DatasetDetailOut(
        **_dataset_fields(ds, _grant_counts(db, [ds.id]).get(ds.id, 0)),
        run_status=RunStatus(ds.run.status) if ds.run is not None else None,
        verifier_results=[VerifierResultOut.model_validate(v) for v in verifier_rows],
        action_counts=action_counts,
    )


@router.patch("/datasets/{dataset_id}", response_model=DatasetOut)
def rename_dataset(
    dataset_id: int,
    body: DatasetRename,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> DatasetOut:
    """Rename only: the protected data is untouched, so it works in any status (published included)."""
    ds = _get_dataset(db, dataset_id)
    if ds is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    previous = ds.dataset_name
    ds.dataset_name = body.dataset_name
    _write_audit(
        db,
        actor=user,
        action="rename_dataset",
        entity_type="dataset",
        entity_id=str(ds.id),
        reason=f"from={previous}; to={body.dataset_name}",
    )
    db.commit()
    db.refresh(ds)
    return _dataset_out(ds)


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
    # output_location keeps pointing at the physical snapshot (postgres://… / mongodb://…):
    # preview reads the protected rows from it and revoke drops it.

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

                from src.db.session import sqlalchemy_url

                engine = create_engine(sqlalchemy_url(settings.snapshot_database_url))
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
                from pymongo import MongoClient

                # User sources keep the protected DB on their own cluster, not the .env one.
                if ds.run is not None:
                    mongo_target = _mongo_uri_for_run(ds.run, db)
                else:
                    mongo_target = settings.mongo_source_uri or settings.mongo_uri
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
        # Back to review with its decisions kept: the DPO can fix them, save (rebuilds this dataset) and republish.
        ds.run.status = RunStatus.READY_TO_BUILD.value

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



def _readable_dataset(db: Session, dataset_id: int, user: SessionUser) -> db_models.Dataset:
    """Dataset whose protected rows this user may read (preview and export share the guard)."""
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
    return ds


@router.get("/datasets/{dataset_id}/preview", response_model=DatasetPreview)
def preview_dataset(
    dataset_id: int,
    table: str | None = Query(default=None, description="Snapshot table/collection; defaults to the first"),
    limit: int = Query(default=PREVIEW_DEFAULT_LIMIT, ge=1, le=PREVIEW_MAX_LIMIT),
    user: SessionUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DatasetPreview:
    """Return rows of the protected snapshot (already MASK/HMAC/DROP) — never raw source values."""
    ds = _readable_dataset(db, dataset_id, user)

    run = ds.run
    columns: list[DatasetPreviewColumn] = []
    rows: list[dict[str, Any]] = []
    tables: list[str] = []
    selected_table = ""
    note = "Dữ liệu đã được bảo vệ (MASK/HMAC/DROP) trước khi ghi snapshot; không chứa giá trị gốc."
    if run is not None:
        columns = _preview_columns_from_run(run)
        tables = _snapshot_tables(ds.output_location, columns)
        if table is not None and table not in tables:
            raise HTTPException(status_code=404, detail="Table not found in this dataset")
        selected_table = table or (tables[0] if tables else "")
        if selected_table:
            try:
                rows = _snapshot_rows(ds, run, db, columns, selected_table, limit)
            except Exception as exc:
                # Error type only: connection strings and values must never leak.
                note = f"Không đọc được snapshot ({type(exc).__name__}). Liên hệ DPO để build lại."
        if not ds.output_location.startswith(("postgres://", "mongodb://")):
            note = "Nguồn demo (không có snapshot thật): giá trị chỉ minh hoạ dạng dữ liệu sau bảo vệ."

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

    checks = db.scalars(
        select(db_models.VerifierResult.status).where(db_models.VerifierResult.dataset_id == ds.id)
    ).all()
    verification = (
        DatasetVerification(passed=sum(1 for c in checks if c == "PASSED"), total=len(checks)) if checks else None
    )

    return DatasetPreview(
        verification=verification,
        dataset_id=ds.id,
        dataset_name=ds.dataset_name,
        status=DatasetStatus(ds.status),
        columns=columns,
        rows=rows,
        tables=tables,
        selected_table=selected_table,
        note=note,
        relationships=relationships,
    )


def _csv_bytes(table_columns: list[str], rows: list[dict]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(table_columns)
    for row in rows:
        writer.writerow(["" if row.get(column) is None else row.get(column) for column in table_columns])
    # BOM so Excel opens Vietnamese text as UTF-8.
    return buffer.getvalue().encode("utf-8-sig")


def _export_file_stem(ds: db_models.Dataset) -> str:
    # ASCII only (the name goes into a Content-Disposition header): "Khách hàng" -> "khach-hang".
    name = (ds.dataset_name or "").lower().replace("đ", "d")
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    stem = re.sub(r"[^a-z0-9._-]+", "-", ascii_name).strip("-")
    return stem or f"dataset-{ds.id}"


@router.get("/datasets/{dataset_id}/export")
def export_dataset(
    dataset_id: int,
    table: str | None = Query(default=None, description="One table as CSV; omitted = every table in a ZIP"),
    user: SessionUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Every protected row of the snapshot (MASK/HMAC/DROP already applied) — one CSV per table."""
    ds = _readable_dataset(db, dataset_id, user)
    run = ds.run
    if run is None:
        raise HTTPException(status_code=404, detail="Dataset has no run to export")
    columns = _preview_columns_from_run(run)
    tables = _snapshot_tables(ds.output_location, columns)
    if table is not None and table not in tables:
        raise HTTPException(status_code=404, detail="Table not found in this dataset")
    selected = [table] if table is not None else tables
    if not selected:
        raise HTTPException(status_code=404, detail="Dataset has no table to export")

    files: dict[str, bytes] = {}
    for name in selected:
        try:
            rows = _snapshot_rows(ds, run, db, columns, name, None)
        except Exception as exc:
            # Error type only: connection strings and values must never leak.
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Không đọc được snapshot ({type(exc).__name__}). Liên hệ DPO để build lại.",
            ) from exc
        files[f"{name}.csv"] = _csv_bytes(_visible_columns(columns, name), rows)

    _write_audit(
        db,
        actor=user,
        action="export_dataset",
        entity_type="dataset",
        entity_id=str(ds.id),
        reason=f"tables={','.join(selected)}",
    )
    db.commit()

    stem = _export_file_stem(ds)
    if table is not None:
        filename = f"{stem}-{re.sub(r'[^A-Za-z0-9._-]+', '-', table)}.csv"
        return Response(
            content=files[f"{table}.csv"],
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    return Response(
        content=archive.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{stem}.zip"'},
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
    usernames = _usernames(db, {g.user_id for g in grants})
    return [
        DatasetGrantOut.model_validate(g).model_copy(update={"username": usernames.get(g.user_id)})
        for g in grants
    ]


def _usernames(db: Session, user_ids: set[int]) -> dict[int, str]:
    if not user_ids:
        return {}
    rows = db.execute(
        select(db_models.DemoUser.id, db_models.DemoUser.username).where(db_models.DemoUser.id.in_(user_ids))
    ).all()
    return {user_id: username for user_id, username in rows}


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
        return DatasetGrantOut.model_validate(existing).model_copy(update={"username": target_user.username})

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
    return DatasetGrantOut.model_validate(grant).model_copy(update={"username": target_user.username})


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
