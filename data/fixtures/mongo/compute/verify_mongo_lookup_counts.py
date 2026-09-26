#!/usr/bin/env python
"""
Verification Script: MongoDB $lookup Integrity Checker.
Validates:
1. Raw Database (mydatabase):
   - $lookup by customer_id: exactly 830 matched, 0 unmatched
   - $lookup by CCCD (pii_ext.customer_cccd <-> identity.cccd): exactly 830 matched, 0 unmatched
2. Protected Snapshot Database (mydatabase_protected):
   - $lookup by customer_id: exactly 830 matched, 0 unmatched
   - $lookup by CCCD (HMAC-SHA256): exactly 830 matched, 0 unmatched
"""

import json
import os
import sys
from pathlib import Path
from pymongo import MongoClient

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


def check_lookup_metrics(db, db_label: str):
    total_orders = db.orders.count_documents({})
    total_customers = db.customers.count_documents({})

    # 1. Lookup by customer_id
    pipe_cust_id = [
        {
            "$lookup": {
                "from": "customers",
                "localField": "customer_id",
                "foreignField": "_id",
                "as": "cust_match",
            }
        },
        {"$match": {"cust_match": {"$ne": []}}},
        {"$count": "matched_count"},
    ]
    res_cust_id = list(db.orders.aggregate(pipe_cust_id))
    matched_cust_id = res_cust_id[0]["matched_count"] if res_cust_id else 0
    unmatched_cust_id = total_orders - matched_cust_id

    # 2. Lookup by CCCD
    pipe_cccd = [
        {
            "$lookup": {
                "from": "customers",
                "localField": "pii_ext.customer_cccd",
                "foreignField": "identity.cccd",
                "as": "cccd_match",
            }
        },
        {"$match": {"cccd_match": {"$ne": []}}},
        {"$count": "matched_count"},
    ]
    res_cccd = list(db.orders.aggregate(pipe_cccd))
    matched_cccd = res_cccd[0]["matched_count"] if res_cccd else 0
    unmatched_cccd = total_orders - matched_cccd

    return {
        "db_name": db_label,
        "total_orders": total_orders,
        "total_customers": total_customers,
        "customer_id": {
            "matched": matched_cust_id,
            "unmatched": unmatched_cust_id,
        },
        "cccd": {
            "matched": matched_cccd,
            "unmatched": unmatched_cccd,
        },
    }


def main():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://admin:admin@localhost:27017/?authSource=admin")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)

    print("=" * 80)
    print("      MONGODB $LOOKUP INTEGRITY VERIFICATION (830 MATCHED / 0 UNMATCHED)")
    print("=" * 80)

    # Check raw database
    raw_res = check_lookup_metrics(client["mydatabase"], "mydatabase (RAW)")
    # Check protected database
    prot_res = check_lookup_metrics(client["mydatabase_protected"], "mydatabase_protected (HMAC-SHA256)")

    results = [raw_res, prot_res]

    print(f"\n{'Database':<35} | {'Lookup Key':<15} | {'Orders':<8} | {'Matched':<10} | {'Unmatched':<10} | {'Status'}")
    print("-" * 95)

    all_passed = True
    for r in results:
        for key_name in ["customer_id", "cccd"]:
            m = r[key_name]["matched"]
            u = r[key_name]["unmatched"]
            passed = (m == 830 and u == 0)
            if not passed:
                all_passed = False
            status = "PASS (100%)" if passed else "FAIL"
            print(f"{r['db_name']:<35} | {key_name:<15} | {r['total_orders']:<8} | {m:<10} | {u:<10} | {status}")

    print("-" * 95)

    # Detailed Assertions
    print("\n[VERIFICATION CRITERIA]")
    print(f"  [1] RAW Database customer_id:        {raw_res['customer_id']['matched']} matched, {raw_res['customer_id']['unmatched']} unmatched -> {'OK' if raw_res['customer_id']['matched'] == 830 and raw_res['customer_id']['unmatched'] == 0 else 'FAIL'}")
    print(f"  [2] RAW Database CCCD:               {raw_res['cccd']['matched']} matched, {raw_res['cccd']['unmatched']} unmatched -> {'OK' if raw_res['cccd']['matched'] == 830 and raw_res['cccd']['unmatched'] == 0 else 'FAIL'}")
    print(f"  [3] PROTECTED Database customer_id:  {prot_res['customer_id']['matched']} matched, {prot_res['customer_id']['unmatched']} unmatched -> {'OK' if prot_res['customer_id']['matched'] == 830 and prot_res['customer_id']['unmatched'] == 0 else 'FAIL'}")
    print(f"  [4] PROTECTED Database CCCD (HMAC):  {prot_res['cccd']['matched']} matched, {prot_res['cccd']['unmatched']} unmatched -> {'OK' if prot_res['cccd']['matched'] == 830 and prot_res['cccd']['unmatched'] == 0 else 'FAIL'}")

    # Save evidence file
    evidence_dir = PROJECT_ROOT / "eval" / "results"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    evidence_file = evidence_dir / "mongo_e2e_evidence.json"

    # Fetch sample customer and order for UI-safe audit
    raw_cust = client["mydatabase"].customers.find_one({}, {"identity": 1, "contact": 1, "_id": 1})
    prot_cust = client["mydatabase_protected"].customers.find_one({}, {"identity": 1, "contact": 1, "_id": 1})

    raw_cccd = (raw_cust.get("identity") or {}).get("cccd", "")
    raw_email = (raw_cust.get("contact") or {}).get("email", "")
    raw_phone = (raw_cust.get("contact") or {}).get("phone", "")

    prot_cccd = (prot_cust.get("identity") or {}).get("cccd", "")
    prot_email = (prot_cust.get("contact") or {}).get("email", "")
    prot_phone = (prot_cust.get("contact") or {}).get("phone", "")

    sample_evidence = {
        "customer_id": str(raw_cust.get("_id")),
        "raw_record": {
            "cccd_shape": f"{len(raw_cccd)} digits [RAW HIDDEN]",
            "email_domain": "@" + raw_email.split("@")[-1] if "@" in raw_email else "masked",
            "phone_prefix": raw_phone[:3] + "***" if len(raw_phone) >= 3 else "090***",
        },
        "protected_record": {
            "cccd_hmac_sha256": prot_cccd[:16] + "..." if prot_cccd else "",
            "email_masked": prot_email,
            "phone_masked": prot_phone,
        },
    }

    evidence_data = {
        "generated_at": datetime.now().isoformat(),
        "status": "PASSED" if all_passed else "FAILED",
        "collections": {
            "customers": {"expected_documents": 91, "actual_documents": raw_res["total_customers"]},
            "orders": {"expected_documents": 830, "actual_documents": raw_res["total_orders"]},
        },
        "verification_metrics": {
            "raw_database": raw_res,
            "protected_database": prot_res,
        },
        "sample_verification_no_raw": sample_evidence,
    }

    with open(evidence_file, "w", encoding="utf-8") as f:
        json.dump(evidence_data, f, indent=2, ensure_ascii=False)

    print(f"\nAudit evidence report successfully saved to: {evidence_file}")

    client.close()
    return 0 if all_passed else 1


if __name__ == "__main__":
    from datetime import datetime
    sys.exit(main())

