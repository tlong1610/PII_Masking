"""Unit tests for compliance report generator and risk scorer (FR-09, FR-10, §9.4, §20.1)."""


from src.services.report_generator import (
    RECOGNIZER_VERSION,
    TAXONOMY_VERSION,
    render_html_report,
)
from src.services.risk_scorer import (
    calculate_risk_score,
    resolve_sensitivity_level,
)


def test_sensitivity_level_resolution():
    # L3 checks
    assert resolve_sensitivity_level(classification="PERSONAL_SENSITIVE") == "L3"
    assert resolve_sensitivity_level(taxonomy_id="OCR_IDENTITY_DOC") == "L3"
    assert resolve_sensitivity_level(taxonomy_id="BIOMETRIC") == "L3"
    assert resolve_sensitivity_level(taxonomy_id="BANK_ACCOUNT") == "L3"

    # Identity numbers and free text are basic data in src/detection/taxonomy.py (L2)
    assert resolve_sensitivity_level(taxonomy_id="CCCD") == "L2"
    assert resolve_sensitivity_level(taxonomy_id="VN_CCCD") == "L2"
    assert resolve_sensitivity_level(field_path="cccd") == "L2"
    assert resolve_sensitivity_level(field_path="so_cmnd") == "L2"
    assert resolve_sensitivity_level(taxonomy_id="FREE_TEXT_PII") == "L2"

    # L2 checks
    assert resolve_sensitivity_level(taxonomy_id="PHONE") == "L2"
    assert resolve_sensitivity_level(taxonomy_id="EMAIL") == "L2"
    assert resolve_sensitivity_level(classification="PERSONAL_BASIC") == "L2"

    # L1 checks
    assert resolve_sensitivity_level(taxonomy_id="DOB") == "L1"
    assert resolve_sensitivity_level(taxonomy_id="GENDER") == "L1"
    assert resolve_sensitivity_level(classification="UNKNOWN") == "L1"

    # L0 checks
    assert resolve_sensitivity_level(classification="NON_PERSONAL") == "L0"
    assert resolve_sensitivity_level(taxonomy_id="SYSTEM_ID") == "L0"
    assert resolve_sensitivity_level(field_path="order_code") == "L0"


def test_classification_wins_over_taxonomy_and_path_keywords():
    """The report must use the same level the review screen shows (taken from the classification)."""
    assert resolve_sensitivity_level(classification="PERSONAL_BASIC", taxonomy_id="CCCD", field_path="cccd") == "L2"
    assert (
        resolve_sensitivity_level(classification="PERSONAL_BASIC", taxonomy_id="FREE_TEXT_PII", field_path="notes")
        == "L2"
    )
    assert resolve_sensitivity_level(classification="PERSONAL_SENSITIVE", taxonomy_id="PHONE") == "L3"
    assert resolve_sensitivity_level(classification="QUASI_IDENTIFIER", field_path="customer_name") == "L1"
    # Unclassified fields still fall back to taxonomy / column name.
    assert resolve_sensitivity_level(classification="UNKNOWN", taxonomy_id="BANK_ACCOUNT") == "L3"


def test_deterministic_risk_score_calculation():
    # Case 1: L3 exists, all unmasked (Cov = 1.0)
    profiles = [
        {"id": 1, "classification": "PERSONAL_SENSITIVE", "taxonomy_id": "CCCD", "field_path": "cccd", "recommended_action": "KEEP"},
        {"id": 2, "classification": "NON_PERSONAL", "taxonomy_id": "SYSTEM_ID", "field_path": "id", "recommended_action": "KEEP"},
    ]
    res1 = calculate_risk_score(profiles, row_count=1000)
    assert res1["max_sensitivity_level"] == "L3"
    assert res1["drivers"]["sens_factor"] == 1.0
    assert res1["drivers"]["cov_factor"] == 1.0
    assert res1["score"] >= 80.0
    assert res1["tier"] == "Critical"

    # Case 2: L3 exists, but masked (Cov = 0.0) -> Score drops drastically!
    res2 = calculate_risk_score(profiles, decisions={1: "HMAC"}, row_count=1000)
    assert res2["drivers"]["cov_factor"] == 0.0
    assert res2["score"] < 25.0
    assert res2["tier"] == "Low"
    assert res2["drivers"]["protection_pct"] == 100.0


