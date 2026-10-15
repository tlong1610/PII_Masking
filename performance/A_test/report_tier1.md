# 📊 Báo Cáo Đánh Giá Hiệu Năng — TIER 1 — Bộ Lọc Tĩnh (Rule-Based & Regex Pattern Matching)

> **Mã tầng (Tier ID):** `TIER_1`  
> **Thời điểm đánh giá:** `2026-10-15 11:06:21`  
> **Phạm vi kiểm thử (Scope):** `all`  
> **Số lượng ca giải quyết tại tầng này:** **160** cases  

*Tầng kiểm tra tĩnh đầu tiên trong phễu lọc: kết hợp quy tắc đối chiếu từ khóa tên cột, kiểu dữ liệu và biểu thức chính quy (Regex) với các mẫu PII chuẩn quốc gia (CCCD 12 số, SĐT di động VN 10-11 số, Email, Ngày sinh, Mã số thuế). Độ trễ cực thấp (< 10ms).*

---

## 1. 🎯 Bảng Chỉ Số Hiệu Năng (Evaluation Metrics)

| Chỉ Số (Metric) | Giá Trị Thực Tế | Đánh Giá | Chi Tiết Số Liệu |
|---|:---:|:---:|---|
| **Action Accuracy** | **95.62%** | 🟢 TỐT | 153/160 ca khớp hoàn toàn hành động bảo vệ |
| **Precision (PII)** | **94.34%** | 🟢 TỐT | TP=100, FP=6 (Tránh báo động giả) |
| **Recall (PII)** | **100.00%** | 🟢 TỐT | TP=100, FN=0 (Tránh bỏ sót dữ liệu cá nhân) |
| **F1 Score** | **97.09%** | ⚖️ Cân Bằng | Trung hòa giữa Precision và Recall |
| **F2 Score** | **98.81%** | 🛡️ An Toàn | Ưu tiên Recall gấp 2 lần (tiêu chuẩn bảo mật dữ liệu) |
| **Latency trung bình** | **5.85 ms** (0.0058s) | ⚡ Tốc Độ | Thời gian xử lý trung bình mỗi trường |
| **Tổng Latency** | **0.9354 s** | — | Tổng thời gian thực thi của tầng này |
| **Confidence trung bình** | **1.0000** | — | Mức độ tự tin trung bình của các dự đoán |
| **Risk ($R_{\text{CW}}$)** | **0.0000** (0.00%) | 🟢 AN TOÀN | Rủi ro bỏ sót PII có trọng số theo độ tự tin |

### 📐 Công Thức & Diễn Giải Chi Tiết Chỉ Số Risk ($R_{\text{CW}}$)

$$
R_{\text{CW}} = \frac{\sum_{i=1}^N \mathbf{1}(y_i = 1, \hat{y}_i = 0) q_i}{N_{\text{PII}}}
$$

Trong đó:
- $N_{\text{PII}}$: Tổng số trường dữ liệu PII thực tế tại tầng này = **100**.
- $y_i = 1$: Mẫu $i$ thực sự chứa dữ liệu cá nhân (`expected_action != 'KEEP'`).
- $\hat{y}_i = 0$: Hệ thống dự đoán nhầm là Non-PII (`predicted_action == 'KEEP'`).
- $\mathbf{1}(\cdot)$: Bằng 1 nếu điều kiện đúng (ca bỏ sót / False Negative), ngược lại bằng 0.
- $q_i$: Độ tự tin (`confidence_score`) của quyết định Non-PII sai lầm đó.

> **Chi tiết phép tính tại TIER_1:**  
> - Tổng số ca PII bị bỏ sót (False Negative): **0** ca  
> - Tổng độ tự tin các ca bỏ sót $\sum q_i$: **0.0000**  
> - Mẫu số $N_{\text{PII}}$: **100**  
> - **Kết quả Risk $R_{\text{CW}}$ = 0.0000 / 100 = 0.0000 (0.00%)**

