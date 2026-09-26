"""Wire Postgres profile extract + LangGraph PII scan into FieldProfile specs.

Samples stay in-memory for the agent only — never persisted to metadata DB.
"""

from __future__ import annotations

import logging
from typing import Any

from src.models.schemas import ColumnProfile, FieldScanResult, PolicyAction

logger = logging.getLogger(__name__)

DEMO_SCAN_TABLES = ("customers", "orders", "order_details")

_PERSONAL_BASIC_TYPES = frozenset(
    {"CCCD", "PHONE", "ADDRESS", "DOB", "TAX_CODE", "FULL_NAME", "NAME"}
)
_PERSONAL_CONTEXT_TYPES = frozenset({"EMAIL", "OCR_TEXT"})
_NON_PERSONAL_TYPES = frozenset(
    {"NOT_PERSONAL_DATA", "TRACKING_CODE", "MONEY_ALONE", "NON_PERSONAL"}
)


def classification_from_pii_type(inferred: str) -> str:
    t = (inferred or "UNKNOWN").upper().strip()
    if t in {"UNKNOWN", ""}:
        return "UNKNOWN"
    if t in _NON_PERSONAL_TYPES:
        return "NON_PERSONAL"
    if t in _PERSONAL_CONTEXT_TYPES:
        return "PERSONAL_CONTEXT"
    if t in _PERSONAL_BASIC_TYPES or t.startswith("PERSONAL"):
        return "PERSONAL_BASIC"
    if t in {"SENSITIVE", "BIOMETRIC", "HEALTH"}:
        return "PERSONAL_SENSITIVE"
    return "PERSONAL_BASIC"


def normalize_action(raw: str | None) -> str:
    a = (raw or "KEEP").upper().strip()
    if a == "HASHING":
        a = "HMAC"
    if a not in {e.value for e in PolicyAction}:
        return PolicyAction.KEEP.value
    return a


def detector_from_tier(tier: str | None) -> str:
    t = (tier or "").upper()
    if "LLM" in t or t in {"TIER_3", "TIER_3_LLM"}:
        return "ai"
    if t.startswith("TIER_1") or t.startswith("TIER_2") or "HYBRID" in t:
        return "rule"
    if not t:
        return "unknown"
    return "ai"


def coverage_from_result(result: FieldScanResult) -> str:
    inferred = (result.inferred_pii_type or "").upper()
    if inferred == "UNKNOWN":
        return "partial"
    if result.confidence >= 0.8:
        return "full"
    return "partial"


def field_profile_spec(
    *,
    table: str,
    column: ColumnProfile,
    result: FieldScanResult,
) -> dict[str, Any]:
    inferred = (result.inferred_pii_type or "UNKNOWN").upper()
    classification = classification_from_pii_type(inferred)
    summary = (result.reasoning or "").strip()[:500]
    if not summary:
        summary = f"tier={result.tier or 'n/a'} confidence={result.confidence:.2f}"
    return {
        "source_path": table,
        "field_path": result.field_name or column.column_name,
        "data_type": column.data_type,
        "profile_summary": summary,
        "classification": classification,
        "taxonomy_id": None if inferred == "UNKNOWN" else inferred,
        "detector_source": detector_from_tier(result.tier),
        "coverage_status": coverage_from_result(result),
        "recommended_action": normalize_action(result.recommended_action),
    }


def _fallback_spec(table: str, column: ColumnProfile) -> dict[str, Any]:
    return {
        "source_path": table,
        "field_path": column.column_name,
        "data_type": column.data_type,
        "profile_summary": "Scanner returned no proposal",
        "classification": "UNKNOWN",
        "taxonomy_id": None,
        "detector_source": "unknown",
        "coverage_status": "partial",
        "recommended_action": PolicyAction.DROP.value,
    }


async def scan_column(column: ColumnProfile) -> FieldScanResult | None:
    from src.agents.graph import agent

    state = await agent.ainvoke({"column_profile": column})
    proposal = state.get("final_proposal") if isinstance(state, dict) else None
    if isinstance(proposal, FieldScanResult):
        return proposal
    if isinstance(proposal, dict):
        return FieldScanResult.model_validate(proposal)
    return None


async def scan_postgres_source(
    connection_url: str,
    *,
    schema_name: str = "public",
    tables: tuple[str, ...] = DEMO_SCAN_TABLES,
) -> list[dict[str, Any]]:
    """Extract demo tables and scan each column. Raises on connector failure."""
    from src.connectors.postgres_connector import PostgresConnector

    connector = PostgresConnector(connection_url)
    db_profile = connector.extract_database_profile(
        schema_name=schema_name, sample_size=5
    )
    wanted = set(tables)
    specs: list[dict[str, Any]] = []

    for table in db_profile.tables:
        if table.table_name not in wanted:
            continue
        for column in table.columns:
            try:
                result = await scan_column(column)
            except Exception:
                logger.exception(
                    "Scan failed for %s.%s", table.table_name, column.column_name
                )
                specs.append(_fallback_spec(table.table_name, column))
                continue
            if result is None:
                specs.append(_fallback_spec(table.table_name, column))
            else:
                specs.append(
                    field_profile_spec(
                        table=table.table_name, column=column, result=result
                    )
                )

    if not specs:
        raise ValueError(
            f"No columns scanned (wanted tables={sorted(wanted)}; "
            f"found={[t.table_name for t in db_profile.tables]})"
        )
    return specs
