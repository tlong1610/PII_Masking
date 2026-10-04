"""Tier-2 BM25: never decides on a generic word alone and always reports the matched type."""

import pytest

from src.detection.bm25_engine import BM25Engine
from src.models.schemas import ColumnProfile


@pytest.fixture(scope="module")
def engine():
    return BM25Engine()


def _col(name: str) -> ColumnProfile:
    return ColumnProfile(column_name=name, data_type="varchar", is_primary_key=False, is_foreign_key=False, samples=[])


@pytest.mark.parametrize("name", ["name", "display_name", "id", "type_code"])
def test_generic_words_alone_never_decide(engine, name):
    score, result = engine.calculate_lexical_score(_col(name))
    assert result is None
    assert score == 0.0


@pytest.mark.parametrize("name", ["product_name", "category_name", "first_name", "contact_name", "ship_name"])
def test_name_columns_are_not_forced_to_pii_unknown(engine, name):
    _, result = engine.calculate_lexical_score(_col(name))
    assert result is None or result.inferred_pii_type != "UNKNOWN"


def test_confident_match_reports_the_corpus_type(engine):
    _, result = engine.calculate_lexical_score(_col("bank_account_holder"))
    assert result is not None
    assert result.inferred_pii_type == "BANK_ACCOUNT"
    assert result.recommended_action == "MASK"


def test_every_corpus_entry_has_a_type(engine):
    assert engine.labels
    assert all(pii_type != "UNKNOWN" for pii_type, _ in engine.labels)
