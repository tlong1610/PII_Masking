from typing import Any

from src.agents.state import AgentState
from src.detection.bm25_engine import BM25Engine
from src.detection.hitl_feedback import get_few_shot_examples, save_few_shot_example, update_rag_corpus
from src.detection.rule_engine import RuleBasedScanner
from src.detection.taxonomy import PIIType
from src.detection.vector_store import PIIKnowledgeBase
from src.models.schemas import FieldScanResult

# Khởi tạo các engines toàn cục cho node
scanner = RuleBasedScanner()
try:
    bm25_engine = BM25Engine()
except FileNotFoundError:
    bm25_engine = None # Sẽ handle trong node nếu file chưa có

# Khởi tạo VectorDB (cần chắc chắn đã chạy script initialize_db trước đó)
kb = PIIKnowledgeBase()
retriever = kb.get_retriever(top_k=3)

def tier1_static_node(state: AgentState) -> dict[str, Any]:
    """Node Tầng 1: Lọc tĩnh (Rule-Based & Regex)."""
    col_profile = state.get("column_profile")
    if not col_profile:
        return {"error": "Missing column_profile in state"}

    scan_result = scanner.tier1_static_filter(col_profile)
    return {"tier1_result": scan_result}


def tier2_bm25_node(state: AgentState) -> dict[str, Any]:
    """Node Tầng 2: Lọc từ vựng cơ bản (BM25)."""
    col_profile = state.get("column_profile")
    if bm25_engine is None:
        # Fallback nếu chưa setup JSON corpus, cho qua phễu luôn với điểm 1.0
        return {"bm25_score": 1.0}

    score, reject_result = bm25_engine.calculate_lexical_score(col_profile, threshold=0.95)

    if reject_result:
        # Bị loại ngay tại Tầng 2
        return {"bm25_score": score, "final_proposal": reject_result}

    return {"bm25_score": score}


def tier3_hybrid_node(state: AgentState) -> dict[str, Any]:
    """Node Tầng 3.1: Chấm điểm hỗn hợp (BM25 + Vector Semantic)."""
    col_profile = state.get("column_profile")
    bm25_score = state.get("bm25_score", 0.0)

    query = col_profile.column_name.replace("_", " ")

    # Tính Vector Similarity (Mô phỏng lấy điểm từ retriever của Chroma)
    # Vì Langchain Retriever chuẩn không trả về kèm điểm số một cách dễ dàng,
    # chúng ta query trực tiếp từ vector_store để lấy distance/score.
    hybrid_score = 0.5 # Giá trị mặc định nếu lỗi
    if kb.vector_store:
        results = kb.vector_store.similarity_search_with_score(query, k=1)
        if results:
            # ChromaDB trả về distance (nhỏ hơn là tốt hơn), cần chuyển đổi thành similarity (0->1)
            distance = results[0][1]
            semantic_score = max(0.0, 1.0 - distance)

            # Hybrid score = 40% BM25 + 60% Semantic
            hybrid_score = (bm25_score * 0.4) + (semantic_score * 0.6)

    # Quy tắc phân luồng Tầng 3.1
    if hybrid_score > 0.75:
        action = col_profile.system_recommendation if col_profile.system_recommendation else "MASK"
        res = FieldScanResult(
            field_name=col_profile.column_name,
            inferred_pii_type=PIIType.UNKNOWN.value, # Cần LLM hoặc mapping lại để biết type chính xác, tạm để UNKNOWN
            confidence=hybrid_score,
            recommended_action=action,
            reasoning=f"Hybrid Score ({hybrid_score:.2f}) > 0.75. Khẳng định là PII.",
            tier="TIER_3_HYBRID",
            hybrid_score=hybrid_score
        )
        return {"hybrid_score": hybrid_score, "final_proposal": res}
        
    if hybrid_score < 0.1:
        res = FieldScanResult(
            field_name=col_profile.column_name,
            inferred_pii_type="NOT_PERSONAL_DATA",
            confidence=1.0 - hybrid_score,
            recommended_action="KEEP",
            reasoning=f"Hybrid Score ({hybrid_score:.2f}) < 0.1. Khẳng định không phải PII.",
            tier="TIER_3_HYBRID",
            hybrid_score=hybrid_score
        )
        return {"hybrid_score": hybrid_score, "final_proposal": res}

    # Vùng xám (0.1 - 0.75): Cần Data Shape để đẩy sang LLM
    data_shape = RuleBasedScanner.transform_to_data_shape(col_profile.samples)
    return {"hybrid_score": hybrid_score, "data_shape": data_shape}


