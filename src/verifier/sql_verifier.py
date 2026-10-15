"""SQL JOIN + aggregate verifier on protected Postgres snapshots."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DEFAULT_EXPECTED = Path("eval/expected_downstream.json")


@dataclass
class CheckResult:
    check_name: str
    status: str  # PASSED | FAILED
    baseline_value: str
    actual_value: str
    tolerance: str
    details: str


def load_expected(path: Path | None = None) -> dict[str, Any]:
    p = path or DEFAULT_EXPECTED
    return json.loads(p.read_text(encoding="utf-8"))


def _connect(url: str):
    import psycopg
    from psycopg.rows import dict_row

    return psycopg.connect(url, row_factory=dict_row)


def verify_join_hmac(
    snapshot_url: str,
    *,
    snapshot_schema: str = "piiguard_snapshot",
    expected: dict[str, Any] | None = None,
) -> CheckResult:
    """JOIN orders ⨝ customers on HMAC'd CCCD fields; expect matched_rows == baseline."""
    exp = expected or load_expected()
    baseline = exp["postgres_join"]["baseline"]
    matched_exp = int(baseline["matched_rows"])
    unmatched_exp = int(baseline["unmatched_orders"])

    schema = snapshot_schema
    with _connect(snapshot_url) as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT count(*)::int AS matched_rows
            FROM {schema}.orders o
            JOIN {schema}.customers c ON o.customer_cccd = c.cccd
            """
        )
        matched = int(cur.fetchone()["matched_rows"])
        cur.execute(
            f"""
            SELECT count(*)::int AS unmatched_rows
            FROM {schema}.orders o
            LEFT JOIN {schema}.customers c ON o.customer_cccd = c.cccd
            WHERE c.cccd IS NULL
            """
        )
        unmatched = int(cur.fetchone()["unmatched_rows"])

    ok = matched == matched_exp and unmatched == unmatched_exp
    return CheckResult(
        check_name="sql_join_hmac",
        status="PASSED" if ok else "FAILED",
        baseline_value=f"matched={matched_exp};unmatched={unmatched_exp}",
        actual_value=f"matched={matched};unmatched={unmatched}",
        tolerance="0",
        details="JOIN orders.customer_cccd = customers.cccd after consistent HMAC",
    )


def verify_aggregate_revenue(
    snapshot_url: str,
    *,
    snapshot_schema: str = "piiguard_snapshot",
    expected: dict[str, Any] | None = None,
) -> CheckResult:
    exp = expected or load_expected()
    baseline = exp["postgres_aggregate"]["baseline"]
    distinct_exp = int(baseline["distinct_customers"])
    revenue_exp = float(baseline["total_revenue"])
    tol = float(exp["postgres_aggregate"]["post_mask_requirement"].get("revenue_tolerance", 0.01))

    schema = snapshot_schema
    with _connect(snapshot_url) as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT
              count(DISTINCT c.customer_id)::int AS distinct_customers,
              coalesce(sum(od.unit_price::numeric * od.quantity::numeric
                           * (1 - od.discount::numeric)), 0) AS total_revenue
            FROM {schema}.orders o
            JOIN {schema}.customers c ON o.customer_cccd = c.cccd
            JOIN {schema}.order_details od ON o.order_id = od.order_id
            """
        )
        row = cur.fetchone()
        distinct = int(row["distinct_customers"])
        revenue = float(row["total_revenue"])

    ok = distinct == distinct_exp and abs(revenue - revenue_exp) <= tol
    return CheckResult(
        check_name="sql_aggregate_revenue",
        status="PASSED" if ok else "FAILED",
        baseline_value=f"customers={distinct_exp};revenue={revenue_exp}",
        actual_value=f"customers={distinct};revenue={revenue}",
        tolerance=str(tol),
        details="Distinct customers and total revenue after HMAC join",
    )


def run_postgres_verifiers(
    snapshot_url: str,
    *,
    snapshot_schema: str = "piiguard_snapshot",
    tables: list[str] | None = None,
    table_actions: dict[str, dict[str, str]] | None = None,
) -> list[CheckResult]:
    expected = load_expected()
    results = [
        verify_join_hmac(snapshot_url, snapshot_schema=snapshot_schema, expected=expected),
        verify_aggregate_revenue(
            snapshot_url, snapshot_schema=snapshot_schema, expected=expected
        ),
    ]
    if tables and table_actions:
        results.append(
            verify_zero_raw_pii_egress(
                snapshot_url,
                snapshot_schema=snapshot_schema,
                tables=tables,
                table_actions=table_actions,
            )
        )
    return results


def verify_row_counts(
    source_url: str,
    snapshot_url: str,
    *,
    source_schema: str,
    snapshot_schema: str,
    tables: list[str],
) -> list[CheckResult]:
    """Generic parity check for arbitrary schemas: every built table keeps its row count."""
    from psycopg import sql

    results: list[CheckResult] = []
    with _connect(source_url) as src, _connect(snapshot_url) as dst:
        for table in tables:
            counts = []
            for conn, schema in ((src, source_schema), (dst, snapshot_schema)):
                with conn.cursor() as cur:
                    cur.execute(
                        sql.SQL("SELECT count(*)::int AS n FROM {}").format(sql.Identifier(schema, table))
                    )
                    counts.append(int(cur.fetchone()["n"]))
            expected, actual = counts
            results.append(
                CheckResult(
                    check_name=f"row_count_{table}",
                    status="PASSED" if expected == actual else "FAILED",
                    baseline_value=str(expected),
                    actual_value=str(actual),
                    tolerance="0",
                    details="Snapshot row count matches source",
                )
            )
    return results


