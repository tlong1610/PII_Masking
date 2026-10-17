import json
import os
import threading

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
            from src.detection.vector_store import PIIKnowledgeBase

            kb = PIIKnowledgeBase()
            kb.initialize_db(corpus_path=corpus_path)
            # Cần chú ý: Hàm này dùng embeddings model, có thể tốn vài giây.
            # Trong thực tế, nên đẩy vào message queue (như Celery/RabbitMQ).
        except Exception as e:
            print(f"[HITL] Lỗi khi cập nhật VectorDB: {e}")

    return updated

_memory_lock = threading.Lock()


def _runtime_memory_path(memory_path: str | None) -> str:
    if memory_path:
        return memory_path
    from src.config import get_settings

    return get_settings().hitl_memory_path


def _read_examples(path: str) -> list[dict]:
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            return []
    return data if isinstance(data, list) else []


def save_few_shot_example(
    column_name: str,
    data_shape: list[str],
    dpo_decision: str,
    action: str,
    memory_path: str | None = None,
    *,
    table_name: str | None = None,
) -> bool:
    """
    Ý tưởng 2: Lưu lại lịch sử quyết định của DPO vào file JSON
    để làm Few-shot examples cho LLM.

    Writes to the runtime memory file (HITL_MEMORY_PATH), never the committed seed file. A newer DPO
    decision for the same table+column replaces the older one, so a correction can itself be corrected.
    Stores the column name, anonymised data shape and the decision only, never sample values.
    """
    path = _runtime_memory_path(memory_path)
    entry = {
        "column_name": column_name,
        "table_name": table_name,
        "data_shape": data_shape,
        "dpo_decision": dpo_decision,
        "action": action,
    }
    with _memory_lock:
        data = [
            item for item in _read_examples(path)
            if not (item.get("column_name") == column_name and item.get("table_name") == table_name)
        ]
        data.append(entry)
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        tmp_path = f"{path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, path)
    return True


def record_dpo_corrections(corrections: list[dict]) -> int:
    """Save DPO overrides from the review screen as few-shot examples; returns how many were stored.

    Each correction is {"table_name", "column_name", "dpo_decision", "action"}. Samples are never
    persisted, so the data shape is left empty. A failure is logged, never raised: learning is best-effort
    and must not block saving decisions.
    """
    import logging

    stored = 0
    for item in corrections:
        try:
            save_few_shot_example(
                column_name=item["column_name"],
                data_shape=[],
                dpo_decision=item["dpo_decision"],
                action=item["action"],
                table_name=item.get("table_name"),
            )
            stored += 1
        except (OSError, KeyError, TypeError) as exc:
            logging.getLogger(__name__).warning("HITL memory not updated: %s", type(exc).__name__)
    return stored


def get_few_shot_examples(
    limit: int = 3,
    memory_path: str | None = None,
    *,
    column_name: str | None = None,
) -> list[dict]:
    """
    Lấy ra n examples để đính kèm vào System Prompt của LLM.

    Merges the committed seed (FEW_SHOT_MEM_PATH) with the runtime DPO memory, newest last. With a
    column_name, examples sharing a name token with it come first, so the LLM sees the most relevant ones.
    """
    examples = _read_examples(FEW_SHOT_MEM_PATH) + _read_examples(_runtime_memory_path(memory_path))
    if not column_name:
        return examples[-limit:]
    from src.detection.regex_patterns import name_tokens

    wanted = set(name_tokens(column_name))

    def overlap(item: dict) -> int:
        return len(wanted & set(name_tokens(str(item.get("column_name", "")))))

    # Stable sort keeps recency order inside each relevance group; the best ones end up last.
    ranked = sorted(examples, key=overlap)
    return ranked[-limit:]
