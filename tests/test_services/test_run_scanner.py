"""Unit tests for run_scanner mapping helpers (no live LLM / DB)."""

from src.models.schemas import ColumnProfile, FieldScanResult
from src.services.run_scanner import (
    classification_from_pii_type,
    coverage_from_result,
    detector_from_tier,
    field_profile_spec,
    normalize_action,
)


def test_classification_and_action_normalize():
    assert classification_from_pii_type("PHONE") == "PERSONAL_BASIC"
    assert classification_from_pii_type("EMAIL") == "PERSONAL_CONTEXT"
    assert classification_from_pii_type("NOT_PERSONAL_DATA") == "NON_PERSONAL"
    assert classification_from_pii_type("UNKNOWN") == "UNKNOWN"
    assert normalize_action("HASHING") == "HMAC"
    assert normalize_action("MASK") == "MASK"
    assert normalize_action("weird") == "KEEP"


def test_detector_and_coverage():
    assert detector_from_tier("TIER_1") == "rule"
    assert detector_from_tier("TIER_3_LLM") == "ai"
    full = FieldScanResult(
        field_name="phone",
        inferred_pii_type="PHONE",
        confidence=0.95,
        recommended_action="MASK",
        reasoning="regex",
        tier="TIER_1",
    )
    assert coverage_from_result(full) == "full"
    partial = FieldScanResult(
        field_name="notes",
        inferred_pii_type="UNKNOWN",
        confidence=0.2,
        recommended_action="DROP",
        reasoning="ambiguous",
        tier="TIER_3_LLM",
    )
    assert coverage_from_result(partial) == "partial"


def test_field_profile_spec_no_samples():
    col = ColumnProfile(
        column_name="cccd",
        data_type="varchar",
        is_primary_key=False,
        is_foreign_key=False,
        samples=["001", "002"],
    )
    result = FieldScanResult(
        field_name="cccd",
        inferred_pii_type="CCCD",
        confidence=0.99,
        recommended_action="HMAC",
        reasoning="join key",
        tier="TIER_1",
    )
    spec = field_profile_spec(table="customers", column=col, result=result)
    assert spec["source_path"] == "customers"
    assert spec["field_path"] == "cccd"
    assert spec["taxonomy_id"] == "CCCD"
    assert spec["recommended_action"] == "HMAC"
    assert spec["coverage_status"] == "full"
    assert "001" not in str(spec)
    assert "sample" not in str(spec).lower()
