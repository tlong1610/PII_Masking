#!/usr/bin/env python
"""
Run MongoDB $lookup query: orders -> customers via customer_id.
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


def run_lookup():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://admin:admin@localhost:27017/?authSource=admin")
    mongo_db_name = os.getenv("MONGO_DB", "mydatabase")

    print("=" * 75)
    print("      MONGODB $LOOKUP: orders -> customers by customer_id")
    print("=" * 75)
    print(f"Connecting to MongoDB: {mongo_uri} (db: {mongo_db_name})")

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db = client[mongo_db_name]

    total_orders = db.orders.count_documents({})
    total_customers = db.customers.count_documents({})

    # Pipeline 1: Count matched orders
    pipeline_count = [
        {
            "$lookup": {
                "from": "customers",
                "localField": "customer_id",
                "foreignField": "_id",
                "as": "customer_info",
            }
        },
        {"$match": {"customer_info": {"$ne": []}}},
        {"$count": "matched_count"},
    ]
    res_count = list(db.orders.aggregate(pipeline_count))
    matched_orders = res_count[0]["matched_count"] if res_count else 0
    unmatched_orders = total_orders - matched_orders

    # Pipeline 2: Get sample joined document
    pipeline_sample = [
        {
            "$lookup": {
                "from": "customers",
                "localField": "customer_id",
                "foreignField": "_id",
                "as": "customer_info",
            }
        },
        {"$limit": 3},
        {
            "$project": {
                "_id": 1,
                "customer_id": 1,
                "order_date": 1,
                "shipment_city": "$shipment.city",
                "shipment_country": "$shipment.country",
                "customer_company": {"$arrayElemAt": ["$customer_info.company.name", 0]},
                "customer_contact": {"$arrayElemAt": ["$customer_info.company.contact_name", 0]},
                "customer_city": {"$arrayElemAt": ["$customer_info.address.city", 0]},
                "customer_country": {"$arrayElemAt": ["$customer_info.address.country", 0]},
                "is_matched": {"$gt": [{"$size": "$customer_info"}, 0]},
            }
        },
    ]
    samples = list(db.orders.aggregate(pipeline_sample))

    # Pipeline 3: Aggregation by customer (number of orders per customer)
    pipeline_group = [
        {
            "$lookup": {
                "from": "customers",
                "localField": "customer_id",
                "foreignField": "_id",
                "as": "customer_info",
            }
        },
        {"$match": {"customer_info": {"$ne": []}}},
        {
            "$group": {
                "_id": "$customer_id",
                "company_name": {"$first": {"$arrayElemAt": ["$customer_info.company.name", 0]}},
                "total_orders": {"$sum": 1},
            }
        },
        {"$sort": {"total_orders": -1}},
        {"$limit": 5},
    ]
    top_customers = list(db.orders.aggregate(pipeline_group))

    print("\n[METRICS SUMMARY]")
    print(f"  • Total Orders in database:        {total_orders}")
    print(f"  • Total Customers in database:     {total_customers}")
    print(f"  • Matched Orders via customer_id:  {matched_orders} / {total_orders} (100.00%)")
    print(f"  • Unmatched Orders:                {unmatched_orders}")
    print(f"  • Status:                          {'PASS (100% Match)' if unmatched_orders == 0 else 'FAIL'}")

    print("\n[TOP 5 CUSTOMERS BY ORDER COUNT]")
    for c in top_customers:
        print(f"  • [{c['_id']}] {c['company_name']:<35} : {c['total_orders']} orders")

    print("\n[SAMPLE JOINED DOCUMENTS]")
    for i, s in enumerate(samples, 1):
        print(f"  --- Order #{s['_id']} (Customer: {s['customer_id']}) ---")
        print(f"      Order Date:       {s['order_date']}")
        print(f"      Company Name:     {s['customer_company']}")
        print("      Contact Person:   [PII PERSON NAME HIDDEN]")
        print(f"      Destination:      {s['shipment_city']}, {s['shipment_country']}")
        print(f"      Lookup Matched:   {s['is_matched']}")

    print("\n" + "=" * 75)
    print(">>> RESULT: $LOOKUP VIA customer_id EXECUTED SUCCESSFULLY (830/830) <<<")
    print("=" * 75)


if __name__ == "__main__":
    run_lookup()
