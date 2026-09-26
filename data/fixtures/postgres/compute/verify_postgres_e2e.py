#!/usr/bin/env python
"""
PostgreSQL End-to-End Verification Runner — PIIGuard VN.
Executes SQL JOIN and Aggregate queries before and after PII transformation,
validates that row counts and total revenue exactly match baseline expectations,
and outputs formal verification evidence.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add project root to sys.path
def _get_project_root() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / ".git").exists() or (parent / "src").exists():
            return parent
    return current.parents[4]

PROJECT_ROOT = _get_project_root()
sys.path.insert(0, str(PROJECT_ROOT))
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

import psycopg
from psycopg.rows import dict_row

from src.connectors.postgres_connector import PostgresConnector
from src.transform.hmac_hasher import hash_value
from src.transform.mask_engine import apply_action
from src.verifier.sql_verifier import (
    load_expected,
    verify_aggregate_revenue,
    verify_join_hmac,
)


def run_full_postgres_audit():
    print("=" * 80)
    print("      PIIGUARD VN — POSTGRESQL END-TO-END VERIFICATION & AUDIT EVIDENCE")
    print("=" * 80)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("Target DB: PostgreSQL (docker container p-138-db-1 / localhost:5432/mydatabase)")
    print()

    # 1. Check all 12+2 tables and relationships via PostgresConnector
    print("[PHASE 1] Checking 12+2 Tables, Primary Keys, and Foreign Keys...")
    pg_host = os.getenv("POSTGRES_HOST", "localhost")
    pg_port = os.getenv("POSTGRES_PORT", "5432")
    pg_user = os.getenv("POSTGRES_USER", "postgres")
    pg_pass = os.getenv("POSTGRES_PASSWORD", "postgres")
    pg_db = os.getenv("POSTGRES_DB", "mydatabase")
    conn_str = f"postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/{pg_db}"

    connector = PostgresConnector(conn_str)
    db_profile = connector.extract_database_profile()

    print(f"Total tables detected in database: {len(db_profile.tables)}")
    table_summary = []
    for tbl in sorted(db_profile.tables, key=lambda x: x.table_name):
        pks = [c.column_name for c in tbl.columns if c.is_primary_key]
        fks = [c.column_name for c in tbl.columns if c.is_foreign_key]
        print(
            f"  • Table: {tbl.table_name:<22} | Columns: {len(tbl.columns):<2} | "
            f"PK: {str(pks):<25} | FKs: {str(fks):<30} | Relations: {len(tbl.relations)}"
        )
        table_summary.append({
            "table_name": tbl.table_name,
            "columns_count": len(tbl.columns),
            "primary_keys": pks,
            "foreign_keys": fks,
            "relations_count": len(tbl.relations),
        })

    # 2. Check Golden Labels & Holdout Split
    print("\n[PHASE 2] Inspecting Golden Labels & Holdout Dataset...")
    golden_path = PROJECT_ROOT / "eval" / "golden_labels.json"
    with open(golden_path, "r", encoding="utf-8") as f:
        golden_data = json.load(f)

    total_golden = len(golden_data)
    dev_items = [x for x in golden_data if x.get("split") == "dev"]
    holdout_items = [x for x in golden_data if x.get("split") == "holdout"]
    pg_holdout = [x for x in holdout_items if x.get("source_engine", x.get("source")) == "postgres"]
    mongo_holdout = [x for x in holdout_items if x.get("source_engine", x.get("source")) == "mongo"]

    print(f"Total Golden Label Records: {total_golden}")
    print(f"  - Dev split:     {len(dev_items)} items")
    print(f"  - Holdout split: {len(holdout_items)} items ({len(pg_holdout)} PostgreSQL, {len(mongo_holdout)} MongoDB)")
    print("Holdout Edge Cases (PostgreSQL sample):")
    for item in pg_holdout[:5]:
        print(f"    - [{item['id']}] Field: '{item['field_path']}' -> Taxonomy: {item['taxonomy_id']}")

    # 3. Run Downstream Verification
    print("\n[PHASE 3] Executing SQL JOIN and Aggregate: Downstream Verification...")
    expected = load_expected()
    join_res = verify_join_hmac(conn_str, snapshot_schema="public", expected=expected)
    agg_res = verify_aggregate_revenue(conn_str, snapshot_schema="public", expected=expected)

    checks = [join_res, agg_res]
    all_passed = all(c.status == "PASSED" for c in checks)

    print("-" * 80)
    print(f"{'CHECK NAME':<25} | {'STATUS':<8} | {'BASELINE':<30} | {'ACTUAL'}")
    print("-" * 80)
    for c in checks:
        print(f"{c.check_name:<25} | {c.status:<8} | {c.baseline_value:<30} | {c.actual_value}")
    print("-" * 80)

    # 4. Sample Record Side-by-Side (No-Raw-Value UI Safe)
    print("\n[PHASE 4] Sample Record Side-by-Side (No-Raw-Value UI Safe):")
    secret = os.getenv("HMAC_SECRET", "dev-hmac-secret-change-me")
    key_version = os.getenv("HMAC_KEY_VERSION", "v1")

    with psycopg.connect(conn_str, row_factory=dict_row) as conn, conn.cursor() as cur:
        cur.execute("SELECT customer_id, cccd, email, phone FROM public.customers LIMIT 1")
        sample_row = cur.fetchone()

    cid = sample_row["customer_id"]
    raw_cccd = sample_row.get("cccd", "")
    raw_email = sample_row.get("email", "")
    raw_phone = sample_row.get("phone", "")

    _, masked_cccd = apply_action(raw_cccd, "HMAC", secret=secret, key_version=key_version)
    _, masked_email = apply_action(raw_email, "MASK", secret=secret, key_version=key_version)
    _, masked_phone = apply_action(raw_phone, "MASK", secret=secret, key_version=key_version)

    email_domain = raw_email.split("@")[-1] if "@" in raw_email else "masked"
    phone_prefix = raw_phone[:3] if len(raw_phone) >= 3 else "090"

    sample_verification = {
        "customer_id": cid,
        "raw_record": {
            "cccd_shape": f"{len(raw_cccd)} digits [RAW HIDDEN]",
            "email_domain": email_domain,
            "mobile_prefix": phone_prefix,
        },
        "protected_record": {
            "cccd_hmac_sha256": masked_cccd[:16] + "..." if masked_cccd else "",
            "email_masked": masked_email,
            "mobile_phone_masked": masked_phone,
        },
    }

    print(f"Customer ID: {cid}")
    print(f"  Raw Shape:       CCCD: {sample_verification['raw_record']['cccd_shape']} | Email Domain: @{email_domain} | Mobile: {phone_prefix}***")
    print(f"  Protected State: CCCD (HMAC): {sample_verification['protected_record']['cccd_hmac_sha256']} | Email: {masked_email} | Mobile: {masked_phone}")

    # Final verdict
    print("\n" + "=" * 80)
    if all_passed:
        print(">>> RESULT: ALL DOWNSTREAM SQL VERIFICATION CHECKS PASSED (100% MATCH) <<<")
    else:
        print(">>> RESULT: VERIFICATION FAILED — METRIC MISMATCH DETECTED <<<")
    print("=" * 80)

    # Save evidence report
    evidence_dir = PROJECT_ROOT / "eval" / "results"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    evidence_file = evidence_dir / "postgres_e2e_evidence.json"
    with open(evidence_file, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "status": "PASSED" if all_passed else "FAILED",
            "tables_profile": table_summary,
            "checks": [
                {
                    "check_name": c.check_name,
                    "status": c.status,
                    "baseline": c.baseline_value,
                    "actual": c.actual_value,
                    "tolerance": c.tolerance,
                    "details": c.details,
                }
                for c in checks
            ],
            "sample_verification": sample_verification,
        }, f, indent=2, ensure_ascii=False)

    print(f"\nAudit evidence report successfully saved to: {evidence_file}")
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(run_full_postgres_audit())
