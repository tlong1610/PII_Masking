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


@router.get("/sources", response_model=list[Source])
def list_sources(_user: SessionUser = Depends(require_dpo)) -> list[Source]:
    """List configured demo sources for DPO. No passwords or connection strings."""
    return list(_DEMO_SOURCES)
