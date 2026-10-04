#!/usr/bin/env python
"""
Apply HMAC-SHA256 Transformation on MongoDB Collections:
- customers: identity.cccd -> HMAC-SHA256, contact masked
- orders: pii_ext.customer_cccd -> HMAC-SHA256 (identical key), shipment phone masked
Writes the protected snapshot to 'mydatabase_protected' and creates performance indexes.
"""

import argparse
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

from src.verifier.mongo_verifier import HMACHasher, MaskEngine, MongoVerifier  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description="Apply HMAC-SHA256 to MongoDB collections")
    parser.add_argument("--source-db", default="mydatabase", help="Source raw database (default: mydatabase)")
    parser.add_argument("--target-db", default="mydatabase_protected", help="Target protected database (default: mydatabase_protected)")
    parser.add_argument("--key", default=None, help="Custom HMAC secret key (optional)")
    args = parser.parse_args()

    print("=" * 80)
    print("      PIIGUARD SHIELD — MONGODB HMAC-SHA256 TRANSFORMATION RUNNER")
    print("=" * 80)
    print(f"Timestamp:       {datetime.now().isoformat()}")
    print(f"Source Database: {args.source_db}")
    print(f"Target Database: {args.target_db}")

    hasher = HMACHasher(secret_key=args.key)
    mask_engine = MaskEngine(hasher)
    verifier = MongoVerifier(
        source_db_name=args.source_db,
        target_db_name=args.target_db,
        hasher=hasher,
        mask_engine=mask_engine,
    )

    # 1. Baseline Pre-check
    print("\n[STEP 1] Measuring Pre-transformation Baseline on raw data...")
    pre_res = verifier.run_pre_processing_baseline()
    print(f"  • Source Orders:          {pre_res['total_orders']}")
    print(f"  • Source Customers:       {pre_res['total_customers']}")
    print(f"  • Raw Matched by CCCD:    {pre_res['matched_by_cccd']} / {pre_res['total_orders']}")

    # 2. Build Protected Snapshot
    print(f"\n[STEP 2] Transforming and writing protected snapshot to '{args.target_db}'...")
    snap_res = verifier.build_protected_snapshot(target_db_name=args.target_db)
    print(f"  • Transformed Customers:  {snap_res['customers_count']} documents inserted")
    print(f"  • Transformed Orders:     {snap_res['orders_count']} documents inserted")
    print("  • Indexes Created:        idx_prot_cust_cccd, idx_prot_cust_email, idx_prot_orders_cccd")

    # 3. Post-transformation Validation
    print(f"\n[STEP 3] Running Downstream Post-validation on '{args.target_db}'...")
    post_res = verifier.run_post_processing_validation(target_db_name=args.target_db)
    print(f"  • Protected Orders:       {post_res['total_orders']}")
    print(f"  • Protected Customers:    {post_res['total_customers']}")
    print(f"  • Matched by customer_id: {post_res['matched_by_customer_id']} / {post_res['total_orders']}")
    print(f"  • Matched by CCCD (HMAC): {post_res['matched_by_cccd']} / {post_res['total_orders']}")
    print(f"  • Unmatched Orders:       {post_res['unmatched_by_cccd']}")

    # 4. Side-by-side Sample Comparison
    print("\n[STEP 4] Side-by-side Document Inspection (No-Raw-Value Safe):")
    sample = verifier._get_sample_comparison()
    print(f"Customer ID: {sample['customer_id']}")
    print(f"  [RAW]       CCCD Shape: {sample['raw_record']['cccd_shape']} | Email Domain: {sample['raw_record']['email_domain']}")
    print(f"  [PROTECTED] CCCD (HMAC): {sample['protected_record']['cccd_hmac_sha256'][:24]}... | Email: {sample['protected_record']['email_masked']}")

    # 5. Final Integrity Check
    is_valid = (
        post_res["matched_by_cccd"] == pre_res["matched_by_cccd"] == 830
        and post_res["unmatched_by_cccd"] == 0
    )

    print("\n" + "=" * 80)
    if is_valid:
        print(">>> RESULT: HMAC INTEGRATION COMPLETED SUCCESSFULLY (100% JOIN INTEGRITY) <<<")
    else:
        print(">>> RESULT: INTEGRATION FAILED — MISMATCH DETECTED <<<")
    print("=" * 80)

    return 0 if is_valid else 1


if __name__ == "__main__":
    sys.exit(main())
