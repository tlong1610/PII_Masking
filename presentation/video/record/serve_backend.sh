#!/usr/bin/env bash
# Run an isolated backend for recording: fresh metadata DB (run #1, clean audit log),
# live Postgres demo source, port 8011. Reads secrets from the repo .env; prints none.
# Usage (from repo root): bash presentation/video/record/serve_backend.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."
DB_DIR="presentation/video/.recording"
mkdir -p "$DB_DIR"
rm -f "$DB_DIR/video_demo.db"
set -a; . ./.env; set +a
ROOT_W="$(pwd -W 2>/dev/null || pwd)"  # Windows path under Git Bash, POSIX path elsewhere
export DATABASE_URL="sqlite:///$ROOT_W/$DB_DIR/video_demo.db"
export ENABLE_PG_SNAPSHOT=true
export SOURCE_DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@localhost:5432/${POSTGRES_DB:-mydatabase}"
export CORS_ORIGINS="http://localhost:5174"
# Analyst read-only SQL login (views are created at publish time, so it must be on before publishing).
export ENABLE_ANALYST_SQL=true
export ANALYST_SQL_SSLMODE=disable
export PYTHONIOENCODING=utf-8
PY=".venv/Scripts/python"; [ -x "$PY" ] || PY=".venv/bin/python"
exec "$PY" -m uvicorn src.main:app --port 8011
