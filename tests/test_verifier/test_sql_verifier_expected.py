"""Tests for SQL verifier helpers (no live DB required for load_expected)."""

from src.verifier import sql_verifier
from src.verifier.sql_verifier import CheckResult, load_expected, run_postgres_verifiers


def test_expected_downstream_baseline_numbers():
    data = load_expected()
    assert data["postgres_join"]["baseline"]["matched_rows"] == 830
    assert data["postgres_join"]["baseline"]["unmatched_orders"] == 0
    assert data["postgres_aggregate"]["baseline"]["distinct_customers"] == 89
    assert abs(float(data["postgres_aggregate"]["baseline"]["total_revenue"]) - 1265793.01) < 0.001


def _stub_checks(monkeypatch):
    def stub(name):
        return lambda *_a, **_k: CheckResult(name, "PASSED", "", "", "0", "")

    monkeypatch.setattr(sql_verifier, "verify_join_hmac", stub("sql_join_hmac"))
    monkeypatch.setattr(sql_verifier, "verify_aggregate_revenue", stub("sql_aggregate_revenue"))
    monkeypatch.setattr(sql_verifier, "verify_zero_raw_pii_egress", stub("zero_raw_pii_egress"))


def _names(results):
    return [r.check_name for r in results]


def test_demo_checks_run_only_when_their_tables_were_built(monkeypatch):
    _stub_checks(monkeypatch)
    actions = {"customers": {}, "orders": {}}

    full = run_postgres_verifiers("url", tables=["customers", "order_details", "orders"], table_actions=actions)
    assert _names(full) == ["sql_join_hmac", "sql_aggregate_revenue", "zero_raw_pii_egress"]

    no_details = run_postgres_verifiers("url", tables=["customers", "orders"], table_actions=actions)
    assert _names(no_details) == ["sql_join_hmac", "zero_raw_pii_egress"]

    kyc_only = run_postgres_verifiers("url", tables=["kyc_documents"], table_actions={"kyc_documents": {}})
    assert _names(kyc_only) == ["zero_raw_pii_egress"]
