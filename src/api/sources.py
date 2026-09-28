"""Demo data sources configured for DPO review — never expose credentials."""

from fastapi import APIRouter, Depends

from src.api.deps import require_dpo
from src.api.session_store import SessionUser
from src.models.schemas import Source, SourceType

router = APIRouter(tags=["sources"])

# P0 ships two demo instances (one SQL, one NoSQL). The API model is vendor-agnostic:
# source_type = SQL | NOSQL; engine = concrete dialect the connector understands.
# Credentials stay in server env / connectors only — never in this list.
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


def mongo_live_enabled() -> bool:
    from src.config import get_settings

    settings = get_settings()
    return bool(settings.enable_mongo and settings.mongo_uri)


def pg_live_enabled() -> bool:
    from src.config import get_settings

    settings = get_settings()
    return bool(
        settings.enable_pg_snapshot
        and settings.source_database_url
        and settings.snapshot_database_url
    )


def _with_live_status(source: Source) -> Source:
    if source.engine == "mongodb":
        live = mongo_live_enabled()
    elif source.engine == "postgresql":
        live = pg_live_enabled()
    else:
        return source
    status = "ready" if live else "demo_stub"
    return source.model_copy(update={"status": status})


@router.get("/sources", response_model=list[Source])
def list_sources(_user: SessionUser = Depends(require_dpo)) -> list[Source]:
    """List configured demo sources for DPO. No passwords or connection strings."""
    return [_with_live_status(s) for s in _DEMO_SOURCES]


def get_source_by_id(source_id: str) -> Source | None:
    for source in _DEMO_SOURCES:
        if source.id == source_id:
            return _with_live_status(source)
    return None
