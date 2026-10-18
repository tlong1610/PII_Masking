"""Print row counts of the given source tables as JSON, so the E2E suite can check exports are complete.

Run from the repo root: PYTHONPATH=. .venv/bin/python release/qa/scripts/source_row_counts.py customers orders
"""

from __future__ import annotations

import json
import sys

import psycopg
from psycopg import sql

from src.config import get_settings


def main(tables: list[str]) -> None:
    settings = get_settings()
    counts: dict[str, int] = {}
    with psycopg.connect(settings.source_database_url) as conn:
        conn.read_only = True
        for table in tables:
            query = sql.SQL("SELECT count(*) FROM {schema}.{table}").format(
                schema=sql.Identifier(settings.pg_schema), table=sql.Identifier(table)
            )
            counts[table] = conn.execute(query).fetchone()[0]
    print(json.dumps(counts))


if __name__ == "__main__":
    main(sys.argv[1:])