def test_html_report_rendering_has_zero_raw_pii():
    dummy_report_data = {
        "report_id": "REP-RUN-0001-A1B2C3D4",
        "run_id": 1,
        "source_id": "postgres-prod",
        "source_name": "Postgres Core",
        "engine": "postgresql",
        "run_status": "VERIFIED",
        "dataset_name": "ds_safe_01",
        "dataset_status": "VERIFIED",
        "created_at": "2026-10-03T12:00:00Z",
        "generated_at": "2026-10-03T12:05:00Z",
        "requester": "analyst",
        "approvers": ["dpo"],
        "versions": {
            "taxonomy_version": TAXONOMY_VERSION,
            "recognizer_version": RECOGNIZER_VERSION,
            "policy_version": "v1",
            "source_manifest_version": "v1",
            "report_spec_version": "1.0.0",
        },
        "risk_assessment": {
            "score": 15.2,
            "tier": "Low",
            "action_required": "Theo dõi",
            "max_sensitivity_level": "L3",
            "drivers": {
                "sens_factor": 1.0,
                "cov_factor": 0.0,
                "vol_factor": 0.46,
                "total_fields": 3,
                "total_pii_fields": 2,
                "unmasked_pii_fields": 0,
                "protected_pii_fields": 2,
                "protection_pct": 100.0,
                "row_count": 5000,
            },
        },
        "metrics": {
            "total_tables_scanned": 1,
            "total_fields_scanned": 3,
            "pii_fields_detected": 2,
            "protected_fields_count": 2,
            "unmasked_pii_count": 0,
            "protection_pct": 100.0,
            "dpo_decisions_count": 2,
            "dpo_overrides_count": 0,
            "sensitivity_breakdown": {"L3": 1, "L2": 1, "L1": 0, "L0": 1},
            "actions_breakdown": {"HMAC": 1, "MASK": 1, "DROP": 0, "KEEP": 1},
            "sampling_confidence": "95% CI",
            "coverage_statement": "100%",
            "actual_cost": "$0.00",
            "residual_leak_rate": "0.0%",
        },
        "inventory": [
            {
                "id": 1,
                "table": "users",
                "column": "cccd",
                "data_type": "varchar",
                "classification": "PERSONAL_SENSITIVE",
                "taxonomy_id": "CCCD",
                "sensitivity_level": "L3",
                "detector_source": "rule",
                "recommended_action": "HMAC",
                "effective_action": "HMAC",
                "is_dpo_override": False,
                "decision_reason": "Bảo toàn JOIN",
                "snapshot_output": "HMAC-SHA256 (khoá v1): không đảo ngược, vẫn JOIN được",
                "coverage_status": "full",
                "summary": "CCCD match",
            }
        ],
        "verification_checks": [
            {
                "check_name": "join_integrity",
                "status": "PASSED",
                "baseline_value": "830",
                "actual_value": "830",
                "details": "All downstream keys preserved",
            }
        ],
        "residual_risks": [
            {
                "risk_title": "Dictionary attack on small domains",
                "level": "Medium",
                "description": "HMAC keys should be rotated",
            }
        ],
        "limitations": "Báo cáo tuân thủ trên dữ liệu mẫu tổng hợp...",
        "audit_proof": {
            "content_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "algorithm": "SHA-256",
            "tamper_evident": True,
        },
    }

    html = render_html_report(dummy_report_data)
    assert "<!DOCTYPE html>" in html
    assert "BÁO CÁO TUÂN THỦ BẢO VỆ DỮ LIỆU CÁ NHÂN (PII)" in html
    assert TAXONOMY_VERSION in html
    assert RECOGNIZER_VERSION in html
    assert "HMAC-SHA256 (khoá v1)" in html
    assert "Hạn Chế Kỹ Thuật" in html
    # Assert no raw sample indicators or passwords
    assert "password" not in html.lower()


def test_render_html_report_xss_injection_prevention():
    """Kiểm tra lỗ hổng Stored XSS / HTML Injection được khắc phục triệt để.
    Các payload độc hại như <script>, <img onerror> phải được escape thành &lt;...&gt;
    """
    xss_payload = "<script>alert('xss')</script>"
    img_payload = "<img src=x onerror=alert('steal_token')>"

    xss_data = {
        "report_id": f"REP-{xss_payload}",
        "source_name": f"source_{img_payload}",
        "engine": "postgres",
        "run_status": "COMPLETED",
        "created_at": "2026-10-03T00:00:00Z",
        "generated_at": "2026-10-03T00:00:00Z",
        "requester": f"attacker_{xss_payload}",
        "approvers": [f"dpo_{img_payload}"],
        "versions": {
            "taxonomy_version": "v1.0",
            "recognizer_version": "v1.0",
            "policy_version": "v1.0",
        },
        "risk_assessment": {
            "score": 15.0,
            "tier": "Low",
            "action_required": f"action_{xss_payload}",
        },
        "metrics": {
            "total_fields_scanned": 1,
            "total_tables_scanned": 1,
            "pii_fields_detected": 1,
            "protection_pct": 100.0,
            "sensitivity_breakdown": {"L3": 0},
        },
        "inventory": [
            {
                "table": f"tbl_{xss_payload}",
                "column": f"col_{img_payload}",
                "sensitivity_level": "L2",
                "taxonomy_id": f"tax_{xss_payload}",
                "effective_action": "MASK",
                "is_dpo_override": False,
                "snapshot_output": f"sample_{img_payload}",
                "decision_reason": f"reason_{xss_payload}",
            }
        ],
        "verification_checks": [
            {
                "check_name": f"chk_{xss_payload}",
                "status": "PASSED",
                "baseline_value": "100",
                "actual_value": "100",
                "details": f"details_{img_payload}",
            }
        ],
        "residual_risks": [
            {
                "risk_title": f"risk_{xss_payload}",
                "level": "Low",
                "description": f"desc_{img_payload}",
            }
        ],
        "limitations": f"limit_{xss_payload}",
        "audit_proof": {
            "content_hash": "abcdef1234567890",
        },
    }

    rendered = render_html_report(xss_data)

    # Tuyệt đối không chứa unescaped script tag hoặc img tag độc hại
    assert "<script>" not in rendered
    assert "</script>" not in rendered
    assert "<img src=x onerror" not in rendered

    # Phải được escape thành HTML entities an toàn
    assert "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;" in rendered
    assert "&lt;img src=x onerror=alert(&#x27;steal_token&#x27;)&gt;" in rendered


