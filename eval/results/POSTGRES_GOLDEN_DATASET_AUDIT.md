# 🎯 BÁO CÁO NGHIỆM THU POSTGRESQL GOLDEN DATASET & DOWNSTREAM BASELINE

> **Dự án:** PIIGuard VN (Mã đề: DATA-06 — Nhóm: P-138)  
> **Kỹ sư phụ trách:** Nguyễn Trung Kiên (Data Engineer)  
> **Thời điểm thẩm định:** 2026-09-26T12:08:45.692578  
> **Môi trường thực thi:** Container `p-138-db-1` / PostgreSQL 15 / `mydatabase`  
> **Trạng thái:** 🟢 **ALL 50 GOLDEN LABELS & DOWNSTREAM BASELINES VERIFIED ON FIXTURE (100% PASS)**  
> **Bằng chứng máy đọc (JSON):** [`eval/results/postgres_golden_evidence.json`](postgres_golden_evidence.json)  
> **Nguyên tắc an toàn:** 🔒 **No-raw-value UI Safe** — Tuyệt đối không để lộ giá trị PII thô trong báo cáo.  

---

## 1. 📊 Bằng Chứng Thực Thi Trên Fixture (`data/fixtures/postgres/seed.sql`)

Dữ liệu được nạp trực tiếp từ `seed.sql` vào cơ sở dữ liệu `mydatabase`. Toàn bộ 14 bảng quan hệ đã được kiểm chứng số lượng thực tế:

| STT | Tên Bảng | Số Cột | Số Bản Ghi Thực Tế (Live Count) | Vai Trò Nghiệp Vụ |
|:---:|---|:---:|:---:|---|
| 1 | `categories` | 4 | **8** | Northwind & VN PII Synthetic |
| 2 | `customers` | 17 | **91** | Northwind & VN PII Synthetic |
| 3 | `employee_territories` | 2 | **49** | Northwind & VN PII Synthetic |
| 4 | `employees` | 22 | **9** | Northwind & VN PII Synthetic |
| 5 | `kyc_documents` | 6 | **10** | Northwind & VN PII Synthetic |
| 6 | `order_details` | 5 | **2,155** | Northwind & VN PII Synthetic |
| 7 | `orders` | 18 | **830** | Northwind & VN PII Synthetic |
| 8 | `products` | 10 | **77** | Northwind & VN PII Synthetic |
| 9 | `region` | 2 | **4** | Northwind & VN PII Synthetic |
| 10 | `shippers` | 3 | **6** | Northwind & VN PII Synthetic |
| 11 | `suppliers` | 15 | **29** | Northwind & VN PII Synthetic |
| 12 | `support_tickets` | 7 | **15** | Northwind & VN PII Synthetic |
| 13 | `territories` | 3 | **53** | Northwind & VN PII Synthetic |
| 14 | `us_states` | 4 | **51** | Northwind & VN PII Synthetic |

---

## 2. 🔗 Bằng Chứng Chốt Downstream Baselines (SQL JOIN & Aggregate)

### A. Chốt Expected SQL JOIN (Bảo Toàn Khóa Nối CCCD)
```sql
SELECT count(*)::int AS matched_rows
FROM orders o
JOIN customers c ON o.customer_cccd = c.cccd;
```
- **Chỉ số Baseline kỳ vọng:** `matched_rows = 830`, `unmatched_rows = 0` (Dung sai = 0).
- **Kết quả chạy thực tế trên Fixture:** `matched = 830`, `unmatched = 0`.
- **Đánh giá:** 🟢 **PASSED (Khớp 100.0% — Không rớt dòng nào)**.

### B. Chốt Expected SQL Aggregate (Doanh Thu & Số Khách Hàng)
```sql
SELECT
    count(DISTINCT c.customer_id)::int AS distinct_customers,
    count(*)::int AS total_order_details,
    coalesce(sum(od.unit_price::numeric * od.quantity::numeric * (1 - od.discount::numeric)), 0) AS total_revenue
FROM orders o
JOIN customers c ON o.customer_cccd = c.cccd
JOIN order_details od ON o.order_id = od.order_id;
```
- **Số khách hàng phát sinh đơn hàng:** Kỳ vọng **89** ➔ Thực tế: **89** (Khớp 100%).
- **Tổng số chi tiết đơn hàng:** Kỳ vọng **2,155** ➔ Thực tế: **2,155** (Khớp 100%).
- **Tổng doanh thu phân tích:** Kỳ vọng **$1,265,793.01** ➔ Thực tế: **$1,265,793.04** (Dung sai cho phép: 0.05).
- **Đánh giá:** 🟢 **PASSED (Bảo toàn 100% độ chính xác cho báo cáo tài chính/BI)**.

