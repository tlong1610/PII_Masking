import os
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Use isolated SQLite DB for tests before app imports engine.
os.environ["DATABASE_URL"] = "sqlite:///./data/test_verifier.db"
os.environ["APP_ENV"] = "test"
os.environ["ENABLE_AI_SCAN"] = "false"
os.environ["ENABLE_PG_SNAPSHOT"] = "false"

from src.api.session_store import clear_sessions
from src.config import get_settings
from src.db.session import init_db, reset_engine

get_settings.cache_clear()
reset_engine()
init_db()

from src.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def _clean_sessions():
    from src.api.auth import reset_auth_rate_limiter

    # Each test logs in on its own; a shared login window would make the suite order-dependent.
    reset_auth_rate_limiter()
    clear_sessions()
    yield
    clear_sessions()


@pytest_asyncio.fixture
async def client():
    """Async HTTP client for testing API endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def live_mongo():
    """Skip unless the seeded MongoDB from MONGO_URI (docker compose) is reachable."""
    from pymongo import MongoClient

    uri = os.getenv("MONGO_URI", "mongodb://admin:admin@localhost:27017/?authSource=admin")
    client = MongoClient(uri, serverSelectionTimeoutMS=2000)
    try:
        client.admin.command("ping")
        client[os.getenv("MONGO_DB", "mydatabase")].list_collection_names()
    except Exception as exc:
        pytest.skip(f"Live MongoDB not available: {type(exc).__name__}")
    finally:
        client.close()


@pytest.fixture
def live_postgres():
    """Skip unless the seeded source DB and a separate snapshot DB (docker compose) are reachable."""
    import psycopg

    source = os.getenv(
        "PG_TEST_SOURCE_URL", "postgresql://postgres:postgres@localhost:5432/mydatabase"
    )
    snapshot = os.getenv(
        "PG_TEST_SNAPSHOT_URL", "postgresql://postgres:postgres@localhost:5432/snapshot_out"
    )
    try:
        with psycopg.connect(source, connect_timeout=2) as conn:
            conn.execute("SELECT customer_cccd FROM orders LIMIT 1")
        with psycopg.connect(snapshot, connect_timeout=2) as conn:
            conn.execute("SELECT 1")
    except Exception as exc:
        pytest.skip(f"Live PostgreSQL not available: {type(exc).__name__}")
    return {"source": source, "snapshot": snapshot}


@pytest.fixture
def mock_llm():
    """Mock LLM to avoid calling OpenAI during tests.

    Usage in test:
        def test_something(mock_llm):
            # LLM calls will return mock response instead of hitting OpenAI
            ...
    """
    mock = AsyncMock()
    mock.ainvoke.return_value = AsyncMock(content="Mocked LLM response")
    return mock
