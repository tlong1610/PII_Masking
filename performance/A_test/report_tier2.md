# 📊 Báo Cáo Đánh Giá Hiệu Năng — TIER 2 — Lọc Từ Vựng Cơ Bản (BM25 Lexical Engine)

> **Mã tầng (Tier ID):** `TIER_2`  
> **Thời điểm đánh giá:** `2026-10-15 11:06:21`  
> **Phạm vi kiểm thử (Scope):** `all`  
> **Số lượng ca giải quyết tại tầng này:** **48** cases  

*Tầng lọc từ vựng đối chiếu với tập RAG corpus từ khóa pháp lý (Luật 91/2025/QH15 & NĐ 356/2025/NĐ-CP). Sử dụng thuật toán BM25 Okapi loại bỏ stopwords kỹ thuật, chuẩn hóa điểm thô qua hàm Sigmoid về khoảng [0, 1]. Chốt quyết định đối với các mẫu vượt ngưỡng threshold=0.95.*

---

## 1. 🎯 Bảng Chỉ Số Hiệu Năng (Evaluation Metrics)

| Chỉ Số (Metric) | Giá Trị Thực Tế | Đánh Giá | Chi Tiết Số Liệu |
|---|:---:|:---:|---|
| **Action Accuracy** | **79.17%** | 🔴 THẤP | 38/48 ca khớp hoàn toàn hành động bảo vệ |
| **Precision (PII)** | **100.00%** | 🟢 TỐT | TP=47, FP=0 (Tránh báo động giả) |
| **Recall (PII)** | **100.00%** | 🟢 TỐT | TP=47, FN=0 (Tránh bỏ sót dữ liệu cá nhân) |
| **F1 Score** | **100.00%** | ⚖️ Cân Bằng | Trung hòa giữa Precision và Recall |
| **F2 Score** | **100.00%** | 🛡️ An Toàn | Ưu tiên Recall gấp 2 lần (tiêu chuẩn bảo mật dữ liệu) |
| **Latency trung bình** | **8.00 ms** (0.0080s) | ⚡ Tốc Độ | Thời gian xử lý trung bình mỗi trường |
| **Tổng Latency** | **0.3839 s** | — | Tổng thời gian thực thi của tầng này |
| **Confidence trung bình** | **0.9935** | — | Mức độ tự tin trung bình của các dự đoán |
| **Risk ($R_{\text{CW}}$)** | **0.0000** (0.00%) | 🟢 AN TOÀN | Rủi ro bỏ sót PII có trọng số theo độ tự tin |

### 📐 Công Thức & Diễn Giải Chi Tiết Chỉ Số Risk ($R_{\text{CW}}$)

$$
R_{\text{CW}} = \frac{\sum_{i=1}^N \mathbf{1}(y_i = 1, \hat{y}_i = 0) q_i}{N_{\text{PII}}}
$$

Trong đó:
- $N_{\text{PII}}$: Tổng số trường dữ liệu PII thực tế tại tầng này = **47**.
- $y_i = 1$: Mẫu $i$ thực sự chứa dữ liệu cá nhân (`expected_action != 'KEEP'`).
- $\hat{y}_i = 0$: Hệ thống dự đoán nhầm là Non-PII (`predicted_action == 'KEEP'`).
- $\mathbf{1}(\cdot)$: Bằng 1 nếu điều kiện đúng (ca bỏ sót / False Negative), ngược lại bằng 0.
- $q_i$: Độ tự tin (`confidence_score`) của quyết định Non-PII sai lầm đó.

> **Chi tiết phép tính tại TIER_2:**  
> - Tổng số ca PII bị bỏ sót (False Negative): **0** ca  
> - Tổng độ tự tin các ca bỏ sót $\sum q_i$: **0.0000**  
> - Mẫu số $N_{\text{PII}}$: **47**  
> - **Kết quả Risk $R_{\text{CW}}$ = 0.0000 / 47 = 0.0000 (0.00%)**

