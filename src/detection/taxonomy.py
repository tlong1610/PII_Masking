try:
    from enum import StrEnum
except ImportError:
    from enum import Enum

    class StrEnum(str, Enum):  # noqa: UP042
        pass
from typing import Any


class DataClassification(StrEnum):
    BASIC = "BASIC"
    SENSITIVE = "SENSITIVE"
    CONTEXT_DEPENDENT = "CONTEXT_DEPENDENT"
    NOT_PERSONAL_DATA = "NOT_PERSONAL_DATA"


class PIIType(StrEnum):
    CCCD = "CCCD"
    PHONE = "PHONE"
    EMAIL = "EMAIL"
    ADDRESS = "ADDRESS"
    DOB = "DOB"
    TAX_CODE = "TAX_CODE"
    OCR_TEXT = "OCR_TEXT"
    TRACKING_CODE = "TRACKING_CODE"
    MONEY_ALONE = "MONEY_ALONE"
    UNKNOWN = "UNKNOWN"


# Mapping chi tiết taxonomy từ tài liệu (message.txt & pii_rag_corpus.json)
PII_TAXONOMY: dict[str, dict[str, Any]] = {
    PIIType.CCCD: {
        "classification": DataClassification.BASIC,
        "description": "Số định danh cá nhân/CCCD. Cơ bản, nhưng nếu đi kèm ảnh/tài chính thì lên mức Nhạy cảm.",
        "legal_basis": "Khoản 7 Điều 3 NĐ 356"
    },
    PIIType.PHONE: {
        "classification": DataClassification.BASIC,
        "description": "Số điện thoại di động, điện thoại bàn.",
        "legal_basis": "Khoản 7 Điều 3 NĐ 356"
    },
    PIIType.EMAIL: {
        "classification": DataClassification.CONTEXT_DEPENDENT,
        "description": "Email cá nhân là dữ liệu cơ bản. Email tổ chức chung có thể không phải dữ liệu cá nhân.",
        "legal_basis": "Khoản 11 Điều 3 NĐ 356; khoản 1 Điều 2 Luật 91"
    },
    PIIType.ADDRESS: {
        "classification": DataClassification.BASIC,
        "description": "Địa chỉ thường trú, tạm trú, nơi ở hiện tại, địa chỉ liên hệ.",
        "legal_basis": "Khoản 4 Điều 3 NĐ 356"
    },
    PIIType.DOB: {
        "classification": DataClassification.BASIC,
        "description": "Ngày, tháng, năm sinh.",
        "legal_basis": "Khoản 2 Điều 3 NĐ 356"
    },
    PIIType.TAX_CODE: {
        "classification": DataClassification.BASIC,
        "description": "Mã số thuế cá nhân.",
        "legal_basis": "Nghị định 356 (quy định chung về thông tin cá nhân)"
    },
    PIIType.OCR_TEXT: {
        "classification": DataClassification.CONTEXT_DEPENDENT,
        "description": "Text trích xuất (OCR) từ thẻ CCCD. Nếu là tập dữ liệu OCR đầy đủ thì nên coi là dữ liệu nhạy cảm.",
        "legal_basis": "Điều 3-4 NĐ 356"
    },
    PIIType.TRACKING_CODE: {
        "classification": DataClassification.NOT_PERSONAL_DATA,
        "description": "Mã vận đơn, mã đơn hàng (order id). Không phải dữ liệu cá nhân nếu không chứa thông tin định danh.",
        "legal_basis": "Khoản 1 Điều 2 Luật 91"
    },
    PIIType.MONEY_ALONE: {
        "classification": DataClassification.NOT_PERSONAL_DATA,
        "description": "Số tiền đứng riêng, không liên kết với người thì không phải dữ liệu cá nhân.",
        "legal_basis": "Khoản 1 Điều 2 Luật 91"
    }
}

