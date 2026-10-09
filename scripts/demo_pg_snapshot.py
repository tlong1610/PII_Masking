#!/usr/bin/env python3
"""Demo: build protected Postgres snapshot + run SQL verifiers.

Prereq:
  1. Docker Postgres up + seed.sql loaded into source DB
  2. Env:
       SOURCE_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydatabase
       SNAPSHOT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydatabase
       (same server OK if snapshot uses schema piiguard_snapshot — URLs may match only if
        you accept schema isolation; pipeline requires different URLs, so use two DBs or
        append ?options=-csearch_path for isolation — prefer two database names.)

For same-instance demo, create DB snapshot_out:
  createdb -U postgres snapshot_out
  SNAPSHOT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/snapshot_out

Usage:
  python scripts/demo_pg_snapshot.py
"""

from __future__ import annotations

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from src.transform.pg_pipeline import run_protected_postgres_pipeline  # noqa: E402


def main() -> int:
    source = os.getenv("SOURCE_DATABASE_URL", "")
    snapshot = os.getenv("SNAPSHOT_DATABASE_URL", "")
    secret = os.getenv("HMAC_SECRET", "dev-hmac-secret-change-me")
    version = os.getenv("HMAC_KEY_VERSION", "v1")
    if not source or not snapshot:
        print("Set SOURCE_DATABASE_URL and SNAPSHOT_DATABASE_URL")
        return 1
    if source == snapshot:
        print("SOURCE and SNAPSHOT URLs must differ (use a second database name).")
        return 1

    written, checks = run_protected_postgres_pipeline(
        source_url=source,
        snapshot_url=snapshot,
        secret=secret,
        key_version=version,
    )
    print("Snapshot tables:", written)
    all_ok = True
    for c in checks:
        print(f"[{c.status}] {c.check_name}: baseline={c.baseline_value} actual={c.actual_value}")
        if c.status != "PASSED":
            all_ok = False
    return 0 if all_ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
