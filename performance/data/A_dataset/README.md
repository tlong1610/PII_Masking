# 📊 Synthetic Enterprise Tabular Dataset (A_dataset)

> **Tập dữ liệu kiểm thử giả lập Doanh nghiệp Việt Nam cho LUỒNG A (Column-Level / Tabular Detection)**  
> **Căn cứ pháp lý:** Luật 91/2025/QH15, Nghị định 356/2025/NĐ-CP & Tài liệu [`message.txt`](../../../message.txt).

---

## 1. 📌 Mục Đích & Phạm Vi
Tập dữ liệu này được thiết kế chuyên biệt để đánh giá **Luồng A — Phễu lọc 3 tầng cấp cột (Cascade Funnel Column-Level PII Detection)**:
* Đầu vào là schema bảng và các mẫu dữ liệu (`ColumnProfile` / `FieldProfile`).
* Đầu ra là hành động bảo vệ cho toàn bộ cột (`HMAC`, `MASK`, `DROP`, `KEEP`) cùng loại PII theo luật định.

---

## 2. 📁 Cấu Trúc Thư Mục
```
performance/data/A_dataset/
├── README.md                           # Tài liệu đặc tả này
├── generate_a_dataset.py               # Script sinh dữ liệu tự động (reproducible)
└── synthetic_enterprise_columns.json   # 339 test cases đã chuẩn hóa
```

---

## 3. ⚖️ Thống Kê & Phân Bố Dữ Liệu (339 Test Cases)

### 3.1. Phân bố theo Hành động bảo mật (Action Distribution)
* 🛡️ **`MASK` (177 cases - 52.2%):** Che mờ dữ liệu cá nhân cơ bản (Họ tên, SĐT, Email, Địa chỉ, Ngày sinh, MST cá nhân, STK/Thẻ ngân hàng, Ghi chú chứa PII).
* 🟢 **`KEEP` (106 cases - 31.3%):** Giữ nguyên dữ liệu an toàn/phi cá nhân (Tên công ty, MST doanh nghiệp, Ngày giao dịch, Số tiền/Doanh thu, Mã vận đơn, Tỉnh/Thành phố).
* 🔑 **`HMAC` (28 cases - 8.3%):** Băm khóa nối bảo toàn quan hệ (Số CCCD 12 chữ số theo chuẩn Luật 91 & NĐ 356).
* 🗑️ **`DROP` (28 cases - 8.3%):** Loại bỏ hoàn toàn khỏi view phân tích (File path CCCD, Text OCR tài liệu nhạy cảm, Dữ liệu sinh trắc học, Cột rỗng toàn NULL).

### 3.2. Phân bố theo Mức độ nhạy cảm (Sensitivity Levels)
* **`L3` (Cao - Nhạy cảm):** 83 cases (CCCD, OCR CCCD, Tài khoản/Thẻ ngân hàng, Sinh trắc học, Free-text PII).
* **`L2` (Trung bình - Cơ bản):** 144 cases (Họ tên, SĐT, Email, Địa chỉ, Ngày sinh, MST cá nhân).
* **`L1` (Thấp - Định danh gián tiếp):** 18 cases (Tỉnh/Thành phố).
* **`L0` (Không PII / Vận hành):** 94 cases (MST tổ chức, Số tiền, Ngày sự kiện, Mã đơn hàng, Tên sản phẩm, Cột rỗng).

### 3.3. Phân chia tập kiểm thử (Splits)
* **`dev` (Train/Tune):** 239 cases (~70%)
* **`test` (Validation):** 52 cases (~15%)
* **`holdout` (Test mù/Edge cases):** 48 cases (~15%)

---

## 4. 🔬 Danh Sách 18 Phân Loại PII (Taxonomies Phủ Kín `message.txt`)

| Taxonomy ID | Hành động | Cấp độ | Ví dụ Tên Cột | Mẫu Dữ Liệu Đại Diện |
|---|:---:|:---:|---|---|
| `CCCD` | **HMAC** | L3 | `cccd`, `national_id`, `so_cccd` | `001085123456`, `079198654321` |
| `FULL_NAME` | **MASK** | L2 | `contact_name`, `full_name`, `ship_name` | `Nguyễn Văn Tuấn`, `Trần Thị Mai` |
| `PHONE_VN` | **MASK** | L2 | `mobile_phone`, `phone_number`, `sdt` | `0389123456`, `0908765432` |
| `EMAIL` | **MASK** | L2 | `email`, `personal_email`, `contact_email` | `user.4512@gmail.com` |
| `DATE_OF_BIRTH` | **MASK** | L2 | `date_of_birth`, `dob`, `ngay_sinh` | `1992-05-18`, `1985-11-04` |
| `STREET_ADDRESS` | **MASK** | L2 | `address`, `home_address`, `ship_address` | `128 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh` |
| `TAX_CODE_PERSONAL`| **MASK** | L2 | `tax_code`, `personal_tax_id`, `mst_ca_nhan` | `8123456789` |
| `TAX_CODE_ORG` | **KEEP** | L0 | `suppliers.tax_code`, `partners.tax_code` | `0101234567`, `0309876543-001` |
| `BANK_ACCOUNT` | **MASK** | L3 | `bank_account_no`, `card_number`, `so_the` | `1029384756`, `4454794511390933` |
| `OCR_IDENTITY_DOC` | **DROP** | L3 | `kyc_documents.ocr_text`, `raw_ocr` | `CONG HOA XA HOI CHU NGHIA VIET NAM - CAN CUOC CONG DAN...` |
| `BIOMETRIC_DATA` | **DROP** | L3 | `face_vector_512d`, `fingerprint_template` | `[VECTOR_512D: 0.1245, 0.9821, ...]` |
| `FREE_TEXT_PII` | **MASK** | L3 | `personal_notes`, `order_notes`, `body` | `Khách hàng Nguyễn Văn An yêu cầu liên hệ 0989123456...` |
| `CITY` | **KEEP** | L1 | `city`, `province`, `ship_city` | `Hà Nội`, `TP. Hồ Chí Minh`, `Đà Nẵng` |
| `FINANCIAL_AMOUNT` | **KEEP** | L0 | `freight`, `unit_price`, `total_amount` | `1250000.0`, `45000.0` |
| `TRANSACTION_DATE` | **KEEP** | L0 | `order_date`, `created_at`, `hire_date` | `2024-03-15 14:30:00` |
| `TRACKING_NUMBER` | **KEEP** | L0 | `tracking_number`, `waybill_code` | `VNPOST81234567VN`, `ORD-45192` |
| `ORGANIZATION_NAME`| **KEEP** | L0 | `company_name`, `product_name` | `Công ty Cổ phần VinFast`, `Tập đoàn FPT` |
| `EMPTY_COLUMN` | **DROP** | L0 | `secondary_fax`, `cancelled_archive` | `""` (Rỗng / NULL) |

---

## 5. 🚀 Cách Chạy Tái Sinh Dữ Liệu
Nếu muốn tái sinh hoặc tăng số lượng mẫu test cases:
```bash
python performance/data/A_dataset/generate_a_dataset.py
```

