"""Database engine and session helpers for app metadata."""

from collections.abc import Generator

from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import Session, sessionmaker

from src.config import get_settings
from src.db.base import Base
from src.db.models import DemoUser

_engine = None
_SessionLocal: sessionmaker[Session] | None = None

DEMO_USERS = (
    {"username": "dpo", "password": "dpo123", "role": "DPO"},
    {"username": "analyst", "password": "analyst123", "role": "ANALYST"},
)


def sqlalchemy_url(url: str) -> str:
    """Pin plain Postgres URLs (e.g. Render's connectionString) to psycopg 3, the only driver installed.

    SQLAlchemy reads "postgresql://" as psycopg2, which the Render image does not ship.
    """
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url.removeprefix(prefix)
    return url


def get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        settings = get_settings()
        connect_args = {}
        if settings.database_url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        _engine = create_engine(sqlalchemy_url(settings.database_url), connect_args=connect_args)
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    get_engine()
    assert _SessionLocal is not None
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()


def reset_engine() -> None:
    """Reset engine (used by tests when DATABASE_URL changes)."""
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None


def seed_demo_users(db: Session) -> None:
    settings = get_settings()
    if settings.app_env.lower() == "production" and not settings.seed_demo_users:
        return
    for row in DEMO_USERS:
        exists = db.scalar(select(DemoUser).where(DemoUser.username == row["username"]))
        if exists is None:
            db.add(DemoUser(**row))
    db.commit()


# Nullable columns added after a table first shipped. create_all() never alters existing tables and there
# are no migrations, so they are added here; each entry is (table, column, SQL type).
_ADDED_COLUMNS: tuple[tuple[str, str, str], ...] = (
    ("field_profiles", "confidence_score", "FLOAT"),
)


def _add_missing_columns(engine) -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table, column, sql_type in _ADDED_COLUMNS:
            if table not in tables:
                continue
            if column not in {c["name"] for c in inspector.get_columns(table)}:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type}"))


def init_db() -> None:
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    _add_missing_columns(engine)
    db = get_session_factory()()
    try:
        seed_demo_users(db)
    finally:
        db.close()
