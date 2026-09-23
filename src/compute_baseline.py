"""
Compute Baseline Script for Downstream Tasks
Runs baseline queries on PostgreSQL and MongoDB, computes exact metrics,
and writes out eval/expected_downstream.json.
"""

import json
import os
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor
from pymongo import MongoClient


def compute_postgres_baseline():
    pg_host = os.getenv("POSTGRES_HOST", "localhost")
    pg_port = int(os.getenv("POSTGRES_PORT", "5432"))
    pg_user = os.getenv("POSTGRES_USER", "postgres")
    pg_pass = os.getenv("POSTGRES_PASSWORD", "postgres")
    pg_db = os.getenv("POSTGRES_DB", "mydatabase")

    print(f"Connecting to PostgreSQL ({pg_host}:{pg_port}/{pg_db})...")
    conn = psycopg2.connect(host=pg_host, port=pg_port, user=pg_user, password=pg_pass, dbname=pg_db)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # 1. Total orders
    cur.execute("SELECT count(*) AS total_orders, count(customer_cccd) AS orders_with_cccd FROM orders;")
    r1 = cur.fetchone()
    total_orders = r1["total_orders"]
    orders_with_cccd = r1["orders_with_cccd"]

    # 2. Join orders ⨝ customers on customer_cccd = cccd
    cur.execute("""
        SELECT count(*) AS matched_rows
        FROM orders o
        JOIN customers c ON o.customer_cccd = c.cccd;
    """)
    r2 = cur.fetchone()
    join_matched_rows = r2["matched_rows"]

    # 3. Unmatched orders on customer_cccd
    cur.execute("""
        SELECT count(*) AS unmatched_rows
        FROM orders o
        LEFT JOIN customers c ON o.customer_cccd = c.cccd
        WHERE c.cccd IS NULL;
    """)
    r3 = cur.fetchone()
    unmatched_orders = r3["unmatched_rows"]

    # 4. Aggregate revenue per customer
    cur.execute("""
        SELECT
            c.customer_id,
            round(sum(od.unit_price * od.quantity * (1 - od.discount))::numeric, 2) AS customer_revenue
        FROM orders o
        JOIN customers c ON o.customer_cccd = c.cccd
        JOIN order_details od ON o.order_id = od.order_id
        GROUP BY c.customer_id;
    """)
    agg_rows = cur.fetchall()
    distinct_customers = len(agg_rows)
    total_revenue = round(sum(float(row["customer_revenue"]) for row in agg_rows), 2)

    # 5. Order details matched
    cur.execute("""
        SELECT count(*) AS total_details
        FROM orders o
        JOIN customers c ON o.customer_cccd = c.cccd
        JOIN order_details od ON o.order_id = od.order_id;
    """)
    r5 = cur.fetchone()
    total_order_details = r5["total_details"]

    cur.close()
    conn.close()

    return {
        "join": {
            "total_orders": total_orders,
            "orders_with_cccd": orders_with_cccd,
            "matched_rows": join_matched_rows,
            "unmatched_orders": unmatched_orders,
        },
        "aggregate": {
            "distinct_customers": distinct_customers,
            "total_revenue": total_revenue,
            "total_order_details_matched": total_order_details,
        },
    }


