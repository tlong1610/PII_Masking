
from src.detection.regex_patterns import HIGH_CONFIDENCE_COLUMNS, REGEX_PATTERNS
from src.models.schemas import ColumnProfile, FieldScanResult


class RuleBasedScanner:
    """
    Lớp Lọc 1: Rule-Based & Regex Scanner.
    Nhiệm vụ: Chặn ngay lập tức các PII rõ ràng (như CCCD, Email, Phone) 
    để không cần tốn chi phí gọi LLM.
    """

    def __init__(self, match_threshold: float = 0.5):
        # Tỷ lệ % số samples tối thiểu phải khớp Regex để kết luận là PII
        # Mặc định: 50% (VD: 3/5 mẫu là số điện thoại thì cột đó chứa SĐT)
        self.match_threshold = match_threshold

    def _check_column_name(self, column_name: str) -> str | None:
        """
        Kiểm tra tên cột có nằm trong danh sách High Confidence không.
        Returns: PII Type (VD: "CCCD") hoặc None.
        """
        col_lower = column_name.lower()
        for pii_type, keywords in HIGH_CONFIDENCE_COLUMNS.items():
            if any(kw in col_lower for kw in keywords):
                return pii_type
        return None

    def _check_samples_regex(self, pii_type: str, samples: list[str]) -> float:
        """
        Chạy Regex tương ứng của loại PII lên danh sách samples.
        Returns: Tỷ lệ khớp (0.0 đến 1.0)
        """
        if not samples:
            return 0.0

        pattern = REGEX_PATTERNS.get(pii_type)
        if not pattern:
            return 0.0

        match_count = sum(1 for sample in samples if pattern.match(str(sample).strip()))
        return match_count / len(samples)

    def scan_column(self, col_profile: ColumnProfile) -> FieldScanResult:
        """
        Động cơ quyết định (Decision Logic) cho 1 cột.
        """
        # Nếu cột này đã được đánh dấu cứng từ bước trước (VD: HASHING do là Khóa ngoại)
        # Vẫn cần xác định nó chứa PII loại gì (nếu có thể), nhưng action giữ nguyên.
        enforced_action = col_profile.system_recommendation

        # Bước 1: Quét bằng Tên cột
        guessed_pii_type = self._check_column_name(col_profile.column_name)

        if guessed_pii_type:
            # Nếu tên cột rất khả nghi (VD: "so_dien_thoai")
            # Ta dùng Regex để "kiểm chứng" lại các mẫu dữ liệu
            match_ratio = self._check_samples_regex(guessed_pii_type, col_profile.samples)

            # Kể cả match_ratio thấp (do data lỗi, null nhiều), nhưng tên cột đã nằm trong
            # bộ HIGH_CONFIDENCE thì vẫn có thể tự tin kết luận.
            if match_ratio >= 0.0 or len(col_profile.samples) == 0:
                # (Ở đây ta tin tưởng 100% vào tên cột rõ ràng)
                return FieldScanResult(
                    field_name=col_profile.column_name,
                    inferred_pii_type=guessed_pii_type,
                    confidence=0.9 if match_ratio == 0 else 1.0,
                    recommended_action=enforced_action or "MASK",
                    reasoning=f"Matched high-confidence column name keyword for {guessed_pii_type}."
                )

        # Bước 2: Tên cột không rõ ràng, thử vét cạn Regex cho mọi loại PII
        for pii_type in REGEX_PATTERNS.keys():
            match_ratio = self._check_samples_regex(pii_type, col_profile.samples)

            if match_ratio >= self.match_threshold:
                # Đa số dữ liệu khớp định dạng cứng
                return FieldScanResult(
                    field_name=col_profile.column_name,
                    inferred_pii_type=pii_type,
                    confidence=match_ratio,
                    recommended_action=enforced_action or "MASK",
                    reasoning=f"{match_ratio*100}% samples matched strict Regex for {pii_type}."
                )

        # Bước 3: Nếu không lọt lưới Rule-based -> Trả về UNKNOWN để đẩy xuống Lớp 2 (LLM)
        return FieldScanResult(
            field_name=col_profile.column_name,
            inferred_pii_type="UNKNOWN",
            confidence=0.0,
            recommended_action=enforced_action or "KEEP",
            reasoning="Rule-based scanner found no strong evidence. Delegating to LLM context analysis."
        )

