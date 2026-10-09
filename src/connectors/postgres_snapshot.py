"""Read source Postgres tables and write protected snapshots to a separate target."""

from __future__ import annotations

import logging
from typing import Any

from psycopg import sql
from psycopg.rows import dict_row

logger = logging.getLogger(__name__)

# Demo scope for P0 verifier (customers ⨝ orders on CCCD).
DEMO_SNAPSHOT_TABLES = ("customers", "orders", "order_details")


def _connect(connection_string: str):
    import psycopg

    return psycopg.connect(connection_string, row_factory=dict_row)


def assert_source_read_only(source_url: str, snapshot_url: str) -> None:
    """Refuse to use the same DB/URL for source and snapshot write target."""
    if source_url.strip() == snapshot_url.strip():
        raise ValueError("Snapshot URL must differ from source URL (no overwrite of source)")


def fetch_table_rows(conn, table: str, schema: str = "public") -> tuple[list[str], list[dict[str, Any]]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = %s AND table_name = %s
            ORDER BY ordinal_position
            """,
            (schema, table),
        )
        columns = [r["column_name"] for r in cur.fetchall()]
        if not columns:
            raise ValueError(f"Table not found: {schema}.{table}")

        query = sql.SQL("SELECT {} FROM {}").format(
            sql.SQL(", ").join(sql.Identifier(c) for c in columns),
            sql.Identifier(schema, table),
        )
        cur.execute(query)
        rows = list(cur.fetchall())
    return columns, rows


def ensure_snapshot_schema(conn, snapshot_schema: str = "piiguard_snapshot") -> None:
    with conn.cursor() as cur:
        cur.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(sql.Identifier(snapshot_schema)))
    conn.commit()


def reset_snapshot_schema(conn, snapshot_schema: str = "piiguard_snapshot") -> None:
    """Recreate the snapshot schema so tables from an earlier build cannot be verified."""
    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(snapshot_schema))
        )
    conn.commit()
    ensure_snapshot_schema(conn, snapshot_schema)


def write_snapshot_table(
    conn,
    *,
    snapshot_schema: str,
    table: str,
    columns: list[str],
    rows: list[dict[str, Any]],
) -> str:
    """Drop+create table in snapshot schema and bulk insert. Returns qualified name."""
    if not columns:
        raise ValueError("No columns to write (all DROPped?)")

    qualified = f"{snapshot_schema}.{table}"
    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("DROP TABLE IF EXISTS {} CASCADE").format(
                sql.Identifier(snapshot_schema, table)
            )
        )
        # Store all values as TEXT for demo simplicity (HMAC digests / masked strings).
        col_defs = sql.SQL(", ").join(
            sql.SQL("{} TEXT").format(sql.Identifier(c)) for c in columns
        )
        cur.execute(
            sql.SQL("CREATE TABLE {} ({})").format(
                sql.Identifier(snapshot_schema, table),
                col_defs,
            )
        )
        if rows:
            insert = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
                sql.Identifier(snapshot_schema, table),
                sql.SQL(", ").join(sql.Identifier(c) for c in columns),
                sql.SQL(", ").join(sql.Placeholder() * len(columns)),
            )
            values = [[row.get(c) for c in columns] for row in rows]
            cur.executemany(insert, values)
    conn.commit()
    logger.info("Wrote snapshot table %s (%s rows)", qualified, len(rows))
    return qualified


def build_protected_snapshots(
    *,
    source_url: str,
    snapshot_url: str,
    table_actions: dict[str, dict[str, str]],
    secret: str,
    key_version: str,
    snapshot_schema: str = "piiguard_snapshot",
    tables: tuple[str, ...] = DEMO_SNAPSHOT_TABLES,
    source_schema: str = "public",
    default_action: str = "KEEP",
) -> dict[str, str]:
    """
    Read listed tables from source, apply per-table column actions, write to snapshot DB.

    table_actions: { table_name: { column_name: MASK|HMAC|DROP|KEEP } }
    default_action applies to source columns missing from table_actions.
    Returns map table -> qualified snapshot table name.
    """
    from src.transform.mask_engine import filter_columns, transform_rows

    assert_source_read_only(source_url, snapshot_url)

    written: dict[str, str] = {}
    with _connect(source_url) as src, _connect(snapshot_url) as dst:
        reset_snapshot_schema(dst, snapshot_schema)
        for table in tables:
            columns, rows = fetch_table_rows(src, table, schema=source_schema)
            actions = table_actions.get(table, {})
            col_actions = {c: actions.get(c, default_action) for c in columns}
            kept_cols = filter_columns(columns, col_actions)
            if not kept_cols:
                logger.info("Skipping snapshot table %s (every column DROP)", table)
                continue
            transformed = transform_rows(
                rows, col_actions, secret=secret, key_version=key_version
            )
            # Drop keys removed from rows
            cleaned = [{c: r[c] for c in kept_cols} for r in transformed]
            qname = write_snapshot_table(
                dst,
                snapshot_schema=snapshot_schema,
                table=table,
                columns=kept_cols,
                rows=cleaned,
            )
            written[table] = qname
    return written
