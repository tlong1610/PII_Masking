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
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


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

    print("\n" + "=" * 80)
    if all_passed:
        print(">>> VERIFICATION SUCCESS: 830 MATCHED, 0 UNMATCHED ACROSS ALL COLLECTIONS <<<")
    else:
        print(">>> VERIFICATION FAILED: UNMATCHED DOCUMENTS DETECTED <<<")
    print("=" * 80)

    client.close()
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
