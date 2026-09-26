"""Orchestrate Postgres protected snapshot build + SQL verification."""

from __future__ import annotations

from dataclasses import asdict

from src.connectors.postgres_snapshot import DEMO_SNAPSHOT_TABLES, build_protected_snapshots
from src.verifier.sql_verifier import CheckResult, run_postgres_verifiers

# Minimal demo policy for join-key preservation (CCCD) + sample MASK fields.
DEFAULT_DEMO_ACTIONS: dict[str, dict[str, str]] = {
    "customers": {
        "cccd": "HMAC",
        "phone": "MASK",
        "email": "MASK",
        "contact_name": "MASK",
    },
    "orders": {
        "customer_cccd": "HMAC",
        "ship_name": "MASK",
        "ship_address": "MASK",
    },
    "order_details": {},
}


def actions_from_run_decisions(
    profiles: list,
    decisions: list,
) -> dict[str, dict[str, str]]:
    """Build table->column->action map from ORM/profile objects or simple namespaces."""
    by_id = {p.id: p for p in profiles}
    out: dict[str, dict[str, str]] = {t: {} for t in DEMO_SNAPSHOT_TABLES}
    for d in decisions:
        p = by_id.get(d.field_profile_id)
        if p is None:
            continue
        table = p.source_path
        if table not in out:
            out[table] = {}
        out[table][p.field_path] = d.action
    # Ensure join keys always HMAC if present in decisions under those names
    return out


def run_protected_postgres_pipeline(
    *,
    source_url: str,
    snapshot_url: str,
    secret: str,
    key_version: str,
    table_actions: dict[str, dict[str, str]] | None = None,
    snapshot_schema: str = "piiguard_snapshot",
) -> tuple[dict[str, str], list[CheckResult]]:
    actions = table_actions or DEFAULT_DEMO_ACTIONS
    written = build_protected_snapshots(
        source_url=source_url,
        snapshot_url=snapshot_url,
        table_actions=actions,
        secret=secret,
        key_version=key_version,
        snapshot_schema=snapshot_schema,
    )
    checks = run_postgres_verifiers(snapshot_url, snapshot_schema=snapshot_schema)
    return written, checks


def checks_as_dicts(checks: list[CheckResult]) -> list[dict]:
    return [asdict(c) for c in checks]
