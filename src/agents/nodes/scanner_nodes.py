from typing import Any

from src.agents.state import AgentState
from src.detection.rule_engine import RuleBasedScanner
from src.detection.taxonomy import PIIType
from src.models.schemas import FieldScanResult

# Khởi tạo scanner toàn cục cho node
scanner = RuleBasedScanner()


def rule_scan_node(state: AgentState) -> dict[str, Any]:
    """Node 1: Chạy Rule-Based Scanner."""
    col_profile = state.get("column_profile")
    if not col_profile:
        return {"error": "Missing column_profile in state"}

    scan_result = scanner.scan_column(col_profile)
    return {"rule_scan_result": scan_result}


def llm_classify_node(state: AgentState) -> dict[str, Any]:
    """
    Node 2: Tùy chọn LLM Classify.
    CHÚ Ý: TUYỆT ĐỐI KHÔNG GỬI RAW PII (samples) VÀO LLM.
    Chỉ gửi metadata (tên cột, kiểu dữ liệu, các cờ) cho LLM.
    """
    col_profile = state.get("column_profile")
    rule_result = state.get("rule_scan_result")

    if not col_profile or not rule_result:
        return {"error": "Missing profile or rule result"}

    # --- SANITIZE DỮ LIỆU THÔ TRƯỚC KHI GỌI LLM ---
    # Loại bỏ 'samples' hoàn toàn khỏi prompt
    safe_metadata = {
        "column_name": col_profile.column_name,
        "data_type": col_profile.data_type,
        "is_primary_key": col_profile.is_primary_key,
        "is_foreign_key": col_profile.is_foreign_key,
        "system_recommendation": col_profile.system_recommendation
    }

    # Ở đây chúng ta sẽ gọi module LLM (ví dụ src.services.llm)
    # Tuy nhiên vì bài toán tập trung vào cấu trúc graph, ta mô phỏng (mock) LLM response
    # dựa vào safe_metadata.
    # TODO: Tích hợp Langchain LLM thực tế vào đây.

    # MOCK LLM Logic (Ví dụ: đoán tên cột)
    col_lower = safe_metadata["column_name"].lower()
    inferred_type = PIIType.UNKNOWN.value
    action = "KEEP"
    reasoning = "LLM analyzed metadata and found no clear PII context."

    if "name" in col_lower:
        inferred_type = PIIType.UNKNOWN.value  # Có thể là BASIC nếu là tên người
        action = "MASK"
        reasoning = "LLM inferred this might be a personal name from column context."
    elif "address" in col_lower:
        inferred_type = PIIType.ADDRESS.value
        action = "MASK"
        reasoning = "LLM inferred this is an address from column context."

    llm_result = FieldScanResult(
        field_name=col_profile.column_name,
        inferred_pii_type=inferred_type,
        confidence=0.8,
        recommended_action=action,
        reasoning=reasoning
    )

    return {"llm_scan_result": llm_result}


def proposal_node(state: AgentState) -> dict[str, Any]:
    """
    Node 3: Tổng hợp kết quả và đưa ra Proposal.
    Xác định xem có cần DPO review không.
    """
    rule_res = state.get("rule_scan_result")
    llm_res = state.get("llm_scan_result")

    # Chọn kết quả cuối cùng (Ưu tiên LLM nếu Rule trả về UNKNOWN)
    final_res = rule_res
    if rule_res and rule_res.inferred_pii_type == PIIType.UNKNOWN.value and llm_res:
        final_res = llm_res

    # Quyết định có cần DPO review không
    # Ví dụ: Nếu LLM vẫn trả về UNKNOWN, hoặc độ tự tin thấp, hoặc là loại nhạy cảm đặc biệt
    requires_dpo = False
    if final_res:
        if final_res.inferred_pii_type == PIIType.UNKNOWN.value:
            requires_dpo = True
        elif final_res.confidence < 0.8:
            requires_dpo = True

    return {
        "final_proposal": final_res,
        "requires_dpo_review": requires_dpo
    }


def dpo_review_node(state: AgentState) -> dict[str, Any]:
    """
    Node 4: DPO Review (Human-in-the-loop).
    Node này đại diện cho trạng thái chờ con người duyệt.
    """
    # Trong thực tế, graph sẽ interrupt trước khi vào node này.
    # Khi user/DPO duyệt xong và resume graph, node này sẽ lưu kết quả.
    return {"dpo_decision": "APPROVED_BY_DPO"}

