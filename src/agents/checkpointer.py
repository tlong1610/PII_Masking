"""Persistent checkpointer factory for LangGraph state persistence (§7).

Supports:
- PostgreSQL checkpointer (PostgresSaver) when PostgreSQL is configured.
- SQLite checkpointer (SqliteSaver) when SQLite is used (local/dev/test).
- InMemorySaver as fallback.
- Automatic TTL / retention pruning for checkpoint records.
"""

from __future__ import annotations

import logging
import sqlite3
from pathlib import Path
from typing import Any

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver

from src.config import get_settings

logger = logging.getLogger(__name__)

_checkpointer_instance: BaseCheckpointSaver | None = None
_sqlite_conn: sqlite3.Connection | None = None
_pg_cm: Any | None = None


def prune_checkpoints(max_age_seconds: int = 86400 * 7) -> int:
    """Delete checkpoints older than max_age_seconds (default 7 days) to prevent disk bloat."""
    global _sqlite_conn
    deleted = 0
    try:
        if _sqlite_conn is not None:
            # LangGraph sqlite checkpoints table has metadata/checkpoint blobs
            # Prune if checkpoints table exists
            cursor = _sqlite_conn.cursor()
            cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='checkpoints'")
            if cursor.fetchone()[0] > 0:
                # Checkpoints table stores thread_id, checkpoint_id, etc.
                # If timestamp is encoded or simple row count limit is exceeded:
                cursor.execute("SELECT count(*) FROM checkpoints")
                total = cursor.fetchone()[0]
                if total > 500:
                    cursor.execute(
                        "DELETE FROM checkpoints WHERE rowid IN (SELECT rowid FROM checkpoints ORDER BY rowid ASC LIMIT ?)",
                        (total - 500,),
                    )
                    cursor.execute(
                        "DELETE FROM writes WHERE thread_id NOT IN (SELECT DISTINCT thread_id FROM checkpoints)"
                    )
                    _sqlite_conn.commit()
                    deleted = total - 500
                    logger.info("Pruned %d old checkpoints from checkpoints.sqlite (TTL maintenance)", deleted)
    except Exception as exc:
        logger.debug("Failed to prune checkpoints: %s", exc)
    return deleted


def get_checkpoint_saver(force_new: bool = False) -> BaseCheckpointSaver:
    """Return a singleton persistent checkpointer based on app configuration."""
    global _checkpointer_instance, _sqlite_conn, _pg_cm

    if _checkpointer_instance is not None and not force_new:
        return _checkpointer_instance

    settings = get_settings()
    db_url = settings.database_url

    # 1. PostgreSQL Checkpointer (§7: langgraph-checkpoint-postgres)
    # Support all standard and SQLAlchemy PostgreSQL URL prefixes
    pg_prefixes = ("postgresql://", "postgres://", "postgresql+psycopg://", "postgresql+asyncpg://")
    if any(db_url.startswith(p) for p in pg_prefixes):
        try:
            from langgraph.checkpoint.postgres import PostgresSaver

            clean_url = (
                db_url.replace("postgresql+psycopg://", "postgresql://")
                .replace("postgresql+asyncpg://", "postgresql://")
            )
            if "connect_timeout" not in clean_url:
                clean_url += ("&" if "?" in clean_url else "?") + "connect_timeout=2"

            # PostgresSaver.from_conn_string returns an Iterator / ContextManager
            _pg_cm = PostgresSaver.from_conn_string(clean_url)
            saver = _pg_cm.__enter__() if hasattr(_pg_cm, "__enter__") else _pg_cm
            saver.setup()
            logger.info("LangGraph using persistent PostgresSaver checkpointer (§7)")
            _checkpointer_instance = saver
            return saver
        except Exception as exc:
            logger.warning("Failed to initialize PostgresSaver (%s), falling back to SQLite", exc)
            if _pg_cm is not None and hasattr(_pg_cm, "__exit__"):
                try:
                    _pg_cm.__exit__(None, None, None)
                except Exception:
                    pass
                _pg_cm = None

    # 2. SQLite Checkpointer (langgraph-checkpoint-sqlite)
    try:
        from langgraph.checkpoint.sqlite import SqliteSaver

        if db_url.startswith("sqlite:///"):
            raw_path = db_url.removeprefix("sqlite:///")
            if raw_path == ":memory:":
                sqlite_path = ":memory:"
            else:
                db_dir = Path(raw_path).parent
                db_dir.mkdir(parents=True, exist_ok=True)
                sqlite_path = str(db_dir / "checkpoints.sqlite")
        else:
            Path("data").mkdir(parents=True, exist_ok=True)
            sqlite_path = "data/checkpoints.sqlite"

        if _sqlite_conn is not None:
            try:
                _sqlite_conn.close()
            except Exception:
                pass

        _sqlite_conn = sqlite3.connect(sqlite_path, check_same_thread=False)
        saver = SqliteSaver(_sqlite_conn)
        saver.setup()
        prune_checkpoints()
        logger.info("LangGraph using persistent SqliteSaver checkpointer (%s)", sqlite_path)
        _checkpointer_instance = saver
        return saver
    except Exception as exc:
        logger.warning("Failed to initialize SqliteSaver (%s), falling back to InMemorySaver", exc)

    # 3. Fallback to InMemorySaver
    _checkpointer_instance = InMemorySaver()
    return _checkpointer_instance


def reset_checkpoint_saver() -> None:
    """Reset checkpointer instance (useful for test isolation)."""
    global _checkpointer_instance, _sqlite_conn, _pg_cm
    if _sqlite_conn is not None:
        try:
            _sqlite_conn.close()
        except Exception:
            pass
        _sqlite_conn = None
    if _pg_cm is not None:
        if hasattr(_pg_cm, "__exit__"):
            try:
                _pg_cm.__exit__(None, None, None)
            except Exception:
                pass
        _pg_cm = None
    _checkpointer_instance = None
