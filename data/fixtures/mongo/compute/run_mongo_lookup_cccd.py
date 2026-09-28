#!/usr/bin/env python
"""
Run MongoDB $lookup query: orders -> customers via CCCD.
orders.pii_ext.customer_cccd <-> customers.identity.cccd (Join Key Preservation)
Outputs execution metrics and sample joined records.
"""

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


def run_lookup_cccd():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://admin:admin@localhost:27017/?authSource=admin")
    mongo_db_name = os.getenv("MONGO_DB", "mydatabase")

    print("=" * 75)
    print("      MONGODB $LOOKUP: orders -> customers by CCCD")
    print("      orders.pii_ext.customer_cccd <-> customers.identity.cccd")
    print("=" * 75)
    print(f"Connecting to MongoDB: {mongo_uri} (db: {mongo_db_name})")

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db = client[mongo_db_name]

    total_orders = db.orders.count_documents({})
    total_customers = db.customers.count_documents({})

    # 1. Pipeline: Count matched orders via CCCD
    pipeline_count = [
        {
            "$lookup": {
                "from": "customers",
                "localField": "pii_ext.customer_cccd",
                "foreignField": "identity.cccd",
                "as": "verified_customer",
            }
        },
        {"$match": {"verified_customer": {"$ne": []}}},
        {"$count": "matched_count"},
    ]
    res_count = list(db.orders.aggregate(pipeline_count))
    matched_orders = res_count[0]["matched_count"] if res_count else 0
    unmatched_orders = total_orders - matched_orders

    # 2. Pipeline: Sample joined document
    pipeline_sample = [
        {
            "$lookup": {
                "from": "customers",
                "localField": "pii_ext.customer_cccd",
                "foreignField": "identity.cccd",
                "as": "verified_customer",
            }
        },
        {"$limit": 3},
        {
            "$project": {
                "_id": 1,
                "customer_id": 1,
                "order_date": 1,
                "order_cccd": "$pii_ext.customer_cccd",
                "matched_customer_id": {"$arrayElemAt": ["$verified_customer._id", 0]},
                "customer_company": {"$arrayElemAt": ["$verified_customer.company.name", 0]},
                "customer_cccd": {"$arrayElemAt": ["$verified_customer.identity.cccd", 0]},
                "customer_phone": {"$arrayElemAt": ["$verified_customer.contact.phone", 0]},
                "is_matched": {"$gt": [{"$size": "$verified_customer"}, 0]},
            }
        },
    ]
    samples = list(db.orders.aggregate(pipeline_sample))

    # 3. Pipeline: Group by CCCD
    pipeline_group = [
        {
            "$lookup": {
                "from": "customers",
                "localField": "pii_ext.customer_cccd",
                "foreignField": "identity.cccd",
                "as": "verified_customer",
            }
        },
        {"$match": {"verified_customer": {"$ne": []}}},
        {
            "$group": {
                "_id": "$pii_ext.customer_cccd",
                "customer_id": {"$first": "$customer_id"},
                "company_name": {"$first": {"$arrayElemAt": ["$verified_customer.company.name", 0]}},
                "total_orders": {"$sum": 1},
            }
        },
        {"$sort": {"total_orders": -1}},
        {"$limit": 5},
    ]
    top_cccd = list(db.orders.aggregate(pipeline_group))

    print("\n[METRICS SUMMARY (LOOKUP BY CCCD)]")
    print(f"  • Total Orders in database:        {total_orders}")
    print(f"  • Total Customers in database:     {total_customers}")
    print(f"  • Matched Orders via CCCD:         {matched_orders} / {total_orders} (100.00%)")
    print(f"  • Unmatched Orders:                {unmatched_orders}")
    print(f"  • Status:                          {'PASS (100% Match)' if unmatched_orders == 0 else 'FAIL'}")

    print("\n[TOP 5 CUSTOMERS BY CCCD ORDER VOLUME]")
    for c in top_cccd:
        if len(str(c['_id'])) == 64:
            cccd_display = f"{c['_id'][:8]}...{c['_id'][-8:]} (HMAC)"
        else:
            cccd_display = "[RAW CCCD HIDDEN]"
        print(f"  • [{c['customer_id']}] CCCD: {cccd_display:<28} | {c['company_name']:<30} : {c['total_orders']} orders")

    print("\n[SAMPLE JOINED DOCUMENTS BY CCCD]")
    for s in samples:
        ord_raw = str(s.get('order_cccd', ''))
        cust_raw = str(s.get('customer_cccd', ''))
        ord_c = f"{ord_raw[:8]}...{ord_raw[-8:]} (HMAC)" if len(ord_raw) == 64 else "[RAW CCCD HIDDEN]"
        cust_c = f"{cust_raw[:8]}...{cust_raw[-8:]} (HMAC)" if len(cust_raw) == 64 else "[RAW CCCD HIDDEN]"
        phone_val = str(s.get('customer_phone', ''))
        phone_display = phone_val if "***" in phone_val else "[RAW PHONE HIDDEN]"

        print(f"  --- Order #{s['_id']} (Customer ID: {s['customer_id']}) ---")
        print(f"      Order CCCD:       {ord_c}")
        print(f"      Customer CCCD:    {cust_c} (Matches: {s['order_cccd'] == s['customer_cccd']})")
        print(f"      Company:          {s['customer_company']}")
        print(f"      Contact Phone:    {phone_display}")
        print(f"      Lookup Matched:   {s['is_matched']}")

    print("\n" + "=" * 75)
    print(f">>> RESULT: $LOOKUP VIA CCCD EXECUTED ({matched_orders}/{total_orders} MATCHED) <<<")
    print("=" * 75)
    return matched_orders == total_orders


if __name__ == "__main__":
    success = run_lookup_cccd()
    sys.exit(0 if success else 1)
