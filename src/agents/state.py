from typing import TypedDict

from src.models.schemas import ColumnProfile, FieldScanResult


class AgentState(TypedDict, total=False):
    """State schema cho luồng LangGraph."""
    # Đầu vào
    column_profile: ColumnProfile

    # Các trạng thái trung gian cho mô hình Phễu 3 tầng
    tier1_result: FieldScanResult | None
    bm25_score: float | None
    data_shape: list[str] | None  # Dữ liệu mẫu đã được ẩn danh hình dáng
    hybrid_score: float | None
    tier3_result: FieldScanResult | None

    # Confidence score của tier đã ra quyết định (BM25 normalized, hybrid fusion, LLM softmax)
    confidence_score: float | None

    # Kết quả cuối cùng
    final_proposal: FieldScanResult | None

    # Cờ đánh dấu cần sự kiểm duyệt của DPO
    requires_dpo_review: bool

    # Báo lỗi nếu có
    error: str | None
