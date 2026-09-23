import re

# ==========================================
# LỚP LỌC 1: CÁC TỪ KHÓA TÊN CỘT RÕ RÀNG (HIGH CONFIDENCE)
# (Column Name Heuristics)
# Dùng chữ thường (lowercase) để match.
# ==========================================
HIGH_CONFIDENCE_COLUMNS = {
    "CCCD": ["cccd", "cmnd", "so_dinh_danh", "identity_card", "national_id"],
    "EMAIL": ["email", "mail_address"],
    "PHONE": ["phone", "sdt", "so_dien_thoai", "mobile"],
    "CREDIT_CARD": ["credit_card", "bank_account_no", "so_tai_khoan"],
    "BIOMETRIC_FILE": ["face_image", "fingerprint", "id_card_front", "id_card_back"]
}

# Các từ khóa tên cột dễ gây nhầm lẫn (Ambiguous), TUYỆT ĐỐI BỎ QUA, đẩy qua Lớp 2 LLM
# Ví dụ: "id" (user_id hay product_id?), "address" (địa chỉ nhà hay địa chỉ công ty?), "name"
AMBIGUOUS_COLUMNS = ["id", "code", "name", "note", "address", "contact_info", "description"]


# ==========================================
# LỚP LỌC 2: REGEX KIỂM TRA DỮ LIỆU MẪU (SAMPLES)
# Phải đảm bảo Strict (Chặt chẽ) để tránh False Positive.
# ==========================================
REGEX_PATTERNS = {
    # Đúng 12 số (CCCD) hoặc 9 số (CMND cũ)
    "CCCD": re.compile(r"^(\d{9}|\d{12})$"),

    # Định dạng chuẩn email
    "EMAIL": re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"),

    # Số điện thoại VN: Bắt đầu 0, 84 hoặc +84, sau đó là 3,5,7,8,9 và đúng 8 số đằng sau
    "PHONE": re.compile(r"^(0|84|\+84)(3|5|7|8|9)\d{8}$"),

    # Regex cơ bản cho thẻ tín dụng (Visa, Master, v.v. - 16 số)
    "CREDIT_CARD": re.compile(r"^(4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})$"),

    # Đuôi file ảnh thông dụng
    "BIOMETRIC_FILE": re.compile(r"(?i)\.(jpg|jpeg|png)$")
}

