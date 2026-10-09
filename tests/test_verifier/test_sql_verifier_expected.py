"""Tests for SQL verifier helpers (no live DB required for load_expected)."""

from src.verifier.sql_verifier import load_expected


def test_expected_downstream_baseline_numbers():
    data = load_expected()
    assert data["postgres_join"]["baseline"]["matched_rows"] == 830
    assert data["postgres_join"]["baseline"]["unmatched_orders"] == 0
    assert data["postgres_aggregate"]["baseline"]["distinct_customers"] == 89
    assert abs(float(data["postgres_aggregate"]["baseline"]["total_revenue"]) - 1265793.01) < 0.001
