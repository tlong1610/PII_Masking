import pytest

from src.agents.graph import agent
from src.detection.taxonomy import PIIType
from src.models.schemas import ColumnProfile


@pytest.fixture
def sample_profile():
    return ColumnProfile(
        column_name="tracking_code",
        data_type="string",
        is_primary_key=False,
        is_foreign_key=False,
        samples=["400691172582"],
        system_recommendation=None
    )


@pytest.mark.asyncio
async def test_agent_basic_flow(sample_profile):
    result = await agent.ainvoke({"column_profile": sample_profile})
    assert "tier1_result" in result
    assert "final_proposal" in result

    # Do tracking code bị chặn ngay ở rule_scan nên không chạy qua llm
    assert result["tier1_result"].inferred_pii_type == PIIType.TRACKING_CODE.value
    assert result["final_proposal"].inferred_pii_type == PIIType.TRACKING_CODE.value


@pytest.mark.asyncio
async def test_agent_state_structure(sample_profile):
    result = await agent.ainvoke({"column_profile": sample_profile})
    assert isinstance(result, dict)
    assert "requires_dpo_review" in result
