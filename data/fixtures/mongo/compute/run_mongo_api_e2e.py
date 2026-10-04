#!/usr/bin/env python
"""
MongoDB API end-to-end run — PIIGuard Shield.

Drives the real API flow against the seeded MongoDB:
  POST /runs (MongoConnector + scanner, nested dot paths) -> PUT /runs/{id}/decisions
  -> POST /runs/{id}/build (protected snapshot DB + $lookup verifier on source and snapshot).

Writes eval/results/mongo_api_e2e_evidence.json with metadata only
(field paths, actions, lookup matched/unmatched counts) — never raw values.

Env (defaults match docker compose):
  MONGO_URI          mongodb://admin:admin@localhost:27017/?authSource=admin
  MONGO_DB           mydatabase
  MONGO_SNAPSHOT_DB  mydatabase_protected
  ENABLE_AI_SCAN     false (rule scanner; set true to use the LangGraph agent)

Usage:
  python data/fixtures/mongo/seed_mongo.py
  python data/fixtures/mongo/compute/run_mongo_api_e2e.py
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(PROJECT_ROOT))
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

os.environ.setdefault("MONGO_URI", "mongodb://admin:admin@localhost:27017/?authSource=admin")
os.environ.setdefault("MONGO_DB", "mydatabase")
os.environ.setdefault("MONGO_SNAPSHOT_DB", "mydatabase_protected")
os.environ.setdefault("ENABLE_AI_SCAN", "false")
os.environ["ENABLE_MONGO"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///./data/mongo_api_e2e.db"

from httpx import ASGITransport, AsyncClient  # noqa: E402

from src.db.session import init_db  # noqa: E402
from src.main import app  # noqa: E402

EVIDENCE_FILE = PROJECT_ROOT / "eval" / "results" / "mongo_api_e2e_evidence.json"


def _accept_recommendations(run: dict) -> list[dict]:
    decisions = []
    for p in run["field_profiles"]:
        action = p["recommended_action"]
        if p["classification"] == "UNKNOWN" and action == "KEEP":
            action = "DROP"
        decisions.append({"field_profile_id": p["id"], "action": action, "reason": "e2e demo"})
    return decisions


async def run() -> int:
    init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://e2e") as client:
        login = await client.post(
            "/api/v1/sessions", json={"username": "dpo", "password": "dpo123"}
        )
        login.raise_for_status()
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        created = await client.post(
            "/api/v1/runs", headers=headers, json={"source_id": "nosql-demo"}
        )
        created.raise_for_status()
        run_body = created.json()
        print(f"[1] POST /runs -> run {run_body['id']} status={run_body['status']}")
        if run_body["status"] != "REVIEW_REQUIRED":
            print("Scan failed; check MONGO_URI and run data/fixtures/mongo/seed_mongo.py first.")
            return 1

        decisions = _accept_recommendations(run_body)
        saved = await client.put(
            f"/api/v1/runs/{run_body['id']}/decisions",
            headers=headers,
            json={"decisions": decisions},
        )
        saved.raise_for_status()
        print(f"[2] PUT /decisions -> {len(decisions)} fields, status={saved.json()['status']}")

        built = await client.post(f"/api/v1/runs/{run_body['id']}/build", headers=headers)
        if built.status_code == 422:
            print(f"Build blocked: {built.json()['detail']}")
            return 2
        built.raise_for_status()
        body = built.json()
        print(
            f"[3] POST /build -> run={body['run']['status']} "
            f"dataset={body['dataset']['status']} at {body['dataset']['output_location']}"
        )

    profiles = {p["id"]: p for p in run_body["field_profiles"]}
    fields = [
        {
            "collection": profiles[d["field_profile_id"]]["source_path"],
            "field": profiles[d["field_profile_id"]]["field_path"],
            "classification": profiles[d["field_profile_id"]]["classification"],
            "action": d["action"],
        }
        for d in decisions
    ]
    checks = [
        {
            "check_name": r["check_name"],
            "status": r["status"],
            "baseline": r["baseline_value"],
            "actual": r["actual_value"],
            "tolerance": r["tolerance"],
        }
        for r in body["verifier_results"]
    ]

    print("-" * 80)
    for c in checks:
        print(f"[{c['status']}] {c['check_name']}: source={c['baseline']} snapshot={c['actual']}")
    print("-" * 80)

    passed = body["run"]["status"] == "VERIFIED"
    EVIDENCE_FILE.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE_FILE.write_text(
        json.dumps(
            {
                "generated_at": datetime.now().isoformat(),
                "flow": "POST /runs -> PUT /runs/{id}/decisions -> POST /runs/{id}/build",
                "scan_mode": "ai" if os.environ["ENABLE_AI_SCAN"].lower() == "true" else "rule",
                "status": body["run"]["status"],
                "dataset_status": body["dataset"]["status"],
                "output_location": body["dataset"]["output_location"],
                "collections_scanned": sorted({f["collection"] for f in fields}),
                "fields_total": len(fields),
                "action_counts": dict(Counter(f["action"] for f in fields)),
                "fields": fields,
                "checks": checks,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"Evidence saved to {EVIDENCE_FILE.relative_to(PROJECT_ROOT)}")
    return 0 if passed else 3


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
