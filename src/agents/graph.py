from langgraph.graph import END, StateGraph

from src.agents.nodes.scanner_nodes import dpo_review_node, llm_classify_node, proposal_node, rule_scan_node
from src.agents.state import AgentState
from src.detection.taxonomy import PIIType


def route_after_rule(state: AgentState) -> str:
    """Định tuyến sau khi chạy Rule Engine."""
    if state.get("error"):
        return END

    rule_res = state.get("rule_scan_result")
    if not rule_res:
        return END

    # Nếu rule engine không xác định được (UNKNOWN) HOẶC
    # nó là EMAIL (có thể cần LLM phân biệt tổ chức/cá nhân)
    # thì đẩy qua LLM.
    if rule_res.inferred_pii_type in [PIIType.UNKNOWN.value, PIIType.EMAIL.value]:
        return "llm_classify"

    # Các trường hợp chắc chắn (như CCCD, PHONE, TRACKING_CODE) thì chốt luôn
    return "proposal"


def route_after_proposal(state: AgentState) -> str:
    """Định tuyến sau khi có proposal (xem có cần DPO duyệt không)."""
    if state.get("requires_dpo_review"):
        return "dpo_review"
    return END


def build_graph() -> StateGraph:
    """
    Xây dựng luồng LangGraph:
    scan rules -> [optional LLM classify] -> proposals -> [chờ DPO review]
    """
    graph = StateGraph(AgentState)

    # 1. Khai báo các Nodes
    graph.add_node("rule_scan", rule_scan_node)
    graph.add_node("llm_classify", llm_classify_node)
    graph.add_node("proposal", proposal_node)
    graph.add_node("dpo_review", dpo_review_node)

    # 2. Khai báo các Edges và Routing
    graph.set_entry_point("rule_scan")

    # Từ rule_scan -> llm_classify hoặc thẳng tới proposal
    graph.add_conditional_edges(
        "rule_scan",
        route_after_rule,
        {
            "llm_classify": "llm_classify",
            "proposal": "proposal",
            END: END
        }
    )

    # Từ llm_classify -> luôn đi tới proposal
    graph.add_edge("llm_classify", "proposal")

    # Từ proposal -> dpo_review hoặc kết thúc
    graph.add_conditional_edges(
        "proposal",
        route_after_proposal,
        {
            "dpo_review": "dpo_review",
            END: END
        }
    )

    # Từ dpo_review -> kết thúc
    graph.add_edge("dpo_review", END)

    # Biên dịch graph (nếu có checkpointer thì sẽ cấu hình interrupt_before=["dpo_review"])
    return graph.compile()


agent = build_graph()