---

## 2. ❌ Danh Sách Các Ca Đoán Sai (Misclassifications)

> ⚠️ **Phát hiện 7 ca có hành động bảo vệ chưa khớp kỳ vọng:**

| STT | ID | Tên Trường (Field) | Bảng / Collection | Golden Type | Predicted Type | Expected Action | Predicted Action | Confidence ($q_i$) | Phân Loại Lỗi |
|:---:|---|---|---|---|---|:---:|:---:|:---:|---|
| 1 | `syn-par-business_tax_number-173` | `business_tax_number` | `partners` | `TAX_CODE_ORG` | `TAX_CODE` | **KEEP** | MASK | **1.0000** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| 2 | `syn-par-business_tax_number-176` | `business_tax_number` | `partners` | `TAX_CODE_ORG` | `TAX_CODE` | **KEEP** | MASK | **1.0000** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| 3 | `syn-sup-company_tax_id-177` | `company_tax_id` | `suppliers` | `TAX_CODE_ORG` | `PHONE` | **KEEP** | MASK | **1.0000** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| 4 | `syn-sup-company_tax_id-178` | `company_tax_id` | `suppliers` | `TAX_CODE_ORG` | `TAX_CODE` | **KEEP** | MASK | **1.0000** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| 5 | `syn-sup-company_tax_id-186` | `company_tax_id` | `suppliers` | `TAX_CODE_ORG` | `TAX_CODE` | **KEEP** | MASK | **1.0000** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| 6 | `syn-ord-payment_card_number-192` | `payment_card_number` | `orders` | `BANK_ACCOUNT` | `CCCD` | **MASK** | HMAC | **1.0000** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| 7 | `syn-sup-company_tax_id-181` | `company_tax_id` | `suppliers` | `TAX_CODE_ORG` | `TAX_CODE` | **KEEP** | MASK | **1.0000** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |

### 🔍 Phân Tích Nguyên Nhân & Hướng Xử Lý

#### Case #1: `business_tax_number` (syn-par-business_tax_number-173)
- **Phân loại lỗi:** 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che)
- **Kỳ vọng:** `KEEP` (TAX_CODE_ORG) ➔ **Dự đoán:** `MASK` (TAX_CODE)
- **Confidence Score ($q_i$):** `1.0000`
- **Đánh giá rủi ro:** 🛡️ An toàn về mặt pháp lý (không lộ dữ liệu), nhưng có thể làm giảm tiện ích phân tích do che dữ liệu an toàn. DPO có thể nới lỏng qua cơ chế HITL.

#### Case #2: `business_tax_number` (syn-par-business_tax_number-176)
- **Phân loại lỗi:** 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che)
- **Kỳ vọng:** `KEEP` (TAX_CODE_ORG) ➔ **Dự đoán:** `MASK` (TAX_CODE)
- **Confidence Score ($q_i$):** `1.0000`
- **Đánh giá rủi ro:** 🛡️ An toàn về mặt pháp lý (không lộ dữ liệu), nhưng có thể làm giảm tiện ích phân tích do che dữ liệu an toàn. DPO có thể nới lỏng qua cơ chế HITL.

#### Case #3: `company_tax_id` (syn-sup-company_tax_id-177)
- **Phân loại lỗi:** 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che)
- **Kỳ vọng:** `KEEP` (TAX_CODE_ORG) ➔ **Dự đoán:** `MASK` (PHONE)
- **Confidence Score ($q_i$):** `1.0000`
- **Đánh giá rủi ro:** 🛡️ An toàn về mặt pháp lý (không lộ dữ liệu), nhưng có thể làm giảm tiện ích phân tích do che dữ liệu an toàn. DPO có thể nới lỏng qua cơ chế HITL.