---

## 3. 🎯 Rà Soát & Phân Bổ Golden Labels (33 Dev / 17 Holdout)

- **Tổng số nhãn PostgreSQL:** **50 / 50 nhãn** (Đạt 100%).
- **Tập Huấn luyện / Phát triển (Dev split):** **33 cases** (Đạt đúng 33 cases).
- **Tập Đánh giá Độc lập (Holdout split):** **17 cases** (Đạt đúng 17 cases).

### Phân Bổ Theo Hành Động Xử Lý (Expected Actions):
| Hành động | Số lượng | Tỷ lệ | Mô tả nghiệp vụ |
|---|:---:|:---:|---|
| `MASK` | **25** | 50% | Che mờ dữ liệu PII hiển thị (Email, SĐT, Tên, Địa chỉ, Ghi chú, MST cá nhân) |
| `KEEP` | **19** | 38% | Giữ nguyên (ID hệ thống, Tên thành phố, Quốc gia, Mã vận đơn, Chi phí freight) |
| `HMAC` | **4** | 8% | Băm bảo toàn khóa nối downstream (CCCD các bảng để giữ JOIN 830/830) |
| `DROP` | **2** | 4% | Loại bỏ hoàn toàn dữ liệu siêu nhạy cảm (`ocr_text`, `file_path` KYC) |

---

## 4. 🧪 Danh Sách 33 Cases Dev (Tập Huấn Luyện & Tinh Chỉnh AI)

