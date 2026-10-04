"""Wire Postgres profile extract + LangGraph PII scan into FieldProfile specs.

Samples stay in-memory for the agent only — never persisted to metadata DB.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from src.models.schemas import ColumnProfile, FieldScanResult, PolicyAction

logger = logging.getLogger(__name__)

_NUMERIC_TYPES = frozenset(
    {"smallint", "integer", "bigint", "real", "double precision", "numeric", "decimal"}
)

_PERSONAL_BASIC_TYPES = frozenset(
    {"CCCD", "PHONE", "ADDRESS", "DOB", "TAX_CODE", "FULL_NAME", "NAME", "FREE_TEXT_PII"}
)
# Định danh gián tiếp (L1): chỉ nhận ra người khi ghép với dữ liệu khác; DPO được Giữ nguyên để phân tích.
_QUASI_IDENTIFIER_TYPES = frozenset({"CITY", "DISTRICT", "IP_ADDRESS", "GENDER", "QUASI_IDENTIFIER"})
_PERSONAL_CONTEXT_TYPES = frozenset({"EMAIL", "OCR_TEXT"})
_NON_PERSONAL_TYPES = frozenset(
    {"NOT_PERSONAL_DATA", "TRACKING_CODE", "MONEY_ALONE", "NON_PERSONAL", "TAX_CODE_ORG", "EMPTY_COLUMN"}
)
# NĐ 13/2023 Điều 2 khoản 4: tài chính (thẻ, tài khoản), sinh trắc, sức khỏe, bản sao giấy tờ tùy thân.
_SENSITIVE_TYPES = frozenset(
    {
        "SENSITIVE",
        "PERSONAL_SENSITIVE",
        "BIOMETRIC",
        "BIOMETRIC_FILE",
        "HEALTH",
        "MEDICAL",
        "PATIENT_ID",
        "CREDIT_CARD",
        "BANK_ACCOUNT",
        "FINANCIAL",
        "OCR_IDENTITY_DOC",
        "INTERNAL_FILE_PATH",
    }
)


def classification_from_pii_type(inferred: str) -> str:
    t = (inferred or "UNKNOWN").upper().strip()
    if t in {"UNKNOWN", ""}:
        return "UNKNOWN"
    if t in _NON_PERSONAL_TYPES:
        return "NON_PERSONAL"
    if t in _SENSITIVE_TYPES:
        return "PERSONAL_SENSITIVE"
    if t in _QUASI_IDENTIFIER_TYPES:
        return "QUASI_IDENTIFIER"
    if t in _PERSONAL_CONTEXT_TYPES:
        return "PERSONAL_CONTEXT"
    if t in _PERSONAL_BASIC_TYPES or t.startswith("PERSONAL"):
        return "PERSONAL_BASIC"
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


# Classifications whose proposal must never be KEEP: PII needs masking (or a DPO exception) and
# UNKNOWN needs a DPO confirmation first. The scanner only proposes; these limits are not negotiable.
_NEVER_KEEP = frozenset({"PERSONAL_SENSITIVE", "PERSONAL_BASIC", "PERSONAL_CONTEXT", "UNKNOWN"})


def enforce_proposal_consistency(classification: str, action: str) -> tuple[str, str | None]:
    """Fix contradictory proposals (e.g. LLM: 'PII' + 'KEEP'); returns (action, note or None)."""
    if classification in _NEVER_KEEP and action == PolicyAction.KEEP.value:
        return PolicyAction.MASK.value, f"Đề xuất hạ từ Giữ nguyên xuống Che vì phân loại là {classification}."
    return action, None


def field_profile_spec(
    *,
    table: str,
    column: ColumnProfile,
    result: FieldScanResult,
) -> dict[str, Any]:
    inferred = (result.inferred_pii_type or "UNKNOWN").upper()
    classification = classification_from_pii_type(inferred)
    summary = (result.reasoning or "").strip()[:400]
    if not summary:
        summary = f"tier={result.tier or 'n/a'} confidence={result.confidence:.2f}"
    action, note = enforce_proposal_consistency(classification, normalize_action(result.recommended_action))
    if note:
        summary = f"{summary} [{note}]"
    return {
        "source_path": table,
        "field_path": result.field_name or column.column_name,
        "data_type": column.data_type,
        "profile_summary": summary,
        "classification": classification,
        "taxonomy_id": None if inferred == "UNKNOWN" else inferred,
        "detector_source": detector_from_tier(result.tier),
        "coverage_status": coverage_from_result(result),
        "recommended_action": action,
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


async def _scan_columns(
    columns: list[tuple[str, ColumnProfile]],
    *,
    use_ai: bool,
    rule_scanner: Any,
    scan: Callable[[ColumnProfile], Awaitable[FieldScanResult | None]] | None = None,
) -> list[FieldScanResult | None]:
    """Scan (table, column) pairs and return results in input order; a failing column yields None.

    With AI, columns run in parallel (bounded by SCAN_CONCURRENCY): almost all the time is spent
    waiting on the LLM, so a few concurrent calls cut scan time several-fold. Without AI only the
    deterministic rule tier runs, which is instant.
    """
    from src.config import get_settings

    def rules(table: str, column: ColumnProfile) -> FieldScanResult | None:
        try:
            return rule_scanner.tier1_static_filter(column)
        except Exception:
            logger.exception("Scan failed for %s.%s", table, column.column_name)
            return None

    if not use_ai:
        return [rules(table, column) for table, column in columns]

    scan_one = scan or scan_column
    semaphore = asyncio.Semaphore(max(1, get_settings().scan_concurrency))

    async def one(table: str, column: ColumnProfile) -> FieldScanResult | None:
        async with semaphore:
            try:
                return await scan_one(column)
            except Exception:
                logger.exception("Scan failed for %s.%s", table, column.column_name)
                return None

    return list(await asyncio.gather(*(one(table, column) for table, column in columns)))


def _with_table(column: ColumnProfile, table_name: str) -> ColumnProfile:
    """Table-scoped tier-1 rules (supplier tax code, KYC documents) need the column's table."""
    return column if column.table_name else column.model_copy(update={"table_name": table_name})


