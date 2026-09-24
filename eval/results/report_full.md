# Evaluation Report (Full Pipeline)

- **Tổng số test cases:** 72
- **Độ chính xác theo Hành động bảo mật (Action Accuracy):** 94.44%
- **Precision (Action):** 100.00%
- **Recall (Action):** 95.45%
- **F2 Score (Action):** 96.33%

## Thống kê chuyên sâu theo Tầng (Tier)

### TIER_1
- **Số lượng:** 34 cases
- **Action Accuracy:** 100.00%
- **Precision:** 100.00%
- **Recall:** 100.00%

### TIER_2
- **Số lượng:** 20 cases
- **Action Accuracy:** 90.00%
- **Precision:** 100.00%
- **Recall:** 100.00%

### TIER_3_HYBRID
- **Số lượng:** 3 cases
- **Action Accuracy:** 100.00%
- **Precision:** 0.00%
- **Recall:** 0.00%

### TIER_3_LLM
- **Số lượng:** 15 cases
- **Action Accuracy:** 86.67%
- **Precision:** 100.00%
- **Recall:** 71.43%

## Các ca sai Hành động bảo mật (Action Mismatch)

| ID | Trường dữ liệu (Field) | Action Kỳ vọng | Action AI Đề xuất | Lý do sai | Tầng |
|---|---|---|---|---|---|
| pg-cust-taxcode-01 | `tax_code` | **MASK** | KEEP | - | TIER_3_LLM |
| pg-emp-taxcode-01 | `tax_code` | **MASK** | KEEP | - | TIER_3_LLM |
| pg-kyc-ocr-01 | `ocr_text` | **DROP** | MASK | - | TIER_2 |
| pg-kyc-filepath-01 | `file_path` | **DROP** | MASK | - | TIER_2 |
