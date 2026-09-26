# 🎯 BÁO CÁO ĐỐI SOÁT POSTGRESQL GOLDEN DATASET & SEED.SQL

> **Nhiệm vụ:** Rà soát 50 PostgreSQL labels trong `eval/golden_labels.json`, đối chiếu với `data/fixtures/seed.sql`, bảo đảm 33 case dev và 17 case holdout.
> **Thời điểm đối soát:** psycopg / Python environment
> **Trạng thái:** 🟢 **100% RECONCILED (50/50 LABELS MATCH SEED.SQL)**

---

## 1. 📊 Tổng Quan Phân Bổ (Distribution)

- **Tổng số nhãn PostgreSQL:** **50** (Kỳ vọng: 50)
- **Tập Huấn luyện / Phát triển (Dev split):** **33** cases (Kỳ vọng: 33)
- **Tập Đánh giá Độc lập (Holdout split):** **17** cases (Kỳ vọng: 17)

### Phân Bổ Theo Hành Động Xử Lý (Expected Action):
| Hành động | Số lượng | Mô tả nghiệp vụ |
|---|:---:|---|
| `MASK` | **25** | Che mờ dữ liệu PII hiển thị (Email, SĐT, Tên, Địa chỉ, Ghi chú) |
| `KEEP` | **19** | Giữ nguyên (ID hệ thống, Tên thành phố, Quốc gia, Danh mục không PII) |
| `HMAC` | **4** | Băm bảo toàn khóa nối downstream (CCCD, Customer CCCD, KYC CCCD) |
| `DROP` | **2** | Loại bỏ hoàn toàn dữ liệu siêu nhạy cảm / không cần thiết |

---

## 2. 🧪 Danh Sách 33 Cases Dev (Tập Huấn Luyện & Tinh Chỉnh AI)

