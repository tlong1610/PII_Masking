"""
MongoDB Fixture Seed Script — PIIGuard Shield
=========================================
Loads synthetic ecommerce + Vietnam PII datasets into MongoDB:
- customers: 91 documents (seed_customers.json)
- orders:    830 documents (seed_orders.json)

Features:
- Idempotent: Automatically drops existing collections before inserting.
- Indexing: Creates ASCENDING indexes on join keys and searchable PII fields.
- Self-verifying: Asserts exact document counts (91 / 830) upon completion.

Usage:
    python data/fixtures/mongo/seed_mongo.py

Environment variables (optional):
    MONGO_URI: MongoDB connection string (default: mongodb://admin:admin@localhost:27017/?authSource=admin)
    MONGO_DB:  Target database name (default: mydatabase)
"""

import json
import os
import sys
from pathlib import Path

from pymongo import ASCENDING, MongoClient


def get_env_var(name: str, default: str) -> str:
    return os.getenv(name, default)


def seed_mongodb(mongo_uri: str | None = None, mongo_db_name: str | None = None) -> bool:
    uri = mongo_uri or get_env_var("MONGO_URI", "mongodb://admin:admin@localhost:27017/?authSource=admin")
    db_name = mongo_db_name or get_env_var("MONGO_DB", "mydatabase")

    print(f"Connecting to MongoDB at: {uri} (database: {db_name})")
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        # Fast health check
        client.admin.command("ping")
    except Exception as e:
        print(f"[ERROR] Could not connect to MongoDB: {e}", file=sys.stderr)
        print("Hint: Ensure the MongoDB container is running: `docker compose up -d mongodb`", file=sys.stderr)
        return False

    try:
        db = client[db_name]

        fixtures_dir = Path(__file__).resolve().parent
        customers_file = fixtures_dir / "seed_customers.json"
        orders_file = fixtures_dir / "seed_orders.json"

        if not customers_file.exists():
            raise FileNotFoundError(f"Missing customers fixture file: {customers_file}")
        if not orders_file.exists():
            raise FileNotFoundError(f"Missing orders fixture file: {orders_file}")

        with open(customers_file, encoding="utf-8") as f:
            customers_data = json.load(f)

        with open(orders_file, encoding="utf-8") as f:
            orders_data = json.load(f)

        print(f"Loaded {len(customers_data)} customer records from JSON.")
        print(f"Loaded {len(orders_data)} order records from JSON.")

        # Drop existing collections (Idempotency guarantee)
        print("Dropping existing collections...")
        db.customers.drop()
        db.orders.drop()

        # Insert documents
        if customers_data:
            cust_result = db.customers.insert_many(customers_data)
            print(f"Successfully inserted {len(cust_result.inserted_ids)} documents into 'customers'.")

        if orders_data:
            order_result = db.orders.insert_many(orders_data)
            print(f"Successfully inserted {len(order_result.inserted_ids)} documents into 'orders'.")

        # Create indexes
        print("Creating indexes...")
        db.customers.create_index([("identity.cccd", ASCENDING)], name="idx_customers_cccd")
        db.customers.create_index([("contact.email", ASCENDING)], name="idx_customers_email")
        db.orders.create_index([("customer_id", ASCENDING)], name="idx_orders_customer_id")
        db.orders.create_index([("pii_ext.customer_cccd", ASCENDING)], name="idx_orders_customer_cccd")
        db.orders.create_index([("pii_ext.tracking_code", ASCENDING)], name="idx_orders_tracking_code")

        # Verify counts
        cust_count = db.customers.count_documents({})
        order_count = db.orders.count_documents({})
        print("\n--- MongoDB Seed Verification ---")
        print(f"Collection 'customers': {cust_count} documents (expected: 91)")
        print(f"Collection 'orders':    {order_count} documents (expected: 830)")

        if cust_count == 91 and order_count == 830:
            print("[SUCCESS] MongoDB seed completed successfully and verified!")
            return True
        else:
            print(
                f"[WARNING] Document counts do not match expected values (cust: {cust_count}/91, ord: {order_count}/830)",
                file=sys.stderr,
            )
            return False
    finally:
        client.close()


if __name__ == "__main__":
    success = seed_mongodb()
    sys.exit(0 if success else 1)
