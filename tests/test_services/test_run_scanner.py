"""Unit tests for run_scanner mapping helpers (no live LLM / DB)."""

import threading

import pytest

from src.models.schemas import (
    ColumnProfile,
    DatabaseProfile,
    FieldScanResult,
    TableProfile,
    TableRelation,
)
from src.services.run_scanner import (
    classification_from_pii_type,
    coverage_from_result,
    detector_from_tier,
    field_profile_spec,
    normalize_action,
    scan_postgres_source,
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


def _col(name, data_type, samples, *, pk=False, fk=False):
    return ColumnProfile(
        column_name=name,
        data_type=data_type,
        is_primary_key=pk,
        is_foreign_key=fk,
        samples=samples,
        system_recommendation="HASHING" if pk or fk else None,
    )


FAKE_DB = DatabaseProfile(
    database_name="mydatabase",
    tables=[
        TableProfile(
            table_name="customers",
            relations=[],
            columns=[
                _col("customer_id", "character varying", ["ALFKI", "ANATR"], pk=True),
                _col("cccd", "character varying", ["001234567890", "079123456789"]),
                _col("email", "character varying", ["a@example.com", "b@example.vn"]),
                _col("notes", "text", ["free text", "other"]),
            ],
        ),
        TableProfile(
            table_name="orders",
            relations=[
                TableRelation(from_column="customer_id", to_table="customers", to_column="customer_id")
            ],
            columns=[
                _col("order_id", "smallint", ["10248"], pk=True),
                _col("customer_id", "character varying", ["ALFKI"], fk=True),
                _col("customer_cccd", "character varying", ["001234567890", "079123456789"]),
                _col("freight", "real", ["32.38", "11.61"]),
            ],
        ),
        TableProfile(table_name="region", relations=[], columns=[_col("region_id", "smallint", ["1"], pk=True)]),
    ],
)


@pytest.fixture
def fake_connector(monkeypatch):
    calls: list[dict] = []

    class FakeConnector:
        def __init__(self, url):
            self.url = url

        def extract_database_profile(self, schema_name="public", sample_size=5, table_names=None):
            assert sample_size == 5
            calls.append({"table_names": table_names, "thread": threading.current_thread()})
            if table_names is None:
                return FAKE_DB
            # Mirror PostgresConnector: only the requested tables come back.
            return FAKE_DB.model_copy(update={"tables": [t for t in FAKE_DB.tables if t.table_name in table_names]})

    monkeypatch.setattr("src.connectors.postgres_connector.PostgresConnector", FakeConnector)
    return calls


@pytest.mark.asyncio
async def test_scan_postgres_rule_mode_covers_all_tables(fake_connector):
    specs = await scan_postgres_source("postgresql://fake/db", use_ai=False)
    by_field = {(s["source_path"], s["field_path"]): s for s in specs}

    assert {t for t, _ in by_field} == {"customers", "orders", "region"}
    # PK/FK and the logical CCCD join key must both be HMAC so the snapshot join survives.
    assert by_field[("customers", "customer_id")]["recommended_action"] == "HMAC"
    assert by_field[("orders", "customer_id")]["recommended_action"] == "HMAC"
    assert by_field[("customers", "cccd")]["recommended_action"] == "HMAC"
    assert by_field[("orders", "customer_cccd")]["recommended_action"] == "HMAC"
    assert by_field[("customers", "cccd")]["taxonomy_id"] == "CCCD"

    assert by_field[("customers", "email")]["recommended_action"] == "MASK"
    assert by_field[("orders", "freight")]["classification"] == "NON_PERSONAL"
    assert by_field[("orders", "freight")]["recommended_action"] == "KEEP"
    assert by_field[("customers", "notes")]["classification"] == "UNKNOWN"
    assert by_field[("customers", "notes")]["recommended_action"] == "DROP"

    blob = str(specs)
    assert "001234567890" not in blob
    assert "a@example.com" not in blob
    assert all("samples" not in s for s in specs)


@pytest.mark.asyncio
async def test_scan_postgres_table_allowlist(fake_connector):
    specs = await scan_postgres_source(
        "postgresql://fake/db", use_ai=False, tables=("customers",)
    )
    assert {s["source_path"] for s in specs} == {"customers"}


@pytest.mark.asyncio
async def test_scan_postgres_profiles_only_selected_tables_off_the_event_loop(fake_connector):
    await scan_postgres_source("postgresql://fake/db", use_ai=False, tables=("customers", "orders"))

    # Only the selected tables are profiled (not the whole schema), and in a worker thread
    # so a long profile does not stall every other API request.
    assert fake_connector[0]["table_names"] == ("customers", "orders")
    assert fake_connector[0]["thread"] is not threading.main_thread()


@pytest.mark.asyncio
async def test_scan_postgres_without_selection_profiles_every_table(fake_connector):
    await scan_postgres_source("postgresql://fake/db", use_ai=False, tables=())
    assert fake_connector[0]["table_names"] is None


@pytest.mark.asyncio
async def test_scan_mongo_drops_objects_beyond_scan_depth(monkeypatch):
    from src.services.run_scanner import scan_mongo_source

    profile = DatabaseProfile(
        database_name="mydatabase",
        tables=[
            TableProfile(
                table_name="customers",
                relations=[],
                columns=[
                    _col("identity.cccd", "string", ["001234567890", "079123456789"]),
                    _col("kyc.scan.ocr", "object", ["{'text': 'CCCD 001234567890'}"]),
                ],
            )
        ],
    )

    class FakeMongo:
        def __init__(self, *_args, **_kwargs):
            pass

        def extract_database_profile(self, sample_size=5):
            return profile

    monkeypatch.setattr("src.connectors.mongo_connector.MongoConnector", FakeMongo)
    specs = await scan_mongo_source("mongodb://fake", "db", use_ai=False)
    by_path = {s["field_path"]: s for s in specs}
    assert by_path["kyc.scan.ocr"]["classification"] == "UNKNOWN"
    assert by_path["kyc.scan.ocr"]["recommended_action"] == "DROP"
    assert by_path["identity.cccd"]["taxonomy_id"] == "CCCD"
    assert "001234567890" not in str(specs)


@pytest.mark.asyncio
async def test_scan_postgres_raises_when_nothing_matches(fake_connector):
    with pytest.raises(ValueError, match="No columns scanned"):
        await scan_postgres_source("postgresql://fake/db", use_ai=False, tables=("missing",))


def _text_col(name: str) -> ColumnProfile:
    return ColumnProfile(column_name=name, data_type="text", is_primary_key=False, is_foreign_key=False, samples=[])


@pytest.mark.asyncio
async def test_ai_scan_runs_columns_in_parallel_bounded_and_in_order(monkeypatch):
    import asyncio

    from src.config import get_settings
    from src.services.run_scanner import _scan_columns

    monkeypatch.setattr(get_settings(), "scan_concurrency", 3)
    running = 0
    peak = 0

    async def fake_scan(column: ColumnProfile) -> FieldScanResult | None:
        nonlocal running, peak
        running += 1
        peak = max(peak, running)
        await asyncio.sleep(0.01)
        running -= 1
        if column.column_name == "boom":
            raise RuntimeError("llm down")
        return FieldScanResult(
            field_name=column.column_name,
            inferred_pii_type="NOT_PERSONAL_DATA",
            confidence=1.0,
            recommended_action="KEEP",
            reasoning="ok",
        )

    names = ["a", "b", "boom", "c", "d", "e", "f"]
    results = await _scan_columns(
        [("t", _text_col(name)) for name in names], use_ai=True, rule_scanner=None, scan=fake_scan
    )

    assert peak == 3
    assert [r.field_name if r else None for r in results] == ["a", "b", None, "c", "d", "e", "f"]


@pytest.mark.parametrize(
    ("pii_type", "classification"),
    [
        ("CREDIT_CARD", "PERSONAL_SENSITIVE"),
        ("BIOMETRIC_FILE", "PERSONAL_SENSITIVE"),
        ("PATIENT_ID", "PERSONAL_SENSITIVE"),
        ("OCR_IDENTITY_DOC", "PERSONAL_SENSITIVE"),
        ("TAX_CODE_ORG", "NON_PERSONAL"),
        ("PHONE", "PERSONAL_BASIC"),
    ],
)
def test_sensitive_and_org_types_get_the_right_level(pii_type, classification):
    assert classification_from_pii_type(pii_type) == classification


@pytest.mark.asyncio
async def test_rule_scan_passes_table_name_to_table_scoped_rules(monkeypatch):
    profile = DatabaseProfile(
        database_name="db",
        tables=[
            TableProfile(
                table_name="suppliers",
                relations=[],
                columns=[_text_col("tax_code").model_copy(update={"samples": ["0101234567"]})],
            )
        ],
    )

    class FakeConnector:
        def __init__(self, *_args, **_kwargs):
            pass

        def extract_database_profile(self, schema_name="public", sample_size=5, table_names=None):
            return profile

    monkeypatch.setattr("src.connectors.postgres_connector.PostgresConnector", FakeConnector)
    specs = await scan_postgres_source("postgresql://fake/db", use_ai=False)
    assert specs[0]["taxonomy_id"] == "TAX_CODE_ORG"
    assert specs[0]["recommended_action"] == "KEEP"


def test_llm_labels_are_normalised_to_the_closed_set():
    from src.detection.taxonomy import normalize_llm_pii_type

    assert normalize_llm_pii_type("GEOGRAPHIC_REGION") == "UNKNOWN"
    assert normalize_llm_pii_type("name") == "FULL_NAME"
    assert normalize_llm_pii_type("NOT_PERSONAL_DATA") == "NOT_PERSONAL_DATA"


@pytest.mark.parametrize(
    ("pii_type", "proposed", "expected_classification", "expected_action"),
    [
        ("PHONE", "KEEP", "PERSONAL_BASIC", "MASK"),
        ("UNKNOWN", "KEEP", "UNKNOWN", "MASK"),
        ("CREDIT_CARD", "KEEP", "PERSONAL_SENSITIVE", "MASK"),
        ("CITY", "KEEP", "QUASI_IDENTIFIER", "KEEP"),
        ("NOT_PERSONAL_DATA", "KEEP", "NON_PERSONAL", "KEEP"),
        ("EMPTY_COLUMN", "DROP", "NON_PERSONAL", "DROP"),
    ],
)
def test_contradictory_proposals_are_corrected(pii_type, proposed, expected_classification, expected_action):
    result = FieldScanResult(
        field_name="c", inferred_pii_type=pii_type, confidence=0.9, recommended_action=proposed, reasoning="llm"
    )
    spec = field_profile_spec(table="t", column=_text_col("c"), result=result)
    assert spec["classification"] == expected_classification
    assert spec["recommended_action"] == expected_action
    if proposed != expected_action:
        assert "Giữ nguyên xuống Che" in spec["profile_summary"]


def test_llm_node_uses_temperature_zero_and_closed_labels(monkeypatch):
    import json

    from src.agents.nodes.scanner_nodes import tier3_llm_node

    calls: list[dict] = []

    class FakeLLM:
        def invoke(self, _messages):
            class Response:
                content = json.dumps(
                    {
                        "field_name": "ship_region_label",
                        "inferred_pii_type": "GEOGRAPHIC_REGION",
                        "confidence": 0.9,
                        "recommended_action": "KEEP",
                        "reasoning": "region",
                    }
                )
                response_metadata: dict = {}

            return Response()

    def fake_get_llm(**kwargs):
        calls.append(kwargs)
        return FakeLLM()

    monkeypatch.setattr("src.services.llm.get_llm", fake_get_llm)
    out = tier3_llm_node({"column_profile": _text_col("ship_region_label"), "data_shape": ["CCCC"]})
    assert calls == [{"temperature": 0}]
    assert out["tier3_result"].inferred_pii_type == "UNKNOWN"


def test_gender_is_basic_personal_data_and_never_proposed_keep():
    """NĐ 356/2025 Điều 3 khoản 3 names gender as basic personal data: L2, masked by default."""
    from src.services.risk_scorer import resolve_sensitivity_level

    column = ColumnProfile(
        column_name="gioi_tinh", data_type="varchar", is_primary_key=False, is_foreign_key=False, samples=[]
    )
    result = FieldScanResult(
        field_name="gioi_tinh", inferred_pii_type="GENDER", confidence=0.9, recommended_action="KEEP", reasoning="r"
    )
    spec = field_profile_spec(table="patients", column=column, result=result)
    assert spec["classification"] == "PERSONAL_BASIC"
    assert spec["recommended_action"] == "MASK"
    assert resolve_sensitivity_level(classification=spec["classification"], taxonomy_id="GENDER") == "L2"
    assert resolve_sensitivity_level(field_path="gioi_tinh") == "L2"
