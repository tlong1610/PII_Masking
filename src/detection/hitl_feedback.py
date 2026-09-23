import json
import os

from src.detection.vector_store import PIIKnowledgeBase

CORPUS_PATH = "src/detection/pii_rag_corpus.json"
FEW_SHOT_MEM_PATH = "src/detection/dpo_few_shot_memory.json"

def update_rag_corpus(column_name: str, pii_type: str, corpus_path: str = CORPUS_PATH):
    """
    Ý tưởng 1: Cập nhật pii_rag_corpus.json với keyword mới được DPO xác nhận
    và khởi tạo lại ChromaDB để hệ thống (Tầng 2 & Tầng 3.1) tự động học.
    """
    if not os.path.exists(corpus_path):
        return False

    with open(corpus_path, encoding='utf-8') as f:
        data = json.load(f)

    # Chuẩn hóa tên cột thành keyword
    col_lower = column_name.lower().replace("_", " ")

    updated = False
    # Tìm entity ID tương ứng dựa trên PIIType (ví dụ: PHONE -> ENT-PHONE)
    target_id = f"ENT-{pii_type}"

    for item in data:
        if item.get("id") == target_id:
            keywords = item.get("metadata", {}).get("keywords", [])
            if col_lower not in keywords:
                keywords.append(col_lower)
                item["metadata"]["keywords"] = keywords
                updated = True
            break

    # Nếu là loại mới chưa có ID chuẩn, ta có thể fallback thêm vào mảng gốc hoặc log lại
    # Ở đây giả sử tìm thấy và update:
    if updated:
        with open(corpus_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # Re-initialize VectorDB in background
        print(f"[HITL] Đã tự động cập nhật từ khóa '{col_lower}' vào ChromaDB cho loại {pii_type}.")
        try:
            kb = PIIKnowledgeBase()
            kb.initialize_db(corpus_path=corpus_path)
            # Cần chú ý: Hàm này dùng embeddings model, có thể tốn vài giây.
            # Trong thực tế, nên đẩy vào message queue (như Celery/RabbitMQ).
        except Exception as e:
            print(f"[HITL] Lỗi khi cập nhật VectorDB: {e}")

    return updated

def save_few_shot_example(column_name: str, data_shape: list[str], dpo_decision: str, action: str, memory_path: str = FEW_SHOT_MEM_PATH):
    """
    Ý tưởng 2: Lưu lại lịch sử quyết định của DPO vào file JSON
    để làm Few-shot examples cho LLM.
    """
    data = []
    if os.path.exists(memory_path):
        with open(memory_path, encoding='utf-8') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []

    # Tránh lưu trùng lặp tên cột
    for item in data:
        if item.get("column_name") == column_name:
            return False

    data.append({
        "column_name": column_name,
        "data_shape": data_shape,
        "dpo_decision": dpo_decision,
        "action": action
    })

    with open(memory_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[HITL] Đã lưu example '{column_name}' -> '{dpo_decision}' vào Few-shot memory.")
    return True

def get_few_shot_examples(limit: int = 3, memory_path: str = FEW_SHOT_MEM_PATH) -> list[dict]:
    """
    Lấy ra n examples gần nhất để đính kèm vào System Prompt của LLM.
    """
    if not os.path.exists(memory_path):
        return []

    with open(memory_path, encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            return []

    return data[-limit:]