| STT | Label ID | Bảng (seed.sql) | Cột / Thuộc tính | Taxonomy ID | Nhóm dữ liệu | Action | Kiểu dữ liệu | Định dạng mẫu (No-Raw-Value UI Safe) |
|:---:|---|---|---|---|---|:---:|---|---|
| 1 | `pg-cust-cccd-01` | `customers` | `cccd` | `CCCD` | sensitive | `HMAC` | string | `12 digits [RAW CCCD HIDDEN]` |
| 2 | `pg-cust-email-01` | `customers` | `email` | `EMAIL` | sensitive | `MASK` | string | `a***@example.vn [RAW HIDDEN]` |
| 3 | `pg-cust-mobile-01` | `customers` | `mobile_phone` | `PHONE_VN` | sensitive | `MASK` | string | `032*** [RAW PHONE HIDDEN]` |
| 4 | `pg-cust-dob-01` | `customers` | `date_of_birth` | `DATE_OF_BIRTH` | sensitive | `MASK` | date | `****-**-** [RAW DOB HIDDEN]` |
| 5 | `pg-cust-taxcode-01` | `customers` | `tax_code` | `TAX_CODE_PERSONAL` | sensitive | `MASK` | string | `451*** [RAW TAX HIDDEN]` |
| 6 | `pg-cust-notes-01` | `customers` | `personal_notes` | `FREE_TEXT_PII` | sensitive | `MASK` | text | `[FREE TEXT PII HIDDEN]` |
| 7 | `pg-cust-name-01` | `customers` | `contact_name` | `FULL_NAME` | basic | `MASK` | string | `Maria *** [RAW NAME HIDDEN]` |
| 8 | `pg-cust-address-01` | `customers` | `address` | `STREET_ADDRESS` | basic | `MASK` | string | `[STREET ADDRESS HIDDEN]` |
| 9 | `pg-cust-city-01` | `customers` | `city` | `CITY` | basic | `KEEP` | string | `Berlin` |
| 10 | `pg-cust-country-01` | `customers` | `country` | `COUNTRY` | non_personal | `KEEP` | string | `Germany` |
| 11 | `pg-cust-id-01` | `customers` | `customer_id` | `SYSTEM_ID` | non_personal | `KEEP` | string | `ALFKI` |
| 12 | `pg-cust-company-01` | `customers` | `company_name` | `ORGANIZATION_NAME` | non_personal | `KEEP` | string | `Alfreds Futterkiste` |
| 13 | `pg-cust-title-01` | `customers` | `contact_title` | `JOB_TITLE` | non_personal | `KEEP` | string | `Sales Representative` |
| 14 | `pg-ord-custcccd-01` | `orders` | `customer_cccd` | `CCCD` | sensitive | `HMAC` | string | `12 digits [RAW CCCD HIDDEN]` |
| 15 | `pg-ord-shipphone-01` | `orders` | `ship_phone` | `PHONE_VN` | basic | `MASK` | string | `098*** [RAW PHONE HIDDEN]` |
| 16 | `pg-ord-tracking-01` | `orders` | `tracking_code` | `TRACKING_NUMBER` | non_personal | `KEEP` | string | `400691172582` |
| 17 | `pg-ord-notes-01` | `orders` | `order_notes` | `FREE_TEXT_PII` | sensitive | `MASK` | text | `[FREE TEXT PII HIDDEN]` |
| 18 | `pg-ord-shipaddr-01` | `orders` | `ship_address` | `STREET_ADDRESS` | basic | `MASK` | string | `[STREET ADDRESS HIDDEN]` |
| 19 | `pg-ord-id-01` | `orders` | `order_id` | `TRANSACTION_ID` | non_personal | `KEEP` | integer | `10248` |
| 20 | `pg-ord-freight-01` | `orders` | `freight` | `FINANCIAL_AMOUNT` | non_personal | `KEEP` | float | `32.38` |
| 21 | `pg-ord-date-01` | `orders` | `order_date` | `TRANSACTION_DATE` | non_personal | `KEEP` | date | `1996-07-04` |
| 22 | `pg-emp-cccd-01` | `employees` | `cccd` | `CCCD` | sensitive | `HMAC` | string | `12 digits [RAW CCCD HIDDEN]` |
| 23 | `pg-emp-email-01` | `employees` | `personal_email` | `EMAIL` | sensitive | `MASK` | string | `n***@gmail.com [RAW HIDDEN]` |
| 24 | `pg-emp-mobile-01` | `employees` | `mobile_phone` | `PHONE_VN` | sensitive | `MASK` | string | `091*** [RAW PHONE HIDDEN]` |
| 25 | `pg-emp-taxcode-01` | `employees` | `tax_code` | `TAX_CODE_PERSONAL` | sensitive | `MASK` | string | `802*** [RAW TAX HIDDEN]` |
| 26 | `pg-emp-name-01` | `employees` | `first_name` | `FIRST_NAME` | basic | `MASK` | string | `Nancy *** [RAW NAME HIDDEN]` |
| 27 | `pg-emp-birth-01` | `employees` | `birth_date` | `DATE_OF_BIRTH` | sensitive | `MASK` | date | `****-**-** [RAW DOB HIDDEN]` |
| 28 | `pg-sup-cccd-01` | `suppliers` | `contact_cccd` | `CCCD` | sensitive | `HMAC` | string | `12 digits [RAW CCCD HIDDEN]` |
| 29 | `pg-sup-email-01` | `suppliers` | `contact_email` | `EMAIL` | basic | `MASK` | string | `s***@exoticliquids.co.uk [RAW HIDDEN]` |
| 30 | `pg-sup-taxcode-01` | `suppliers` | `tax_code` | `TAX_CODE_ORG` | non_personal | `KEEP` | string | `7654009810` |
| 31 | `pg-tick-body-01` | `support_tickets` | `body` | `FREE_TEXT_PII` | sensitive | `MASK` | text | `[FREE TEXT PII HIDDEN]` |
| 32 | `pg-kyc-ocr-01` | `kyc_documents` | `ocr_text` | `OCR_IDENTITY_DOC` | sensitive | `DROP` | text | `[OCR TEXT DROP/HIDDEN]` |
| 33 | `pg-kyc-filepath-01` | `kyc_documents` | `file_path` | `INTERNAL_FILE_PATH` | sensitive | `DROP` | string | `[INTERNAL FILE PATH DROP/HIDDEN]` |

---

## 5. 🛡️ Danh Sách 17 Cases Holdout (Tập Kiểm Định Độc Lập / Edge Cases)

