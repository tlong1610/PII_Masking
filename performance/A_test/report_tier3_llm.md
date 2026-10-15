# 📊 Báo Cáo Đánh Giá Hiệu Năng — TIER 3 LLM — Đánh Giá Ngữ Cảnh Chuyên Sâu (GPT-4o-mini Reasoning)

> **Mã tầng (Tier ID):** `TIER_3_LLM`  
> **Thời điểm đánh giá:** `2026-10-15 11:06:21`  
> **Phạm vi kiểm thử (Scope):** `all`  
> **Số lượng ca giải quyết tại tầng này:** **131** cases  

*Tầng suy luận ngữ cảnh sâu bằng Large Language Model (GPT-4o-mini) với temperature=0. Đầu vào gồm Data Shape đã khử nhận dạng (Zero Raw-PII egress) và các ví dụ Few-shot từ DPO. Độ tự tin (Confidence Score) được tính từ phân phối xác suất Softmax / Logprobs của mô hình.*

---

## 1. 🎯 Bảng Chỉ Số Hiệu Năng (Evaluation Metrics)

| Chỉ Số (Metric) | Giá Trị Thực Tế | Đánh Giá | Chi Tiết Số Liệu |
|---|:---:|:---:|---|
| **Action Accuracy** | **74.81%** | 🔴 THẤP | 98/131 ca khớp hoàn toàn hành động bảo vệ |
| **Precision (PII)** | **94.59%** | 🟢 TỐT | TP=70, FP=4 (Tránh báo động giả) |
| **Recall (PII)** | **81.40%** | 🔴 THẤP | TP=70, FN=16 (Tránh bỏ sót dữ liệu cá nhân) |
| **F1 Score** | **87.50%** | ⚖️ Cân Bằng | Trung hòa giữa Precision và Recall |
| **F2 Score** | **83.73%** | 🛡️ An Toàn | Ưu tiên Recall gấp 2 lần (tiêu chuẩn bảo mật dữ liệu) |
| **Latency trung bình** | **2338.44 ms** (2.3384s) | ⚡ Tốc Độ | Thời gian xử lý trung bình mỗi trường |
| **Tổng Latency** | **306.3357 s** | — | Tổng thời gian thực thi của tầng này |
| **Confidence trung bình** | **0.9777** | — | Mức độ tự tin trung bình của các dự đoán |
| **Risk ($R_{\text{CW}}$)** | **0.1827** (18.27%) | 🔴 NGUY HIỂM | Rủi ro bỏ sót PII có trọng số theo độ tự tin |

### 📐 Công Thức & Diễn Giải Chi Tiết Chỉ Số Risk ($R_{\text{CW}}$)

$$
R_{\text{CW}} = \frac{\sum_{i=1}^N \mathbf{1}(y_i = 1, \hat{y}_i = 0) q_i}{N_{\text{PII}}}
$$

Trong đó:
- $N_{\text{PII}}$: Tổng số trường dữ liệu PII thực tế tại tầng này = **86**.
- $y_i = 1$: Mẫu $i$ thực sự chứa dữ liệu cá nhân (`expected_action != 'KEEP'`).
- $\hat{y}_i = 0$: Hệ thống dự đoán nhầm là Non-PII (`predicted_action == 'KEEP'`).
- $\mathbf{1}(\cdot)$: Bằng 1 nếu điều kiện đúng (ca bỏ sót / False Negative), ngược lại bằng 0.
- $q_i$: Độ tự tin (`confidence_score`) của quyết định Non-PII sai lầm đó.

> **Chi tiết phép tính tại TIER_3_LLM:**  
> - Tổng số ca PII bị bỏ sót (False Negative): **16** ca  
> - Tổng độ tự tin các ca bỏ sót $\sum q_i$: **15.7139**  
> - Mẫu số $N_{\text{PII}}$: **86**  
> - **Kết quả Risk $R_{\text{CW}}$ = 15.7139 / 86 = 0.1827 (18.27%)**

---

## 2. ❌ Danh Sách Các Ca Đoán Sai (Misclassifications)

> ⚠️ **Phát hiện 33 ca có hành động bảo vệ chưa khớp kỳ vọng:**

