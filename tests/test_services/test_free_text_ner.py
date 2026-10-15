"""Free-text NER wiring: scanner proposes REDACT, transform redacts entities, nothing raw reaches metadata."""

import pytest

from src.detection.ner_orchestrator import detect_entity_types, redact_free_text, reset_ner_pipeline
from src.models.schemas import ColumnProfile
from src.services.run_scanner import apply_free_text_ner, is_free_text_column
from src.transform.mask_engine import transform_row

PHONE = "0912345678"
EMAIL = "an.nguyen@example.com"


@pytest.fixture(autouse=True)
def _regex_only_pipeline():
    # ENABLE_NER is off in tests: regex + dictionary tiers only, no model download.
    reset_ner_pipeline()
    yield
    reset_ner_pipeline()


def _column(name: str, samples: list[str], data_type: str = "text") -> ColumnProfile:
    return ColumnProfile(
        table_name="customers",
        column_name=name,
        data_type=data_type,
        is_primary_key=False,
        is_foreign_key=False,
        samples=samples,
    )


def _spec(**overrides) -> dict:
    spec = {
        "source_path": "customers",
        "field_path": "notes",
        "data_type": "text",
        "profile_summary": "Ambiguous free text",
        "classification": "UNKNOWN",
        "taxonomy_id": None,
        "detector_source": "unknown",
        "coverage_status": "partial",
        "recommended_action": "DROP",
    }
    spec.update(overrides)
    return spec


def test_redact_free_text_keeps_sentence():
    out = redact_free_text(f"Khách gọi {PHONE}, gửi mail {EMAIL} để đổi lịch")
    assert out == "Khách gọi [PHONE], gửi mail [EMAIL] để đổi lịch"


def test_detect_entity_types_returns_types_only():
    types, hits = detect_entity_types([f"liên hệ {PHONE}", "không có gì", "", None])
    assert types == ["PHONE"]
    assert hits == 1


def test_scanner_proposes_redact_for_notes_with_pii():
    column = _column("notes", [f"Khách hẹn gọi lại {PHONE}", "Giao hàng giờ hành chính", f"mail {EMAIL}"])
    spec = apply_free_text_ner(_spec(), column)
    assert spec["recommended_action"] == "REDACT"
    assert spec["taxonomy_id"] == "FREE_TEXT_PII"
    assert spec["classification"] == "PERSONAL_BASIC"
    assert "EMAIL" in spec["profile_summary"] and "PHONE" in spec["profile_summary"]
    # Hard invariant: no raw value in persisted metadata.
    assert PHONE not in str(spec) and EMAIL not in str(spec)


def test_scanner_leaves_clean_free_text_alone():
    column = _column("notes", ["Giao hàng giờ hành chính", "Khách thích màu xanh"])
    assert apply_free_text_ner(_spec(), column) == _spec()


def test_scanner_keeps_specific_and_sensitive_proposals():
    column = _column("notes", [f"gọi {PHONE}"])
    address = _spec(taxonomy_id="ADDRESS", classification="PERSONAL_BASIC", recommended_action="MASK")
    assert apply_free_text_ner(address, column) == address
    sensitive = _spec(taxonomy_id="HEALTH", classification="PERSONAL_SENSITIVE", recommended_action="DROP")
    assert apply_free_text_ner(sensitive, column) == sensitive


def test_free_text_detection_by_name_or_prose():
    assert is_free_text_column(_column("ghi_chu", ["ok"]))
    assert is_free_text_column(_column("extra", ["Khách hàng muốn đổi địa chỉ nhận hàng sang chi nhánh khác"]))
    assert not is_free_text_column(_column("status", ["ACTIVE", "CLOSED"]))
    assert not is_free_text_column(_column("notes", ["1"], data_type="integer"))


def test_transform_row_redacts_entities_per_cell():
    row = {"id": 1, "notes": f"Gọi {PHONE} trước 5h", "empty": None}
    out = transform_row(row, {"notes": "REDACT", "empty": "REDACT"}, secret="s", key_version="v1")
    assert out == {"id": 1, "notes": "Gọi [PHONE] trước 5h", "empty": None}
