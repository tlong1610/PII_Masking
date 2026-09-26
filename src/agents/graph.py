from langgraph.graph import END, StateGraph

from src.agents.nodes.scanner_nodes import (
    dpo_review_node,
    proposal_node,
    tier1_static_node,
    tier2_bm25_node,
    tier3_hybrid_node,
    tier3_llm_node,
)
from src.agents.state import AgentState


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


def build_graph() -> StateGraph:
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

    return graph.compile()


agent = build_graph()