#### Case #4: `company_tax_id` (syn-sup-company_tax_id-178)
- **Phân loại lỗi:** 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che)
- **Kỳ vọng:** `KEEP` (TAX_CODE_ORG) ➔ **Dự đoán:** `MASK` (TAX_CODE)
- **Confidence Score ($q_i$):** `1.0000`
- **Đánh giá rủi ro:** 🛡️ An toàn về mặt pháp lý (không lộ dữ liệu), nhưng có thể làm giảm tiện ích phân tích do che dữ liệu an toàn. DPO có thể nới lỏng qua cơ chế HITL.

#### Case #5: `company_tax_id` (syn-sup-company_tax_id-186)
- **Phân loại lỗi:** 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che)
- **Kỳ vọng:** `KEEP` (TAX_CODE_ORG) ➔ **Dự đoán:** `MASK` (TAX_CODE)
- **Confidence Score ($q_i$):** `1.0000`
- **Đánh giá rủi ro:** 🛡️ An toàn về mặt pháp lý (không lộ dữ liệu), nhưng có thể làm giảm tiện ích phân tích do che dữ liệu an toàn. DPO có thể nới lỏng qua cơ chế HITL.

#### Case #6: `payment_card_number` (syn-ord-payment_card_number-192)
- **Phân loại lỗi:** 🔵 Action Mismatch (Lệch mức độ bảo vệ PII)
- **Kỳ vọng:** `MASK` (BANK_ACCOUNT) ➔ **Dự đoán:** `HMAC` (CCCD)
- **Confidence Score ($q_i$):** `1.0000`
- **Đánh giá rủi ro:** ℹ️ Lệch phương thức xử lý (ví dụ cần HMAC bảo toàn JOIN nhưng lại MASK).

#### Case #7: `company_tax_id` (syn-sup-company_tax_id-181)
- **Phân loại lỗi:** 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che)
- **Kỳ vọng:** `KEEP` (TAX_CODE_ORG) ➔ **Dự đoán:** `MASK` (TAX_CODE)
- **Confidence Score ($q_i$):** `1.0000`
- **Đánh giá rủi ro:** 🛡️ An toàn về mặt pháp lý (không lộ dữ liệu), nhưng có thể làm giảm tiện ích phân tích do che dữ liệu an toàn. DPO có thể nới lỏng qua cơ chế HITL.

---

## 3. 📈 Danh Sách Predictions Đưa Ra (Sắp Xếp Tăng Dần Theo Confidence Score)

> Toàn bộ **160** dự đoán được đưa ra tại `TIER_1`, xếp theo thứ tự **tăng dần** về độ tự tin ($q_i$ từ thấp đến cao):