| STT | Label ID | Bảng (seed.sql) | Cột / Thuộc tính | Taxonomy ID | Nhóm dữ liệu | Action | Kiểu dữ liệu | Sample Value |
|:---:|---|---|---|---|---|:---:|---|---|
| 1 | `pg-cust-cccd-01` | `customers` | `cccd` | `CCCD` | sensitive | `HMAC` | string | `033254456184` |
| 2 | `pg-cust-email-01` | `customers` | `email` | `EMAIL` | sensitive | `MASK` | string | `alfki.0712@example.vn` |
| 3 | `pg-cust-mobile-01` | `customers` | `mobile_phone` | `PHONE_VN` | sensitive | `MASK` | string | `0327540543` |
| 4 | `pg-cust-dob-01` | `customers` | `date_of_birth` | `DATE_OF_BIRTH` | sensitive | `MASK` | date | `1967-11-24` |
| 5 | `pg-cust-taxcode-01` | `customers` | `tax_code` | `TAX_CODE_PERSONAL` | sensitive | `MASK` | string | `4518834201` |
| 6 | `pg-cust-notes-01` | `customers` | `personal_notes` | `FREE_TEXT_PII` | sensitive | `MASK` | text | `LH 0327540543; CCCD 03...` |
| 7 | `pg-cust-name-01` | `customers` | `contact_name` | `FULL_NAME` | basic | `MASK` | string | `Maria Anders` |
| 8 | `pg-cust-address-01` | `customers` | `address` | `STREET_ADDRESS` | basic | `MASK` | string | `Obere Str. 57` |
| 9 | `pg-cust-city-01` | `customers` | `city` | `CITY` | basic | `KEEP` | string | `Berlin` |
| 10 | `pg-cust-country-01` | `customers` | `country` | `COUNTRY` | non_personal | `KEEP` | string | `Germany` |
| 11 | `pg-cust-id-01` | `customers` | `customer_id` | `SYSTEM_ID` | non_personal | `KEEP` | string | `ALFKI` |
| 12 | `pg-cust-company-01` | `customers` | `company_name` | `ORGANIZATION_NAME` | non_personal | `KEEP` | string | `Alfreds Futterkiste` |
| 13 | `pg-cust-title-01` | `customers` | `contact_title` | `JOB_TITLE` | non_personal | `KEEP` | string | `Sales Representative` |
| 14 | `pg-ord-custcccd-01` | `orders` | `customer_cccd` | `CCCD` | sensitive | `HMAC` | string | `038263451360` |
| 15 | `pg-ord-shipphone-01` | `orders` | `ship_phone` | `PHONE_VN` | basic | `MASK` | string | `0980431050` |
| 16 | `pg-ord-tracking-01` | `orders` | `tracking_code` | `TRACKING_NUMBER` | non_personal | `KEEP` | string | `400691172582` |
| 17 | `pg-ord-notes-01` | `orders` | `order_notes` | `FREE_TEXT_PII` | sensitive | `MASK` | text | `Goi nguoi nhan 0980431...` |
| 18 | `pg-ord-shipaddr-01` | `orders` | `ship_address` | `STREET_ADDRESS` | basic | `MASK` | string | `59 rue de l'Abbaye` |
| 19 | `pg-ord-id-01` | `orders` | `order_id` | `TRANSACTION_ID` | non_personal | `KEEP` | integer | `10248` |
| 20 | `pg-ord-freight-01` | `orders` | `freight` | `FINANCIAL_AMOUNT` | non_personal | `KEEP` | float | `32.38` |
| 21 | `pg-ord-date-01` | `orders` | `order_date` | `TRANSACTION_DATE` | non_personal | `KEEP` | date | `1996-07-04` |
| 22 | `pg-emp-cccd-01` | `employees` | `cccd` | `CCCD` | sensitive | `HMAC` | string | `001085002134` |
| 23 | `pg-emp-email-01` | `employees` | `personal_email` | `EMAIL` | sensitive | `MASK` | string | `nancy.davolio@gmail.com` |
| 24 | `pg-emp-mobile-01` | `employees` | `mobile_phone` | `PHONE_VN` | sensitive | `MASK` | string | `0912345678` |
| 25 | `pg-emp-taxcode-01` | `employees` | `tax_code` | `TAX_CODE_PERSONAL` | sensitive | `MASK` | string | `8023456789` |
| 26 | `pg-emp-name-01` | `employees` | `first_name` | `FIRST_NAME` | basic | `MASK` | string | `Nancy` |
| 27 | `pg-emp-birth-01` | `employees` | `birth_date` | `DATE_OF_BIRTH` | sensitive | `MASK` | date | `1948-12-08` |
| 28 | `pg-sup-cccd-01` | `suppliers` | `contact_cccd` | `CCCD` | sensitive | `HMAC` | string | `079090123456` |
| 29 | `pg-sup-email-01` | `suppliers` | `contact_email` | `EMAIL` | basic | `MASK` | string | `supplier.contact@exoti...` |
| 30 | `pg-sup-taxcode-01` | `suppliers` | `tax_code` | `TAX_CODE_ORG` | non_personal | `KEEP` | string | `7654009810` |
| 31 | `pg-tick-body-01` | `support_tickets` | `body` | `FREE_TEXT_PII` | sensitive | `MASK` | text | `Khach hang yeu cau kie...` |
| 32 | `pg-kyc-ocr-01` | `kyc_documents` | `ocr_text` | `OCR_IDENTITY_DOC` | sensitive | `DROP` | text | `CONG HOA XA HOI CHU NG...` |
| 33 | `pg-kyc-filepath-01` | `kyc_documents` | `file_path` | `INTERNAL_FILE_PATH` | sensitive | `DROP` | string | `/var/data/kyc/cust_033...` |

---

## 3. 🛡️ Danh Sách 17 Cases Holdout (Tập Kiểm Định Độc Lập / Edge Cases)

