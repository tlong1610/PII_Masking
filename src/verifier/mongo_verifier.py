"""
MongoDB Downstream Verifier.
Runs pre- and post-transformation NoSQL queries ($lookup by customer_id and customer_cccd)
to verify that HMAC-SHA256 pseudonymization preserves 100% analytical downstream integrity.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any

try:
    from pymongo import ASCENDING, MongoClient
except ImportError:
    MongoClient = None

from src.transform.hmac_hasher import hash_value

logger = logging.getLogger(__name__)


class HMACHasher:
    """Wrapper around hash_value for consistent pseudonymization."""

    def __init__(self, secret_key: str | None = None, key_version: str = "v1"):
        from src.config import get_settings
        settings = get_settings()
        self.secret_key = secret_key or settings.hmac_secret
        self.key_version = key_version or settings.hmac_key_version

    def hash(self, value: Any) -> str | None:
        if value is None:
            return None
        return hash_value(value, secret=self.secret_key, key_version=self.key_version)


class MaskEngine:
    """Masking utilities for MongoDB documents (No-raw-value safe)."""

    def __init__(self, hasher: HMACHasher | None = None):
        self.hasher = hasher or HMACHasher()

    @staticmethod
    def mask_email(email: str | None) -> str:
        if not email or "@" not in str(email):
            return "***"
        user, domain = str(email).split("@", 1)
        if len(user) <= 2:
            return f"{user[:1]}***@{domain}"
        return f"{user[:1]}***{user[-1:]}@{domain}"

    @staticmethod
    def mask_phone(phone: str | None) -> str:
        if not phone:
            return "***"
        digits = str(phone).strip()
        if len(digits) >= 7:
            return f"{digits[:3]}***{digits[-4:]}"
        return f"{digits[:2]}***"


class MongoVerifier:
    """
    Verifies downstream MongoDB $lookup queries before and after PII anonymization:
    1. Pre-processing: Measures raw $lookup matches on source database.
    2. Post-processing: Builds a protected snapshot database with MASK & HMAC applied,
       then runs identical $lookup pipelines to prove 100% document match.
    3. Benchmarks against eval/expected_downstream.json.
    """

    def __init__(
        self,
        connection_string: str | None = None,
        source_db_name: str | None = None,
        target_db_name: str | None = None,
        hasher: HMACHasher | None = None,
        mask_engine: MaskEngine | None = None,
    ):
        self.connection_string = connection_string or os.getenv(
            "MONGO_URI", "mongodb://admin:admin@localhost:27017/?authSource=admin"
        )
        self.source_db_name = source_db_name or os.getenv("MONGO_DB", "mydatabase")
        self.target_db_name = target_db_name or os.getenv("MONGO_TARGET_DB", "mydatabase_protected")
        self.hasher = hasher or HMACHasher()
        self.mask_engine = mask_engine or MaskEngine(self.hasher)

    def _get_client(self) -> MongoClient:
        if MongoClient is None:
            raise RuntimeError("Thư viện pymongo chưa được cài đặt. Không thể kết nối MongoDB.")
        return MongoClient(self.connection_string, serverSelectionTimeoutMS=5000)

    def load_expected_downstream(self) -> dict[str, Any]:
        """Loads baseline expectations from eval/expected_downstream.json."""
        eval_path = Path(__file__).resolve().parent.parent.parent / "eval" / "expected_downstream.json"
        if not eval_path.exists():
            raise FileNotFoundError(f"Missing baseline file at {eval_path}")
        with open(eval_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def run_pre_processing_baseline(self) -> dict[str, Any]:
        """Runs downstream $lookup queries on raw source database before transformation."""
        client = self._get_client()
        try:
            db = client[self.source_db_name]
            total_orders = db.orders.count_documents({})
            total_customers = db.customers.count_documents({})

            # 1. Lookup by customer_id
            pipeline_cust_id = [
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
            res1 = list(db.orders.aggregate(pipeline_cust_id))
            matched_by_customer_id = res1[0]["matched_count"] if res1 else 0

            # 2. Lookup by customer_cccd (join key preservation)
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
        finally:
            client.close()

    def build_protected_snapshot(self, target_db_name: str | None = None) -> dict[str, int]:
        """
        Creates an isolated protected snapshot database:
        - customers: identity.cccd hashed via HMAC-SHA256, contact.email and phone masked.
        - orders: pii_ext.customer_cccd hashed via HMAC-SHA256 (identical key), ship_phone masked, notes redacted.
        """
        t_db_name = target_db_name or self.target_db_name
        client = self._get_client()
        try:
            src_db = client[self.source_db_name]
            dst_db = client[t_db_name]

            # 1. Drop existing target collections (Idempotency)
            dst_db.customers.drop()
            dst_db.orders.drop()

            # 2. Transform and insert customers
            raw_customers = list(src_db.customers.find({}))
            transformed_customers = []

            for doc in raw_customers:
                c_copy = json.loads(json.dumps(doc, default=str))

                # Transform identity
                if "identity" in c_copy and isinstance(c_copy["identity"], dict):
                    raw_cccd = c_copy["identity"].get("cccd")
                    if raw_cccd:
                        c_copy["identity"]["cccd"] = self.hasher.hash(str(raw_cccd))
                    if "tax_code" in c_copy["identity"]:
                        c_copy["identity"]["tax_code"] = "[REDACTED]"

                # Transform contact
                if "contact" in c_copy and isinstance(c_copy["contact"], dict):
                    if "email" in c_copy["contact"]:
                        c_copy["contact"]["email"] = self.mask_engine.mask_email(c_copy["contact"]["email"])
                    if "phone" in c_copy["contact"]:
                        c_copy["contact"]["phone"] = self.mask_engine.mask_phone(c_copy["contact"]["phone"])
                    if "mobile_phone" in c_copy["contact"]:
                        c_copy["contact"]["mobile_phone"] = self.mask_engine.mask_phone(c_copy["contact"]["mobile_phone"])

                # Transform notes
                if "notes" in c_copy and c_copy["notes"]:
                    c_copy["notes"] = "[REDACTED]"

                transformed_customers.append(c_copy)

            if transformed_customers:
                dst_db.customers.insert_many(transformed_customers)

            # 3. Transform and insert orders
            raw_orders = list(src_db.orders.find({}))
            transformed_orders = []

            for doc in raw_orders:
                o_copy = json.loads(json.dumps(doc, default=str))

                # Transform pii_ext
                if "pii_ext" in o_copy and isinstance(o_copy["pii_ext"], dict):
                    raw_cust_cccd = o_copy["pii_ext"].get("customer_cccd")
                    if raw_cust_cccd:
                        # Consistent HMAC-SHA256 with same key and salt
                        o_copy["pii_ext"]["customer_cccd"] = self.hasher.hash(str(raw_cust_cccd))
                    if "ship_phone" in o_copy["pii_ext"]:
                        o_copy["pii_ext"]["ship_phone"] = self.mask_engine.mask_phone(o_copy["pii_ext"]["ship_phone"])
                    if "order_notes" in o_copy["pii_ext"]:
                        o_copy["pii_ext"]["order_notes"] = "[REDACTED]"
                    # pii_ext.tracking_code is kept unchanged (Non-PII tracking code)

                transformed_orders.append(o_copy)

            if transformed_orders:
                dst_db.orders.insert_many(transformed_orders)

            # 4. Create indexes on protected collections
            dst_db.customers.create_index([("identity.cccd", ASCENDING)], name="idx_prot_cust_cccd")
            dst_db.customers.create_index([("contact.email", ASCENDING)], name="idx_prot_cust_email")
            dst_db.orders.create_index([("customer_id", ASCENDING)], name="idx_prot_orders_customer_id")
            dst_db.orders.create_index([("pii_ext.customer_cccd", ASCENDING)], name="idx_prot_orders_customer_cccd")

            return {
                "customers_count": len(transformed_customers),
                "orders_count": len(transformed_orders),
            }
        finally:
            client.close()

    def run_post_processing_validation(self, target_db_name: str | None = None) -> dict[str, Any]:
        """Runs downstream $lookup queries on the protected snapshot database."""
        t_db_name = target_db_name or self.target_db_name
        client = self._get_client()
        try:
            db = client[t_db_name]
            total_orders = db.orders.count_documents({})
            total_customers = db.customers.count_documents({})

            # 1. Lookup by customer_id
            pipeline_cust_id = [
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
            res1 = list(db.orders.aggregate(pipeline_cust_id))
            matched_by_customer_id = res1[0]["matched_count"] if res1 else 0

            # 2. Lookup by customer_cccd (join key preservation check)
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
        finally:
            client.close()

    def verify_end_to_end(self) -> dict[str, Any]:
        """
        Executes complete verification flow for MongoDB:
        - Baseline pre-processing
        - Snapshot creation with HMAC & Masking
        - Post-processing validation
        - Comparison against eval/expected_downstream.json
        """
        expected = self.load_expected_downstream()
        expected_cust_id_match = expected["mongo_lookup"]["baseline"]["matched_orders"]
        expected_cccd_match = expected["mongo_lookup_cccd"]["baseline"]["matched_rows"]
        expected_total_orders = expected["mongo_lookup"]["baseline"]["total_orders"]

        pre_res = self.run_pre_processing_baseline()
        self.build_protected_snapshot()
        post_res = self.run_post_processing_validation()

        # Check conditions
        cust_id_matched = (
            pre_res["matched_by_customer_id"] == post_res["matched_by_customer_id"] == expected_cust_id_match
        )
        cccd_matched = (
            pre_res["matched_by_cccd"] == post_res["matched_by_cccd"] == expected_cccd_match
        )
        unmatched_zero = (post_res["unmatched_by_cccd"] == 0)

        all_passed = cust_id_matched and cccd_matched and unmatched_zero

        return {
            "all_passed": all_passed,
            "metrics": {
                "matched_by_customer_id": {
                    "baseline_expected": expected_cust_id_match,
                    "pre_processing_actual": pre_res["matched_by_customer_id"],
                    "post_processing_actual": post_res["matched_by_customer_id"],
                    "difference": post_res["matched_by_customer_id"] - expected_cust_id_match,
                    "status": "PASS" if cust_id_matched else "FAIL",
                },
                "matched_by_cccd": {
                    "baseline_expected": expected_cccd_match,
                    "pre_processing_actual": pre_res["matched_by_cccd"],
                    "post_processing_actual": post_res["matched_by_cccd"],
                    "difference": post_res["matched_by_cccd"] - expected_cccd_match,
                    "status": "PASS" if cccd_matched else "FAIL",
                },
                "unmatched_orders": {
                    "baseline_expected": 0,
                    "pre_processing_actual": pre_res["unmatched_by_cccd"],
                    "post_processing_actual": post_res["unmatched_by_cccd"],
                    "difference": post_res["unmatched_by_cccd"],
                    "status": "PASS" if unmatched_zero else "FAIL",
                },
                "total_orders": {
                    "baseline_expected": expected_total_orders,
                    "pre_processing_actual": pre_res["total_orders"],
                    "post_processing_actual": post_res["total_orders"],
                    "difference": post_res["total_orders"] - expected_total_orders,
                    "status": "PASS" if post_res["total_orders"] == expected_total_orders else "FAIL",
                },
            },
            "sample_verification": self._get_sample_comparison(),
        }

    def _get_sample_comparison(self) -> dict[str, Any]:
        """Provides sample side-by-side comparison of raw vs protected MongoDB document (Strict No-raw-value safe)."""
        client = self._get_client()
        try:
            dst_c = client[self.target_db_name].customers.find_one({"_id": "ALFKI"}) or {}

            return {
                "customer_id": "ALFKI",
                "raw_record": {
                    "cccd_shape": "XXXXXXXXXXXX (12-digit format, raw hidden)",
                    "email_domain": "[DOMAIN_PRESERVED]",
                    "status": "RAW_VALUE_PROTECTED",
                },
                "protected_record": {
                    "cccd_hmac_sha256": dst_c.get("identity", {}).get("cccd", ""),
                    "email_masked": dst_c.get("contact", {}).get("email", ""),
                },
            }
        finally:
            client.close()
