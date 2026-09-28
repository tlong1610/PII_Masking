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
from src.transform.mask_engine import MASK_PLACEHOLDER

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
        client: Any | None = None,
    ):
        self.connection_string = connection_string or os.getenv(
            "MONGO_URI", "mongodb://admin:admin@localhost:27017/?authSource=admin"
        )
        self.source_db_name = source_db_name or os.getenv("MONGO_DB", "mydatabase")
        self.target_db_name = target_db_name or os.getenv("MONGO_TARGET_DB", "mydatabase_protected")
        self.hasher = hasher or HMACHasher()
        self.mask_engine = mask_engine or MaskEngine(self.hasher)
        # Caller-owned client (shared or mongomock); never closed by the verifier.
        self._client = client

    def _get_client(self) -> MongoClient:
        if self._client is not None:
            return self._client
        if MongoClient is None:
            raise RuntimeError("Thư viện pymongo chưa được cài đặt. Không thể kết nối MongoDB.")
        return MongoClient(self.connection_string, serverSelectionTimeoutMS=5000)

    def _release_client(self, client: Any) -> None:
        if client is not self._client:
            client.close()

    def load_expected_downstream(self) -> dict[str, Any]:
        """Loads baseline expectations from eval/expected_downstream.json."""
        eval_path = Path(__file__).resolve().parent.parent.parent / "eval" / "expected_downstream.json"
        if not eval_path.exists():
            raise FileNotFoundError(f"Missing baseline file at {eval_path}")
        with open(eval_path, encoding="utf-8") as f:
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
            self._release_client(client)

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
            self._release_client(client)

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
            self._release_client(client)

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
            self._release_client(client)

    # ------------------------------------------------------------------
    # Decision-driven snapshot + relation-driven verification (API path)
    # ------------------------------------------------------------------

    def _mask_value(self, leaf: str, value: Any) -> Any:
        if value is None:
            return None
        name = leaf.lower()
        if "email" in name:
            return self.mask_engine.mask_email(value)
        if "phone" in name or "fax" in name:
            return self.mask_engine.mask_phone(value)
        return MASK_PLACEHOLDER

    def transform_document(
        self,
        doc: dict[str, Any],
        field_actions: dict[str, str],
        default_action: str = "KEEP",
    ) -> dict[str, Any]:
        """Apply {dot_path: MASK|HMAC|DROP|KEEP} to one document.

        default_action="KEEP" keeps unlisted fields; "DROP" keeps only listed, non-DROP paths.
        """
        out = self._apply_actions(doc, field_actions)
        if (default_action or "KEEP").upper() != "DROP":
            return out
        projected: dict[str, Any] = {}
        for path, action in field_actions.items():
            if (action or "KEEP").upper() == "DROP":
                continue
            parent, leaf = _resolve_parent(out, path)
            if parent is not None and leaf in parent:
                _set_path(projected, path, parent[leaf])
        return projected

    def _apply_actions(self, doc: dict[str, Any], field_actions: dict[str, str]) -> dict[str, Any]:
        out = json.loads(json.dumps(doc, default=str))
        for path, action in field_actions.items():
            act = (action or "KEEP").upper()
            if act == "KEEP":
                continue
            parent, leaf = _resolve_parent(out, path)
            if parent is None or leaf not in parent:
                continue
            if act == "DROP":
                del parent[leaf]
            elif act == "HMAC":
                parent[leaf] = self.hasher.hash(parent[leaf])
            elif act == "MASK":
                parent[leaf] = self._mask_value(leaf, parent[leaf])
        return out

    def build_snapshot_from_actions(
        self,
        table_actions: dict[str, dict[str, str]],
        index_fields: dict[str, list[str]] | None = None,
        default_action: str = "KEEP",
    ) -> dict[str, int]:
        """Rebuild target_db from scratch: every collection in table_actions, transformed per DPO decisions."""
        if self.source_db_name == self.target_db_name:
            raise ValueError("Mongo snapshot database must differ from the source database")
        client = self._get_client()
        try:
            src_db = client[self.source_db_name]
            dst_db = client[self.target_db_name]
            for stale in dst_db.list_collection_names():
                if not stale.startswith("system."):
                    dst_db[stale].drop()
            written: dict[str, int] = {}
            for coll_name in sorted(table_actions):
                actions = table_actions[coll_name]
                docs = [
                    self.transform_document(d, actions, default_action)
                    for d in src_db[coll_name].find({})
                ]
                if docs:
                    dst_db[coll_name].insert_many(docs)
                for field in (index_fields or {}).get(coll_name, []):
                    dst_db[coll_name].create_index([(field, ASCENDING)])
                written[coll_name] = len(docs)
            return written
        finally:
            self._release_client(client)

    def measure_lookups(
        self,
        db_name: str,
        collections: list[str],
        relations: list[tuple[str, str, str, str]],
    ) -> dict[str, Any]:
        """Document counts + $lookup matched/unmatched per relation, measured live on db_name."""
        client = self._get_client()
        try:
            db = client[db_name]
            counts = {c: db[c].count_documents({}) for c in collections}
            lookups: dict[str, dict[str, int]] = {}
            for from_coll, from_field, to_coll, to_field in relations:
                pipeline = [
                    {
                        "$lookup": {
                            "from": to_coll,
                            "localField": from_field,
                            "foreignField": to_field,
                            "as": "_piiguard_match",
                        }
                    },
                    {"$match": {"_piiguard_match": {"$ne": []}}},
                    {"$count": "matched"},
                ]
                res = list(db[from_coll].aggregate(pipeline))
                matched = res[0]["matched"] if res else 0
                total = db[from_coll].count_documents({})
                lookups[relation_label((from_coll, from_field, to_coll, to_field))] = {
                    "total": total,
                    "matched": matched,
                    "unmatched": total - matched,
                }
            return {"counts": counts, "lookups": lookups}
        finally:
            self._release_client(client)

    def verify_snapshot(
        self,
        collections: list[str],
        relations: list[tuple[str, str, str, str]],
    ) -> list[dict[str, str]]:
        """Compare snapshot against the source measured right now. PASS only when post == pre."""
        pre = self.measure_lookups(self.source_db_name, collections, relations)
        post = self.measure_lookups(self.target_db_name, collections, relations)
        checks: list[dict[str, str]] = []
        for coll in collections:
            before, after = pre["counts"][coll], post["counts"][coll]
            checks.append(
                _check(f"doc_count:{coll}", before, after, f"Documents in {coll}: source vs snapshot")
            )
        for label, before in pre["lookups"].items():
            after = post["lookups"][label]
            checks.append(
                _check(
                    f"lookup_matched:{label}",
                    before["matched"],
                    after["matched"],
                    f"$lookup matched documents (of {before['total']}) must be preserved",
                )
            )
            checks.append(
                _check(
                    f"lookup_unmatched:{label}",
                    before["unmatched"],
                    after["unmatched"],
                    "$lookup unmatched documents must not increase or decrease",
                )
            )
        return checks


def relation_label(relation: tuple[str, str, str, str]) -> str:
    from_coll, from_field, to_coll, to_field = relation
    return f"{from_coll}.{from_field}->{to_coll}.{to_field}"


def _resolve_parent(doc: dict[str, Any], path: str) -> tuple[dict[str, Any] | None, str]:
    parts = path.split(".")
    node: Any = doc
    for part in parts[:-1]:
        if not isinstance(node, dict) or part not in node:
            return None, parts[-1]
        node = node[part]
    if not isinstance(node, dict):
        return None, parts[-1]
    return node, parts[-1]


def _set_path(doc: dict[str, Any], path: str, value: Any) -> None:
    parts = path.split(".")
    node = doc
    for part in parts[:-1]:
        child = node.get(part)
        if not isinstance(child, dict):
            child = {}
            node[part] = child
        node = child
    node[parts[-1]] = value


def _check(name: str, baseline: int, actual: int, details: str) -> dict[str, str]:
    return {
        "check_name": name,
        "status": "PASSED" if baseline == actual else "FAILED",
        "baseline_value": str(baseline),
        "actual_value": str(actual),
        "tolerance": "0",
        "details": details,
    }
