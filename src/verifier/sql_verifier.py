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
) -> list[CheckResult]:
    expected = load_expected()
    return [
        verify_join_hmac(snapshot_url, snapshot_schema=snapshot_schema, expected=expected),
        verify_aggregate_revenue(
            snapshot_url, snapshot_schema=snapshot_schema, expected=expected
        ),
    ]


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
