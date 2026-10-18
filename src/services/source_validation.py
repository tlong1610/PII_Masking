"""Validate and probe user-supplied source URLs. Errors never include the URL or password."""

from __future__ import annotations

import ipaddress
import re
import socket
from dataclasses import dataclass
from urllib.parse import parse_qs, unquote, urlparse, urlunparse

from src.config import get_settings

_PG_SCHEMES = {"postgresql", "postgres"}
_MONGO_SCHEMES = {"mongodb", "mongodb+srv"}


class SourceUrlError(ValueError):
    """Invalid or disallowed source URL. The message is safe to return to the client."""


@dataclass(frozen=True)
class ParsedSource:
    engine: str  # postgresql | mongodb
    source_type: str  # SQL | NOSQL
    host_hint: str  # host[:port]/db — no credentials
    default_namespace: str  # Postgres: schema from URL query or "public"; Mongo: db from URL path or ""


def normalize_source_url(url: str) -> str:
    """Normalize URLs, e.g. converting IPv6-only Supabase direct hosts to the IPv4 session pooler."""
    try:
        parsed = urlparse(url.strip())
        host = (parsed.hostname or "").lower()
        if host.startswith("db.") and host.endswith(".supabase.co"):
            parts = host.split(".")
            if len(parts) >= 3:
                project_ref = parts[1]
                user = f"postgres.{project_ref}"
                password = parsed.password or ""
                # Use pooler for region ap-northeast-2
                netloc = f"{user}:{password}@aws-0-ap-northeast-2.pooler.supabase.com:5432"
                query = parsed.query
                if "sslmode" not in query:
                    query = (query + "&sslmode=require").lstrip("&")
                return urlunparse(
                    (parsed.scheme, netloc, parsed.path or "/postgres", parsed.params, query, parsed.fragment)
                )
    except Exception:
        pass
    return url.strip()


def _is_private_host(host: str) -> bool:
    if host in {"localhost", ""}:
        return True
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError:
        return False  # unresolved here; connection test will fail with a clear error
    for info in infos:
        addr = ipaddress.ip_address(info[4][0])
        if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved:
            return True
    return False


_SEARCH_PATH = re.compile(r"-c\s*search_path\s*=\s*([^\s]+)", re.IGNORECASE)


def _pg_schema_from_query(query: str) -> str:
    """First schema of `options=-c search_path=...` or `currentSchema=...` (JDBC style), else ""."""
    params = parse_qs(query)
    candidates = [m.group(1) for v in params.get("options", []) if (m := _SEARCH_PATH.search(v))]
    candidates += params.get("currentSchema", [])
    for value in candidates:
        for schema in (s.strip().strip('"') for s in value.split(",")):
            if schema and schema != "$user":
                return schema
    return ""


def parse_source_url(url: str) -> ParsedSource:
    url = normalize_source_url(url)
    try:
        parsed = urlparse(url.strip())
        scheme = parsed.scheme.lower()
        host = parsed.hostname or ""
        port = parsed.port
    except ValueError:
        raise SourceUrlError("Malformed connection URL") from None

    if scheme in _PG_SCHEMES:
        engine, source_type = "postgresql", "SQL"
    elif scheme in _MONGO_SCHEMES:
        engine, source_type = "mongodb", "NOSQL"
    else:
        raise SourceUrlError("Unsupported scheme: use postgresql:// or mongodb://")
    if not host:
        raise SourceUrlError("Connection URL must include a host")

    if not get_settings().allow_private_source_hosts and _is_private_host(host):
        raise SourceUrlError("Private or loopback hosts are not allowed")

    db = unquote(parsed.path.strip("/").split("/")[0]) if parsed.path.strip("/") else ""
    if engine == "mongodb" and not db:
        settings = get_settings()
        db = settings.mongo_db or "mydatabase"
    hint = host + (f":{port}" if port else "") + (f"/{db}" if db else "")
    default_ns = (_pg_schema_from_query(parsed.query) or "public") if engine == "postgresql" else db
    return ParsedSource(engine, source_type, hint, default_ns)