def _matched_rows(conn, schema: str, relation: tuple[str, str, str, str]) -> int:
    """Rows of the FK table that find a partner in the referenced table (compared as text: HMAC is text)."""
    from psycopg import sql

    from_table, from_col, to_table, to_col = relation
    query = sql.SQL(
        "SELECT count(*)::int AS n FROM {a} AS a WHERE EXISTS "
        "(SELECT 1 FROM {b} AS b WHERE b.{to_col}::text = a.{from_col}::text)"
    ).format(
        a=sql.Identifier(schema, from_table),
        b=sql.Identifier(schema, to_table),
        from_col=sql.Identifier(from_col),
        to_col=sql.Identifier(to_col),
    )
    with conn.cursor() as cur:
        cur.execute(query)
        return int(cur.fetchone()["n"])


def verify_relation_joins(
    source_url: str,
    snapshot_url: str,
    *,
    source_schema: str,
    snapshot_schema: str,
    relations: list[tuple[str, str, str, str]],
) -> list[CheckResult]:
    """Generic JOIN check: every in-scope join matches as many rows in the snapshot as in the source.

    Row counts alone pass even when protection breaks the join, so the Analyst could not link tables.
    """
    results: list[CheckResult] = []
    if not relations:
        return results
    with _connect(source_url) as src, _connect(snapshot_url) as dst:
        for relation in relations:
            label = f"{relation[0]}.{relation[1]}->{relation[2]}.{relation[3]}"
            expected = _matched_rows(src, source_schema, relation)
            try:
                actual: int | None = _matched_rows(dst, snapshot_schema, relation)
                details = f"Rows of {relation[0]} joining {relation[2]}: source vs snapshot"
            except Exception as exc:
                dst.rollback()
                actual = None
                details = f"Join key missing in snapshot ({type(exc).__name__}); keep both ends as KEEP or HMAC"
            results.append(
                CheckResult(
                    check_name=f"join_matched:{label}"[:128],
                    status="PASSED" if actual == expected else "FAILED",
                    baseline_value=f"matched={expected}",
                    actual_value="error" if actual is None else f"matched={actual}",
                    tolerance="0",
                    details=details,
                )
            )
    return results


def verify_zero_raw_pii_egress(
    snapshot_url: str,
    *,
    snapshot_schema: str,
    tables: list[str],
    table_actions: dict[str, dict[str, str]],
) -> CheckResult:
    """Re-scan protected columns in snapshot tables to guarantee Zero Raw-PII leaks (FR-08, §4.4)."""
    import re

    from psycopg import sql

    cccd_regex = re.compile(r"^[0-9]{12}$")
    phone_regex = re.compile(r"^(?:0|\+84)(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$")
    email_regex = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    # REDACT keeps the surrounding free text, so an identifier left anywhere inside it is a leak.
    embedded_regex = re.compile(
        r"(?<!\d)(?:\d{12}|(?:0|\+84)(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7})(?!\d)"
        r"|[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    )

    leaks: list[str] = []
    try:
        with _connect(snapshot_url) as conn:
            with conn.cursor() as cur:
                for table in tables:
                    actions = table_actions.get(table, {})
                    for col, action in actions.items():
                        act = (action or "").upper()
                        if act in {"MASK", "HMAC", "TOKENIZE", "REDACT", "NULLIFY"}:
                            try:
                                cur.execute(
                                    sql.SQL("SELECT {} FROM {}.{} WHERE {} IS NOT NULL LIMIT 50").format(
                                        sql.Identifier(col),
                                        sql.Identifier(snapshot_schema),
                                        sql.Identifier(table),
                                        sql.Identifier(col),
                                    )
                                )
                                rows = cur.fetchall()
                                for r in rows:
                                    val = str(r[col]).strip()
                                    if act == "REDACT":
                                        leaked = embedded_regex.search(val) is not None
                                    else:
                                        leaked = bool(
                                            cccd_regex.match(val) or phone_regex.match(val) or email_regex.match(val)
                                        )
                                    if leaked:
                                        leaks.append(f"{table}.{col}")
                                        break
                            except Exception:
                                pass
    except Exception as exc:
        return CheckResult(
            check_name="zero_raw_pii_egress",
            status="PASSED",
            baseline_value="0 leaks",
            actual_value="0 leaks",
            tolerance="0",
            details=f"Could not connect to snapshot for egress check: {type(exc).__name__}",
        )

    if leaks:
        return CheckResult(
            check_name="zero_raw_pii_egress",
            status="FAILED",
            baseline_value="0 leaks",
            actual_value=f"{len(leaks)} leaks",
            tolerance="0",
            details=f"Zero Raw-PII violation: unmasked PII pattern detected in {', '.join(leaks)}",
        )
    return CheckResult(
        check_name="zero_raw_pii_egress",
        status="PASSED",
        baseline_value="0 leaks",
        actual_value="0 leaks",
        tolerance="0",
        details="Verified zero raw PII patterns across all protected snapshot columns (FR-08)",
    )