| STT | ID | Trường (Field) | Bảng | Golden Type | Predicted Type | Expected | Predicted | Confidence ($q_i$) | Kết Quả | Latency |
|:---:|---|---|---|---|---|:---:|:---:|:---:|:---:|---:|
| 1 | `syn-cus-cccd-005` | `cccd` | `customers` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0222s |
| 2 | `syn-par-business_tax_number-173` | `business_tax_number` | `partners` | `TAX_CODE_ORG` | `TAX_CODE` | **KEEP** | MASK | **1.0000** | ❌ Sai | 0.0052s |
| 3 | `syn-cus-contact_email-094` | `contact_email` | `customers` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0042s |
| 4 | `syn-cus-cccd-009` | `cccd` | `customers` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0045s |
| 5 | `syn-emp-cccd-018` | `cccd` | `employees` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0053s |
| 6 | `syn-sup-company_name-331` | `company_name` | `suppliers` | `ORGANIZATION_NAME` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0059s |
| 7 | `syn-com-tax_code-183` | `tax_code` | `company` | `TAX_CODE_ORG` | `TAX_CODE_ORG` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0035s |
| 8 | `syn-ord-tracking_number-310` | `tracking_number` | `orders` | `TRACKING_NUMBER` | `TRACKING_CODE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0032s |
| 9 | `syn-ord-delivery_contact_phone-076` | `delivery_contact_phone` | `orders` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0052s |
| 10 | `syn-cus-mst_ca_nhan-162` | `mst_ca_nhan` | `customers` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0052s |
| 11 | `syn-ord-customer_cccd-016` | `customer_cccd` | `orders` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0028s |
| 12 | `syn-cus-province-252` | `province` | `customers` | `CITY` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0040s |
| 13 | `syn-ord-customer_cccd-004` | `customer_cccd` | `orders` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0029s |
| 14 | `syn-ord-tracking_code-307` | `tracking_code` | `orders` | `TRACKING_NUMBER` | `TRACKING_CODE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0031s |
| 15 | `syn-cus-identity_card_number-001` | `identity_card_number` | `customers` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0029s |
| 16 | `syn-par-tax_code-180` | `tax_code` | `partners` | `TAX_CODE_ORG` | `TAX_CODE_ORG` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0044s |
| 17 | `syn-ban-registered_phone-078` | `registered_phone` | `bank_accounts` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0044s |
| 18 | `syn-ord-tracking_number-313` | `tracking_number` | `orders` | `TRACKING_NUMBER` | `TRACKING_CODE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0061s |
| 19 | `syn-ord-order_date-284` | `order_date` | `orders` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0061s |
| 20 | `syn-emp-personal_tax_code-167` | `personal_tax_code` | `employees` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0054s |
| 21 | `syn-par-business_tax_number-176` | `business_tax_number` | `partners` | `TAX_CODE_ORG` | `TAX_CODE` | **KEEP** | MASK | **1.0000** | ❌ Sai | 0.0066s |
| 22 | `syn-emp-mobile_phone-086` | `mobile_phone` | `employees` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0038s |
| 23 | `syn-ord-delivery_contact_phone-072` | `delivery_contact_phone` | `orders` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0033s |
| 24 | `syn-emp-citizen_identity-026` | `citizen_identity` | `employees` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0037s |
| 25 | `syn-ord-order_id-306` | `order_id` | `orders` | `TRACKING_NUMBER` | `TRACKING_CODE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0036s |
| 26 | `syn-emp-personal_email-115` | `personal_email` | `employees` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0053s |
| 27 | `syn-sup-company_tax_id-177` | `company_tax_id` | `suppliers` | `TAX_CODE_ORG` | `PHONE` | **KEEP** | MASK | **1.0000** | ❌ Sai | 0.0044s |
| 28 | `syn-emp-tax_code-168` | `tax_code` | `employees` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0043s |
| 29 | `syn-cus-mobile_phone-065` | `mobile_phone` | `customers` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0059s |
| 30 | `syn-ord-unit_price-273` | `unit_price` | `order_items` | `FINANCIAL_AMOUNT` | `MONEY_ALONE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0034s |
| 31 | `syn-ban-registered_phone-089` | `registered_phone` | `bank_accounts` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0033s |
| 32 | `syn-ban-registered_phone-082` | `registered_phone` | `bank_accounts` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0042s |
| 33 | `syn-cus-contact_title-321` | `contact_title` | `customers` | `ORGANIZATION_NAME` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0031s |
| 34 | `syn-ord-delivery_contact_phone-091` | `delivery_contact_phone` | `orders` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0038s |
| 35 | `syn-emp-personal_tax_code-159` | `personal_tax_code` | `employees` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0037s |
| 36 | `syn-sup-country-257` | `country` | `suppliers` | `CITY` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0031s |
| 37 | `syn-ord-ship_phone-074` | `ship_phone` | `orders` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0034s |
| 38 | `syn-cus-personal_email-108` | `personal_email` | `customers` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0061s |
| 39 | `syn-ord-delivery_contact_phone-071` | `delivery_contact_phone` | `orders` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0045s |
| 40 | `syn-par-tax_code-188` | `tax_code` | `partners` | `TAX_CODE_ORG` | `TAX_CODE_ORG` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0061s |
| 41 | `syn-emp-personal_email-110` | `personal_email` | `employees` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0060s |
| 42 | `syn-par-tax_code-184` | `tax_code` | `partners` | `TAX_CODE_ORG` | `TAX_CODE_ORG` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0053s |
| 43 | `syn-emp-personal_tax_code-164` | `personal_tax_code` | `employees` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0052s |
| 44 | `syn-cus-identity_card_number-017` | `identity_card_number` | `customers` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0047s |
| 45 | `syn-sup-sender_email-099` | `sender_email` | `support_tickets` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0049s |
| 46 | `syn-kyc-file_path-216` | `file_path` | `kyc_documents` | `OCR_IDENTITY_DOC` | `INTERNAL_FILE_PATH` | **DROP** | DROP | **1.0000** | ✅ Đúng | 0.0047s |
| 47 | `syn-kyc-file_path-218` | `file_path` | `kyc_documents` | `OCR_IDENTITY_DOC` | `INTERNAL_FILE_PATH` | **DROP** | DROP | **1.0000** | ✅ Đúng | 0.0054s |
| 48 | `syn-ban-notification_email-102` | `notification_email` | `bank_accounts` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0050s |
| 49 | `syn-ord-unit_price-276` | `unit_price` | `order_items` | `FINANCIAL_AMOUNT` | `MONEY_ALONE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0045s |
| 50 | `syn-ord-tracking_number-303` | `tracking_number` | `orders` | `TRACKING_NUMBER` | `TRACKING_CODE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0037s |
| 51 | `syn-ord-ship_phone-088` | `ship_phone` | `orders` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0038s |
| 52 | `syn-ord-freight-269` | `freight` | `orders` | `FINANCIAL_AMOUNT` | `MONEY_ALONE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0051s |
| 53 | `syn-cus-province-251` | `province` | `customers` | `CITY` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0125s |
| 54 | `syn-emp-tax_code-172` | `tax_code` | `employees` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0035s |
| 55 | `syn-cus-province-255` | `province` | `customers` | `CITY` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0066s |
| 56 | `syn-sup-contact_phone-079` | `contact_phone` | `support_tickets` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0051s |
| 57 | `syn-sup-company_name-318` | `company_name` | `suppliers` | `ORGANIZATION_NAME` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0034s |
| 58 | `syn-sup-company_name-330` | `company_name` | `suppliers` | `ORGANIZATION_NAME` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0066s |
| 59 | `syn-cus-mst_ca_nhan-165` | `mst_ca_nhan` | `customers` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0056s |
| 60 | `syn-ord-order_date-290` | `order_date` | `orders` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0115s |
| 61 | `syn-emp-personal_email-095` | `personal_email` | `employees` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0052s |
| 62 | `syn-ord-waybill_code-300` | `waybill_code` | `orders` | `TRACKING_NUMBER` | `TRACKING_CODE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0055s |
| 63 | `syn-cus-so_dien_thoai-080` | `so_dien_thoai` | `customers` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0047s |
| 64 | `syn-ord-freight-279` | `freight` | `orders` | `FINANCIAL_AMOUNT` | `MONEY_ALONE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0035s |
| 65 | `syn-ord-ship_phone-077` | `ship_phone` | `orders` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0038s |
| 66 | `syn-ord-tracking_number-314` | `tracking_number` | `orders` | `TRACKING_NUMBER` | `TRACKING_CODE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0038s |
| 67 | `syn-sup-company_tax_id-178` | `company_tax_id` | `suppliers` | `TAX_CODE_ORG` | `TAX_CODE` | **KEEP** | MASK | **1.0000** | ❌ Sai | 0.0038s |
| 68 | `syn-emp-tax_code-158` | `tax_code` | `employees` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0043s |
| 69 | `syn-cus-email-104` | `email` | `customers` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0042s |
| 70 | `syn-emp-personal_email-100` | `personal_email` | `employees` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0041s |
| 71 | `syn-ord-freight-275` | `freight` | `orders` | `FINANCIAL_AMOUNT` | `MONEY_ALONE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0072s |
| 72 | `syn-pro-cost_price-266` | `cost_price` | `products` | `FINANCIAL_AMOUNT` | `MONEY_ALONE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0140s |
| 73 | `syn-cus-personal_email-103` | `personal_email` | `customers` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0159s |
| 74 | `syn-cus-identity_card_number-019` | `identity_card_number` | `customers` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0079s |
| 75 | `syn-sup-mst-179` | `mst` | `suppliers` | `TAX_CODE_ORG` | `TAX_CODE_ORG` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0062s |
| 76 | `syn-sup-tax_code-187` | `tax_code` | `suppliers` | `TAX_CODE_ORG` | `TAX_CODE_ORG` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0049s |
| 77 | `syn-kyc-scanned_cccd_id-013` | `scanned_cccd_id` | `kyc_documents` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0056s |
| 78 | `syn-cus-phone_number-084` | `phone_number` | `customers` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0105s |
| 79 | `syn-emp-personal_tax_code-160` | `personal_tax_code` | `employees` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0109s |
| 80 | `syn-emp-citizen_identity-012` | `citizen_identity` | `employees` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0109s |
| 81 | `syn-sup-country-246` | `country` | `suppliers` | `CITY` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0081s |
| 82 | `syn-cus-cccd-021` | `cccd` | `customers` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0076s |
| 83 | `syn-sup-requester_cccd-008` | `requester_cccd` | `support_tickets` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0041s |
| 84 | `syn-cus-so_dien_thoai-083` | `so_dien_thoai` | `customers` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0096s |
| 85 | `syn-kyc-scanned_cccd_id-028` | `scanned_cccd_id` | `kyc_documents` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0072s |
| 86 | `syn-sup-sender_email-096` | `sender_email` | `support_tickets` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0064s |
| 87 | `syn-cus-contact_email-101` | `contact_email` | `customers` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0127s |
| 88 | `syn-sup-company_tax_id-186` | `company_tax_id` | `suppliers` | `TAX_CODE_ORG` | `TAX_CODE` | **KEEP** | MASK | **1.0000** | ❌ Sai | 0.0104s |
| 89 | `syn-sup-mst-175` | `mst` | `suppliers` | `TAX_CODE_ORG` | `TAX_CODE_ORG` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0069s |
| 90 | `syn-kyc-ocr_text-211` | `ocr_text` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | DROP | **1.0000** | ✅ Đúng | 0.0082s |
| 91 | `syn-emp-citizen_identity-007` | `citizen_identity` | `employees` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0091s |
| 92 | `syn-pro-cost_price-265` | `cost_price` | `products` | `FINANCIAL_AMOUNT` | `MONEY_ALONE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0126s |
| 93 | `syn-cus-national_id-025` | `national_id` | `customers` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0101s |
| 94 | `syn-ord-tracking_number-316` | `tracking_number` | `orders` | `TRACKING_NUMBER` | `TRACKING_CODE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0069s |
| 95 | `syn-emp-personal_phone-064` | `personal_phone` | `employees` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0073s |
| 96 | `syn-emp-citizen_identity-020` | `citizen_identity` | `employees` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0065s |
| 97 | `syn-ban-notification_email-107` | `notification_email` | `bank_accounts` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0060s |
| 98 | `syn-ord-order_id-305` | `order_id` | `orders` | `TRACKING_NUMBER` | `TRACKING_CODE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0074s |
| 99 | `syn-kyc-scanned_cccd_id-002` | `scanned_cccd_id` | `kyc_documents` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0072s |
| 100 | `syn-emp-tax_code-170` | `tax_code` | `employees` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0071s |
| 101 | `syn-ord-ship_country-261` | `ship_country` | `orders` | `CITY` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0051s |
| 102 | `syn-ord-delivery_contact_phone-070` | `delivery_contact_phone` | `orders` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0044s |
| 103 | `syn-ord-payment_card_number-192` | `payment_card_number` | `orders` | `BANK_ACCOUNT` | `CCCD` | **MASK** | HMAC | **1.0000** | ❌ Sai | 0.0066s |
| 104 | `syn-ord-total_amount-271` | `total_amount` | `orders` | `FINANCIAL_AMOUNT` | `MONEY_ALONE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0051s |
| 105 | `syn-ord-order_date-293` | `order_date` | `orders` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0039s |
| 106 | `syn-cus-phone_number-090` | `phone_number` | `customers` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0037s |
| 107 | `syn-ord-tracking_code-302` | `tracking_code` | `orders` | `TRACKING_NUMBER` | `TRACKING_CODE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0046s |
| 108 | `syn-ord-total_amount-263` | `total_amount` | `orders` | `FINANCIAL_AMOUNT` | `MONEY_ALONE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0029s |
| 109 | `syn-ord-waybill_code-304` | `waybill_code` | `orders` | `TRACKING_NUMBER` | `TRACKING_CODE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0030s |
| 110 | `syn-ord-unit_price-264` | `unit_price` | `order_items` | `FINANCIAL_AMOUNT` | `MONEY_ALONE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0051s |
| 111 | `syn-cus-contact_email-114` | `contact_email` | `customers` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0053s |
| 112 | `syn-cus-identity_card_number-011` | `identity_card_number` | `customers` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0035s |
| 113 | `syn-cus-personal_email-112` | `personal_email` | `customers` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0048s |
| 114 | `syn-sup-company_tax_id-181` | `company_tax_id` | `suppliers` | `TAX_CODE_ORG` | `TAX_CODE` | **KEEP** | MASK | **1.0000** | ❌ Sai | 0.0050s |
| 115 | `syn-cus-contact_title-333` | `contact_title` | `customers` | `ORGANIZATION_NAME` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0067s |
| 116 | `syn-emp-cccd-010` | `cccd` | `employees` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0049s |
| 117 | `syn-ord-ship_country-250` | `ship_country` | `orders` | `CITY` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0056s |
| 118 | `syn-emp-citizen_identity-014` | `citizen_identity` | `employees` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0057s |
| 119 | `syn-emp-personal_email-113` | `personal_email` | `employees` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0037s |
| 120 | `syn-pro-unit_price-274` | `unit_price` | `products` | `FINANCIAL_AMOUNT` | `MONEY_ALONE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0071s |
| 121 | `syn-emp-tax_code-169` | `tax_code` | `employees` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0039s |
| 122 | `syn-cus-province-244` | `province` | `customers` | `CITY` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0053s |
| 123 | `syn-sup-contact_phone-081` | `contact_phone` | `support_tickets` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0057s |
| 124 | `syn-cus-mobile_phone-085` | `mobile_phone` | `customers` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0221s |
| 125 | `syn-pro-cost_price-268` | `cost_price` | `products` | `FINANCIAL_AMOUNT` | `MONEY_ALONE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0041s |
| 126 | `syn-com-tax_code-185` | `tax_code` | `company` | `TAX_CODE_ORG` | `TAX_CODE_ORG` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0055s |
| 127 | `syn-ban-registered_phone-066` | `registered_phone` | `bank_accounts` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0049s |
| 128 | `syn-sup-requester_cccd-023` | `requester_cccd` | `support_tickets` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0040s |
| 129 | `syn-cus-personal_tax_id-161` | `personal_tax_id` | `customers` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0045s |
| 130 | `syn-cus-mobile_phone-073` | `mobile_phone` | `customers` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0043s |
| 131 | `syn-pro-unit_price-272` | `unit_price` | `products` | `FINANCIAL_AMOUNT` | `MONEY_ALONE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0055s |
| 132 | `syn-emp-tax_code-163` | `tax_code` | `employees` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0046s |
| 133 | `syn-ord-order_date-285` | `order_date` | `orders` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0107s |
| 134 | `syn-sup-tax_code-174` | `tax_code` | `suppliers` | `TAX_CODE_ORG` | `TAX_CODE_ORG` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0133s |
| 135 | `syn-cus-phone_number-087` | `phone_number` | `customers` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0045s |
| 136 | `syn-cus-mobile_phone-092` | `mobile_phone` | `customers` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0055s |
| 137 | `syn-kyc-scanned_cccd_id-022` | `scanned_cccd_id` | `kyc_documents` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0066s |
| 138 | `syn-sup-contact_phone-068` | `contact_phone` | `support_tickets` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0075s |
| 139 | `syn-ord-ship_country-259` | `ship_country` | `orders` | `CITY` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0049s |
| 140 | `syn-cus-cccd-003` | `cccd` | `customers` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0061s |
| 141 | `syn-kyc-scanned_cccd_id-024` | `scanned_cccd_id` | `kyc_documents` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0030s |
| 142 | `syn-par-tax_code-182` | `tax_code` | `partners` | `TAX_CODE_ORG` | `TAX_CODE_ORG` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0033s |
| 143 | `syn-cus-tax_code-171` | `tax_code` | `customers` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0053s |
| 144 | `syn-ban-owner_cccd-027` | `owner_cccd` | `bank_accounts` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0045s |
| 145 | `syn-ban-notification_email-109` | `notification_email` | `bank_accounts` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0112s |
| 146 | `syn-emp-tax_code-166` | `tax_code` | `employees` | `TAX_CODE_PERSONAL` | `TAX_CODE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0052s |
| 147 | `syn-emp-mobile_phone-069` | `mobile_phone` | `employees` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0037s |
| 148 | `syn-sup-requester_cccd-006` | `requester_cccd` | `support_tickets` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0030s |
| 149 | `syn-ord-order_date-299` | `order_date` | `orders` | `TRANSACTION_DATE` | `NOT_PERSONAL_DATA` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0091s |
| 150 | `syn-kyc-scanned_cccd_id-015` | `scanned_cccd_id` | `kyc_documents` | `CCCD` | `CCCD` | **HMAC** | HMAC | **1.0000** | ✅ Đúng | 0.0050s |
| 151 | `syn-cus-mobile_phone-075` | `mobile_phone` | `customers` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0036s |
| 152 | `syn-kyc-ocr_text-210` | `ocr_text` | `kyc_documents` | `OCR_IDENTITY_DOC` | `OCR_IDENTITY_DOC` | **DROP** | DROP | **1.0000** | ✅ Đúng | 0.0052s |
| 153 | `syn-emp-personal_phone-093` | `personal_phone` | `employees` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0092s |
| 154 | `syn-emp-personal_email-097` | `personal_email` | `employees` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0049s |
| 155 | `syn-cus-personal_email-111` | `personal_email` | `customers` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0044s |
| 156 | `syn-ord-waybill_code-308` | `waybill_code` | `orders` | `TRACKING_NUMBER` | `TRACKING_CODE` | **KEEP** | KEEP | **1.0000** | ✅ Đúng | 0.0034s |
| 157 | `syn-cus-email-106` | `email` | `customers` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0048s |
| 158 | `syn-ord-ship_phone-067` | `ship_phone` | `orders` | `PHONE_VN` | `PHONE` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0043s |
| 159 | `syn-ban-notification_email-098` | `notification_email` | `bank_accounts` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0036s |
| 160 | `syn-emp-personal_email-105` | `personal_email` | `employees` | `EMAIL` | `EMAIL` | **MASK** | MASK | **1.0000** | ✅ Đúng | 0.0048s |
