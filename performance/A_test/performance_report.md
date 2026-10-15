# 📊 Báo Cáo Hiệu Năng Tổng Hợp — PIIGuard Multi-Tier Pipeline

> **Thời điểm chạy:** `2026-10-15 11:06:21`  
> **Phạm vi (Scope):** `all`  
> **Tổng số test cases:** **339**  
> **Tổng thời gian quét:** **319.11 s** (Latency TB: 907.54 ms/case)  

---

## 1. 🔬 Bảng Đối Chiếu Hiệu Năng 4 Tầng (Multi-Tier Matrix)

| Tầng (Tier) | Báo Cáo Chi Tiết | Cases | Accuracy | Precision | Recall | F1 | F2 | Risk ($R_{\text{CW}}$) | Latency TB |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `TIER_1` | [report_tier1.md](./report_tier1.md) | **160** | **95.62%** | 94.34% | 100.00% | 97.09% | 98.81% | **0.00%** | 5.85 ms |
| `TIER_2` | [report_tier2.md](./report_tier2.md) | **48** | **79.17%** | 100.00% | 100.00% | 100.00% | 100.00% | **0.00%** | 8.00 ms |
| `TIER_3_HYBRID` | [report_tier3_hybrid.md](./report_tier3_hybrid.md) | 0 | — | — | — | — | — | 0.00% | — |
| `TIER_3_LLM` | [report_tier3_llm.md](./report_tier3_llm.md) | **131** | **74.81%** | 94.59% | 81.40% | 87.50% | 83.73% | **18.27%** | 2338.44 ms |
| **TOÀN PIPELINE** | — | **339** | **85.25%** | **95.59%** | **93.13%** | **94.35%** | **93.62%** | **6.74%** | **907.54 ms** |

---

## 2. 📑 Danh Sách 4 Bản Báo Cáo Riêng Biệt Cho Từng Tier

- 📄 **[TIER 1 — Bộ Lọc Tĩnh (Rule-Based & Regex Pattern Matching)](./report_tier1.md)** (160 cases)
  - *File path:* `performance/report_tier1.md`
  - *Chức năng:* Báo cáo chi tiết metrics, danh sách ca sai và toàn bộ predictions xếp theo confidence score tăng dần.
- 📄 **[TIER 2 — Lọc Từ Vựng Cơ Bản (BM25 Lexical Engine)](./report_tier2.md)** (48 cases)
  - *File path:* `performance/report_tier2.md`
  - *Chức năng:* Báo cáo chi tiết metrics, danh sách ca sai và toàn bộ predictions xếp theo confidence score tăng dần.
- 📄 **[TIER 3 HYBRID — Chấm Điểm Hỗn Hợp (BM25 + Semantic Vector Fusion)](./report_tier3_hybrid.md)** (0 cases)
  - *File path:* `performance/report_tier3_hybrid.md`
  - *Chức năng:* Báo cáo chi tiết metrics, danh sách ca sai và toàn bộ predictions xếp theo confidence score tăng dần.
- 📄 **[TIER 3 LLM — Đánh Giá Ngữ Cảnh Chuyên Sâu (GPT-4o-mini Reasoning)](./report_tier3_llm.md)** (131 cases)
  - *File path:* `performance/report_tier3_llm.md`
  - *Chức năng:* Báo cáo chi tiết metrics, danh sách ca sai và toàn bộ predictions xếp theo confidence score tăng dần.

---

## 3. ❌ Tổng Hợp Các Ca Đoán Sai Toàn Bộ Pipeline

> ⚠️ **Có tổng cộng 50 ca sai lệch trên toàn hệ thống:**

