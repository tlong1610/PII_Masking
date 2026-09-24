import os
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Use isolated SQLite DB for tests before app imports engine.
os.environ["DATABASE_URL"] = "sqlite:///./data/test_sessions.db"
os.environ["APP_ENV"] = "test"

from src.api.session_store import clear_sessions
from src.config import get_settings
from src.db.session import init_db, reset_engine

get_settings.cache_clear()
reset_engine()
init_db()

from src.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def _clean_sessions():
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
