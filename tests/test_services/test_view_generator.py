import pytest

from src.services.view_generator import generate_postgres_view


def test_generate_postgres_view_masks_hashes_and_drops_columns():
    sql = generate_postgres_view(
        table_name="customers",
        all_columns=["customer_id", "email", "cccd", "personal_notes"],
        pii_actions={
            "email": "MASK",
            "cccd": "HMAC",
            "personal_notes": "DROP",
        },
        salt="salt",
        pepper="pepper",
        schema_name="public",
    )

    assert 'CREATE OR REPLACE VIEW "public"."vw_masked_customers" AS' in sql
    assert '"customer_id" AS "customer_id"' in sql
    assert "'[MASKED]' AS \"email\"" in sql
    assert 'encode(hmac(coalesce("cccd"::text, \'\'), \'pepper:salt\', \'sha256\'), \'hex\') AS "cccd"' in sql
    assert "personal_notes" not in sql
    assert 'FROM "public"."customers";' in sql


def test_generate_postgres_view_quotes_identifiers():
    sql = generate_postgres_view(
        table_name='customer"records',
        all_columns=['weird"column'],
        pii_actions={},
    )

    assert 'CREATE OR REPLACE VIEW "vw_masked_customer""records" AS' in sql
    assert '"weird""column" AS "weird""column"' in sql
    assert 'FROM "customer""records";' in sql


def test_generate_postgres_view_accepts_hashing_alias():
    sql = generate_postgres_view(
        table_name="orders",
        all_columns=["customer_cccd"],
        pii_actions={"customer_cccd": "HASHING"},
        salt="salt",
        pepper="pepper",
    )

    assert "hmac" in sql
    assert 'AS "customer_cccd"' in sql


def test_generate_postgres_view_rejects_zero_output_columns():
    with pytest.raises(ValueError, match="zero output columns"):
        generate_postgres_view(
            table_name="customers",
            all_columns=["email"],
            pii_actions={"email": "DROP"},
        )
