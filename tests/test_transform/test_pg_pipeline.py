"""Unit tests for the Postgres pipeline wiring (snapshot build mocked, no live DB)."""

from types import SimpleNamespace

from src.transform import pg_pipeline
from src.transform.pg_pipeline import (
    actions_from_run_decisions,
    logical_join_fields,
    run_protected_postgres_pipeline,
)


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
