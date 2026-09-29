import json
import os

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    raise ImportError("Vui lòng cài đặt: pip install rank_bm25")

from src.detection.taxonomy import PIIType
from src.models.schemas import ColumnProfile, FieldScanResult


class BM25Engine:
    """
    Tầng 2 (Cascade Funnel): Lọc Từ Vựng Cơ Bản (BM25).
    Tính điểm tần suất xuất hiện của từ khóa, đối chiếu dữ liệu với tập hồ sơ quy định pháp luật.
    """
    def __init__(self, corpus_path: str = "src/detection/pii_rag_corpus.json"):
        self.corpus_path = corpus_path
        self.tokenized_corpus = []
        self.bm25 = None
        self._load_and_fit()

    def _load_and_fit(self):
        if not os.path.exists(self.corpus_path):
            raise FileNotFoundError(f"Không tìm thấy file corpus tại {self.corpus_path}")

        with open(self.corpus_path, encoding='utf-8') as f:
            data = json.load(f)

        # Xây dựng corpus từ khóa
        for item in data:
            meta = item.get("metadata", {})
            # CHỈ LẤY CÁC CASE POSITIVE (PII)
            if meta.get("classification") == "NOT_PERSONAL_DATA":
                continue

            keywords = meta.get("keywords", [])
            # Tokenize từ khóa (thay thế dấu chấm, gạch dưới)
            tokens = []
            for kw in keywords:
                clean_kw = kw.lower().replace("_", " ").replace(".", " ")
                tokens.extend(clean_kw.split())
            self.tokenized_corpus.append(tokens)

        # Fit mô hình BM25
        self.bm25 = BM25Okapi(self.tokenized_corpus)

    def calculate_lexical_score(self, col_profile: ColumnProfile, threshold: float = 0.95) -> tuple[float, FieldScanResult | None]:
        """
        Đánh giá cột bằng BM25.
        Returns:
            - Tuple (bm25_score, FieldScanResult | None)
            - Lọc trên (Top-filter): Nếu score > threshold, chốt luôn đây là PII để tiết kiệm LLM.
            - Nếu score <= threshold: Trả về None để Đẩy xuống Tầng 3 (ưu tiên recall, không bỏ sót).
        """
        # Chuẩn bị query từ tên cột (thay thế cả dấu chấm và gạch dưới)
        query_str = col_profile.column_name.lower().replace("_", " ").replace(".", " ")
        tokenized_query = query_str.split()

        # Tính điểm
        doc_scores = self.bm25.get_scores(tokenized_query)
        max_raw_score = max(doc_scores) if len(doc_scores) > 0 else 0.0

        # Chuẩn hóa bằng hàm Sigmoid để ép điểm về [0, 1]
        import math
        if max_raw_score == 0.0:
            max_score = 0.0
        else:
            # x0 = 2.5 (ngưỡng bắt đầu khớp từ khóa), k = 2.0 (độ dốc)
            max_score = 1.0 / (1.0 + math.exp(-2.0 * (max_raw_score - 2.5)))

        if max_score > threshold:
            # Điểm cao -> Chắc chắn là PII
            # Nếu là khoá (PK/FK) thì dùng HMAC/HASHING, ngược lại dùng MASK
            action = col_profile.system_recommendation if col_profile.system_recommendation else "MASK"

            result = FieldScanResult(
                field_name=col_profile.column_name,
                inferred_pii_type=PIIType.UNKNOWN.value,  # LLM/DPO có thể phân loại chi tiết sau, tạm thời đánh dấu là PII
                confidence=1.0,
                recommended_action=action,
                reasoning=f"BM25 Score: {max_score:.2f} > Threshold {threshold} cho loại {PIIType.UNKNOWN.value}",
                tier="TIER_2",
                bm25_score=max_score
            )
            return max_score, result

        # Dưới ngưỡng -> Chưa chắc chắn, đi tiếp Tầng 3 để LLM quét kỹ hơn
        return max_score, None

