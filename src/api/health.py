"""Health and Readiness Probes (§17.1).

Cung cấp các probe chuẩn cho Docker, Docker Compose, Nginx và máy chủ On-Premise/Local:
- /healthz: Liveness probe xác nhận tiến trình FastAPI đang hoạt động.
- /readyz: Readiness probe kiểm tra kết nối CSDL PostgreSQL/SQLite và MongoDB nội bộ
  trước khi tiếp nhận traffic.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.config import get_settings
from src.db.session import get_db
from src.models.schemas import HealthzResponse, ReadyzResponse

router = APIRouter(tags=["health"])


@router.get(
    "/healthz",
    response_model=HealthzResponse,
    status_code=status.HTTP_200_OK,
    summary="Liveness Probe",
    description="Xác nhận tiến trình FastAPI còn sống và phản hồi request (§17.1).",
)
def healthz() -> HealthzResponse:
    """Liveness probe: returns 200 OK as long as FastAPI process is alive."""
    return HealthzResponse(
        status="ok",
        timestamp=datetime.now(UTC).isoformat(),
        version="1.0.0",
    )


@router.get(
    "/readyz",
    response_model=ReadyzResponse,
    summary="Readiness Probe",
    description="Kiểm tra kết nối CSDL, MongoDB và LLM sẵn sàng phục vụ request (§17.1).",
)
def readyz(
    response: Response,
    db: Session = Depends(get_db),
) -> ReadyzResponse:
    """Readiness probe: pings database, MongoDB, and checks LLM configuration."""
    settings = get_settings()
    checks: dict[str, str] = {}
    is_ready = True

    # 1. Primary Database Check
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = f"unhealthy: {type(exc).__name__}"
        is_ready = False

    # 2. MongoDB Check
    if settings.enable_mongo or settings.mongo_uri:
        try:
            from pymongo import MongoClient

            client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=2000)
            client.admin.command("ping")
            client.close()
            checks["mongodb"] = "ok"
        except Exception as exc:
            checks["mongodb"] = f"unhealthy: {type(exc).__name__}"
            is_ready = False
    else:
        checks["mongodb"] = "disabled"

    # 3. LLM API readiness
    if settings.enable_ai_scan:
        has_key = any(
            [
                settings.google_api_key,
                settings.groq_api_key,
                settings.openrouter_api_key,
                settings.cerebras_api_key,
            ]
        )
        checks["llm"] = "ready" if has_key else "warning: no_api_keys_configured"
    else:
        checks["llm"] = "ready (stub_mode)"

    now_iso = datetime.now(UTC).isoformat()
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadyzResponse(
            status="not_ready",
            checks=checks,
            timestamp=now_iso,
        )

    response.status_code = status.HTTP_200_OK
    return ReadyzResponse(
        status="ready",
        checks=checks,
        timestamp=now_iso,
    )