def assert_not_snapshot_target(url: str) -> None:
    """The source must never be the server's own snapshot write target."""
    settings = get_settings()
    if settings.snapshot_database_url and url.strip() == settings.snapshot_database_url.strip():
        raise SourceUrlError("Source URL must differ from the snapshot target")


def probe_connection(url: str, engine: str) -> None:
    """Open a short-lived connection. Raises SourceUrlError with a sanitized message on failure."""
    try:
        if engine == "postgresql":
            import psycopg

            with psycopg.connect(url, connect_timeout=5) as conn:
                conn.execute("SELECT 1")
        else:
            from pymongo import MongoClient

            client = MongoClient(url, serverSelectionTimeoutMS=5000)
            try:
                client.admin.command("ping")
            finally:
                client.close()
    except Exception as exc:  # driver messages can echo the URL/password — report the type only
        raise SourceUrlError(f"Cannot connect to source ({type(exc).__name__})") from None


def probe_namespace(url: str, engine: str, namespace: str) -> None:
    """The Postgres schema / Mongo database must exist. Messages name only the namespace."""
    try:
        if engine == "postgresql":
            import psycopg

            with psycopg.connect(url, connect_timeout=5) as conn:
                found = conn.execute(
                    "SELECT 1 FROM information_schema.schemata WHERE schema_name = %s", (namespace,)
                ).fetchone()
        else:
            from pymongo import MongoClient

            client = MongoClient(url, serverSelectionTimeoutMS=5000)
            try:
                try:
                    names = client.list_database_names()
                except Exception:  # user may lack listDatabases; fall back to the db itself
                    names = [namespace] if client[namespace].list_collection_names() else []
            finally:
                client.close()
            found = namespace in names
    except Exception as exc:  # driver messages can echo the URL/password — report the type only
        raise SourceUrlError(f"Cannot inspect source ({type(exc).__name__})") from None
    if not found:
        kind = "Schema" if engine == "postgresql" else "Database"
        raise SourceUrlError(f"{kind} '{namespace}' not found in source")


_PG_SYSTEM_SCHEMAS = frozenset(
    {
        "pg_catalog",
        "information_schema",
        # Managed by Supabase (auth, storage, realtime, ...), never business data to scan.
        "auth",
        "extensions",
        "graphql",
        "graphql_public",
        "net",
        "pgbouncer",
        "pgsodium",
        "pgsodium_masks",
        "realtime",
        "storage",
        "supabase_functions",
        "supabase_migrations",
        "vault",
        "cron",
    }
)
_MONGO_SYSTEM_DATABASES = {"admin", "local", "config"}


def list_namespaces(url: str, engine: str, default: str = "") -> list[str]:
    """Schemas (Postgres) or databases (Mongo) the DPO can pick, names only.

    System namespaces and PIIGuard's own snapshot targets are left out. If listing is not
    permitted, fall back to the namespace in the URL so the form still has one option.
    """
    settings = get_settings()
    snapshot_prefixes = tuple(p for p in (settings.snapshot_schema, settings.mongo_snapshot_db) if p)
    try:
        if engine == "postgresql":
            import psycopg

            with psycopg.connect(url, connect_timeout=5) as conn:
                rows = conn.execute(
                    "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name"
                ).fetchall()
            names = [
                r[0]
                for r in rows
                if r[0] not in _PG_SYSTEM_SCHEMAS and not r[0].startswith(("pg_toast", "pg_temp"))
            ]
        else:
            from pymongo import MongoClient

            client = MongoClient(url, serverSelectionTimeoutMS=5000)
            try:
                names = sorted(n for n in client.list_database_names() if n not in _MONGO_SYSTEM_DATABASES)
            finally:
                client.close()
    except Exception:  # listing is a convenience: lacking the privilege must not fail the test
        names = []
    # User Mongo sources snapshot into "<db>_protected_run<id>" on their own cluster (see sources.py).
    names = [
        n
        for n in names
        if not (snapshot_prefixes and n.startswith(snapshot_prefixes)) and "_protected_run" not in n
    ]
    if default and default not in names:
        names.insert(0, default)
    return names
