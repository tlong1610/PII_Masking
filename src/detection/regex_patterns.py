import re

from src.detection.taxonomy import PIIType

# ==========================================
# LỚP LỌC 1: CÁC TỪ KHÓA TÊN CỘT RÕ RÀNG (HIGH CONFIDENCE)
# ==========================================
HIGH_CONFIDENCE_COLUMNS = {
    PIIType.CCCD.value: ["cccd", "cmnd", "so_dinh_danh", "identity_card", "national_id"],
    PIIType.EMAIL.value: ["email", "mail_address"],
    PIIType.PHONE.value: ["phone", "sdt", "so_dien_thoai", "mobile", "fax"],
    PIIType.TAX_CODE.value: ["tax_code", "mst", "ma_so_thue"],
    PIIType.DOB.value: ["date_of_birth", "birth_date", "dob", "ngay_sinh"],
    PIIType.ADDRESS.value: ["address", "dia_chi", "street", "street_address"],
    # Lưu ý: CREDIT_CARD và BIOMETRIC_FILE không có trong taxonomy tối thiểu
    # nhưng có thể giữ lại dưới dạng string nếu cần cho tương lai,
    # hoặc ánh xạ về SENSITIVE. Tạm dùng string.
    "CREDIT_CARD": ["credit_card", "bank_account_no", "so_tai_khoan"],
    "BIOMETRIC_FILE": ["face_image", "fingerprint", "id_card_front", "id_card_back"]
}

# Các từ khóa tên cột dễ gây nhầm lẫn (Ambiguous), TUYỆT ĐỐI BỎ QUA, đẩy qua Lớp 2 LLM
AMBIGUOUS_COLUMNS = ["id", "code", "name", "note", "contact_info", "description"]

# Các từ khóa tên cột chắc chắn KHÔNG PHẢI PII CÁ NHÂN (Negative Cases)
NEGATIVE_COLUMNS = {
    PIIType.TRACKING_CODE.value: ["tracking_number", "tracking_code", "order_id", "order_number", "shipment_id", "waybill", "bill_of_lading"],
    PIIType.MONEY_ALONE.value: ["amount", "total_price", "unit_price", "balance", "fee", "cost", "freight"],
    "NOT_PERSONAL_DATA": ["customer_id", "_id", "company_name", "ship_via", "doc_type", "postal_code", "contact_title", "order_date", "region"]
}

# ==========================================
# LỚP LỌC 2: REGEX KIỂM TRA DỮ LIỆU MẪU (SAMPLES)
# Phải đảm bảo Strict (Chặt chẽ) để tránh False Positive.
# ==========================================
REGEX_PATTERNS = {
    # Đúng 12 số (CCCD) - Bỏ 9 số để chặt chẽ theo yêu cầu
    PIIType.CCCD.value: re.compile(r"^\d{12}$"),

    # Định dạng chuẩn email
    PIIType.EMAIL.value: re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"),

    # Số điện thoại VN: Bắt đầu 0, 84 hoặc +84, sau đó là 3,5,7,8,9 và đúng 8 số đằng sau
    PIIType.PHONE.value: re.compile(r"^(0|84|\+84)(3|5|7|8|9)\d{8}$"),

    # Ma so thue
    PIIType.TAX_CODE.value: re.compile(r"^\d{10}(-\d{3})?$"),
}
