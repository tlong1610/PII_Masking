"""Unit tests for the Postgres pipeline wiring (snapshot build mocked, no live DB)."""

from types import SimpleNamespace

from src.transform import pg_pipeline
from src.transform.pg_pipeline import (
    actions_from_run_decisions,
    logical_join_fields,
    pg_join_key_violations,
    run_protected_postgres_pipeline,
)

# ---------------------------------------------------------------------------
# pg_join_key_violations
# ---------------------------------------------------------------------------


def test_pg_join_key_no_violations_when_both_hmac():
    """Both cccd columns HMAC → consistent, no violation."""
    actions = {
        "customers": {"cccd": "HMAC"},
        "orders": {"customer_cccd": "HMAC"},
    }
    assert pg_join_key_violations(actions) == []


def test_pg_join_key_no_violations_when_both_keep():
    """Both cccd columns KEEP → consistent, no violation."""
    actions = {
        "customers": {"cccd": "KEEP"},
        "orders": {"customer_cccd": "KEEP"},
    }
    assert pg_join_key_violations(actions) == []


def test_pg_join_key_violation_hmac_vs_mask():
    """One side HMAC, other MASK → violation reported."""
    actions = {
        "customers": {"cccd": "MASK"},
        "orders": {"customer_cccd": "HMAC"},
    }
    violations = pg_join_key_violations(actions)
    assert len(violations) == 1
    v = violations[0]
    assert v["from"] == "orders.customer_cccd"
    assert v["from_action"] == "HMAC"
    assert v["to"] == "customers.cccd"
    assert v["to_action"] == "MASK"


def test_pg_join_key_violation_one_side_drop():
    """DROP on a join key is always a violation."""
    actions = {
        "customers": {"cccd": "DROP"},
        "orders": {"customer_cccd": "HMAC"},
    }
    violations = pg_join_key_violations(actions)
    assert len(violations) == 1
    assert violations[0]["to_action"] == "DROP"


def test_pg_join_key_missing_table_defaults_to_keep():
    """Field absent from table_actions defaults to KEEP; KEEP vs HMAC is a violation."""
    # Only orders side declared; customers.cccd missing → defaults to KEEP
    actions = {"orders": {"customer_cccd": "HMAC"}}
    violations = pg_join_key_violations(actions)
    assert len(violations) == 1
    assert violations[0]["to_action"] == "KEEP"
    assert violations[0]["from_action"] == "HMAC"


def test_pg_join_key_custom_relations():
    """Caller can pass arbitrary relations instead of the default LOGICAL_JOIN_KEYS."""
    custom = (("tableA", "col1", "tableB", "col2"),)
    assert pg_join_key_violations({"tableA": {"col1": "HMAC"}, "tableB": {"col2": "HMAC"}}, custom) == []
    violations = pg_join_key_violations({"tableA": {"col1": "HMAC"}, "tableB": {"col2": "MASK"}}, custom)
    assert len(violations) == 1




def test_actions_from_run_decisions_groups_every_table():
    profiles = [
        SimpleNamespace(id=1, source_path="customers", field_path="cccd"),
        SimpleNamespace(id=2, source_path="orders", field_path="customer_cccd"),
        SimpleNamespace(id=3, source_path="kyc_documents", field_path="ocr_text"),
    ]
    decisions = [
        SimpleNamespace(field_profile_id=1, action="HMAC"),
        SimpleNamespace(field_profile_id=2, action="HMAC"),
        SimpleNamespace(field_profile_id=3, action="DROP"),
        SimpleNamespace(field_profile_id=99, action="KEEP"),
    ]
    assert actions_from_run_decisions(profiles, decisions) == {
        "customers": {"cccd": "HMAC"},
        "orders": {"customer_cccd": "HMAC"},
        "kyc_documents": {"ocr_text": "DROP"},
    }


def test_logical_join_fields_include_both_cccd_ends():
    assert {("orders", "customer_cccd"), ("customers", "cccd")} <= logical_join_fields()


def test_pipeline_builds_only_decided_tables(monkeypatch):
    captured = {}

    def fake_build(**kwargs):
        captured.update(kwargs)
        return {t: f"snap.{t}" for t in kwargs["tables"]}

    monkeypatch.setattr(pg_pipeline, "build_protected_snapshots", fake_build)
    monkeypatch.setattr(pg_pipeline, "run_postgres_verifiers", lambda *_a, **_k: [])

    actions = {"customers": {"cccd": "HMAC"}, "support_tickets": {"body": "DROP"}}
    written, checks = run_protected_postgres_pipeline(
        source_url="postgresql://src/db",
        snapshot_url="postgresql://snap/db",
        secret="s",
        key_version="v1",
        table_actions=actions,
        source_schema="public",
        default_action="DROP",
    )
    assert captured["tables"] == ("customers", "support_tickets")
    assert captured["default_action"] == "DROP"
    assert captured["table_actions"] == actions
    assert set(written) == {"customers", "support_tickets"}
    assert checks == []


def test_pipeline_without_actions_uses_demo_policy(monkeypatch):
    captured = {}

    def fake_build(**kwargs):
        captured.update(kwargs)
        return {}

    monkeypatch.setattr(pg_pipeline, "build_protected_snapshots", fake_build)
    monkeypatch.setattr(pg_pipeline, "run_postgres_verifiers", lambda *_a, **_k: [])

    run_protected_postgres_pipeline(
        source_url="postgresql://src/db",
        snapshot_url="postgresql://snap/db",
        secret="s",
        key_version="v1",
    )
    assert captured["tables"] == ("customers", "orders", "order_details")
    assert captured["default_action"] == "KEEP"
    assert captured["table_actions"]["orders"]["customer_cccd"] == "HMAC"
