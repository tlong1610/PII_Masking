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
            keywords = meta.get("keywords", [])
            # Tokenize đơn giản bằng cách tách khoảng trắng
            tokens = []
            for kw in keywords:
                tokens.extend(kw.lower().split())
            self.tokenized_corpus.append(tokens)

        # Fit mô hình BM25
        self.bm25 = BM25Okapi(self.tokenized_corpus)

    def calculate_lexical_score(self, col_profile: ColumnProfile, threshold: float = 0.2) -> tuple[float, FieldScanResult | None]:
        """
        Đánh giá cột bằng BM25.
        Returns:
            - Tuple (bm25_score, FieldScanResult | None)
            - Nếu score < threshold: Dữ liệu dưới ngưỡng bị loại bỏ hoàn toàn (Trả về Result KHÔNG PHẢI PII).
            - Nếu score >= threshold: Trả về None (để đẩy xuống Tầng 3).
        """
        # Chuẩn bị query từ tên cột (có thể mở rộng thêm mô tả cột nếu có)
        query_str = col_profile.column_name.lower().replace("_", " ")
        tokenized_query = query_str.split()

        # Tính điểm
        doc_scores = self.bm25.get_scores(tokenized_query)
        max_score = max(doc_scores) if len(doc_scores) > 0 else 0.0

        if max_score < threshold:
            # Bị loại bỏ, không phải PII
            result = FieldScanResult(
                field_name=col_profile.column_name,
                inferred_pii_type=PIIType.UNKNOWN.value,  # Hoặc NOT_PERSONAL_DATA
                confidence=1.0,
                recommended_action="KEEP",
                reasoning=f"BM25 Score ({max_score:.2f}) dưới ngưỡng ({threshold}). Loại bỏ tại Tầng 2.",
                tier="TIER_2",
                bm25_score=max_score
            )
            return max_score, result

        # Qua được phễu lọc Tầng 2, đi tiếp Tầng 3
        return max_score, None

