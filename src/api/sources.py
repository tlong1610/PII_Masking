"""Data sources for DPO review: built-in demos plus user-registered databases.

Connection URLs of user sources are stored encrypted and are never returned by the API.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import require_dpo
from src.api.session_store import SessionUser
from src.db import models as db_models
from src.db.session import get_db
from src.models.schemas import (
    ScopeRelationship,
    Source,
    SourceCreate,
    SourceScope,
    SourceScopeField,
    SourceScopeItem,
    SourceTestResult,
    SourceType,
)
from src.services import secret_box
from src.services.source_validation import (
    ParsedSource,
    SourceUrlError,
    assert_not_snapshot_target,
    normalize_source_url,
    parse_source_url,
    probe_connection,
    probe_namespace,
)

router = APIRouter(tags=["sources"])

USER_SOURCE_PREFIX = "usr-"

# P0 ships two demo instances (one SQL, one NoSQL). The API model is vendor-agnostic:
# source_type = SQL | NOSQL; engine = concrete dialect the connector understands.
# Demo credentials stay in server env / connectors only — never in this list.
_DEMO_SOURCES: list[Source] = [
    Source(
        id="sql-demo",
        name="SQL demo",
        source_type=SourceType.SQL,
        engine="postgresql",
        description="Relational demo for SQL join verification",
        scope_summary="tables: customers, orders (read-only demo)",
        status="ready",
    ),
    Source(
        id="nosql-demo",
        name="NoSQL demo",
        source_type=SourceType.NOSQL,
        engine="mongodb",
        description="Document demo for lookup verification",
        scope_summary="collections: customers, orders (read-only demo)",
        status="ready",
    ),
]


def mongo_live_enabled(client=None) -> bool:
    from src.config import get_settings

    settings = get_settings()
    if not (settings.enable_mongo and settings.mongo_uri):
        return False
    if client is not None:
        try:
            client.admin.command("ping")
            return True
        except Exception:
            return False
    try:
        import sys
        runs_mod = sys.modules.get("src.api.runs")
        if runs_mod is not None and hasattr(runs_mod, "mongo_client"):
            override = runs_mod.mongo_client()
            if override is not None:
                override.admin.command("ping")
                return True
    except Exception:
        pass
    try:
        from pymongo import MongoClient

        c = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)
        c.admin.command("ping")
        c.close()
    except Exception:
        return False
    return True


def pg_live_enabled() -> bool:
    from src.config import get_settings

    settings = get_settings()
    if not (
        settings.enable_pg_snapshot
        and settings.source_database_url
        and settings.snapshot_database_url
    ):
        return False
    try:
        import psycopg

        with psycopg.connect(settings.source_database_url, connect_timeout=1) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
    except Exception:
        return False
    return True


def _with_live_status(source: Source) -> Source:
    if source.engine == "mongodb":
        live = mongo_live_enabled()
    elif source.engine == "postgresql":
        live = pg_live_enabled()
    else:
        return source
    status_label = "ready" if live else "demo_stub"
    return source.model_copy(update={"status": status_label})


def _user_source_out(row: db_models.DataSource) -> Source:
    kind = "schema" if row.engine == "postgresql" else "database"
    scope = f"{row.host_hint}; {kind}: {row.namespace}"
    if row.scan_tables:
        scope += f"; tables: {row.scan_tables}"
    return Source(
        id=row.id,
        name=row.name,
        source_type=SourceType(row.source_type),
        engine=row.engine,
        description="User-registered source (read-only)",
        scope_summary=scope,
        status="ready",
    )


@router.get("/sources/{source_id}/scope", response_model=SourceScope)
def get_source_scope(
    source_id: str,
    _user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> SourceScope:
    """Read safe table/collection metadata for DPO scope selection."""
    source = get_source_by_id(source_id, db)
    if source is None:
        raise HTTPException(status_code=404, detail="Unknown source_id")

    conn = resolve_connection(source, db)

    if source.engine == "postgresql" and conn.live:
        from src.connectors.postgres_connector import PostgresConnector

        profile = PostgresConnector(conn.url).extract_database_profile(
            schema_name=conn.namespace,
            sample_size=0,
        )
        tables = _allowed_tables(profile.tables, conn)
        return SourceScope(
            source_id=source.id,
            source_type=source.source_type,
            engine=source.engine,
            items=[
                SourceScopeItem(
                    name=table.table_name,
                    kind="table",
                    field_count=len(table.columns),
                    fields=[
                        SourceScopeField(
                            name=column.column_name,
                            data_type=column.data_type,
                            is_primary_key=column.is_primary_key,
                            is_foreign_key=column.is_foreign_key,
                        )
                        for column in table.columns
                    ],
                )
                for table in tables
            ],
            relationships=_scope_relationships(source.engine, conn, {t.table_name for t in tables}),
        )

    if source.engine == "mongodb" and conn.live:
        from src.connectors.mongo_connector import MongoConnector

        profile = MongoConnector(conn.url, conn.namespace).extract_database_profile(sample_size=1)
        collections = _allowed_tables(profile.tables, conn)
        return SourceScope(
            source_id=source.id,
            source_type=source.source_type,
            engine=source.engine,
            items=[
                SourceScopeItem(
                    name=collection.table_name,
                    kind="collection",
                    field_count=len(collection.columns),
                    fields=[
                        SourceScopeField(
                            name=column.column_name,
                            data_type=column.data_type,
                            is_primary_key=column.is_primary_key,
                            is_foreign_key=column.is_foreign_key,
                        )
                        for column in collection.columns
                    ],
                )
                for collection in collections
            ],
            relationships=_scope_relationships(source.engine, conn, {c.table_name for c in collections}),
        )

    if source.source_type == SourceType.SQL:
        items = [
            SourceScopeItem(
                name="customers",
                kind="table",
                field_count=5,
                fields=[
                    SourceScopeField(name="customer_id", data_type="varchar", is_primary_key=True),
                    SourceScopeField(name="full_name", data_type="varchar"),
                    SourceScopeField(name="phone", data_type="varchar"),
                    SourceScopeField(name="email", data_type="varchar"),
                    SourceScopeField(name="notes", data_type="text"),
                ],
            ),
            SourceScopeItem(
                name="orders",
                kind="table",
                field_count=5,
                fields=[
                    SourceScopeField(name="order_id", data_type="varchar", is_primary_key=True),
                    SourceScopeField(name="customer_id", data_type="varchar", is_foreign_key=True),
                    SourceScopeField(name="order_date", data_type="date"),
                    SourceScopeField(name="amount", data_type="numeric"),
                    SourceScopeField(name="tracking_code", data_type="varchar"),
                ],
            ),
        ]
    else:
        items = [
            SourceScopeItem(
                name="customers",
                kind="collection",
                field_count=5,
                fields=[
                    SourceScopeField(name="_id", data_type="objectId", is_primary_key=True),
                    SourceScopeField(name="customer_id", data_type="string"),
                    SourceScopeField(name="full_name", data_type="string"),
                    SourceScopeField(name="phone", data_type="string"),
                    SourceScopeField(name="notes", data_type="string"),
                ],
            ),
            SourceScopeItem(
                name="orders",
                kind="collection",
                field_count=5,
                fields=[
                    SourceScopeField(name="_id", data_type="objectId", is_primary_key=True),
                    SourceScopeField(name="customer_id", data_type="string", is_foreign_key=True),
                    SourceScopeField(name="order_date", data_type="date"),
                    SourceScopeField(name="amount", data_type="float"),
                    SourceScopeField(name="pii_ext.customer_cccd", data_type="string"),
                ],
            ),
        ]
    return SourceScope(
        source_id=source.id,
        source_type=source.source_type,
        engine=source.engine,
        items=items,
        relationships=[_STUB_RELATIONSHIP],
    )


def _allowed_tables(tables: list, conn: SourceConnection) -> list:
    """Restrict profiled tables/collections to the source allowlist registered by the DPO (if any)."""
    if not conn.tables:
        return list(tables)
    allowed = set(conn.tables)
    return [t for t in tables if t.table_name in allowed]


# Demo stub scope: orders.customer_id -> customers.customer_id (same for SQL and NoSQL stubs).
_STUB_RELATIONSHIP = ScopeRelationship(
    source_table="orders", source_column="customer_id", target_table="customers", target_column="customer_id"
)


def _scope_relationships(engine: str, conn: SourceConnection, names: set[str]) -> list[ScopeRelationship]:
    """Same join set the build guard uses (runs.py), restricted to tables present in the scope."""
    from src.api import runs

    relations = runs._mongo_join_relations(conn) if engine == "mongodb" else runs._postgres_join_relations(conn)
    out: list[ScopeRelationship] = []
    seen: set[tuple[str, str, str, str]] = set()
    for relation in relations:
        from_table, from_column, to_table, to_column = relation
        if relation in seen or from_table not in names or to_table not in names:
            continue
        seen.add(relation)
        out.append(
            ScopeRelationship(
                source_table=from_table, source_column=from_column, target_table=to_table, target_column=to_column
            )
        )
    return out


def get_source_by_id(source_id: str, db: Session | None = None) -> Source | None:
    for source in _DEMO_SOURCES:
        if source.id == source_id:
            return _with_live_status(source)
    if db is not None and source_id.startswith(USER_SOURCE_PREFIX):
        row = db.get(db_models.DataSource, source_id)
        if row is not None:
            return _user_source_out(row)
    return None


@dataclass(frozen=True)
class SourceConnection:
    """Resolved, secret-bearing connection details. Internal only — never serialize or log."""

    engine: str
    url: str = ""  # Postgres source URL or Mongo URI
    namespace: str = ""  # Postgres schema or Mongo database
    tables: tuple[str, ...] | None = None
    live: bool = False
    user_supplied: bool = False

    def pg_snapshot_schema(self, run_id: int) -> str:
        from src.config import get_settings

        base = get_settings().snapshot_schema
        return f"{base}_run{run_id}" if self.user_supplied else base

    def mongo_snapshot_db(self, run_id: int) -> str:
        from src.config import get_settings

        if self.user_supplied:
            return f"{self.namespace}_protected_run{run_id}"
        return get_settings().mongo_snapshot_db



def _tables_tuple(raw: str) -> tuple[str, ...] | None:
    tables = tuple(t.strip() for t in raw.split(",") if t.strip())
    return tables or None


def resolve_connection(source: Source, db: Session) -> SourceConnection:
    """Return connection details for a source: user-registered (decrypted) or demo (from env)."""
    from src.config import get_settings

    settings = get_settings()
    if source.id.startswith(USER_SOURCE_PREFIX):
        row = db.get(db_models.DataSource, source.id)
        if row is None:
            raise LookupError("Source no longer exists")
        # Scanning only reads the source, so a user source is always live; build checks the snapshot target.
        return SourceConnection(
            engine=row.engine,
            url=secret_box.decrypt(row.encrypted_url),
            namespace=row.namespace,
            tables=_tables_tuple(row.scan_tables),
            live=True,
            user_supplied=True,
        )
    if source.engine == "postgresql":
        return SourceConnection(
            engine="postgresql",
            url=settings.source_database_url,
            namespace=settings.pg_schema,
            tables=_tables_tuple(settings.pg_scan_tables),
            live=pg_live_enabled(),
        )
    return SourceConnection(
        engine="mongodb",
        url=settings.mongo_uri,
        namespace=settings.mongo_db,
        live=mongo_live_enabled(),
    )


def _audit(db: Session, user: SessionUser, action: str, entity_id: str, reason: str = "") -> None:
    from src.audit import record_audit_event

    record_audit_event(
        db,
        actor=user,
        action=action,
        entity_type="source",
        entity_id=entity_id,
        reason=reason,
    )


def _check_url(url: str) -> ParsedSource:
    """Parse, policy-check and probe a URL. Raises SourceUrlError with a client-safe message."""
    parsed = parse_source_url(url)
    assert_not_snapshot_target(url)
    probe_connection(url, parsed.engine)
    return parsed


@router.get("/sources", response_model=list[Source])
def list_sources(
    _user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> list[Source]:
    """List demo + user-registered sources for DPO. No passwords or connection strings."""
    rows = db.scalars(select(db_models.DataSource).order_by(db_models.DataSource.created_at)).all()
    return [_with_live_status(s) for s in _DEMO_SOURCES] + [_user_source_out(r) for r in rows]


@router.post("/sources/test", response_model=SourceTestResult)
def test_source(body: SourceCreate, _user: SessionUser = Depends(require_dpo)) -> SourceTestResult:
    """Check that a URL is acceptable and reachable, without saving it."""
    url = normalize_source_url(body.url)
    try:
        parsed = _check_url(url)
    except SourceUrlError as exc:
        return SourceTestResult(ok=False, message=str(exc))
    return SourceTestResult(ok=True, engine=parsed.engine, message="Connection OK")


@router.post("/sources", response_model=Source, status_code=status.HTTP_201_CREATED)
def create_source(
    body: SourceCreate,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> Source:
    url = normalize_source_url(body.url)
    try:
        parsed = _check_url(url)
    except SourceUrlError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None

    namespace = body.namespace.strip() or parsed.default_namespace
    if not namespace:
        raise HTTPException(
            status_code=422, detail="Mongo database name is required (in URL path or namespace)"
        )
    try:
        probe_namespace(url, parsed.engine, namespace)
    except SourceUrlError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None
    try:
        encrypted = secret_box.encrypt(url.strip())
    except secret_box.SecretBoxError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None

    row = db_models.DataSource(
        id=f"{USER_SOURCE_PREFIX}{uuid.uuid4().hex[:12]}",
        name=body.name.strip(),
        source_type=parsed.source_type,
        engine=parsed.engine,
        encrypted_url=encrypted,
        namespace=namespace,
        scan_tables=",".join(t.strip() for t in body.tables if t.strip()),
        host_hint=parsed.host_hint,
        created_by=user.id,
    )
    db.add(row)
    _audit(db, user, "create_source", row.id, f"engine={row.engine}")
    db.commit()
    return _user_source_out(row)


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(
    source_id: str,
    force: bool = False,
    user: SessionUser = Depends(require_dpo),
    db: Session = Depends(get_db),
) -> None:
    row = db.get(db_models.DataSource, source_id) if source_id.startswith(USER_SOURCE_PREFIX) else None
    if row is None:
        raise HTTPException(status_code=404, detail="Source not found")
    in_use = db.scalar(select(db_models.Run.id).where(db_models.Run.source_id == source_id).limit(1))
    if in_use is not None:
        if not force:
            raise HTTPException(status_code=409, detail="Source has runs and cannot be deleted")
        # Cascade cleanup runs and all associated metadata (audit events are kept)
        from src.services.run_cleanup import delete_run_metadata

        for rid in db.scalars(select(db_models.Run.id).where(db_models.Run.source_id == source_id)).all():
            delete_run_metadata(db, rid)
    db.delete(row)
    _audit(db, user, "delete_source", source_id)
    db.commit()