| STT | ID | Tên Trường (Field) | Bảng / Collection | Golden Type | Predicted Type | Expected Action | Predicted Action | Confidence ($q_i$) | Phân Loại Lỗi |
|:---:|---|---|---|---|---|:---:|:---:|:---:|---|
| 1 | `syn-tra-source_account-206` | `source_account` | `transactions` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9778** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 2 | `syn-ban-so_tai_khoan-191` | `so_tai_khoan` | `bank_accounts` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9904** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 3 | `syn-kyc-fingerprint_template-223` | `fingerprint_template` | `kyc_documents` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9822** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 4 | `syn-tra-destination_account-198` | `destination_account` | `transactions` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9866** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 5 | `syn-emp-previous_termination_reason-336` | `previous_termination_reason` | `employees` | `EMPTY_COLUMN` | `UNKNOWN` | **DROP** | MASK | **0.9846** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 6 | `syn-sup-tax_exception_note-339` | `tax_exception_note` | `suppliers` | `EMPTY_COLUMN` | `NOT_PERSONAL_DATA` | **DROP** | KEEP | **0.9840** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 7 | `syn-kyc-fingerprint_template-227` | `fingerprint_template` | `kyc_documents` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9806** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 8 | `syn-ban-account_number-199` | `account_number` | `bank_accounts` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9855** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 9 | `syn-cus-address-157` | `address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | KEEP | **0.9776** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 10 | `syn-tra-source_account-201` | `source_account` | `transactions` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9807** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 11 | `syn-emp-previous_termination_reason-337` | `previous_termination_reason` | `employees` | `EMPTY_COLUMN` | `UNKNOWN` | **DROP** | MASK | **0.9851** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 12 | `syn-emp-biometric_template-226` | `biometric_template` | `employees` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9824** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 13 | `syn-kyc-face_vector_512d-225` | `face_vector_512d` | `kyc_documents` | `BIOMETRIC_DATA` | `UNKNOWN` | **DROP** | MASK | **0.9746** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 14 | `syn-cus-secondary_fax-338` | `secondary_fax` | `customers` | `EMPTY_COLUMN` | `UNKNOWN` | **DROP** | MASK | **0.9882** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 15 | `syn-tra-source_account-202` | `source_account` | `transactions` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9798** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 16 | `syn-emp-previous_termination_reason-335` | `previous_termination_reason` | `employees` | `EMPTY_COLUMN` | `UNKNOWN` | **DROP** | MASK | **0.9846** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 17 | `syn-sup-supplier_name-326` | `supplier_name` | `suppliers` | `ORGANIZATION_NAME` | `FULL_NAME` | **KEEP** | MASK | **0.9629** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| 18 | `syn-cus-address-150` | `address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | KEEP | **0.9774** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 19 | `syn-emp-biometric_template-228` | `biometric_template` | `employees` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9837** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 20 | `syn-kyc-face_vector_512d-224` | `face_vector_512d` | `kyc_documents` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9743** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 21 | `syn-cus-street_address-136` | `street_address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | KEEP | **0.9737** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 22 | `syn-sup-supplier_name-320` | `supplier_name` | `suppliers` | `ORGANIZATION_NAME` | `FULL_NAME` | **KEEP** | MASK | **0.9639** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| 23 | `syn-sup-supplier_name-332` | `supplier_name` | `suppliers` | `ORGANIZATION_NAME` | `FULL_NAME` | **KEEP** | MASK | **0.9657** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| 24 | `syn-kyc-face_vector_512d-222` | `face_vector_512d` | `kyc_documents` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9753** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 25 | `syn-cus-street_address-134` | `street_address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | KEEP | **0.9770** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 26 | `syn-emp-previous_termination_reason-334` | `previous_termination_reason` | `employees` | `EMPTY_COLUMN` | `UNKNOWN` | **DROP** | MASK | **0.9843** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 27 | `syn-sup-supplier_name-319` | `supplier_name` | `suppliers` | `ORGANIZATION_NAME` | `FULL_NAME` | **KEEP** | MASK | **0.9667** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| 28 | `syn-ban-so_tai_khoan-197` | `so_tai_khoan` | `bank_accounts` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9893** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 29 | `syn-tra-destination_account-190` | `destination_account` | `transactions` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9851** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 30 | `syn-cus-street_address-135` | `street_address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | KEEP | **0.9811** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 31 | `syn-emp-residential_address-149` | `residential_address` | `employees` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | KEEP | **0.9786** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| 32 | `syn-kyc-fingerprint_template-221` | `fingerprint_template` | `kyc_documents` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9830** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 33 | `syn-ban-so_tai_khoan-196` | `so_tai_khoan` | `bank_accounts` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9893** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |

### 🔍 Phân Tích Nguyên Nhân & Hướng Xử Lý

#### Case #1: `source_account` (syn-tra-source_account-206)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (BANK_ACCOUNT) ➔ **Dự đoán:** `KEEP` (NOT_PERSONAL_DATA)
- **Confidence Score ($q_i$):** `0.9778`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #2: `so_tai_khoan` (syn-ban-so_tai_khoan-191)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (BANK_ACCOUNT) ➔ **Dự đoán:** `KEEP` (NOT_PERSONAL_DATA)
- **Confidence Score ($q_i$):** `0.9904`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #3: `fingerprint_template` (syn-kyc-fingerprint_template-223)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (BIOMETRIC_DATA) ➔ **Dự đoán:** `MASK` (BIOMETRIC)
- **Confidence Score ($q_i$):** `0.9822`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #4: `destination_account` (syn-tra-destination_account-198)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (BANK_ACCOUNT) ➔ **Dự đoán:** `KEEP` (NOT_PERSONAL_DATA)
- **Confidence Score ($q_i$):** `0.9866`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #5: `previous_termination_reason` (syn-emp-previous_termination_reason-336)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (EMPTY_COLUMN) ➔ **Dự đoán:** `MASK` (UNKNOWN)
- **Confidence Score ($q_i$):** `0.9846`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #6: `tax_exception_note` (syn-sup-tax_exception_note-339)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `DROP` (EMPTY_COLUMN) ➔ **Dự đoán:** `KEEP` (NOT_PERSONAL_DATA)
- **Confidence Score ($q_i$):** `0.9840`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #7: `fingerprint_template` (syn-kyc-fingerprint_template-227)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (BIOMETRIC_DATA) ➔ **Dự đoán:** `MASK` (BIOMETRIC)
- **Confidence Score ($q_i$):** `0.9806`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #8: `account_number` (syn-ban-account_number-199)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (BANK_ACCOUNT) ➔ **Dự đoán:** `KEEP` (NOT_PERSONAL_DATA)
- **Confidence Score ($q_i$):** `0.9855`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #9: `address` (syn-cus-address-157)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (STREET_ADDRESS) ➔ **Dự đoán:** `KEEP` (ADDRESS)
- **Confidence Score ($q_i$):** `0.9776`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #10: `source_account` (syn-tra-source_account-201)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (BANK_ACCOUNT) ➔ **Dự đoán:** `KEEP` (NOT_PERSONAL_DATA)
- **Confidence Score ($q_i$):** `0.9807`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #11: `previous_termination_reason` (syn-emp-previous_termination_reason-337)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (EMPTY_COLUMN) ➔ **Dự đoán:** `MASK` (UNKNOWN)
- **Confidence Score ($q_i$):** `0.9851`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #12: `biometric_template` (syn-emp-biometric_template-226)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (BIOMETRIC_DATA) ➔ **Dự đoán:** `MASK` (BIOMETRIC)
- **Confidence Score ($q_i$):** `0.9824`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #13: `face_vector_512d` (syn-kyc-face_vector_512d-225)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (BIOMETRIC_DATA) ➔ **Dự đoán:** `MASK` (UNKNOWN)
- **Confidence Score ($q_i$):** `0.9746`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #14: `secondary_fax` (syn-cus-secondary_fax-338)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (EMPTY_COLUMN) ➔ **Dự đoán:** `MASK` (UNKNOWN)
- **Confidence Score ($q_i$):** `0.9882`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #15: `source_account` (syn-tra-source_account-202)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (BANK_ACCOUNT) ➔ **Dự đoán:** `KEEP` (NOT_PERSONAL_DATA)
- **Confidence Score ($q_i$):** `0.9798`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #16: `previous_termination_reason` (syn-emp-previous_termination_reason-335)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (EMPTY_COLUMN) ➔ **Dự đoán:** `MASK` (UNKNOWN)
- **Confidence Score ($q_i$):** `0.9846`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #17: `supplier_name` (syn-sup-supplier_name-326)
- **Phân loại lỗi:** 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che)
- **Kỳ vọng:** `KEEP` (ORGANIZATION_NAME) ➔ **Dự đoán:** `MASK` (FULL_NAME)
- **Confidence Score ($q_i$):** `0.9629`
- **Đánh giá rủi ro:** 🛡️ An toàn về mặt pháp lý (không lộ dữ liệu), nhưng có thể làm giảm tiện ích phân tích do che dữ liệu an toàn. DPO có thể nới lỏng qua cơ chế HITL.

#### Case #18: `address` (syn-cus-address-150)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (STREET_ADDRESS) ➔ **Dự đoán:** `KEEP` (ADDRESS)
- **Confidence Score ($q_i$):** `0.9774`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #19: `biometric_template` (syn-emp-biometric_template-228)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (BIOMETRIC_DATA) ➔ **Dự đoán:** `MASK` (BIOMETRIC)
- **Confidence Score ($q_i$):** `0.9837`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #20: `face_vector_512d` (syn-kyc-face_vector_512d-224)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (BIOMETRIC_DATA) ➔ **Dự đoán:** `MASK` (BIOMETRIC)
- **Confidence Score ($q_i$):** `0.9743`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #21: `street_address` (syn-cus-street_address-136)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (STREET_ADDRESS) ➔ **Dự đoán:** `KEEP` (ADDRESS)
- **Confidence Score ($q_i$):** `0.9737`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #22: `supplier_name` (syn-sup-supplier_name-320)
- **Phân loại lỗi:** 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che)
- **Kỳ vọng:** `KEEP` (ORGANIZATION_NAME) ➔ **Dự đoán:** `MASK` (FULL_NAME)
- **Confidence Score ($q_i$):** `0.9639`
- **Đánh giá rủi ro:** 🛡️ An toàn về mặt pháp lý (không lộ dữ liệu), nhưng có thể làm giảm tiện ích phân tích do che dữ liệu an toàn. DPO có thể nới lỏng qua cơ chế HITL.

#### Case #23: `supplier_name` (syn-sup-supplier_name-332)
- **Phân loại lỗi:** 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che)
- **Kỳ vọng:** `KEEP` (ORGANIZATION_NAME) ➔ **Dự đoán:** `MASK` (FULL_NAME)
- **Confidence Score ($q_i$):** `0.9657`
- **Đánh giá rủi ro:** 🛡️ An toàn về mặt pháp lý (không lộ dữ liệu), nhưng có thể làm giảm tiện ích phân tích do che dữ liệu an toàn. DPO có thể nới lỏng qua cơ chế HITL.

#### Case #24: `face_vector_512d` (syn-kyc-face_vector_512d-222)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (BIOMETRIC_DATA) ➔ **Dự đoán:** `MASK` (BIOMETRIC)
- **Confidence Score ($q_i$):** `0.9753`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #25: `street_address` (syn-cus-street_address-134)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (STREET_ADDRESS) ➔ **Dự đoán:** `KEEP` (ADDRESS)
- **Confidence Score ($q_i$):** `0.9770`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #26: `previous_termination_reason` (syn-emp-previous_termination_reason-334)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (EMPTY_COLUMN) ➔ **Dự đoán:** `MASK` (UNKNOWN)
- **Confidence Score ($q_i$):** `0.9843`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #27: `supplier_name` (syn-sup-supplier_name-319)
- **Phân loại lỗi:** 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che)
- **Kỳ vọng:** `KEEP` (ORGANIZATION_NAME) ➔ **Dự đoán:** `MASK` (FULL_NAME)
- **Confidence Score ($q_i$):** `0.9667`
- **Đánh giá rủi ro:** 🛡️ An toàn về mặt pháp lý (không lộ dữ liệu), nhưng có thể làm giảm tiện ích phân tích do che dữ liệu an toàn. DPO có thể nới lỏng qua cơ chế HITL.

#### Case #28: `so_tai_khoan` (syn-ban-so_tai_khoan-197)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (BANK_ACCOUNT) ➔ **Dự đoán:** `KEEP` (NOT_PERSONAL_DATA)
- **Confidence Score ($q_i$):** `0.9893`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #29: `destination_account` (syn-tra-destination_account-190)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (BANK_ACCOUNT) ➔ **Dự đoán:** `KEEP` (NOT_PERSONAL_DATA)
- **Confidence Score ($q_i$):** `0.9851`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #30: `street_address` (syn-cus-street_address-135)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (STREET_ADDRESS) ➔ **Dự đoán:** `KEEP` (ADDRESS)
- **Confidence Score ($q_i$):** `0.9811`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #31: `residential_address` (syn-emp-residential_address-149)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (STREET_ADDRESS) ➔ **Dự đoán:** `KEEP` (ADDRESS)
- **Confidence Score ($q_i$):** `0.9786`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

#### Case #32: `fingerprint_template` (syn-kyc-fingerprint_template-221)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `DROP` (BIOMETRIC_DATA) ➔ **Dự đoán:** `MASK` (BIOMETRIC)
- **Confidence Score ($q_i$):** `0.9830`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #33: `so_tai_khoan` (syn-ban-so_tai_khoan-196)
- **Phân loại lỗi:** 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!)
- **Kỳ vọng:** `MASK` (BANK_ACCOUNT) ➔ **Dự đoán:** `KEEP` (NOT_PERSONAL_DATA)
- **Confidence Score ($q_i$):** `0.9893`
- **Đánh giá rủi ro:** ⚠️ Ca này đóng góp trực tiếp vào chỉ số Risk $R_{\text{CW}}$ do hệ thống tự tin bỏ qua trường dữ liệu có chứa PII. Cần bổ sung rule/corpus để ngăn chặn lọt lưới.

---

## 3. 📈 Danh Sách Predictions Đưa Ra (Sắp Xếp Tăng Dần Theo Confidence Score)

> Toàn bộ **131** dự đoán được đưa ra tại `TIER_3_LLM`, xếp theo thứ tự **tăng dần** về độ tự tin ($q_i$ từ thấp đến cao):

| STT | ID | Trường (Field) | Bảng | Golden Type | Predicted Type | Expected | Predicted | Confidence ($q_i$) | Kết Quả | Latency |
|:---:|---|---|---|---|---|:---:|:---:|:---:|:---:|---:|
| 1 | `syn-emp-dob-128` | `dob` | `employees` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9616** | ✅ Đúng | 2.1385s |
| 2 | `syn-sup-supplier_name-326` | `supplier_name` | `suppliers` | `ORGANIZATION_NAME` | `FULL_NAME` | **KEEP** | MASK | **0.9629** | ❌ Sai | 2.5496s |
| 3 | `syn-cus-dob-125` | `dob` | `customers` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9638** | ✅ Đúng | 2.3513s |
| 4 | `syn-sup-supplier_name-320` | `supplier_name` | `suppliers` | `ORGANIZATION_NAME` | `FULL_NAME` | **KEEP** | MASK | **0.9639** | ❌ Sai | 2.5097s |
| 5 | `syn-sup-body-235` | `body` | `support_tickets` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **0.9642** | ✅ Đúng | 2.2079s |
| 6 | `syn-sup-supplier_name-332` | `supplier_name` | `suppliers` | `ORGANIZATION_NAME` | `FULL_NAME` | **KEEP** | MASK | **0.9657** | ❌ Sai | 2.2158s |
| 7 | `syn-sup-body-238` | `body` | `support_tickets` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **0.9661** | ✅ Đúng | 2.6509s |
| 8 | `syn-cus-city-245` | `city` | `customers` | `CITY` | `CITY` | **KEEP** | KEEP | **0.9663** | ✅ Đúng | 2.1415s |
| 9 | `syn-sup-body-242` | `body` | `support_tickets` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **0.9666** | ✅ Đúng | 2.1690s |
| 10 | `syn-sup-supplier_name-319` | `supplier_name` | `suppliers` | `ORGANIZATION_NAME` | `FULL_NAME` | **KEEP** | MASK | **0.9667** | ❌ Sai | 2.2091s |
| 11 | `syn-ord-ship_name-043` | `ship_name` | `orders` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9672** | ✅ Đúng | 2.1780s |
| 12 | `syn-sup-comment-237` | `comment` | `support_tickets` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **0.9672** | ✅ Đúng | 2.1505s |
| 13 | `syn-sup-comment-239` | `comment` | `support_tickets` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **0.9677** | ✅ Đúng | 2.2137s |
| 14 | `syn-ord-recipient_name-049` | `recipient_name` | `orders` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9685** | ✅ Đúng | 2.0129s |
| 15 | `syn-sup-city-247` | `city` | `suppliers` | `CITY` | `CITY` | **KEEP** | KEEP | **0.9686** | ✅ Đúng | 2.5602s |
| 16 | `syn-ord-recipient_name-053` | `recipient_name` | `orders` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9687** | ✅ Đúng | 2.1244s |
| 17 | `syn-ord-ship_name-035` | `ship_name` | `orders` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9689** | ✅ Đúng | 2.3735s |
| 18 | `syn-par-representative_name-061` | `representative_name` | `partners` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9689** | ✅ Đúng | 2.1249s |
| 19 | `syn-sup-comment-230` | `comment` | `support_tickets` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **0.9692** | ✅ Đúng | 2.0070s |
| 20 | `syn-ord-ship_name-031` | `ship_name` | `orders` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9695** | ✅ Đúng | 2.3170s |
| 21 | `syn-sup-comment-234` | `comment` | `support_tickets` | `FREE_TEXT_PII` | `FREE_TEXT_PII` | **MASK** | MASK | **0.9697** | ✅ Đúng | 2.9816s |
| 22 | `syn-ord-ship_name-047` | `ship_name` | `orders` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9697** | ✅ Đúng | 2.7172s |
| 23 | `syn-sup-city-254` | `city` | `suppliers` | `CITY` | `CITY` | **KEEP** | KEEP | **0.9700** | ✅ Đúng | 3.0886s |
| 24 | `syn-cus-customer_name-039` | `customer_name` | `customers` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9701** | ✅ Đúng | 2.2781s |
| 25 | `syn-cus-dob-126` | `dob` | `customers` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9704** | ✅ Đúng | 2.2810s |
| 26 | `syn-ban-card_number-205` | `card_number` | `bank_accounts` | `BANK_ACCOUNT` | `CREDIT_CARD` | **MASK** | MASK | **0.9708** | ✅ Đúng | 2.1442s |
| 27 | `syn-par-representative_name-050` | `representative_name` | `partners` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9709** | ✅ Đúng | 2.4528s |
| 28 | `syn-par-representative_name-054` | `representative_name` | `partners` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9709** | ✅ Đúng | 2.1535s |
| 29 | `syn-par-representative_name-062` | `representative_name` | `partners` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9709** | ✅ Đúng | 2.1983s |
| 30 | `syn-ord-ship_city-248` | `ship_city` | `orders` | `CITY` | `CITY` | **KEEP** | KEEP | **0.9710** | ✅ Đúng | 2.3496s |
| 31 | `syn-emp-staff_name-058` | `staff_name` | `employees` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9715** | ✅ Đúng | 2.1679s |
| 32 | `syn-sup-city-258` | `city` | `suppliers` | `CITY` | `CITY` | **KEEP** | KEEP | **0.9715** | ✅ Đúng | 2.2588s |
| 33 | `syn-cus-customer_name-048` | `customer_name` | `customers` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9716** | ✅ Đúng | 2.1955s |
| 34 | `syn-sup-city-260` | `city` | `suppliers` | `CITY` | `CITY` | **KEEP** | KEEP | **0.9717** | ✅ Đúng | 2.3427s |
| 35 | `syn-sup-city-249` | `city` | `suppliers` | `CITY` | `CITY` | **KEEP** | KEEP | **0.9719** | ✅ Đúng | 2.5090s |
| 36 | `syn-sup-city-256` | `city` | `suppliers` | `CITY` | `CITY` | **KEEP** | KEEP | **0.9719** | ✅ Đúng | 2.3670s |
| 37 | `syn-cus-customer_name-038` | `customer_name` | `customers` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9719** | ✅ Đúng | 2.1854s |
| 38 | `syn-cus-customer_name-030` | `customer_name` | `customers` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9721** | ✅ Đúng | 2.1898s |
| 39 | `syn-cus-home_address-143` | `home_address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9721** | ✅ Đúng | 2.1596s |
| 40 | `syn-cus-ho_va_ten-057` | `ho_va_ten` | `customers` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9724** | ✅ Đúng | 2.3524s |
| 41 | `syn-ord-ship_city-253` | `ship_city` | `orders` | `CITY` | `CITY` | **KEEP** | KEEP | **0.9725** | ✅ Đúng | 2.4903s |
| 42 | `syn-emp-first_name-032` | `first_name` | `employees` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9734** | ✅ Đúng | 2.1886s |
| 43 | `syn-cus-street_address-136` | `street_address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | KEEP | **0.9737** | ❌ Sai | 2.3826s |
| 44 | `syn-ban-account_holder_name-037` | `account_holder_name` | `bank_accounts` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9738** | ✅ Đúng | 2.6980s |
| 45 | `syn-kyc-face_vector_512d-224` | `face_vector_512d` | `kyc_documents` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9743** | ❌ Sai | 2.1586s |
| 46 | `syn-ban-holder_dob-122` | `holder_dob` | `bank_accounts` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9745** | ✅ Đúng | 2.1866s |
| 47 | `syn-kyc-face_vector_512d-225` | `face_vector_512d` | `kyc_documents` | `BIOMETRIC_DATA` | `UNKNOWN` | **DROP** | MASK | **0.9746** | ❌ Sai | 2.1897s |
| 48 | `syn-emp-staff_name-060` | `staff_name` | `employees` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9746** | ✅ Đúng | 2.2486s |
| 49 | `syn-cus-dob-118` | `dob` | `customers` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9750** | ✅ Đúng | 2.2488s |
| 50 | `syn-cus-home_address-146` | `home_address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9752** | ✅ Đúng | 2.7781s |
| 51 | `syn-ban-account_holder_name-033` | `account_holder_name` | `bank_accounts` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9753** | ✅ Đúng | 2.0994s |
| 52 | `syn-ban-card_number-189` | `card_number` | `bank_accounts` | `BANK_ACCOUNT` | `CREDIT_CARD` | **MASK** | MASK | **0.9753** | ✅ Đúng | 2.0301s |
| 53 | `syn-kyc-face_vector_512d-222` | `face_vector_512d` | `kyc_documents` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9753** | ❌ Sai | 2.9856s |
| 54 | `syn-ord-payment_card_number-200` | `payment_card_number` | `orders` | `BANK_ACCOUNT` | `CREDIT_CARD` | **MASK** | MASK | **0.9755** | ✅ Đúng | 2.7569s |
| 55 | `syn-cus-ngay_sinh-121` | `ngay_sinh` | `customers` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9757** | ✅ Đúng | 2.7101s |
| 56 | `syn-emp-staff_name-052` | `staff_name` | `employees` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9761** | ✅ Đúng | 2.1357s |
| 57 | `syn-cus-home_address-155` | `home_address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9762** | ✅ Đúng | 2.1645s |
| 58 | `syn-cus-dob-130` | `dob` | `customers` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9762** | ✅ Đúng | 1.9588s |
| 59 | `syn-ban-holder_dob-127` | `holder_dob` | `bank_accounts` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9764** | ✅ Đúng | 2.2676s |
| 60 | `syn-emp-staff_name-059` | `staff_name` | `employees` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9765** | ✅ Đúng | 2.0949s |
| 61 | `syn-ord-payment_card_number-193` | `payment_card_number` | `orders` | `BANK_ACCOUNT` | `CREDIT_CARD` | **MASK** | MASK | **0.9767** | ✅ Đúng | 2.4196s |
| 62 | `syn-emp-dob-120` | `dob` | `employees` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9767** | ✅ Đúng | 2.0333s |
| 63 | `syn-emp-full_name-045` | `full_name` | `employees` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9768** | ✅ Đúng | 2.5057s |
| 64 | `syn-emp-staff_name-063` | `staff_name` | `employees` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9769** | ✅ Đúng | 3.4782s |
| 65 | `syn-cus-dob-124` | `dob` | `customers` | `DATE_OF_BIRTH` | `DOB` | **MASK** | MASK | **0.9769** | ✅ Đúng | 2.6329s |
| 66 | `syn-cus-street_address-134` | `street_address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | KEEP | **0.9770** | ❌ Sai | 3.4938s |
| 67 | `syn-emp-full_name-044` | `full_name` | `employees` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9770** | ✅ Đúng | 2.1502s |
| 68 | `syn-cus-address-150` | `address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | KEEP | **0.9774** | ❌ Sai | 2.1562s |
| 69 | `syn-ban-account_holder_name-029` | `account_holder_name` | `bank_accounts` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9775** | ✅ Đúng | 2.2517s |
| 70 | `syn-cus-address-157` | `address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | KEEP | **0.9776** | ❌ Sai | 2.3791s |
| 71 | `syn-ban-card_number-204` | `card_number` | `bank_accounts` | `BANK_ACCOUNT` | `CREDIT_CARD` | **MASK** | MASK | **0.9776** | ✅ Đúng | 2.2562s |
| 72 | `syn-cus-street_address-147` | `street_address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | MASK | **0.9777** | ✅ Đúng | 2.7084s |
| 73 | `syn-tra-source_account-206` | `source_account` | `transactions` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9778** | ❌ Sai | 2.4017s |
| 74 | `syn-emp-full_name-040` | `full_name` | `employees` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9778** | ✅ Đúng | 2.2540s |
| 75 | `syn-cus-full_name-046` | `full_name` | `customers` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9779** | ✅ Đúng | 2.3010s |
| 76 | `syn-emp-residential_address-149` | `residential_address` | `employees` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | KEEP | **0.9786** | ❌ Sai | 2.2932s |
| 77 | `syn-emp-full_name-034` | `full_name` | `employees` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9789** | ✅ Đúng | 2.7759s |
| 78 | `syn-emp-full_name-041` | `full_name` | `employees` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9792** | ✅ Đúng | 2.1815s |
| 79 | `syn-pro-product_name-329` | `product_name` | `products` | `ORGANIZATION_NAME` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9797** | ✅ Đúng | 2.1187s |
| 80 | `syn-tra-source_account-202` | `source_account` | `transactions` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9798** | ❌ Sai | 2.5042s |
| 81 | `syn-emp-full_name-042` | `full_name` | `employees` | `FULL_NAME` | `FULL_NAME` | **MASK** | MASK | **0.9798** | ✅ Đúng | 2.2001s |
| 82 | `syn-pro-category_name-325` | `category_name` | `products` | `ORGANIZATION_NAME` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9800** | ✅ Đúng | 2.2600s |
| 83 | `syn-pro-category_name-323` | `category_name` | `products` | `ORGANIZATION_NAME` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9801** | ✅ Đúng | 2.3838s |
| 84 | `syn-kyc-fingerprint_template-227` | `fingerprint_template` | `kyc_documents` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9806** | ❌ Sai | 2.1740s |
| 85 | `syn-tra-source_account-201` | `source_account` | `transactions` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9807** | ❌ Sai | 2.4536s |
| 86 | `syn-cus-street_address-135` | `street_address` | `customers` | `STREET_ADDRESS` | `ADDRESS` | **MASK** | KEEP | **0.9811** | ❌ Sai | 2.1698s |
| 87 | `syn-pro-product_name-324` | `product_name` | `products` | `ORGANIZATION_NAME` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9815** | ✅ Đúng | 2.5398s |
| 88 | `syn-pro-product_name-322` | `product_name` | `products` | `ORGANIZATION_NAME` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9818** | ✅ Đúng | 2.7453s |
| 89 | `syn-kyc-fingerprint_template-223` | `fingerprint_template` | `kyc_documents` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9822** | ❌ Sai | 2.4750s |
| 90 | `syn-emp-biometric_template-226` | `biometric_template` | `employees` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9824** | ❌ Sai | 2.1744s |
| 91 | `syn-kyc-fingerprint_template-221` | `fingerprint_template` | `kyc_documents` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9830** | ❌ Sai | 2.2189s |
| 92 | `syn-emp-biometric_template-228` | `biometric_template` | `employees` | `BIOMETRIC_DATA` | `BIOMETRIC` | **DROP** | MASK | **0.9837** | ❌ Sai | 2.6043s |
| 93 | `syn-pro-product_name-327` | `product_name` | `products` | `ORGANIZATION_NAME` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9839** | ✅ Đúng | 2.3761s |
| 94 | `syn-sup-tax_exception_note-339` | `tax_exception_note` | `suppliers` | `EMPTY_COLUMN` | `NOT_PERSONAL_DATA` | **DROP** | KEEP | **0.9840** | ❌ Sai | 2.0531s |
| 95 | `syn-sup-resolved_at-281` | `resolved_at` | `support_tickets` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9840** | ✅ Đúng | 2.0984s |
| 96 | `syn-sup-resolved_at-283` | `resolved_at` | `support_tickets` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9843** | ✅ Đúng | 2.0065s |
| 97 | `syn-emp-previous_termination_reason-334` | `previous_termination_reason` | `employees` | `EMPTY_COLUMN` | `UNKNOWN` | **DROP** | MASK | **0.9843** | ❌ Sai | 2.0508s |
| 98 | `syn-emp-previous_termination_reason-336` | `previous_termination_reason` | `employees` | `EMPTY_COLUMN` | `UNKNOWN` | **DROP** | MASK | **0.9846** | ❌ Sai | 2.3066s |
| 99 | `syn-emp-previous_termination_reason-335` | `previous_termination_reason` | `employees` | `EMPTY_COLUMN` | `UNKNOWN` | **DROP** | MASK | **0.9846** | ❌ Sai | 2.5948s |
| 100 | `syn-sup-resolved_at-291` | `resolved_at` | `support_tickets` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9849** | ✅ Đúng | 2.1506s |
| 101 | `syn-emp-previous_termination_reason-337` | `previous_termination_reason` | `employees` | `EMPTY_COLUMN` | `UNKNOWN` | **DROP** | MASK | **0.9851** | ❌ Sai | 2.2051s |
| 102 | `syn-aud-timestamp-295` | `timestamp` | `audit_logs` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9851** | ✅ Đúng | 2.2245s |
| 103 | `syn-tra-destination_account-190` | `destination_account` | `transactions` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9851** | ❌ Sai | 2.1904s |
| 104 | `syn-sup-resolved_at-282` | `resolved_at` | `support_tickets` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9852** | ✅ Đúng | 2.0710s |
| 105 | `syn-sup-created_at-287` | `created_at` | `support_tickets` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9854** | ✅ Đúng | 2.0970s |
| 106 | `syn-ban-account_number-199` | `account_number` | `bank_accounts` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9855** | ❌ Sai | 2.1464s |
| 107 | `syn-sup-resolved_at-294` | `resolved_at` | `support_tickets` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9855** | ✅ Đúng | 2.1498s |
| 108 | `syn-sup-resolved_at-297` | `resolved_at` | `support_tickets` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9860** | ✅ Đúng | 2.2341s |
| 109 | `syn-emp-hire_date-286` | `hire_date` | `employees` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9861** | ✅ Đúng | 2.3503s |
| 110 | `syn-emp-hire_date-288` | `hire_date` | `employees` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9863** | ✅ Đúng | 2.1971s |
| 111 | `syn-emp-hire_date-298` | `hire_date` | `employees` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9864** | ✅ Đúng | 2.0255s |
| 112 | `syn-ord-shipped_date-296` | `shipped_date` | `orders` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9865** | ✅ Đúng | 2.2525s |
| 113 | `syn-tra-destination_account-198` | `destination_account` | `transactions` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9866** | ❌ Sai | 2.4400s |
| 114 | `syn-ord-shipped_date-292` | `shipped_date` | `orders` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9868** | ✅ Đúng | 2.1849s |
| 115 | `syn-ord-shipped_date-289` | `shipped_date` | `orders` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9871** | ✅ Đúng | 2.4023s |
| 116 | `syn-ord-shipped_date-280` | `shipped_date` | `orders` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9872** | ✅ Đúng | 2.4992s |
| 117 | `syn-dep-department_id-317` | `department_id` | `departments` | `TRACKING_NUMBER` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9875** | ✅ Đúng | 2.2044s |
| 118 | `syn-dep-department_id-312` | `department_id` | `departments` | `TRACKING_NUMBER` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9878** | ✅ Đúng | 2.3525s |
| 119 | `syn-ord-discount-267` | `discount` | `order_items` | `FINANCIAL_AMOUNT` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9882** | ✅ Đúng | 2.3978s |
| 120 | `syn-cus-secondary_fax-338` | `secondary_fax` | `customers` | `EMPTY_COLUMN` | `UNKNOWN` | **DROP** | MASK | **0.9882** | ❌ Sai | 2.5332s |
| 121 | `syn-ord-item_id-301` | `item_id` | `order_items` | `TRACKING_NUMBER` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9884** | ✅ Đúng | 2.0606s |
| 122 | `syn-ord-discount-270` | `discount` | `order_items` | `FINANCIAL_AMOUNT` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9888** | ✅ Đúng | 2.7537s |
| 123 | `syn-dep-department_id-309` | `department_id` | `departments` | `TRACKING_NUMBER` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9888** | ✅ Đúng | 2.4895s |
| 124 | `syn-ord-item_id-315` | `item_id` | `order_items` | `TRACKING_NUMBER` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9890** | ✅ Đúng | 2.0787s |
| 125 | `syn-ban-so_tai_khoan-197` | `so_tai_khoan` | `bank_accounts` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9893** | ❌ Sai | 2.0386s |
| 126 | `syn-ban-so_tai_khoan-196` | `so_tai_khoan` | `bank_accounts` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9893** | ❌ Sai | 2.3681s |
| 127 | `syn-ord-discount-262` | `discount` | `order_items` | `FINANCIAL_AMOUNT` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9894** | ✅ Đúng | 2.5183s |
| 128 | `syn-pro-product_id-311` | `product_id` | `products` | `TRACKING_NUMBER` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9900** | ✅ Đúng | 2.8984s |
| 129 | `syn-ord-discount-277` | `discount` | `order_items` | `FINANCIAL_AMOUNT` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9901** | ✅ Đúng | 2.1805s |
| 130 | `syn-ord-discount-278` | `discount` | `order_items` | `FINANCIAL_AMOUNT` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **0.9903** | ✅ Đúng | 2.6061s |
| 131 | `syn-ban-so_tai_khoan-191` | `so_tai_khoan` | `bank_accounts` | `BANK_ACCOUNT` | `NOT_PERSONAL_DATA` | **MASK** | KEEP | **0.9904** | ❌ Sai | 2.5021s |
