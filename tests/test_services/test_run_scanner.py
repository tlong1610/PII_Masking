"""Unit tests for run_scanner mapping helpers (no live LLM / DB)."""

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
    class FakeConnector:
        def __init__(self, url):
            self.url = url

        def extract_database_profile(self, schema_name="public", sample_size=5):
            assert sample_size == 5
            return FAKE_DB

    monkeypatch.setattr("src.connectors.postgres_connector.PostgresConnector", FakeConnector)


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