| STT | Label ID | Bảng (seed.sql) | Cột / Thuộc tính | Taxonomy ID | Phân loại | Action | Kiểu dữ liệu | Mô tả Edge Case |
|:---:|---|---|---|---|---|:---:|---|---|
| 1 | `pg-cust-phone-01` | `customers` | `phone` | `PHONE_VN` | basic | `MASK` | string | Số điện thoại cố định/liên hệ cơ bản của khách ... |
| 2 | `pg-cust-fax-01` | `customers` | `fax` | `PHONE_FAX` | basic | `MASK` | string | Số fax liên hệ có thể dẫn tới địa chỉ/phòng ban... |
| 3 | `pg-ord-shipname-01` | `orders` | `ship_name` | `RECIPIENT_NAME` | basic | `MASK` | string | Tên người hoặc đơn vị nhận hàng giao thực tế. |
| 4 | `holdout-edge-tracking-01` | `orders` | `tracking_code` | `TRACKING_NUMBER` | non_personal | `KEEP` | string | EDGE CASE: Chuỗi số 12 ký tự đúng độ dài chuẩn ... |
| 5 | `holdout-edge-tracking-notes-01` | `orders` | `order_notes` | `FREE_TEXT_PII` | sensitive | `MASK` | text | EDGE CASE: Đoạn văn bản tự do chứa chuỗi 12 chữ... |
| 6 | `holdout-edge-org-taxcode-01` | `suppliers` | `tax_code` | `TAX_CODE_ORG` | non_personal | `KEEP` | string | EDGE CASE: Mã số thuế doanh nghiệp 10 số của cô... |
| 7 | `holdout-edge-personal-taxcode-01` | `customers` | `tax_code` | `TAX_CODE_PERSONAL` | sensitive | `MASK` | string | EDGE CASE: MST 10 số của khách hàng cá nhân. Ng... |
| 8 | `holdout-edge-freight-num-01` | `orders` | `freight` | `FINANCIAL_AMOUNT` | non_personal | `KEEP` | float | EDGE CASE: Con số thập phân chi phí độc lập. Kh... |
| 9 | `holdout-edge-custid-str-01` | `customers` | `customer_id` | `SYSTEM_ID` | non_personal | `KEEP` | string | EDGE CASE: Chuỗi ký tự hệ thống viết hoa 5 ký t... |
| 10 | `holdout-edge-orderid-seq-01` | `orders` | `order_id` | `TRANSACTION_ID` | non_personal | `KEEP` | integer | EDGE CASE: Khóa số nguyên tuần tự cuối cùng của... |
| 11 | `holdout-edge-org-email-01` | `customers` | `email` | `EMAIL` | sensitive | `MASK` | string | EDGE CASE: Email có prefix là mã công ty nhưng ... |
| 12 | `holdout-edge-anon-seq-01` | `customers` | `personal_notes` | `FREE_TEXT_PII` | sensitive | `MASK` | text | EDGE CASE: Chuỗi số 12 chữ số ngẫu nhiên 152506... |
| 13 | `holdout-pg-emp-notes-01` | `employees` | `notes` | `BIOGRAPHY` | basic | `MASK` | text | EDGE CASE: Tiểu sử nhân sự chứa thông tin đời t... |
| 14 | `holdout-pg-kyc-doctype-01` | `kyc_documents` | `doc_type` | `METADATA_DOC_TYPE` | non_personal | `KEEP` | string | EDGE CASE: Phân loại loại tài liệu kỹ thuật (mặ... |
| 15 | `holdout-pg-ticket-subj-01` | `support_tickets` | `subject` | `TICKET_SUBJECT` | non_personal | `KEEP` | string | EDGE CASE: Tiêu đề yêu cầu hỗ trợ chỉ đề cập mã... |
| 16 | `holdout-pg-ord-shipper-01` | `orders` | `ship_via` | `FOREIGN_KEY` | non_personal | `KEEP` | integer | EDGE CASE: Khóa ngoại trỏ đến đối tác vận tải (... |
| 17 | `holdout-pg-unknown-field-01` | `customers` | `postal_code` | `UNKNOWN_OR_MIXED` | unknown | `KEEP` | string | EDGE CASE: Mã bưu chính quốc tế có cấu trúc hỗn... |

---

## 6. 📜 Căn Cứ Pháp Lý & Tuân Thủ Quy Chuẩn An Toàn

- **100% nhãn có Taxonomy ID chuẩn hóa:** Viết hoa nhất quán (`CCCD`, `PHONE_VN`, `EMAIL`, `TAX_CODE_PERSONAL`, `TAX_CODE_ORG`, `FREE_TEXT_PII`, `OCR_IDENTITY_DOC`, `SYSTEM_ID`, `TRANSACTION_ID`, `TRACKING_NUMBER`, `FINANCIAL_AMOUNT`).
- **100% nhãn viện dẫn căn cứ pháp lý:** Luật 91/2025/QH15 và Nghị định 13/2023/NĐ-CP.
- **Tuân thủ triệt để No-raw-value UI Safe:** Toàn bộ bằng chứng không chứa số CCCD, SĐT hoặc Email thô của khách hàng.