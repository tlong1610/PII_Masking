"""Unit tests for decision-driven Mongo document transforms and join-key guard (no live Mongo)."""

import re
from types import SimpleNamespace

from src.transform.mongo_pipeline import actions_from_run_decisions, join_key_violations
from src.verifier.mongo_verifier import HMACHasher, MongoVerifier

RELATIONS = [
    ("orders", "customer_id", "customers", "_id"),
    ("orders", "pii_ext.customer_cccd", "customers", "identity.cccd"),
]


def _verifier() -> MongoVerifier:
    return MongoVerifier(client=object(), hasher=HMACHasher(secret_key="s", key_version="v1"))


def test_transform_document_applies_each_action_on_dot_paths():
    doc = {
        "_id": "C1",
        "identity": {"cccd": "001090000001", "tax_code": "0101"},
        "contact": {"email": "nguyen@example.vn", "phone": "0901234567"},
        "notes": "free text",
        "status": "active",
    }
    out = _verifier().transform_document(
        doc,
        {
            "identity.cccd": "HMAC",
            "identity.tax_code": "DROP",
            "contact.email": "MASK",
            "contact.phone": "MASK",
            "notes": "MASK",
            "status": "KEEP",
            "missing.path": "DROP",
        },
    )
    assert re.fullmatch(r"[0-9a-f]{64}", out["identity"]["cccd"])
    assert "tax_code" not in out["identity"]
    assert out["contact"]["email"] == "n***n@example.vn"
    assert out["contact"]["phone"] == "090***4567"
    assert out["notes"] == "***"
    assert out["status"] == "active"
    assert doc["identity"]["cccd"] == "001090000001"


def test_hmac_is_consistent_across_collections():
    v = _verifier()
    customer = v.transform_document({"identity": {"cccd": "001"}}, {"identity.cccd": "HMAC"})
    order = v.transform_document(
        {"pii_ext": {"customer_cccd": "001"}}, {"pii_ext.customer_cccd": "HMAC"}
    )
    assert customer["identity"]["cccd"] == order["pii_ext"]["customer_cccd"]


def test_actions_from_run_decisions_groups_by_collection():
    profiles = [
        SimpleNamespace(id=1, source_path="customers", field_path="identity.cccd"),
        SimpleNamespace(id=2, source_path="orders", field_path="pii_ext.customer_cccd"),
    ]
    decisions = [
        SimpleNamespace(field_profile_id=1, action="HMAC"),
        SimpleNamespace(field_profile_id=2, action="HMAC"),
    ]
    assert actions_from_run_decisions(profiles, decisions) == {
        "customers": {"identity.cccd": "HMAC"},
        "orders": {"pii_ext.customer_cccd": "HMAC"},
    }


def test_join_key_violations():
    ok = {
        "orders": {"customer_id": "HMAC", "pii_ext.customer_cccd": "HMAC"},
        "customers": {"_id": "HMAC", "identity.cccd": "HMAC"},
    }
    assert join_key_violations(ok, RELATIONS) == []

    keep_both = {"orders": {"customer_id": "KEEP"}, "customers": {"_id": "KEEP"}}
    assert join_key_violations(keep_both, RELATIONS[:1]) == []

    mismatch = {
        "orders": {"customer_id": "HMAC", "pii_ext.customer_cccd": "HMAC"},
        "customers": {"_id": "KEEP", "identity.cccd": "DROP"},
    }
    violations = join_key_violations(mismatch, RELATIONS)
    assert len(violations) == 2
    assert violations[1]["to_action"] == "DROP"