| STT | Label ID | Bảng (seed.sql) | Cột / Thuộc tính | Taxonomy ID | Phân loại | Action | Kiểu dữ liệu | Mô tả Edge Case |
|:---:|---|---|---|---|---|:---:|---|---|
| 1 | `pg-cust-phone-01` | `customers` | `phone` | `PHONE_VN` | basic | `MASK` | string | Số điện thoại cố định/liên hệ cơ bản ... |
| 2 | `pg-cust-fax-01` | `customers` | `fax` | `PHONE_FAX` | basic | `MASK` | string | Số fax liên hệ có thể dẫn tới địa chỉ... |
| 3 | `pg-ord-shipname-01` | `orders` | `ship_name` | `RECIPIENT_NAME` | basic | `MASK` | string | Tên người hoặc đơn vị nhận hàng giao ... |
| 4 | `holdout-edge-tracking-01` | `orders` | `tracking_code` | `TRACKING_NUMBER` | non_personal | `KEEP` | string | EDGE CASE: Chuỗi số 12 ký tự đúng độ ... |
| 5 | `holdout-edge-tracking-notes-01` | `orders` | `order_notes` | `FREE_TEXT_PII` | sensitive | `MASK` | text | EDGE CASE: Đoạn văn bản tự do chứa ch... |
| 6 | `holdout-edge-org-taxcode-01` | `suppliers` | `tax_code` | `TAX_CODE_ORG` | non_personal | `KEEP` | string | EDGE CASE: Mã số thuế doanh nghiệp 10... |
| 7 | `holdout-edge-personal-taxcode-01` | `customers` | `tax_code` | `TAX_CODE_PERSONAL` | sensitive | `MASK` | string | EDGE CASE: MST 10 số của khách hàng c... |
| 8 | `holdout-edge-freight-num-01` | `orders` | `freight` | `FINANCIAL_AMOUNT` | non_personal | `KEEP` | float | EDGE CASE: Con số thập phân chi phí đ... |
| 9 | `holdout-edge-custid-str-01` | `customers` | `customer_id` | `SYSTEM_ID` | non_personal | `KEEP` | string | EDGE CASE: Chuỗi ký tự hệ thống viết ... |
| 10 | `holdout-edge-orderid-seq-01` | `orders` | `order_id` | `TRANSACTION_ID` | non_personal | `KEEP` | integer | EDGE CASE: Khóa số nguyên tuần tự cuố... |
| 11 | `holdout-edge-org-email-01` | `customers` | `email` | `EMAIL` | sensitive | `MASK` | string | EDGE CASE: Email có prefix là mã công... |
| 12 | `holdout-edge-anon-seq-01` | `customers` | `personal_notes` | `FREE_TEXT_PII` | sensitive | `MASK` | text | EDGE CASE: Chuỗi số 12 chữ số ngẫu nh... |
| 13 | `holdout-pg-emp-notes-01` | `employees` | `notes` | `BIOGRAPHY` | basic | `MASK` | text | EDGE CASE: Tiểu sử nhân sự chứa thông... |
| 14 | `holdout-pg-kyc-doctype-01` | `kyc_documents` | `doc_type` | `METADATA_DOC_TYPE` | non_personal | `KEEP` | string | EDGE CASE: Phân loại loại tài liệu kỹ... |
| 15 | `holdout-pg-ticket-subj-01` | `support_tickets` | `subject` | `TICKET_SUBJECT` | non_personal | `KEEP` | string | EDGE CASE: Tiêu đề yêu cầu hỗ trợ chỉ... |
| 16 | `holdout-pg-ord-shipper-01` | `orders` | `ship_via` | `FOREIGN_KEY` | non_personal | `KEEP` | integer | EDGE CASE: Khóa ngoại trỏ đến đối tác... |
| 17 | `holdout-pg-unknown-field-01` | `customers` | `postal_code` | `UNKNOWN_OR_MIXED` | unknown | `KEEP` | string | EDGE CASE: Mã bưu chính quốc tế có cấ... |

---

## 4. 🔗 Tính Nhất Quán Khóa Nối Downstream (seed.sql Baseline)

- Phép nối `orders.customer_cccd = customers.cccd`: **830 / 830 dòng khớp (0 unmatched)**.
- Phép nối `orders.customer_id = customers.customer_id`: **830 / 830 dòng khớp (0 unmatched)**.
- Doanh thu tổng hợp (`total_revenue`): **$1,265,793.01** qua 89 khách hàng phân tích.

> **Xác nhận:** Toàn bộ 50 nhãn PostgreSQL hoàn toàn đồng nhất với schema thực tế của `data/fixtures/seed.sql`, bảo đảm 33 case dev và 17 case holdout đúng theo chỉ tiêu đề ra.