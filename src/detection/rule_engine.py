from src.detection.regex_patterns import NEGATIVE_COLUMNS, REGEX_PATTERNS
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

    def tier1_static_filter(self, col_profile: ColumnProfile) -> FieldScanResult | None:
        """
        Tầng 1 (Cascade Funnel): Lọc tĩnh (Rule-based & Regex).
        Chỉ trả về kết quả nếu khớp 100% (chắc chắn PII hoặc chắc chắn KHÔNG phải).
        Nếu mập mờ (không khớp 100%), trả về None để đẩy xuống Tầng 2.
        """
        enforced_action = col_profile.system_recommendation

        # Bước 0: Bắt các ca ÂM (Tracking, Order, Amount) - Chắc chắn 100% không phải PII
        negative_type = self._check_column_name(col_profile.column_name, NEGATIVE_COLUMNS)
        if negative_type:
            return FieldScanResult(
                field_name=col_profile.column_name,
                inferred_pii_type=negative_type,
                confidence=1.0,
                recommended_action=self._get_recommended_action(negative_type, enforced_action),
                reasoning=f"Matched negative keyword for {negative_type}. Bypassing regex checks.",
                tier="TIER_1"
            )

        # Bước 1: Quét bằng Regex (Vét cạn) - Chỉ lấy nếu khớp 100%
        # Ưu tiên kiểm tra các cột có tên trong HIGH_CONFIDENCE trước để tối ưu, nhưng ở đây
        # theo yêu cầu Tầng 1: Khớp regex 100% mới tính.
        for pii_type in REGEX_PATTERNS.keys():
            match_ratio = self._check_samples_regex(pii_type, col_profile.samples)
            if match_ratio == 1.0 and len(col_profile.samples) > 0:
                return FieldScanResult(
                    field_name=col_profile.column_name,
                    inferred_pii_type=pii_type,
                    confidence=1.0,
                    recommended_action=self._get_recommended_action(pii_type, enforced_action),
                    reasoning=f"100% samples matched strict Regex for {pii_type}.",
                    tier="TIER_1"
                )

        # Mập mờ -> Trả về None để đẩy xuống Tầng 2 (BM25)
        return None

    @staticmethod
    def transform_to_data_shape(samples: list[str]) -> list[str]:
        """
        Helper cho Tầng 3: Biến đổi dữ liệu thô thành Data Shape ẩn danh.
        VD: '0901234567' -> 'XXXXXXXXXX', 'nguyen@gmail.com' -> 'XXXXXX@XXXXX.XXX'
        """
        shapes = []
        for sample in samples:
            if not sample:
                continue
            shape_str = ""
            for char in str(sample):
                if char.isdigit():
                    shape_str += "X"
                elif char.isalpha():
                    shape_str += "C"  # C for Character
                else:
                    shape_str += char # Giữ lại các ký tự đặc biệt như @, -, .
            shapes.append(shape_str)
        return shapes
