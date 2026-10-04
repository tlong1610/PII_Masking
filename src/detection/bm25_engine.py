import json
import math
import os

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    raise ImportError("Vui lòng cài đặt: pip install rank_bm25")

from src.detection.regex_patterns import name_tokens
from src.detection.taxonomy import PIIType
from src.models.schemas import ColumnProfile, FieldScanResult

# Generic words that appear in countless column names and say nothing about personal data on their own
# (product_name vs first_name differ only by the OTHER word). They are dropped from the query so a match
# on "name"/"id" alone can never decide a column.
_GENERIC_TOKENS = frozenset(
    {"name", "names", "id", "ids", "code", "type", "no", "number", "num", "value", "info", "data", "text",
     "description", "desc", "date", "at", "of", "the", "is", "ten", "ma", "so"}
)
_NON_PERSONAL_CLASSIFICATION = "NOT_PERSONAL_DATA"


class BM25Engine:
    """
    Tầng 2 (Cascade Funnel): Lọc Từ Vựng Cơ Bản (BM25).
    Tính điểm tần suất xuất hiện của từ khóa, đối chiếu dữ liệu với tập hồ sơ quy định pháp luật.
    Khớp cả mẫu PII lẫn mẫu KHÔNG phải PII, và trả về đúng loại của mẫu khớp nhất (không trả UNKNOWN).
    """
    def __init__(self, corpus_path: str = "src/detection/pii_rag_corpus.json"):
        self.corpus_path = corpus_path
        self.tokenized_corpus: list[list[str]] = []
        # Parallel to tokenized_corpus: (pii_type, classification) of each corpus entry.
        self.labels: list[tuple[str, str]] = []
        self.bm25 = None
        self._load_and_fit()

    def _load_and_fit(self):
        if not os.path.exists(self.corpus_path):
            raise FileNotFoundError(f"Không tìm thấy file corpus tại {self.corpus_path}")

        with open(self.corpus_path, encoding='utf-8') as f:
            data = json.load(f)

        # Xây dựng corpus từ khóa (cả mẫu PII và mẫu không phải PII, để biết cột giống loại nào nhất)
        for item in data:
            meta = item.get("metadata", {})
            tokens = []
            for kw in meta.get("keywords", []):
                tokens.extend(token for token in name_tokens(kw) if token not in _GENERIC_TOKENS)
            if not tokens:
                continue
            classification = meta.get("classification", "")
            pii_type = meta.get("pii_type") or (
                _NON_PERSONAL_CLASSIFICATION if classification == _NON_PERSONAL_CLASSIFICATION else PIIType.UNKNOWN.value
            )
            self.tokenized_corpus.append(tokens)
            self.labels.append((pii_type, classification))

        # Fit mô hình BM25
        self.bm25 = BM25Okapi(self.tokenized_corpus)

    def calculate_lexical_score(self, col_profile: ColumnProfile, threshold: float = 0.95) -> tuple[float, FieldScanResult | None]:
        """
        Đánh giá cột bằng BM25.
        Returns:
            - Tuple (bm25_score, FieldScanResult | None)
            - Lọc trên (Top-filter): Nếu score > threshold, chốt theo loại của mẫu khớp nhất để tiết kiệm LLM.
            - Nếu score <= threshold hoặc tên cột chỉ gồm từ chung chung: trả None để đẩy xuống Tầng 3.
        """
        tokenized_query = [token for token in name_tokens(col_profile.column_name) if token not in _GENERIC_TOKENS]
        if not tokenized_query:
            return 0.0, None

        # Tính điểm
        doc_scores = list(self.bm25.get_scores(tokenized_query))
        max_raw_score = max(doc_scores) if doc_scores else 0.0

        # Chuẩn hóa bằng hàm Sigmoid để ép điểm về [0, 1]
        if max_raw_score <= 0.0:
            max_score = 0.0
        else:
            # x0 = 2.5 (ngưỡng bắt đầu khớp từ khóa), k = 2.0 (độ dốc)
            max_score = 1.0 / (1.0 + math.exp(-2.0 * (max_raw_score - 2.5)))

        if max_score > threshold:
            pii_type, classification = self.labels[doc_scores.index(max_raw_score)]
            if pii_type == PIIType.UNKNOWN.value:
                return max_score, None
            if classification == _NON_PERSONAL_CLASSIFICATION:
                action = "KEEP"
            elif pii_type == PIIType.CCCD.value:
                action = "HMAC"
            else:
                action = "MASK"
            # Nếu là khoá (PK/FK) thì luôn dùng HMAC/HASHING
            action = col_profile.system_recommendation or action

            result = FieldScanResult(
                field_name=col_profile.column_name,
                inferred_pii_type=pii_type,
                confidence=max_score,
                recommended_action=action,
                reasoning=f"BM25 Score: {max_score:.2f} > Threshold {threshold}, khớp nhất với loại {pii_type}",
                tier="TIER_2",
                bm25_score=max_score
            )
            return max_score, result

        # Dưới ngưỡng -> Chưa chắc chắn, đi tiếp Tầng 3 để LLM quét kỹ hơn
        return max_score, None
