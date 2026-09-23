import pytest

from src.detection.rule_engine import RuleBasedScanner
from src.detection.taxonomy import PIIType
from src.models.schemas import ColumnProfile


@pytest.fixture
def scanner():
    return RuleBasedScanner(match_threshold=0.5)


def test_tracking_code_not_cccd(scanner):
    # Tracking code giống CCCD (12 số) không được tính là CCCD
    profile = ColumnProfile(
        column_name="tracking_code",
        data_type="string",
        is_primary_key=False,
        is_foreign_key=False,
        samples=["400691172582", "123456789012"],
        system_recommendation=None
    )
    result = scanner.scan_column(profile)
    assert result.inferred_pii_type == PIIType.TRACKING_CODE.value
    assert result.recommended_action == "KEEP"


def test_order_id_not_pii(scanner):
    # order id không phải PII
    profile = ColumnProfile(
        column_name="order_id",
        data_type="string",
        is_primary_key=True,
        is_foreign_key=False,
        samples=["ORD123", "ORD456"],
        system_recommendation=None
    )
    result = scanner.scan_column(profile)
    assert result.inferred_pii_type == PIIType.TRACKING_CODE.value
    assert result.recommended_action == "KEEP"


def test_org_email_detected_as_email(scanner):
    # email tổ chức
    profile = ColumnProfile(
        column_name="contact_email",
        data_type="string",
        is_primary_key=False,
        is_foreign_key=False,
        samples=["support@company.vn", "contact@exoticliquids.co.uk"],
        system_recommendation=None
    )
    result = scanner.scan_column(profile)
    # Rule engine bắt bằng regex email nên sẽ ra EMAIL.
    # LLM sẽ đánh giá là personal hay non_personal sau.
    assert result.inferred_pii_type == PIIType.EMAIL.value


def test_money_alone_non_personal(scanner):
    # số tiền đứng riêng non_personal
    profile = ColumnProfile(
        column_name="total_amount",
        data_type="float",
        is_primary_key=False,
        is_foreign_key=False,
        samples=["1000.50", "200.0"],
        system_recommendation=None
    )
    result = scanner.scan_column(profile)
    assert result.inferred_pii_type == PIIType.MONEY_ALONE.value
    assert result.recommended_action == "KEEP"


def test_cccd_regex_strict_12_digits(scanner):
    # Đảm bảo CCCD phải đúng 12 số
    profile_9_digits = ColumnProfile(
        column_name="unknown_col",
        data_type="string",
        is_primary_key=False,
        is_foreign_key=False,
        samples=["123456789"],  # CMND cũ 9 số
        system_recommendation=None
    )
    result = scanner.scan_column(profile_9_digits)
    # Không còn khớp CCCD vì regex đã siết chặt lại thành 12 số
    assert result.inferred_pii_type == PIIType.UNKNOWN.value

    profile_12_digits = ColumnProfile(
        column_name="unknown_col",
        data_type="string",
        is_primary_key=False,
        is_foreign_key=False,
        samples=["033254456184"],
        system_recommendation=None
    )
    result_12 = scanner.scan_column(profile_12_digits)
    assert result_12.inferred_pii_type == PIIType.CCCD.value


def test_tax_code(scanner):
    profile = ColumnProfile(
        column_name="tax_number",
        data_type="string",
        is_primary_key=False,
        is_foreign_key=False,
        samples=["8023456789"],
        system_recommendation=None
    )
    result = scanner.scan_column(profile)
    assert result.inferred_pii_type == PIIType.TAX_CODE.value

