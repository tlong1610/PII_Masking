"""Tests for Health Check Probes /healthz and /readyz (§17.1)."""

from unittest.mock import MagicMock

import pytest


@pytest.mark.asyncio
async def test_healthz_liveness_probe_root_and_api(client):
    """Liveness probe /healthz xác nhận tiến trình FastAPI còn sống (200 OK)."""
    # 1. Root /healthz (Kubernetes / Cloud Run probe chuẩn)
    res_root = await client.get("/healthz")
    assert res_root.status_code == 200
    data_root = res_root.json()
    assert data_root["status"] == "ok"
    assert "timestamp" in data_root
    assert data_root["version"] == "1.0.0"

    # 2. Prefixed /api/v1/healthz
    res_api = await client.get("/api/v1/healthz")
    assert res_api.status_code == 200
    data_api = res_api.json()
    assert data_api["status"] == "ok"


@pytest.mark.asyncio
async def test_readyz_readiness_probe_healthy(client, monkeypatch):
    """Readiness probe /readyz kiểm tra các kết nối phụ thuộc sẵn sàng phục vụ request."""
    monkeypatch.setenv("ENABLE_MONGO", "true")
    monkeypatch.setenv("MONGO_URI", "mongodb://dummy")
    from src.config import get_settings
    get_settings.cache_clear()

    class MockAdmin:
        def command(self, cmd):
            pass

    class MockMongoClient:
        def __init__(self, *args, **kwargs):
            self.admin = MockAdmin()

        def close(self):
            pass

    monkeypatch.setattr("pymongo.MongoClient", MockMongoClient)

    from unittest.mock import MagicMock

    from src.db import session as db_session
    from src.main import app

    def mock_get_db():
        mock_db = MagicMock()
        mock_db.execute.return_value = None
        yield mock_db

    app.dependency_overrides[db_session.get_db] = mock_get_db
    try:
        # 1. Root /readyz
        res_root = await client.get("/readyz")
        assert res_root.status_code == 200
        data_root = res_root.json()
        assert data_root["status"] == "ready"
        assert data_root["checks"]["database"] == "ok"
        assert "mongodb" in data_root["checks"]
        assert "llm" in data_root["checks"]
        assert "timestamp" in data_root

        # 2. Prefixed /api/v1/readyz
        res_api = await client.get("/api/v1/readyz")
        assert res_api.status_code == 200
        assert res_api.json()["status"] == "ready"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_readyz_reports_503_when_database_fails(client, monkeypatch):
    """Readiness probe /readyz trả về 503 Service Unavailable khi CSDL gặp lỗi."""
    from src.db import session as db_session

    # Giả lập lỗi kết nối DB
    def mock_get_db():
        mock_db = MagicMock()
        mock_db.execute.side_effect = RuntimeError("Database connection refused")
        try:
            yield mock_db
        finally:
            pass

    from src.main import app

    app.dependency_overrides[db_session.get_db] = mock_get_db

    try:
        res = await client.get("/readyz")
        assert res.status_code == 503
        data = res.json()
        assert data["status"] == "not_ready"
        assert "unhealthy" in data["checks"]["database"]
    finally:
        app.dependency_overrides.clear()
