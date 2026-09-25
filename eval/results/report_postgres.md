# Evaluation Report (Full Pipeline)

- **Scope:** `postgres`
- **Tổng số test cases:** 50
- **Dev cases:** 33
- **Holdout cases:** 17
- **Tổng thời gian chạy (chứa sleep):** 6.51s
- **Độ trễ trung bình/case (chưa tính sleep):** 0.0279s
- **Độ chính xác theo Hành động bảo mật (Action Accuracy):** 86.00%
- **Precision (Action):** 93.33%
- **Recall (Action):** 90.32%
- **F2 Score (Action):** 90.91%

## Thống kê chuyên sâu theo Tầng (Tier)

### TIER_1
- **Số lượng:** 27 cases
- **Latency trung bình:** 0.0042s
- **Action Accuracy:** 92.59%
- **Precision:** 88.24%
- **Recall:** 100.00%

### TIER_2
- **Số lượng:** 13 cases
- **Latency trung bình:** 0.0056s
- **Action Accuracy:** 84.62%
- **Precision:** 100.00%
- **Recall:** 100.00%

### TIER_3_HYBRID
- **Số lượng:** 3 cases
- **Latency trung bình:** 0.0176s
- **Action Accuracy:** 100.00%
- **Precision:** 0.00%
- **Recall:** 0.00%

### TIER_3_LLM
- Không có case nào dừng ở tầng này.

### FAILED: Missing credentials. Please pass an `api_key`, `workload_identity`, `admin_api_key`, or set the `OPENAI_API_KEY` or `OPENAI_ADMIN_KEY` environment variable.
- **Số lượng:** 7 cases

## Các ca sai Hành động bảo mật (Action Mismatch)

| ID | Trường dữ liệu (Field) | Action Kỳ vọng | Action AI Đề xuất | Lý do sai | Tầng |
|---|---|---|---|---|---|
| pg-cust-fax-01 | `fax` | **MASK** | KEEP | - | FAILED: Missing credentials. Please pass an `api_key`, `workload_identity`, `admin_api_key`, or set the `OPENAI_API_KEY` or `OPENAI_ADMIN_KEY` environment variable. |
| pg-cust-address-01 | `address` | **MASK** | KEEP | - | FAILED: Missing credentials. Please pass an `api_key`, `workload_identity`, `admin_api_key`, or set the `OPENAI_API_KEY` or `OPENAI_ADMIN_KEY` environment variable. |
| pg-sup-taxcode-01 | `tax_code` | **KEEP** | MASK | - | TIER_1 |
| pg-tick-body-01 | `body` | **MASK** | KEEP | - | FAILED: Missing credentials. Please pass an `api_key`, `workload_identity`, `admin_api_key`, or set the `OPENAI_API_KEY` or `OPENAI_ADMIN_KEY` environment variable. |
| pg-kyc-ocr-01 | `ocr_text` | **DROP** | MASK | - | TIER_2 |
| pg-kyc-filepath-01 | `file_path` | **DROP** | MASK | - | TIER_2 |
| holdout-edge-org-taxcode-01 | `tax_code` | **KEEP** | MASK | - | TIER_1 |