def tier3_llm_node(state: AgentState) -> dict[str, Any]:
    """Node Tầng 3.2: LLM Context Reasoning."""
    import json

    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import PydanticOutputParser

    from src.services.llm import get_llm

    col_profile = state.get("column_profile")
    data_shape = state.get("data_shape", [])

    # Lấy Few-shot examples từ lịch sử DPO để đưa vào System Prompt
    few_shot_examples = get_few_shot_examples(limit=3)
    few_shot_str = json.dumps(few_shot_examples, ensure_ascii=False, indent=2) if few_shot_examples else "Không có ví dụ nào."

    llm = get_llm()
    parser = PydanticOutputParser(pydantic_object=FieldScanResult)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """Bạn là một chuyên gia bảo mật dữ liệu (Data Privacy Officer).
Nhiệm vụ của bạn là phân tích cấu trúc của một cột trong Database và quyết định xem nó có chứa dữ liệu cá nhân (PII) hay không, dựa trên tên cột và hình dáng dữ liệu (Data Shape) đã được ẩn danh.

Các loại PII (inferred_pii_type) có thể là: CCCD, PHONE, EMAIL, ADDRESS, DOB, TAX_CODE, UNKNOWN, NOT_PERSONAL_DATA...
Hành động khuyến nghị (recommended_action): HMAC (nếu là Khóa chính/Khóa ngoại - PK/FK), MASK (nếu là PII thông thường), KEEP (nếu không phải).

{format_instructions}"""),
        ("human", """ĐÂY LÀ KINH NGHIỆM TỪ CÁC CHUYÊN GIA DPO TRƯỚC ĐÓ (FEW-SHOT EXAMPLES):
{few_shot_examples}

THÔNG TIN CỘT CẦN PHÂN TÍCH:
- Tên cột: {column_name}
- Kiểu dữ liệu SQL: {data_type}
- Là Khóa (Key): {system_rec}
- Data Shapes (Mẫu dữ liệu đã được biến đổi thành dạng ký tự X và C): {data_shapes}

Hãy đưa ra quyết định cuối cùng dưới dạng JSON theo schema yêu cầu (không thêm bất kỳ văn bản giải thích nào khác).""")
    ])

    chain = prompt | llm | parser

    # Gọi API thật. Nếu có lỗi (Rate Limit), Exception sẽ được ném lên trên
    # để script đánh giá (run_eval_full.py) bắt lấy và kích hoạt cơ chế Retry.
    result: FieldScanResult = chain.invoke({
        "few_shot_examples": few_shot_str,
        "column_name": col_profile.column_name,
        "data_type": col_profile.data_type,
        "system_rec": col_profile.system_recommendation or "Không",
        "data_shapes": json.dumps(data_shape),
        "format_instructions": parser.get_format_instructions()
    })
    # Ghi đè tier logic
    result.tier = "TIER_3_LLM"
    return {"tier3_result": result}


def proposal_node(state: AgentState) -> dict[str, Any]:
    """Node 3.3: Tổng hợp và kích hoạt HITL (Data Steward)."""
    # Nếu đã có final_proposal từ các Tầng trước thì lấy luôn
    final_res = state.get("final_proposal")

    # Nếu chưa có, lấy từ Tầng 1 hoặc Tầng 3 LLM
    if not final_res:
        final_res = state.get("tier1_result") or state.get("tier3_result")

    # Quyết định có cần DPO/Data Steward review không
    # (Trường hợp LLM có độ tự tin thấp)
    requires_dpo = False
    if final_res and final_res.tier == "TIER_3_LLM":
        if final_res.confidence < 0.8 or final_res.inferred_pii_type == PIIType.UNKNOWN.value:
            requires_dpo = True

    return {
        "final_proposal": final_res,
        "requires_dpo_review": requires_dpo
    }


def dpo_review_node(state: AgentState) -> dict[str, Any]:
    """Node: DPO Review (Human-in-the-loop)."""
    # DPO xem xét final_proposal và submit lại quyết định mới qua biến state 'dpo_decision'.
    # Ví dụ format: {"inferred_pii_type": "PHONE", "recommended_action": "MASK"}

    dpo_decision = state.get("dpo_decision")
    final_res = state.get("final_proposal")
    col_profile = state.get("column_profile")
    data_shape = state.get("data_shape", [])

    if dpo_decision and final_res and col_profile:
        # 1. Ghi đè kết quả
        final_res.inferred_pii_type = dpo_decision.get("inferred_pii_type", final_res.inferred_pii_type)
        final_res.recommended_action = dpo_decision.get("recommended_action", final_res.recommended_action)
        final_res.confidence = 1.0
        final_res.reasoning = "Overridden by DPO (Human-in-the-loop)."

        # 2. Lưu Few-shot memory (Ý tưởng 2)
        save_few_shot_example(
            column_name=col_profile.column_name,
            data_shape=data_shape,
            dpo_decision=final_res.inferred_pii_type,
            action=final_res.recommended_action
        )

        # 3. Auto-update RAG Corpus (Ý tưởng 1)
        if final_res.inferred_pii_type not in [PIIType.UNKNOWN.value, PIIType.NOT_PERSONAL_DATA.value]:
            update_rag_corpus(
                column_name=col_profile.column_name,
                pii_type=final_res.inferred_pii_type
            )

        return {"final_proposal": final_res}

    return {}

