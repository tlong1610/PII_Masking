import json

from src.detection.bm25_engine import BM25Engine
from src.detection.ner_orchestrator import NERPipelines
from src.detection.rule_engine import RuleBasedScanner
from src.models.schemas import ColumnProfile


def is_high_variance(sample: str, taxonomy: str) -> bool:
    """Mock việc tính toán Variance của cột: Cột free-text dài sẽ có variance rất cao."""
    if taxonomy == "FREE_TEXT_PII":
        return True
    if len(str(sample)) > 50:
        return True
    return False

def run_e2e_eval():
    print("=== KHỞI TẠO CÁC MODULE ===")
    rule_scanner_a = RuleBasedScanner()
    bm25_engine_a = BM25Engine()

    # Từ điển cho Luồng B
    dict_configs = {
        "LOCATION": ["Nha Trang", "Hà Nội", "Hồ Chí Minh", "Berlin", "Germany"],
        "ORGANIZATION": ["Vingroup", "VinFast", "Alfreds Futterkiste", "Vins et alcools Chevalier"],
        "PERSON_NAME": ["Nguyễn Văn A", "Maria Anders"] # Nạp thêm một vài tên để test dictionary fallback nếu ML trượt
    }
    ner_pipeline_b = NERPipelines(dict_configs=dict_configs)

    with open("eval/golden_labels.json", encoding="utf-8") as f:
        data = json.load(f)

    print("\n=== BẮT ĐẦU CHẠY PIPELINE TỔNG HỢP ===")

    # Lấy 15 sample đầu tiên để chạy demo cho nhanh
    for idx, record in enumerate(data[:15]):
        field_name = record["field_path"]
        sample_value = record["sample_value"]
        taxonomy = record["taxonomy_id"]

        print(f"\n[{idx+1}] Đang xử lý cột: {field_name} | Sample: {sample_value[:50]}...")

        # BƯỚC 1: Phân loại theo Variance
        if is_high_variance(sample_value, taxonomy):
            print("=> PHÂN LOẠI: Variance lớn -> LUỒNG B (Entity-Level Redaction / Free-text)")

            # Mock HITL: DPO quyết định
            print("   [HITL - DPO Alert]: Phát hiện cột Free-text nhạy cảm.")
            user_choice = "DEEP_SCAN" # Giả lập người dùng chọn Deep Scan thay vì xóa cả cột
            print(f"   [DPO Quyết định]: {user_choice}")

            if user_choice == "DEEP_SCAN":
                print("   [Luồng B] Khởi động NER Pipeline (Regex -> Dict -> ML)...")
                redacted_text = ner_pipeline_b.redact_document(sample_value)
                print(f"   [Kết quả Redact]: {redacted_text}")
            else:
                print(f"   [Kết quả]: DROP toàn bộ cột {field_name}")

        else:
            print("=> PHÂN LOẠI: Variance thấp -> LUỒNG A (Column-Level / Cấu trúc cố định)")

            # Tạo Column Profile giả lập
            profile = ColumnProfile(
                table_name=record["table"],
                column_name=field_name,
                data_type=record["data_type"],
                is_primary_key=field_name == "id",
                is_foreign_key=False,
                samples=[sample_value]
            )

            # Chạy Cascade Tầng 1
            result_t1 = rule_scanner_a.tier1_static_filter(profile)
            if result_t1:
                print(f"   [Luồng A - Tầng 1 (Regex/Rule)]: Bắt được -> Loại {result_t1.inferred_pii_type}, Action: {result_t1.recommended_action}")
                continue

            # Chạy Cascade Tầng 2
            score, result_t2 = bm25_engine_a.calculate_lexical_score(profile)
            if result_t2:
                print(f"   [Luồng A - Tầng 2 (BM25)]: Bắt được (Score: {score:.2f}) -> Loại {result_t2.inferred_pii_type}, Action: {result_t2.recommended_action}")
                continue

            # Không bắt được -> Rớt xuống Tầng 3 (LLM - Mock)
            print("   [Luồng A - Tầng 3 (LLM)]: Chuyển cho LLM đánh giá ngữ nghĩa (Đang Mock)...")
            print("   [Luồng A - Tầng 3]: LLM quyết định MASK/KEEP dựa trên sample.")

    print("\n=== KẾT THÚC PIPELINE TỔNG HỢP ===")

if __name__ == "__main__":
    run_e2e_eval()

