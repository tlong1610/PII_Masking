"""Print raw PII samples from the read-only source DB as JSON, for leak checks in the E2E suite.

The suite only tests whether these values appear on screen or in downloads; it never prints them.
Run from the repo root: PYTHONPATH=. .venv/bin/python release/qa/scripts/sample_raw_pii.py
"""

from __future__ import annotations

import json

import psycopg
from psycopg import sql

from src.config import get_settings

# orders.ship_name is left out on purpose: in the Northwind seed it holds the customer's company name,
# which is not personal data and legitimately stays readable in customers.company_name (KEEP).
COLUMNS = {
    "customers": ["contact_name", "address", "phone", "email", "mobile_phone", "cccd", "tax_code"],
    "orders": ["ship_address", "ship_phone", "customer_cccd"],
}
PER_COLUMN = 15


def main() -> None:
    settings = get_settings()
    samples: dict[str, list[str]] = {}
    with psycopg.connect(settings.source_database_url) as conn:
        conn.read_only = True
        for table, columns in COLUMNS.items():
            for column in columns:
                query = sql.SQL(
                    "SELECT DISTINCT {col}::text FROM {schema}.{table} "
                    "WHERE {col} IS NOT NULL AND length({col}::text) >= 6 LIMIT %s"
                ).format(
                    col=sql.Identifier(column),
                    schema=sql.Identifier(settings.pg_schema),
                    table=sql.Identifier(table),
                )
                rows = conn.execute(query, (PER_COLUMN,)).fetchall()
                samples[f"{table}.{column}"] = [r[0] for r in rows]
    print(json.dumps(samples, ensure_ascii=False))


if __name__ == "__main__":
    main()
