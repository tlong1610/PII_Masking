"""Read-only SQL access for Analysts to the protected snapshot store.

Each published Postgres dataset gets a schema ``ds_<dataset id>`` of views over its snapshot
tables, so the name an Analyst queries never changes when the DPO rebuilds it. Each Analyst who
asks for access gets one Postgres login role that can only SELECT from the ``ds_*`` schemas of
the datasets they are granted; the snapshot schemas and the app's own tables stay private.

Revoking a dataset drops its snapshot schema, which (CASCADE) drops the views and every
privilege on them, so a revoke never depends on this module succeeding.
"""

from __future__ import annotations

import re
import secrets
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlsplit

from psycopg import sql

from src.config import get_settings

ROLE_PREFIX = "piiguard_analyst_"
DATASET_SCHEMA = re.compile(r"ds_\d+")
# Analyst sessions cannot write, hold many connections or run away with the server.
_ROLE_LIMITS = (
    "ALTER ROLE {role} SET default_transaction_read_only = on",
    "ALTER ROLE {role} SET statement_timeout = '60s'",
    "ALTER ROLE {role} SET idle_in_transaction_session_timeout = '60s'",
)


@dataclass(frozen=True)
class ConnectionInfo:
    host: str
    port: int
    database: str
    sslmode: str


def enabled() -> bool:
    settings = get_settings()
    return bool(settings.enable_analyst_sql and settings.snapshot_database_url)


def role_name(user_id: int) -> str:
    return f"{ROLE_PREFIX}{int(user_id)}"


def dataset_schema(dataset_id: int) -> str:
    return f"ds_{int(dataset_id)}"


def snapshot_location(output_location: str) -> tuple[str, list[str]] | None:
    """(snapshot schema, tables) of a Postgres snapshot, None for Mongo/stub/revoked datasets."""
    if not output_location.startswith("postgres://"):
        return None
    schema, _, tables = output_location.removeprefix("postgres://").partition("/")
    names = [t for t in tables.split(",") if t]
    return (schema, names) if schema and names else None


def connection_info() -> ConnectionInfo:
    """Where Analysts connect: the snapshot server, with a public host/port when one is configured."""
    settings = get_settings()
    parts = urlsplit(settings.snapshot_database_url)
    return ConnectionInfo(
        host=settings.analyst_sql_host or parts.hostname or "",
        port=settings.analyst_sql_port or parts.port or 5432,
        database=parts.path.lstrip("/") or "postgres",
        sslmode=settings.analyst_sql_sslmode,
    )


def connect() -> Any:
    import psycopg

    return psycopg.connect(get_settings().snapshot_database_url, autocommit=True, connect_timeout=10)


def publish_views(conn: Any, dataset_id: int, snapshot_schema: str, tables: Iterable[str]) -> bool:
    """(Re)create ds_<id> with one view per snapshot table; nobody may use it until granted.

    Tables missing from the snapshot are skipped; with none left the schema is dropped and
    False is returned, so one stale dataset never breaks an Analyst's other datasets.
    """
    present = {
        row[0]
        for row in conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = %s", (snapshot_schema,)
        ).fetchall()
    }
    wanted = [t for t in tables if t in present]
    if not wanted:
        drop_views(conn, dataset_id)
        return False
    schema = sql.Identifier(dataset_schema(dataset_id))
    conn.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(schema))
    conn.execute(sql.SQL("REVOKE ALL ON SCHEMA {} FROM PUBLIC").format(schema))
    for table in wanted:
        conn.execute(
            sql.SQL("CREATE OR REPLACE VIEW {}.{} AS SELECT * FROM {}.{}").format(
                schema, sql.Identifier(table), sql.Identifier(snapshot_schema), sql.Identifier(table)
            )
        )
    return True


def drop_views(conn: Any, dataset_id: int) -> None:
    conn.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(dataset_schema(dataset_id))))


def role_exists(conn: Any, user_id: int) -> bool:
    return conn.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (role_name(user_id),)).fetchone() is not None


def issue_password(conn: Any, user_id: int) -> str:
    """Create the Analyst's login role, or give it a new password. The password is never stored."""
    password = secrets.token_urlsafe(24)
    role = sql.Identifier(role_name(user_id))
    verb = "ALTER" if role_exists(conn, user_id) else "CREATE"
    conn.execute(
        sql.SQL(verb + " ROLE {} LOGIN NOINHERIT CONNECTION LIMIT 3 PASSWORD {}").format(role, sql.Literal(password))
    )
    for statement in _ROLE_LIMITS:
        conn.execute(sql.SQL(statement).format(role=role))
    return password


def _granted_schemas(conn: Any, user_id: int) -> set[str]:
    rows = conn.execute(
        "SELECT nspname FROM pg_namespace WHERE nspname ~ '^ds_[0-9]+$' AND has_schema_privilege(%s, oid, 'USAGE')",
        (role_name(user_id),),
    ).fetchall()
    return {row[0] for row in rows}


def _existing_schemas(conn: Any, dataset_ids: Iterable[int]) -> set[str]:
    wanted = [dataset_schema(i) for i in dataset_ids]
    if not wanted:
        return set()
    rows = conn.execute("SELECT nspname FROM pg_namespace WHERE nspname = ANY(%s)", (wanted,)).fetchall()
    return {row[0] for row in rows}


def sync_role(conn: Any, user_id: int, dataset_ids: Iterable[int]) -> list[str]:
    """Make the role able to read exactly these datasets' views. No role yet: nothing to do.

    Returns the schemas the role can read afterwards.
    """
    if not role_exists(conn, user_id):
        return []
    role = sql.Identifier(role_name(user_id))
    wanted = _existing_schemas(conn, dataset_ids)
    for schema in sorted(_granted_schemas(conn, user_id) - wanted):
        name = sql.Identifier(schema)
        conn.execute(sql.SQL("REVOKE SELECT ON ALL TABLES IN SCHEMA {} FROM {}").format(name, role))
        conn.execute(sql.SQL("REVOKE USAGE ON SCHEMA {} FROM {}").format(name, role))
    for schema in sorted(wanted):
        name = sql.Identifier(schema)
        conn.execute(sql.SQL("GRANT USAGE ON SCHEMA {} TO {}").format(name, role))
        conn.execute(sql.SQL("GRANT SELECT ON ALL TABLES IN SCHEMA {} TO {}").format(name, role))
    return sorted(wanted)
