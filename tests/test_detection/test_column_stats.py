"""Distribution stats reach the LLM only as coarse buckets: no exact counts, no values."""

import json
from types import SimpleNamespace

from src.agents.nodes.scanner_nodes import tier3_llm_node
from src.detection.column_stats import describe_distribution, ratios_from_counts
from src.models.schemas import ColumnProfile


def test_ratios_from_counts():
    assert ratios_from_counts(100, 80, 8) == (80, 0.1, 0.2)
    assert ratios_from_counts(0, 0, 0) == (None, None, None)
    assert ratios_from_counts(5, 0, 0) == (0, None, 1.0)


def test_too_few_values_gives_no_signal():
    # 3 people with 3 different titles look exactly like 3 names: say nothing.
    assert describe_distribution(3, 1.0, 0.0) is None
    assert describe_distribution(None, None, None) is None


def test_small_table_only_trusts_repetition():
    # 9 employees, 4 titles: repetition is visible even in a small table.
    assert "thấp: giá trị lặp lại nhiều" in describe_distribution(9, 4 / 9, 0.0)
    # 9 rows all different: could be names or just too few rows.
    assert "chưa kết luận được" in describe_distribution(9, 1.0, 0.0)


def test_large_table_buckets_without_exact_counts():
    text = describe_distribution(8_431, 0.0024, 0.31)
    assert "rất thấp" in text and "trống một phần" in text and "trên 1.000" in text
    assert "8431" not in text and "8.431" not in text and "0.0024" not in text


class _CapturingLLM:
    def __init__(self):
        self.prompt = ""

    def invoke(self, messages):
        self.prompt = "\n".join(str(m.content) for m in messages)
        answer = {
            "field_name": "title",
            "inferred_pii_type": "JOB_TITLE",
            "confidence": 0.9,
            "recommended_action": "KEEP",
            "reasoning": "Chức danh lặp lại nhiều",
        }
        return SimpleNamespace(content=json.dumps(answer), response_metadata={})


def test_llm_prompt_carries_table_and_buckets_but_no_counts_or_values(monkeypatch, tmp_path):
    from src.config import get_settings

    monkeypatch.setattr(get_settings(), "hitl_memory_path", str(tmp_path / "memory.json"))
    llm = _CapturingLLM()
    monkeypatch.setattr("src.services.llm.get_llm", lambda temperature=None: llm)
    column = ColumnProfile(
        table_name="employees",
        column_name="title",
        data_type="character varying",
        is_primary_key=False,
        is_foreign_key=False,
        samples=["Sales Representative"],
        profiled_values=1_284,
        distinct_ratio=0.0031,
        null_ratio=0.0,
    )

    result = tier3_llm_node({"column_profile": column, "data_shape": ["Ccccc Cccccccccccccc"]})

    assert result["tier3_result"].inferred_pii_type == "JOB_TITLE"
    assert "Bảng/collection: employees" in llm.prompt
    assert "rất thấp: vài giá trị lặp lại rất nhiều lần" in llm.prompt
    assert "1284" not in llm.prompt and "1.284" not in llm.prompt
    assert "Sales Representative" not in llm.prompt


def test_job_title_is_l1_and_may_stay_keep():
    from src.models.schemas import FieldScanResult
    from src.services.run_scanner import field_profile_spec

    column = ColumnProfile(column_name="title", data_type="text", is_primary_key=False, is_foreign_key=False, samples=[])
    result = FieldScanResult(
        field_name="title", inferred_pii_type="JOB_TITLE", confidence=0.9, recommended_action="KEEP", reasoning="r"
    )
    spec = field_profile_spec(table="employees", column=column, result=result)
    assert spec["classification"] == "QUASI_IDENTIFIER"
    assert spec["recommended_action"] == "KEEP"


def test_mongo_profile_counts_distinct_and_missing_fields():
    import mongomock

    from src.connectors.mongo_connector import MongoConnector

    client = mongomock.MongoClient()
    titles = ["Sales Rep"] * 15 + ["Manager"] * 4 + ["CEO"]
    client["hr"]["employees"].insert_many(
        [{"name": f"Person {i}", "title": t} for i, t in enumerate(titles)] + [{"name": "No Title"} for _ in range(5)]
    )
    profile = MongoConnector("mongodb://fake", "hr", client=client).extract_database_profile()
    columns = {c.column_name: c for c in profile.tables[0].columns}

    assert columns["title"].profiled_values == 20
    assert columns["title"].distinct_ratio == 3 / 20
    assert columns["title"].null_ratio == 5 / 25
    assert columns["name"].distinct_ratio == 21 / 25