---

## 2. ❌ Danh Sách Các Ca Đoán Sai (Misclassifications)

> ⚠️ **Phát hiện 10 ca có hành động bảo vệ chưa khớp kỳ vọng:**

| STT | ID | Tên Trường (Field) | Bảng / Collection | Golden Type | Predicted Type | Expected Action | Predicted Action | Confidence ($q_i$) | Phân Loại Lỗi |
|:---:|---|---|---|---|---|:---:|:---:|:---:|---|
| 1 | `syn-kyc-id_card_back_path-207` | `id_card_back_path` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9860** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 2 | `syn-kyc-id_card_back_path-208` | `id_card_back_path` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9860** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 3 | `syn-kyc-id_card_back_path-220` | `id_card_back_path` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9860** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 4 | `syn-kyc-extracted_raw_ocr-214` | `extracted_raw_ocr` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9995** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 5 | `syn-kyc-extracted_raw_ocr-212` | `extracted_raw_ocr` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9995** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 6 | `syn-kyc-id_card_back_path-209` | `id_card_back_path` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9860** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 7 | `syn-kyc-extracted_raw_ocr-213` | `extracted_raw_ocr` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9995** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 8 | `syn-kyc-extracted_raw_ocr-219` | `extracted_raw_ocr` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9995** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 9 | `syn-kyc-extracted_raw_ocr-217` | `extracted_raw_ocr` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9995** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 10 | `syn-kyc-extracted_raw_ocr-215` | `extracted_raw_ocr` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9995** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |

### 🔍 Phân Tích Nguyên Nhân & Hướng Xử Lý

#### Case #1: `id_card_back_path` (syn-kyc-id_card_back_path-207)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (OCR_IDENTITY_DOC) ➔ **Dự đoán:** `MASK` (OCR_IDENTITY_DOC)
- **Confidence Score ($q_i$):** `0.9860`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #2: `id_card_back_path` (syn-kyc-id_card_back_path-208)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (OCR_IDENTITY_DOC) ➔ **Dự đoán:** `MASK` (OCR_IDENTITY_DOC)
- **Confidence Score ($q_i$):** `0.9860`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #3: `id_card_back_path` (syn-kyc-id_card_back_path-220)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (OCR_IDENTITY_DOC) ➔ **Dự đoán:** `MASK` (OCR_IDENTITY_DOC)
- **Confidence Score ($q_i$):** `0.9860`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #4: `extracted_raw_ocr` (syn-kyc-extracted_raw_ocr-214)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (OCR_IDENTITY_DOC) ➔ **Dự đoán:** `MASK` (OCR_IDENTITY_DOC)
- **Confidence Score ($q_i$):** `0.9995`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #5: `extracted_raw_ocr` (syn-kyc-extracted_raw_ocr-212)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (OCR_IDENTITY_DOC) ➔ **Dự đoán:** `MASK` (OCR_IDENTITY_DOC)
- **Confidence Score ($q_i$):** `0.9995`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #6: `id_card_back_path` (syn-kyc-id_card_back_path-209)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (OCR_IDENTITY_DOC) ➔ **Dự đoán:** `MASK` (OCR_IDENTITY_DOC)
- **Confidence Score ($q_i$):** `0.9860`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #7: `extracted_raw_ocr` (syn-kyc-extracted_raw_ocr-213)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (OCR_IDENTITY_DOC) ➔ **Dự đoán:** `MASK` (OCR_IDENTITY_DOC)
- **Confidence Score ($q_i$):** `0.9995`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #8: `extracted_raw_ocr` (syn-kyc-extracted_raw_ocr-219)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (OCR_IDENTITY_DOC) ➔ **Dự đoán:** `MASK` (OCR_IDENTITY_DOC)
- **Confidence Score ($q_i$):** `0.9995`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #9: `extracted_raw_ocr` (syn-kyc-extracted_raw_ocr-217)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (OCR_IDENTITY_DOC) ➔ **Dự đoán:** `MASK` (OCR_IDENTITY_DOC)
- **Confidence Score ($q_i$):** `0.9995`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #10: `extracted_raw_ocr` (syn-kyc-extracted_raw_ocr-215)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (OCR_IDENTITY_DOC) ➔ **Dự đoán:** `MASK` (OCR_IDENTITY_DOC)
- **Confidence Score ($q_i$):** `0.9995`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

