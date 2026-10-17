import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api import health, vault
from src.api.routes import router
from src.config import get_settings
from src.db.session import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if settings.app_env.lower() == "production":
        if settings.hmac_secret == "dev-hmac-secret-change-me":
            raise RuntimeError(
                "CRITICAL SECURITY: Cannot start in production mode with default hmac_secret='dev-hmac-secret-change-me'. "
                "Set HMAC_SECRET environment variable (§4.1)."
            )
    if settings.database_url.startswith("sqlite"):
        # Ensure parent dir exists for file-based SQLite (e.g. ./data/app.db)
        db_path = settings.database_url.removeprefix("sqlite:///")
        if db_path and db_path != ":memory:" and not db_path.startswith("/"):
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    init_db()
    logger.info("Starting %s in %s mode", settings.app_name, settings.app_env)
    yield
    logger.info("Shutting down %s...", settings.app_name)


app = FastAPI(
    title="PIIGuard Shield",
    description="PII review and protected dataset release API",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")
app.include_router(health.router)
app.include_router(vault.router)


@app.get("/health")
async def root_health():
    return {"status": "ok", "env": settings.app_env}

