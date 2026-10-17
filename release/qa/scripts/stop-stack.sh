#!/usr/bin/env bash
set -uo pipefail
RUN="$(cd "$(dirname "$0")/.." && pwd)/.run"
for name in backend frontend; do
  if [[ -f "$RUN/$name.pid" ]]; then
    pid="$(cat "$RUN/$name.pid")"
    pkill -P "$pid" 2>/dev/null
    kill "$pid" 2>/dev/null && echo "stopped $name ($pid)"
    rm -f "$RUN/$name.pid"
  fi
done