---

## 3. 📈 Danh Sách Predictions Đưa Ra (Sắp Xếp Tăng Dần Theo Confidence Score)

> Toàn bộ **48** dự đoán được đưa ra tại `TIER_2`, xếp theo thứ tự **tăng dần** về độ tự tin ($q_i$ từ thấp đến cao):

| STT | ID | Trường (Field) | Bảng | Golden Type | Predicted Type | Expected | Predicted | Confidence ($q_i$) | Kết Quả | Latency |
|:---:|---|---|---|---|---|:---:|:---:|:---:|:---:|---:|
| 1 | `syn-ban-bank_account_no-195` | `bank_account_no` | `bank_accounts` | `BANK_ACCOUNT` | `BANK_ACCOUNT` | **MASK** | MASK | **0.9754** | ✅ Đúng | 0.0056s |
| 2 | `syn-ban-bank_account_no-194` | `bank_account_no` | `bank_accounts` | `BANK_ACCOUNT` | `BANK_ACCOUNT` | **MASK** | MASK | **0.9754** | ✅ Đúng | 0.0079s |
| 3 | `syn-ban-bank_account_no-203` | `bank_account_no` | `bank_accounts` | `BANK_ACCOUNT` | `BANK_ACCOUNT` | **MASK** | MASK | **0.9754** | ✅ Đúng | 0.0067s |
| 4 | `syn-par-partner_company-328` | `partner_company` | `partners` | `ORGANIZATION_NAME` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9783** | ✅ Đúng | 0.0066s |
| 5 | `syn-cus-date_of_birth-133` | `date_of_birth` | `customers` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9825** | ✅ Đúng | 0.0038s |
| 6 | `syn-cus-birth_date-129` | `birth_date` | `customers` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9825** | ✅ Đúng | 0.0059s |
| 7 | `syn-emp-birth_date-119` | `birth_date` | `employees` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9825** | ✅ Đúng | 0.0111s |
| 8 | `syn-emp-birth_date-116` | `birth_date` | `employees` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9825** | ✅ Đúng | 0.0113s |
| 9 | `syn-cus-birth_date-117` | `birth_date` | `customers` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9825** | ✅ Đúng | 0.0119s |
| 10 | `syn-emp-birth_date-123` | `birth_date` | `employees` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9825** | ✅ Đúng | 0.0118s |
| 11 | `syn-cus-birth_date-131` | `birth_date` | `customers` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9825** | ✅ Đúng | 0.0067s |
| 12 | `syn-cus-date_of_birth-132` | `date_of_birth` | `customers` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9825** | ✅ Đúng | 0.0077s |
| 13 | `syn-kyc-id_card_back_path-207` | `id_card_back_path` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9860** | ❌ Sai | 0.0052s |
| 14 | `syn-kyc-id_card_back_path-208` | `id_card_back_path` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9860** | ❌ Sai | 0.0062s |
| 15 | `syn-kyc-id_card_back_path-220` | `id_card_back_path` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9860** | ❌ Sai | 0.0087s |
| 16 | `syn-kyc-id_card_back_path-209` | `id_card_back_path` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9860** | ❌ Sai | 0.0069s |
| 17 | `syn-ord-delivery_notes-236` | `delivery_notes` | `orders` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **0.9945** | ✅ Đúng | 0.0065s |
| 18 | `syn-ord-delivery_notes-232` | `delivery_notes` | `orders` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **0.9945** | ✅ Đúng | 0.0070s |
| 19 | `syn-ord-ship_address-140` | `ship_address` | `orders` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9979** | ✅ Đúng | 0.0073s |
| 20 | `syn-ord-ship_address-148` | `ship_address` | `orders` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9979** | ✅ Đúng | 0.0143s |
| 21 | `syn-ord-ship_address-137` | `ship_address` | `orders` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9979** | ✅ Đúng | 0.0055s |
| 22 | `syn-kyc-extracted_raw_ocr-214` | `extracted_raw_ocr` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9995** | ❌ Sai | 0.0054s |
| 23 | `syn-kyc-extracted_raw_ocr-212` | `extracted_raw_ocr` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9995** | ❌ Sai | 0.0041s |
| 24 | `syn-kyc-extracted_raw_ocr-213` | `extracted_raw_ocr` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9995** | ❌ Sai | 0.0103s |
| 25 | `syn-kyc-extracted_raw_ocr-219` | `extracted_raw_ocr` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9995** | ❌ Sai | 0.0070s |
| 26 | `syn-kyc-extracted_raw_ocr-217` | `extracted_raw_ocr` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9995** | ❌ Sai | 0.0048s |
| 27 | `syn-kyc-extracted_raw_ocr-215` | `extracted_raw_ocr` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | MASK | **0.9995** | ❌ Sai | 0.0108s |
| 28 | `syn-cus-dia_chi-156` | `dia_chi` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9998** | ✅ Đúng | 0.0066s |
| 29 | `syn-cus-dia_chi-138` | `dia_chi` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9998** | ✅ Đúng | 0.0074s |
| 30 | `syn-cus-dia_chi-139` | `dia_chi` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9998** | ✅ Đúng | 0.0056s |
| 31 | `syn-cus-dia_chi-142` | `dia_chi` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9998** | ✅ Đúng | 0.0239s |
| 32 | `syn-ord-delivery_address-154` | `delivery_address` | `orders` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9998** | ✅ Đúng | 0.0051s |
| 33 | `syn-ord-delivery_address-151` | `delivery_address` | `orders` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9998** | ✅ Đúng | 0.0142s |
| 34 | `syn-cus-dia_chi-141` | `dia_chi` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9998** | ✅ Đúng | 0.0120s |
| 35 | `syn-cus-dia_chi-153` | `dia_chi` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9998** | ✅ Đúng | 0.0155s |
| 36 | `syn-ord-delivery_address-152` | `delivery_address` | `orders` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9998** | ✅ Đúng | 0.0090s |
| 37 | `syn-cus-dia_chi-144` | `dia_chi` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9998** | ✅ Đúng | 0.0075s |
| 38 | `syn-ord-delivery_address-145` | `delivery_address` | `orders` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9998** | ✅ Đúng | 0.0068s |
| 39 | `syn-cus-personal_notes-243` | `personal_notes` | `customers` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0059s |
| 40 | `syn-ord-nguoi_nhan-036` | `nguoi_nhan` | `orders` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0056s |
| 41 | `syn-ord-nguoi_nhan-051` | `nguoi_nhan` | `orders` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0056s |
| 42 | `syn-ord-order_notes-229` | `order_notes` | `orders` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0044s |
| 43 | `syn-ord-nguoi_nhan-056` | `nguoi_nhan` | `orders` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0055s |
| 44 | `syn-cus-personal_notes-233` | `personal_notes` | `customers` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0063s |
| 45 | `syn-ord-nguoi_nhan-055` | `nguoi_nhan` | `orders` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0080s |
| 46 | `syn-ord-order_notes-240` | `order_notes` | `orders` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0075s |
| 47 | `syn-cus-personal_notes-241` | `personal_notes` | `customers` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0039s |
| 48 | `syn-ord-order_notes-231` | `order_notes` | `orders` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0110s |
