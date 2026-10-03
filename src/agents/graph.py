import uuid
from typing import Any

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, StateGraph

from src.agents.checkpointer import get_checkpoint_saver
from src.agents.nodes.field_profile_nodes import FieldProfileState, fp_llm_node, fp_proposal_node, fp_rules_node
from src.agents.nodes.scanner_nodes import (
    dpo_review_node,
    proposal_node,
    tier1_static_node,
    tier2_bm25_node,
    tier3_hybrid_node,
    tier3_llm_node,
)
from src.agents.state import AgentState

# Default persistent checkpointer (PostgresSaver / SqliteSaver §7)
default_checkpointer = get_checkpoint_saver()


class CheckpointedGraph:
    """Wrapper around compiled LangGraph to ensure thread_id is always present."""

    def __init__(self, compiled_graph: Any):
        self.graph = compiled_graph

    def _ensure_config(self, config: dict | None) -> dict:
        cfg = dict(config or {})
        configurable = dict(cfg.get("configurable") or {})
        if "thread_id" not in configurable:
            configurable["thread_id"] = str(uuid.uuid4())
        cfg["configurable"] = configurable
        return cfg

    async def ainvoke(self, input: Any, config: dict | None = None, **kwargs: Any) -> Any:
        cfg = self._ensure_config(config)
        try:
            return await self.graph.ainvoke(input, config=cfg, **kwargs)
        except NotImplementedError:
            import asyncio
            return await asyncio.to_thread(self.graph.invoke, input, config=cfg, **kwargs)

    def invoke(self, input: Any, config: dict | None = None, **kwargs: Any) -> Any:
        return self.graph.invoke(input, config=self._ensure_config(config), **kwargs)

    def __getattr__(self, name: str) -> Any:
        return getattr(self.graph, name)


def route_after_tier1(state: AgentState) -> str:
    """Nếu Tầng 1 bắt được kết quả chắc chắn -> Đóng đinh, nhảy tới Proposal."""
    if state.get("error"):
        return END
    if state.get("tier1_result"):
        return "proposal"
    return "tier2_bm25"


def route_after_tier2(state: AgentState) -> str:
    """Nếu điểm Tầng 2 < ngưỡng -> bị loại luôn, đưa tới Proposal. Nếu >= ngưỡng -> xuống Tầng 3.1"""
    if state.get("final_proposal"):
        return "proposal"
    return "tier3_hybrid"


def route_after_tier3_hybrid(state: AgentState) -> str:
    """Nếu điểm Tầng 3.1 > 0.75 hoặc < 0.1 -> chốt kết quả. Nếu ở vùng xám (0.1 - 0.75) -> chuyển qua LLM."""
    if state.get("final_proposal"):
        return "proposal"
    return "tier3_llm"


def route_after_proposal(state: AgentState) -> str:
    """Xem xét có cần Data Steward / DPO duyệt không."""
    if state.get("requires_dpo_review"):
        return "dpo_review"
    return END


def build_graph(checkpointer: BaseCheckpointSaver | None = default_checkpointer) -> Any:
    """Xây dựng luồng LangGraph Phễu Lọc 3 Tầng."""
    graph = StateGraph(AgentState)

    # 1. Khai báo các Nodes
    graph.add_node("tier1_static", tier1_static_node)
    graph.add_node("tier2_bm25", tier2_bm25_node)
    graph.add_node("tier3_hybrid", tier3_hybrid_node)
    graph.add_node("tier3_llm", tier3_llm_node)
    graph.add_node("proposal", proposal_node)
    graph.add_node("dpo_review", dpo_review_node)

    # 2. Khai báo các Edges và Routing
    graph.set_entry_point("tier1_static")

    graph.add_conditional_edges(
        "tier1_static",
        route_after_tier1,
        {"proposal": "proposal", "tier2_bm25": "tier2_bm25", END: END}
    )

    graph.add_conditional_edges(
        "tier2_bm25",
        route_after_tier2,
        {"proposal": "proposal", "tier3_hybrid": "tier3_hybrid"}
    )

    graph.add_conditional_edges(
        "tier3_hybrid",
        route_after_tier3_hybrid,
        {"proposal": "proposal", "tier3_llm": "tier3_llm"}
    )

    # Từ LLM thì luôn đưa qua tổng hợp
    graph.add_edge("tier3_llm", "proposal")

    graph.add_conditional_edges(
        "proposal",
        route_after_proposal,
        {"dpo_review": "dpo_review", END: END}
    )

    graph.add_edge("dpo_review", END)

    compiled = graph.compile(checkpointer=checkpointer)
    return CheckpointedGraph(compiled) if checkpointer else compiled


# Column-level scanner runs in-memory (§6.3, run_scanner: "samples stay in-memory only")
agent = build_graph(InMemorySaver())



# ==============================================================================
# --- Graph mới cho luồng FieldProfile (Enterprise/Gate 2) ---
# ==============================================================================


def fp_route_after_rules(state: FieldProfileState) -> str:
    rules_proposal = state.get("rules_proposal")
    # Nếu rules đã chắc chắn (confidence >= 0.9), đi thẳng tới tổng hợp
    if rules_proposal and rules_proposal.confidence >= 0.9:
        return "fp_proposal"
    return "fp_llm"

def build_field_profile_graph(checkpointer: BaseCheckpointSaver | None = None):
    chk = checkpointer or InMemorySaver()
    graph = StateGraph(FieldProfileState)

    # Khai báo node
    graph.add_node("fp_rules", fp_rules_node)
    graph.add_node("fp_llm", fp_llm_node)
    graph.add_node("fp_proposal", fp_proposal_node)

    # Routing
    graph.set_entry_point("fp_rules")

    graph.add_conditional_edges(
        "fp_rules",
        fp_route_after_rules,
        {"fp_proposal": "fp_proposal", "fp_llm": "fp_llm"}
    )

    graph.add_edge("fp_llm", "fp_proposal")
    graph.add_edge("fp_proposal", END)

    compiled = graph.compile(checkpointer=chk)
    return CheckpointedGraph(compiled) if chk else compiled

# Agent chính cho luồng FieldProfile (Gate 2)
field_profile_agent = build_field_profile_graph(InMemorySaver())

# End-to-end 8-node Orchestrator Graph (§7.1)
