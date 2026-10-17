#!/usr/bin/env bash
# Render the main-flow demo video on a fresh, isolated QA stack (synthetic data only).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
QA="$HERE/../qa"

bash "$QA/scripts/start-stack.sh"
trap 'bash "$QA/scripts/stop-stack.sh"' EXIT
node "$HERE/record.mjs" --base "http://localhost:${QA_FRONTEND_PORT:-5174}"