def _numeric_measure_spec(table: str, column: ColumnProfile) -> dict[str, Any]:
    return {
        "source_path": table,
        "field_path": column.column_name,
        "data_type": column.data_type,
        "profile_summary": "Numeric measure; no PII keyword or pattern matched",
        "classification": "NON_PERSONAL",
        "taxonomy_id": "NOT_PERSONAL_DATA",
        "detector_source": "rule",
        "coverage_status": "partial",
        "recommended_action": PolicyAction.KEEP.value,
    }


async def scan_postgres_source(
    connection_url: str,
    *,
    use_ai: bool = True,
    schema_name: str = "public",
    tables: tuple[str, ...] | None = None,
) -> list[dict[str, Any]]:
    """Profile the source schema and scan each column. Raises on connector failure.

    tables=None scans every base table. Without AI, only the rule/regex tier runs;
    unmatched numeric columns are proposed as non-personal measures, anything else UNKNOWN.
    PK/FK columns and logical join keys are proposed as HMAC so joins survive the snapshot.
    """
    from src.connectors.postgres_connector import PostgresConnector
    from src.detection.rule_engine import RuleBasedScanner
    from src.transform.pg_pipeline import logical_join_fields

    connector = PostgresConnector(connection_url)
    db_profile = connector.extract_database_profile(
        schema_name=schema_name, sample_size=5
    )
    wanted = set(tables) if tables else None
    rule_scanner = RuleBasedScanner()
    join_fields = logical_join_fields()
    for table in db_profile.tables:
        for rel in table.relations:
            join_fields.add((table.table_name, rel.from_column))
            join_fields.add((rel.to_table, rel.to_column))

    targets = [
        (table.table_name, _with_table(column, table.table_name))
        for table in db_profile.tables
        if wanted is None or table.table_name in wanted
        for column in table.columns
    ]
    to_scan = [(name, column) for name, column in targets if column.system_recommendation != "HASHING"]
    scanned = iter(await _scan_columns(to_scan, use_ai=use_ai, rule_scanner=rule_scanner))

    specs: list[dict[str, Any]] = []
    for table_name, column in targets:
        if column.system_recommendation == "HASHING":
            specs.append(_join_key_spec(table_name, column))
            continue
        result = next(scanned)
        if result is not None:
            spec = field_profile_spec(table=table_name, column=column, result=result)
        elif not use_ai and column.data_type in _NUMERIC_TYPES:
            spec = _numeric_measure_spec(table_name, column)
        else:
            spec = _fallback_spec(table_name, column)
        if (table_name, column.column_name) in join_fields:
            spec["recommended_action"] = PolicyAction.HMAC.value
        specs.append(spec)

    if not specs:
        raise ValueError(
            f"No columns scanned (wanted tables={sorted(wanted) if wanted else 'all'}; "
            f"found={[t.table_name for t in db_profile.tables]})"
        )
    return specs


