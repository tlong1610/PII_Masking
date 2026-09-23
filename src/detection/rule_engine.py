from src.detection.regex_patterns import HIGH_CONFIDENCE_COLUMNS, NEGATIVE_COLUMNS, REGEX_PATTERNS
from src.detection.taxonomy import PIIType
from src.models.schemas import ColumnProfile, FieldScanResult


class RuleBasedScanner:
    """
    Lớp Lọc 1: Rule-Based & Regex Scanner.
    Nhiệm vụ: Chặn ngay lập tức các PII rõ ràng (như CCCD, Email, Phone)
    hoặc bỏ qua các loại chắc chắn không phải PII (Mã vận đơn, số tiền).
    Những thứ không chắc chắn (UNKNOWN) sẽ được đẩy qua các lớp sau (LLM, DPO).
    """

    def __init__(self, match_threshold: float = 0.5):
        # Tỷ lệ % số samples tối thiểu phải khớp Regex để kết luận là PII
        # Mặc định: 50% (VD: 3/5 mẫu là số điện thoại thì cột đó chứa SĐT)
        self.match_threshold = match_threshold

    def _check_column_name(self, column_name: str, keyword_dict: dict) -> str | None:
        """
        Kiểm tra tên cột có nằm trong danh sách từ khóa không.
        Returns: PII Type hoặc None.
        """
        col_lower = column_name.lower()
        for pii_type, keywords in keyword_dict.items():
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

    def _get_recommended_action(self, inferred_type: str, enforced_action: str | None) -> str:
        """Helper để map loại PII với action nếu chưa có enforced_action."""
        if enforced_action:
            return enforced_action

        # Nếu là loại không phải dữ liệu cá nhân -> KEEP
        if inferred_type in [PIIType.TRACKING_CODE.value, PIIType.MONEY_ALONE.value]:
            return "KEEP"

        # Nếu là UNKNOWN -> KEEP (để pass qua LLM quyết định)
        if inferred_type == PIIType.UNKNOWN.value:
            return "KEEP"

        return "MASK"

    def scan_column(self, col_profile: ColumnProfile) -> FieldScanResult:
        """
        Động cơ quyết định (Decision Logic) cho 1 cột.
        """
        enforced_action = col_profile.system_recommendation

        # Bước 0: Bắt các ca ÂM (Tracking, Order, Amount)
        # Nếu tên cột rơi vào nhóm này, chặn ngay, không cho chạy regex CCCD
        negative_type = self._check_column_name(col_profile.column_name, NEGATIVE_COLUMNS)
        if negative_type:
            return FieldScanResult(
                field_name=col_profile.column_name,
                inferred_pii_type=negative_type,
                confidence=1.0,
                recommended_action=self._get_recommended_action(negative_type, enforced_action),
                reasoning=f"Matched negative keyword for {negative_type}. Bypassing regex checks."
            )

        # Bước 1: Quét bằng Tên cột khả nghi (High Confidence)
        guessed_pii_type = self._check_column_name(col_profile.column_name, HIGH_CONFIDENCE_COLUMNS)

        if guessed_pii_type:
            match_ratio = self._check_samples_regex(guessed_pii_type, col_profile.samples)

            # Kể cả match_ratio thấp (do data lỗi, null nhiều), nhưng tên cột rõ ràng
            # thì vẫn tin tưởng.
            if match_ratio >= 0.0 or len(col_profile.samples) == 0:
                return FieldScanResult(
                    field_name=col_profile.column_name,
                    inferred_pii_type=guessed_pii_type,
                    confidence=0.9 if match_ratio == 0 else 1.0,
                    recommended_action=self._get_recommended_action(guessed_pii_type, enforced_action),
                    reasoning=f"Matched high-confidence column name keyword for {guessed_pii_type}."
                )

        # Bước 2: Tên cột không rõ ràng, thử vét cạn Regex
        for pii_type in REGEX_PATTERNS.keys():
            match_ratio = self._check_samples_regex(pii_type, col_profile.samples)

            if match_ratio >= self.match_threshold:
                # Đặc biệt: Nếu Regex email khớp, vẫn trả về EMAIL, LLM layer sau
                # sẽ đánh giá xem nó là email cá nhân hay tổ chức nếu cần (hoặc DPO).
                return FieldScanResult(
                    field_name=col_profile.column_name,
                    inferred_pii_type=pii_type,
                    confidence=match_ratio,
                    recommended_action=self._get_recommended_action(pii_type, enforced_action),
                    reasoning=f"{match_ratio*100}% samples matched strict Regex for {pii_type}."
                )

        # Bước 3: Không lọt lưới Rule-based -> Trả về UNKNOWN để đẩy xuống Lớp 2 (LLM)
        return FieldScanResult(
            field_name=col_profile.column_name,
            inferred_pii_type=PIIType.UNKNOWN.value,
            confidence=0.0,
            recommended_action=self._get_recommended_action(PIIType.UNKNOWN.value, enforced_action),
            reasoning="Rule-based scanner found no strong evidence. Delegating to next layers."
        )
