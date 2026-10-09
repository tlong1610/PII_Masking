"""
Unit tests for MongoVerifier downstream integrity validation.
"""


from src.verifier.mongo_verifier import MongoVerifier


def test_mongo_verifier_end_to_end(live_mongo):
    verifier = MongoVerifier()
    res = verifier.verify_end_to_end()

    assert res["all_passed"] is True, f"Mongo verification failed: {res['metrics']}"

    # Matched counts must equal baseline exactly
    assert res["metrics"]["matched_by_customer_id"]["difference"] == 0
    assert res["metrics"]["matched_by_customer_id"]["post_processing_actual"] == 830
    assert res["metrics"]["matched_by_cccd"]["difference"] == 0
    assert res["metrics"]["matched_by_cccd"]["post_processing_actual"] == 830
    assert res["metrics"]["unmatched_orders"]["post_processing_actual"] == 0

    # Sample verification
    sample = res["sample_verification"]
    assert sample["customer_id"] == "ALFKI"
    assert len(sample["protected_record"]["cccd_hmac_sha256"]) == 64
    assert "@" in sample["protected_record"]["email_masked"]
    assert "***" in sample["protected_record"]["email_masked"]
