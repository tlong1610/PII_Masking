#!/usr/bin/env bash
# Start an isolated QA stack: backend on :8010 with a throwaway SQLite metadata DB,
# Vite dev server on :5174 proxying /api to it. Source/snapshot DBs come from the repo .env
# (local Docker Postgres + Mongo). Snapshots go to QA-only names (piiguard_qa_snapshot*,
# mydatabase_qa_protected*) so QA run ids never overwrite the developer's snapshots.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
QA="$ROOT/release/qa"
RUN="$QA/.run"
mkdir -p "$RUN"
BE_PORT="${QA_BACKEND_PORT:-8010}"
FE_PORT="${QA_FRONTEND_PORT:-5174}"

rm -f "$ROOT/data/qa_app.db"
cd "$ROOT"
DATABASE_URL="sqlite:///./data/qa_app.db" \
CORS_ORIGINS="http://localhost:$FE_PORT" \
SNAPSHOT_SCHEMA="piiguard_qa_snapshot" \
MONGO_SNAPSHOT_DB="mydatabase_qa_protected" \
OPENAI_MODEL="${QA_OPENAI_MODEL:-gpt-4o-mini}" \
  nohup .venv/bin/uvicorn src.main:app --host 127.0.0.1 --port "$BE_PORT" > "$RUN/backend.log" 2>&1 &
echo $! > "$RUN/backend.pid"

cd "$ROOT/front_end"
VITE_API_URL=/api/v1 VITE_PROXY_TARGET="http://127.0.0.1:$BE_PORT" \
  nohup npx vite --port "$FE_PORT" --strictPort > "$RUN/frontend.log" 2>&1 &
echo $! > "$RUN/frontend.pid"

for _ in $(seq 1 60); do
  if curl -fs "http://127.0.0.1:$BE_PORT/health" >/dev/null && curl -fs "http://localhost:$FE_PORT/" >/dev/null; then
    echo "QA stack ready: frontend http://localhost:$FE_PORT  backend http://127.0.0.1:$BE_PORT"
    exit 0
  fi
  sleep 2
done
echo "QA stack failed to start; see $RUN/*.log" >&2
exit 1
