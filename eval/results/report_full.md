# Evaluation Report (Full Pipeline)

- **Scope:** `all sources`
- **Tổng số test cases:** 72
- **Tổng thời gian chạy (chứa sleep):** 102.10s
- **Độ trễ trung bình/case (chưa tính sleep):** 1.3095s
- **Độ chính xác theo Hành động bảo mật (Action Accuracy):** 94.44%
- **Precision (Action):** 95.65%
- **Recall (Action):** 100.00%
- **F2 Score (Action):** 99.10%

## Thống kê chuyên sâu theo Tầng (Tier)

### TIER_1
- **Số lượng:** 40 cases
- **Latency trung bình:** 0.0117s
- **Action Accuracy:** 95.00%
- **Precision:** 91.30%
- **Recall:** 100.00%

### TIER_2
- **Số lượng:** 20 cases
- **Latency trung bình:** 0.0122s
- **Action Accuracy:** 90.00%
- **Precision:** 100.00%
- **Recall:** 100.00%

### TIER_3_HYBRID
- **Số lượng:** 4 cases
- **Latency trung bình:** 0.0307s
- **Action Accuracy:** 100.00%
- **Precision:** 0.00%
- **Recall:** 0.00%

### TIER_3_LLM
- **Số lượng:** 8 cases
- **Latency trung bình:** 11.6811s
- **Action Accuracy:** 100.00%
- **Precision:** 100.00%
- **Recall:** 100.00%

## Các ca sai Hành động bảo mật (Action Mismatch)

| ID | Trường dữ liệu (Field) | Action Kỳ vọng | Action AI Đề xuất | Lý do sai | Tầng |
|---|---|---|---|---|---|
| pg-sup-taxcode-01 | `tax_code` | **KEEP** | MASK | - | TIER_1 |
| pg-kyc-ocr-01 | `ocr_text` | **DROP** | MASK | - | TIER_2 |
| pg-kyc-filepath-01 | `file_path` | **DROP** | MASK | - | TIER_2 |
| holdout-edge-org-taxcode-01 | `tax_code` | **KEEP** | MASK | - | TIER_1 |