def _join_key_spec(collection: str, column: ColumnProfile) -> dict[str, Any]:
    return {
        "source_path": collection,
        "field_path": column.column_name,
        "data_type": column.data_type,
        "profile_summary": "Join key (document id / reference); keep joinable via HMAC",
        "classification": "NON_PERSONAL",
        "taxonomy_id": None,
        "detector_source": "rule",
        "coverage_status": "full",
        "recommended_action": PolicyAction.HMAC.value,
    }


async def scan_mongo_source(
    uri: str,
    database_name: str,
    *,
    use_ai: bool,
    collections: tuple[str, ...] | None = None,
    client: Any | None = None,
) -> list[dict[str, Any]]:
    """Profile every collection with MongoConnector and scan each flattened field.

    field_path keeps the real dot path (e.g. identity.cccd); the scanner sees a snake_case copy.
    Without AI, only the deterministic rule/regex tier runs (no LLM call).
    """
    from src.connectors.mongo_connector import MongoConnector
    from src.detection.rule_engine import RuleBasedScanner

    connector = MongoConnector(uri, database_name, client=client)
    db_profile = connector.extract_database_profile(sample_size=5)
    wanted = set(collections) if collections else None
    rule_scanner = RuleBasedScanner()
    specs: list[dict[str, Any]] = []
    join_fields: set[tuple[str, str]] = set()
    for table in db_profile.tables:
        if wanted is not None and table.table_name not in wanted:
            continue
        for rel in table.relations:
            join_fields.add((table.table_name, rel.from_column))
            join_fields.add((rel.to_table, rel.to_column))

    # The scanner sees a snake_case copy of the dot path; field_path keeps the real one.
    targets = [
        (
            table.table_name,
            column,
            _with_table(column, table.table_name).model_copy(
                update={"column_name": column.column_name.replace(".", "_")}
            ),
        )
        for table in db_profile.tables
        if wanted is None or table.table_name in wanted
        for column in table.columns
    ]
    to_scan = [
        (table_name, scanner_col)
        for table_name, column, scanner_col in targets
        if column.system_recommendation != "HASHING" and column.data_type != "object"
    ]
    scanned = iter(await _scan_columns(to_scan, use_ai=use_ai, rule_scanner=rule_scanner))

    for table_name, column, scanner_col in targets:
        if column.system_recommendation == "HASHING":
            # Keys stay HMAC, but a key carrying PII (e.g. CCCD) must still be labelled as PII.
            result = rule_scanner.tier1_static_filter(scanner_col)
            if result is None or classification_from_pii_type(result.inferred_pii_type) == "UNKNOWN":
                spec = _join_key_spec(table_name, column)
            else:
                spec = field_profile_spec(table=table_name, column=column, result=result)
                spec["field_path"] = column.column_name
                spec["recommended_action"] = PolicyAction.HMAC.value
            specs.append(spec)
            continue
        if column.data_type == "object":
            spec = _fallback_spec(table_name, column)
            spec["profile_summary"] = "Nested object beyond scan depth; contents not profiled"
            specs.append(spec)
            continue
        result = next(scanned)
        if result is None:
            spec = _fallback_spec(table_name, column)
        else:
            spec = field_profile_spec(table=table_name, column=column, result=result)
        spec["field_path"] = column.column_name
        if (table_name, column.column_name) in join_fields:
            spec["recommended_action"] = PolicyAction.HMAC.value
        specs.append(spec)

    if not specs:
        raise ValueError(
            f"No fields scanned (wanted collections={sorted(wanted) if wanted else 'all'}; "
            f"found={[t.table_name for t in db_profile.tables]})"
        )
    return specs
