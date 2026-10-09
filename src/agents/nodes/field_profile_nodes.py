import json
from typing import Any, TypedDict

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from src.config import get_settings
from src.detection.field_profile_scanner import FieldProfileScanner
from src.models.schemas import FieldProfile, FieldScanProposal, PolicyAction
from src.services.llm import get_llm

scanner = FieldProfileScanner()


class FieldProfileState(TypedDict, total=False):
    """State riêng biệt cho luồng Gate 2 (Enterprise)."""
    field_profile: FieldProfile
    rules_proposal: FieldScanProposal | None
    llm_proposal: FieldScanProposal | None
    final_proposal: FieldScanProposal | None
    error: str | None


def fp_rules_node(state: FieldProfileState) -> dict[str, Any]:
    """Tầng 1: Chạy Rules-based scanner trên metadata và statistics."""
    profile = state.get("field_profile")
    if not profile:
        return {"error": "Missing field_profile in state"}

    proposal = scanner.scan(profile)
    return {"rules_proposal": proposal}


class LLMFieldDecision(BaseModel):
    """Schema Pydantic trung gian để LLM trả kết quả chuẩn format."""
    classification: str = Field(
        description="Phân loại dữ liệu: PERSONAL_SENSITIVE, PERSONAL_BASIC, PERSONAL_CONTEXT, NON_PERSONAL, UNKNOWN"
    )
    action: PolicyAction = Field(description="Hành động: MASK, HMAC, KEEP, DROP")
    reason: str = Field(description="Lý do ngắn gọn (dưới 50 từ)")
    confidence: float = Field(description="Độ tự tin từ 0.0 đến 1.0")


def fp_llm_node(state: FieldProfileState) -> dict[str, Any]:
    """Tầng 2: LLM phân tích dựa trên Metadata và Statistics (Không có raw PII)."""
    profile = state.get("field_profile")
    rules_proposal = state.get("rules_proposal")

    # Bỏ qua LLM nếu Rules đã bắt được với độ tự tin cao
    if rules_proposal and rules_proposal.confidence >= 0.9:
        return {}

    # Guard: Trả về None nếu AI scan bị tắt
    if not get_settings().enable_ai_scan:
        return {"llm_proposal": None}

    llm = get_llm()
    parser = PydanticOutputParser(pydantic_object=LLMFieldDecision)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                """Bạn là một Data Privacy Officer (DPO). Nhiệm vụ của bạn là phân tích và phân loại một trường dữ liệu (Field) có phải là Thông tin cá nhân (PII) hay không.
BẠN CHỈ DỰA VÀO METADATA VÀ THỐNG KÊ (STATISTICS). KHÔNG CÓ DỮ LIỆU RAW NÀO ĐƯỢC CUNG CẤP.

Quy tắc Action (Hành động):
- MASK: Dữ liệu cá nhân thông thường cần che mờ (VD: Email, SĐT, Tên).
- HMAC: Mã định danh hoặc Khóa ngoại (VD: CCCD, ID lồng nhau) cần băm để giữ khả năng JOIN bảng.
- KEEP: Dữ liệu KHÔNG PHẢI cá nhân, hoặc email/mã số thuế của tổ chức, mã vận đơn, số tiền đứng riêng.
- DROP: Rất nhạy cảm, tuyệt đối không được đưa vào kho dữ liệu phân tích.

{format_instructions}""",
            ),
            (
                "human",
                """THÔNG TIN TRƯỜNG DỮ LIỆU CẦN PHÂN TÍCH:
- Engine Database: {engine}
- Tên Bảng/Collection: {table}
- Đường dẫn trường (Path): {path}
- Kiểu dữ liệu: {data_type}
- Tổng số dòng Null / Dòng phân biệt (Distinct): {null_count} / {distinct_count}
- Thống kê hình thái học (Shape/Length): {statistics_json}

Dựa vào các thông số này, hãy đưa ra phân loại và hành động.""",
            ),
        ]
    )

    chain = prompt | llm | parser

    try:
        decision: LLMFieldDecision = chain.invoke(
            {
                "engine": profile.engine,
                "table": profile.table_or_collection,
                "path": profile.path,
                "data_type": profile.data_type,
                "null_count": profile.null_count,
                "distinct_count": profile.distinct_count,
                "statistics_json": json.dumps(profile.statistics, ensure_ascii=False),
                "format_instructions": parser.get_format_instructions(),
            }
        )

        proposal = FieldScanProposal(
            field_path=profile.path,
            classification=decision.classification,
            action=decision.action,
            reason=decision.reason,
            confidence=decision.confidence,
            tier="TIER_3_LLM",
            provider_meta={"llm_used": True},
        )
        return {"llm_proposal": proposal}
    except Exception as e:
        return {"error": f"LLM failure: {str(e)}"}


def fp_proposal_node(state: FieldProfileState) -> dict[str, Any]:
    """Tầng 3: Tổng hợp kết quả và chốt Proposal cuối cùng."""
    profile = state.get("field_profile")
    rules_proposal = state.get("rules_proposal")
    llm_proposal = state.get("llm_proposal")

    # Ưu tiên LLM proposal nếu có, nếu không thì dùng kết quả của Rules
    final_proposal = llm_proposal or rules_proposal

    # Nếu cả 2 đều không ra kết quả -> Mặc định mập mờ là UNKNOWN / KEEP
    if not final_proposal:
        final_proposal = FieldScanProposal(
            field_path=profile.path if profile else "unknown",
            classification="UNKNOWN",
            action=PolicyAction.KEEP,
            reason="Không khớp rules tĩnh và nhánh AI bị tắt hoặc lỗi.",
            confidence=0.0,
            tier="DEFAULT_FALLBACK",
        )

    return {"final_proposal": final_proposal}
