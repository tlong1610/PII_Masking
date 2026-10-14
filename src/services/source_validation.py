"""Validate and probe user-supplied source URLs. Errors never include the URL or password."""

from __future__ import annotations

import ipaddress
import re
import socket
from dataclasses import dataclass
from urllib.parse import parse_qs, unquote, urlparse

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