def compute_mongo_baseline():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://admin:admin@localhost:27017/?authSource=admin")
    mongo_db_name = os.getenv("MONGO_DB", "mydatabase")

    print(f"Connecting to MongoDB ({mongo_uri}, db={mongo_db_name})...")
    client = MongoClient(mongo_uri)
    db = client[mongo_db_name]

    total_orders = db.orders.count_documents({})
    total_customers = db.customers.count_documents({})

    # 1. Lookup by customer_id
    pipeline_cust_id = [
        {"$lookup": {"from": "customers", "localField": "customer_id", "foreignField": "_id", "as": "customer_info"}},
        {"$match": {"customer_info": {"$ne": []}}},
        {"$count": "matched_count"},
    ]
    res1 = list(db.orders.aggregate(pipeline_cust_id))
    matched_by_customer_id = res1[0]["matched_count"] if res1 else 0

    # 2. Lookup by customer_cccd
    pipeline_cccd = [
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
    res2 = list(db.orders.aggregate(pipeline_cccd))
    matched_by_cccd = res2[0]["matched_count"] if res2 else 0

    return {
        "total_orders": total_orders,
        "total_customers": total_customers,
        "matched_by_customer_id": matched_by_customer_id,
        "matched_by_cccd": matched_by_cccd,
        "unmatched_by_cccd": total_orders - matched_by_cccd,
    }


def main():
    pg_res = compute_postgres_baseline()
    mongo_res = compute_mongo_baseline()

    downstream_data = {
        "metadata": {
            "version": "1.0.0",
            "description": "Baseline metrics and expectations for downstream joins and lookups before/after PII transformation",
            "author": "Nguyen Trung Kien (Data Engineer, Team P-138)",
        },
        "postgres_join": {
            "query": "SELECT o.order_id, o.customer_cccd, c.cccd FROM orders o JOIN customers c ON o.customer_cccd = c.cccd",
            "description": "Join orders ⨝ customers via CCCD (HMAC join key preservation)",
            "baseline": {
                "total_orders": pg_res["join"]["total_orders"],
                "orders_with_cccd": pg_res["join"]["orders_with_cccd"],
                "matched_rows": pg_res["join"]["matched_rows"],
                "unmatched_orders": pg_res["join"]["unmatched_orders"],
                "note": "All orders have customer_cccd; join count must remain identical after consistent HMAC transformation",
            },
            "post_mask_requirement": {
                "matched_rows_must_equal_baseline": True,
                "hmac_key_consistent": True,
                "tolerance": 0,
            },
        },
        "postgres_aggregate": {
            "query": "SELECT c.customer_id, SUM(od.unit_price * od.quantity * (1 - od.discount)) AS total_revenue FROM orders o JOIN customers c ON o.customer_cccd = c.cccd JOIN order_details od ON o.order_id = od.order_id GROUP BY c.customer_id",
            "description": "Customer revenue aggregation across 3 tables joined via CCCD",
            "baseline": {
                "distinct_customers": pg_res["aggregate"]["distinct_customers"],
                "total_revenue": pg_res["aggregate"]["total_revenue"],
                "total_order_details_matched": pg_res["aggregate"]["total_order_details_matched"],
                "note": "After HMAC masking of CCCD, aggregate group counts and revenue sum must remain unchanged",
            },
            "post_mask_requirement": {
                "distinct_customers_must_equal_baseline": True,
                "revenue_sum_must_equal_baseline": True,
                "revenue_tolerance": 0.01,
            },
        },
        "mongo_lookup": {
            "pipeline": [
                {
                    "$lookup": {
                        "from": "customers",
                        "localField": "customer_id",
                        "foreignField": "_id",
                        "as": "customer_info",
                    }
                },
                {"$match": {"customer_info": {"$ne": []}}},
            ],
            "description": "$lookup orders -> customers via customer_id (system identifier)",
            "baseline": {
                "total_orders": mongo_res["total_orders"],
                "matched_orders": mongo_res["matched_by_customer_id"],
                "unmatched_orders": mongo_res["total_orders"] - mongo_res["matched_by_customer_id"],
            },
            "post_mask_requirement": {"matched_orders_must_equal_baseline": True, "tolerance": 0},
        },
        "mongo_lookup_cccd": {
            "pipeline": [
                {
                    "$lookup": {
                        "from": "customers",
                        "localField": "pii_ext.customer_cccd",
                        "foreignField": "identity.cccd",
                        "as": "verified_customer",
                    }
                },
                {"$match": {"verified_customer": {"$ne": []}}},
            ],
            "description": "$lookup orders -> customers via CCCD (pii_ext.customer_cccd <-> identity.cccd, HMAC join key)",
            "baseline": {
                "total_orders": mongo_res["total_orders"],
                "matched_rows": mongo_res["matched_by_cccd"],
                "unmatched_orders": mongo_res["unmatched_by_cccd"],
                "note": "After HMAC transformation of CCCD in both collections, matched document count must match baseline",
            },
            "post_mask_requirement": {"matched_rows_must_equal_baseline": True, "tolerance": 0},
        },
    }

    eval_dir = Path(__file__).parent.parent / "eval"
    eval_dir.mkdir(parents=True, exist_ok=True)
    out_file = eval_dir / "expected_downstream.json"

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(downstream_data, f, indent=2, ensure_ascii=False)

    print(f"\n[SUCCESS] Baseline computed and saved to: {out_file}")
    print(f"PostgreSQL Join Matched: {pg_res['join']['matched_rows']}")
    print(
        f"PostgreSQL Revenue Sum:  {pg_res['aggregate']['total_revenue']} across {pg_res['aggregate']['distinct_customers']} customers"
    )
    print(f"MongoDB Lookup Matched:  {mongo_res['matched_by_cccd']} / {mongo_res['total_orders']}")


if __name__ == "__main__":
    main()
