from typing import TypedDict

from src.models.schemas import ColumnProfile, FieldScanResult


class AgentState(TypedDict, total=False):
    """State schema cho luồng LangGraph."""
    # Đầu vào
    column_profile: ColumnProfile

    # Kết quả từ các bước
    rule_scan_result: FieldScanResult | None
    llm_scan_result: FieldScanResult | None

    # Kết quả cuối cùng
    final_proposal: FieldScanResult | None

    # Cờ đánh dấu cần sự kiểm duyệt của DPO
    requires_dpo_review: bool

    # Báo lỗi nếu có
    error: str | None