| ID | Field Path | Table | Expected | Predicted | Tier | Confidence ($q_i$) | Phân Loại Lỗi |
|---|---|---|:---:|:---:|:---:|:---:|---|
| `syn-par-business_tax_number-173` | `business_tax_number` | `partners` | **KEEP** | MASK | `TIER_1` | **1.0000** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| `syn-tra-source_account-206` | `source_account` | `transactions` | **MASK** | KEEP | `TIER_3_LLM` | **0.9778** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-ban-so_tai_khoan-191` | `so_tai_khoan` | `bank_accounts` | **MASK** | KEEP | `TIER_3_LLM` | **0.9904** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-kyc-id_card_back_path-207` | `id_card_back_path` | `kyc_documents` | **DROP** | MASK | `TIER_2` | **0.9860** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-kyc-id_card_back_path-208` | `id_card_back_path` | `kyc_documents` | **DROP** | MASK | `TIER_2` | **0.9860** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-kyc-fingerprint_template-223` | `fingerprint_template` | `kyc_documents` | **DROP** | MASK | `TIER_3_LLM` | **0.9822** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-tra-destination_account-198` | `destination_account` | `transactions` | **MASK** | KEEP | `TIER_3_LLM` | **0.9866** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-kyc-id_card_back_path-220` | `id_card_back_path` | `kyc_documents` | **DROP** | MASK | `TIER_2` | **0.9860** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-par-business_tax_number-176` | `business_tax_number` | `partners` | **KEEP** | MASK | `TIER_1` | **1.0000** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| `syn-kyc-extracted_raw_ocr-214` | `extracted_raw_ocr` | `kyc_documents` | **DROP** | MASK | `TIER_2` | **0.9995** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-sup-company_tax_id-177` | `company_tax_id` | `suppliers` | **KEEP** | MASK | `TIER_1` | **1.0000** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| `syn-kyc-extracted_raw_ocr-212` | `extracted_raw_ocr` | `kyc_documents` | **DROP** | MASK | `TIER_2` | **0.9995** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-emp-previous_termination_reason-336` | `previous_termination_reason` | `employees` | **DROP** | MASK | `TIER_3_LLM` | **0.9846** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-sup-tax_exception_note-339` | `tax_exception_note` | `suppliers` | **DROP** | KEEP | `TIER_3_LLM` | **0.9840** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-kyc-fingerprint_template-227` | `fingerprint_template` | `kyc_documents` | **DROP** | MASK | `TIER_3_LLM` | **0.9806** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-ban-account_number-199` | `account_number` | `bank_accounts` | **MASK** | KEEP | `TIER_3_LLM` | **0.9855** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-cus-address-157` | `address` | `customers` | **MASK** | KEEP | `TIER_3_LLM` | **0.9776** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-kyc-id_card_back_path-209` | `id_card_back_path` | `kyc_documents` | **DROP** | MASK | `TIER_2` | **0.9860** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-tra-source_account-201` | `source_account` | `transactions` | **MASK** | KEEP | `TIER_3_LLM` | **0.9807** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-emp-previous_termination_reason-337` | `previous_termination_reason` | `employees` | **DROP** | MASK | `TIER_3_LLM` | **0.9851** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-emp-biometric_template-226` | `biometric_template` | `employees` | **DROP** | MASK | `TIER_3_LLM` | **0.9824** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-kyc-face_vector_512d-225` | `face_vector_512d` | `kyc_documents` | **DROP** | MASK | `TIER_3_LLM` | **0.9746** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-sup-company_tax_id-178` | `company_tax_id` | `suppliers` | **KEEP** | MASK | `TIER_1` | **1.0000** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| `syn-kyc-extracted_raw_ocr-213` | `extracted_raw_ocr` | `kyc_documents` | **DROP** | MASK | `TIER_2` | **0.9995** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-cus-secondary_fax-338` | `secondary_fax` | `customers` | **DROP** | MASK | `TIER_3_LLM` | **0.9882** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-tra-source_account-202` | `source_account` | `transactions` | **MASK** | KEEP | `TIER_3_LLM` | **0.9798** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-emp-previous_termination_reason-335` | `previous_termination_reason` | `employees` | **DROP** | MASK | `TIER_3_LLM` | **0.9846** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-sup-supplier_name-326` | `supplier_name` | `suppliers` | **KEEP** | MASK | `TIER_3_LLM` | **0.9629** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| `syn-sup-company_tax_id-186` | `company_tax_id` | `suppliers` | **KEEP** | MASK | `TIER_1` | **1.0000** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| `syn-cus-address-150` | `address` | `customers` | **MASK** | KEEP | `TIER_3_LLM` | **0.9774** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-ord-payment_card_number-192` | `payment_card_number` | `orders` | **MASK** | HMAC | `TIER_1` | **1.0000** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-emp-biometric_template-228` | `biometric_template` | `employees` | **DROP** | MASK | `TIER_3_LLM` | **0.9837** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-sup-company_tax_id-181` | `company_tax_id` | `suppliers` | **KEEP** | MASK | `TIER_1` | **1.0000** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| `syn-kyc-extracted_raw_ocr-219` | `extracted_raw_ocr` | `kyc_documents` | **DROP** | MASK | `TIER_2` | **0.9995** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-kyc-face_vector_512d-224` | `face_vector_512d` | `kyc_documents` | **DROP** | MASK | `TIER_3_LLM` | **0.9743** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-cus-street_address-136` | `street_address` | `customers` | **MASK** | KEEP | `TIER_3_LLM` | **0.9737** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-sup-supplier_name-320` | `supplier_name` | `suppliers` | **KEEP** | MASK | `TIER_3_LLM` | **0.9639** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| `syn-sup-supplier_name-332` | `supplier_name` | `suppliers` | **KEEP** | MASK | `TIER_3_LLM` | **0.9657** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| `syn-kyc-face_vector_512d-222` | `face_vector_512d` | `kyc_documents` | **DROP** | MASK | `TIER_3_LLM` | **0.9753** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-cus-street_address-134` | `street_address` | `customers` | **MASK** | KEEP | `TIER_3_LLM` | **0.9770** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-emp-previous_termination_reason-334` | `previous_termination_reason` | `employees` | **DROP** | MASK | `TIER_3_LLM` | **0.9843** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-sup-supplier_name-319` | `supplier_name` | `suppliers` | **KEEP** | MASK | `TIER_3_LLM` | **0.9667** | 🟡 False Positive (Báo động giả — Dữ liệu an toàn bị che) |
| `syn-kyc-extracted_raw_ocr-217` | `extracted_raw_ocr` | `kyc_documents` | **DROP** | MASK | `TIER_2` | **0.9995** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-ban-so_tai_khoan-197` | `so_tai_khoan` | `bank_accounts` | **MASK** | KEEP | `TIER_3_LLM` | **0.9893** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-tra-destination_account-190` | `destination_account` | `transactions` | **MASK** | KEEP | `TIER_3_LLM` | **0.9851** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-cus-street_address-135` | `street_address` | `customers` | **MASK** | KEEP | `TIER_3_LLM` | **0.9811** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-emp-residential_address-149` | `residential_address` | `employees` | **MASK** | KEEP | `TIER_3_LLM` | **0.9786** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
| `syn-kyc-extracted_raw_ocr-215` | `extracted_raw_ocr` | `kyc_documents` | **DROP** | MASK | `TIER_2` | **0.9995** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-kyc-fingerprint_template-221` | `fingerprint_template` | `kyc_documents` | **DROP** | MASK | `TIER_3_LLM` | **0.9830** | 🔵 Action Mismatch (Lệch mức độ bảo vệ PII) |
| `syn-ban-so_tai_khoan-196` | `so_tai_khoan` | `bank_accounts` | **MASK** | KEEP | `TIER_3_LLM` | **0.9893** | 🔴 False Negative (Bỏ sót PII — Có nguy cơ rò rỉ!) |
