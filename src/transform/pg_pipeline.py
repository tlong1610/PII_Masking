"""Orchestrate Postgres protected snapshot build + SQL verification."""

from __future__ import annotations

from dataclasses import asdict

from src.connectors.postgres_snapshot import DEMO_SNAPSHOT_TABLES, build_protected_snapshots
from src.verifier.sql_verifier import (
    CheckResult,
    run_postgres_verifiers,
    verify_row_counts,
    verify_zero_raw_pii_egress,
)

# Joins the verifier relies on that are not declared as FOREIGN KEY in the source schema.
# (from_table, from_column, to_table, to_column)
LOGICAL_JOIN_KEYS: tuple[tuple[str, str, str, str], ...] = (
    ("orders", "customer_cccd", "customers", "cccd"),
)

JOIN_SAFE_ACTIONS = frozenset({"KEEP", "HMAC"})


def pg_join_key_violations(
    table_actions: dict[str, dict[str, str]],
    relations: tuple[tuple[str, str, str, str], ...] = LOGICAL_JOIN_KEYS,
) -> list[dict[str, str]]:
    """Both ends of every logical join key must share a JOIN_SAFE_ACTIONS action.

    If one side is HMAC and the other is KEEP (or vice-versa) the join is broken
    because HMAC values will never match plain values.  Raises nothing — returns
    a list of violation dicts that the caller can embed in a 422 response.
    """
    violations: list[dict[str, str]] = []
    for from_table, from_col, to_table, to_col in relations:
        from_action = table_actions.get(from_table, {}).get(from_col, "KEEP").upper()
        to_action = table_actions.get(to_table, {}).get(to_col, "KEEP").upper()
        if from_action == to_action and from_action in JOIN_SAFE_ACTIONS:
            continue
        violations.append(
            {
                "from": f"{from_table}.{from_col}",
                "from_action": from_action,
                "to": f"{to_table}.{to_col}",
                "to_action": to_action,
            }
        )
    return violations


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


def logical_join_fields() -> set[tuple[str, str]]:
    fields: set[tuple[str, str]] = set()
    for from_table, from_col, to_table, to_col in LOGICAL_JOIN_KEYS:
        fields.add((from_table, from_col))
        fields.add((to_table, to_col))
    return fields


def actions_from_run_decisions(
    profiles: list,
    decisions: list,
) -> dict[str, dict[str, str]]:
    """Build table->column->action map from ORM/profile objects or simple namespaces."""
    by_id = {p.id: p for p in profiles}
    out: dict[str, dict[str, str]] = {}
    for d in decisions:
        p = by_id.get(d.field_profile_id)
        if p is None:
            continue
        out.setdefault(p.source_path, {})[p.field_path] = d.action
    return out


def run_protected_postgres_pipeline(
    *,
    source_url: str,
    snapshot_url: str,
    secret: str,
    key_version: str,
    table_actions: dict[str, dict[str, str]] | None = None,
    snapshot_schema: str = "piiguard_snapshot",
    source_schema: str = "public",
    default_action: str = "KEEP",
    generic_verify: bool = False,
) -> tuple[dict[str, str], list[CheckResult]]:
    """table_actions=None runs the demo policy; otherwise only tables in table_actions are built.

    generic_verify=True (user-supplied sources) checks row-count parity instead of the
    demo-only customers/orders join baseline.
    """
    actions = table_actions or DEFAULT_DEMO_ACTIONS
    tables = tuple(table_actions) if table_actions else DEMO_SNAPSHOT_TABLES
    written = build_protected_snapshots(
        source_url=source_url,
        snapshot_url=snapshot_url,
        table_actions=actions,
        secret=secret,
        key_version=key_version,
        snapshot_schema=snapshot_schema,
        tables=tables,
        source_schema=source_schema,
        default_action=default_action,
    )
    if generic_verify:
        checks = verify_row_counts(
            source_url,
            snapshot_url,
            source_schema=source_schema,
            snapshot_schema=snapshot_schema,
            tables=sorted(written),
        )
        checks.append(
            verify_zero_raw_pii_egress(
                snapshot_url,
                snapshot_schema=snapshot_schema,
                tables=sorted(written),
                table_actions=actions,
            )
        )
    else:
        checks = run_postgres_verifiers(
            snapshot_url,
            snapshot_schema=snapshot_schema,
            tables=sorted(written),
            table_actions=actions,
        )
    return written, checks


def checks_as_dicts(checks: list[CheckResult]) -> list[dict]:
    return [asdict(c) for c in checks]
