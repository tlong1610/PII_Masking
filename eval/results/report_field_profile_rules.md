# Evaluation Report - FieldProfile Scanner (Gate 2)

- **Mode:** `rules` (AI Scan: False)
- **Tổng số test cases:** 72
- **Dev cases:** 50
- **Holdout cases:** 22
- **Tổng thời gian chạy (chứa sleep):** 0.01s
- **Độ trễ trung bình/case (chưa tính sleep):** 0.0001s
- **Độ chính xác theo Hành động bảo mật (Action Accuracy):** 56.94%
- **Precision (Action):** 91.30%
- **Recall (Action):** 47.73%
- **F2 Score (Action):** 52.76%

## Thống kê chuyên sâu theo Tầng (Tier)

### DEFAULT_FALLBACK
- **Số lượng:** 32 cases
- **Latency trung bình:** 0.0002s
- **Action Accuracy:** 28.12%
- **Precision:** 0.00%
- **Recall:** 0.00%

### TIER_1
- **Số lượng:** 40 cases
- **Latency trung bình:** 0.0000s
- **Action Accuracy:** 80.00%
- **Precision:** 91.30%
- **Recall:** 100.00%

## Các ca sai Hành động bảo mật (Action Mismatch)

| ID | Trường dữ liệu (Field) | Action Kỳ vọng | Action AI Đề xuất | Lý do sai | Tầng |
|---|---|---|---|---|---|
| pg-cust-cccd-01 | `cccd` | **HMAC** | MASK | - | TIER_1 |
| pg-cust-dob-01 | `date_of_birth` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| pg-cust-notes-01 | `personal_notes` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| pg-cust-name-01 | `contact_name` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| pg-cust-fax-01 | `fax` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| pg-cust-address-01 | `address` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| pg-ord-custcccd-01 | `customer_cccd` | **HMAC** | MASK | - | TIER_1 |
| pg-ord-notes-01 | `order_notes` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| pg-ord-shipname-01 | `ship_name` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| pg-ord-shipaddr-01 | `ship_address` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| pg-emp-cccd-01 | `cccd` | **HMAC** | MASK | - | TIER_1 |
| pg-emp-name-01 | `first_name` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| pg-emp-birth-01 | `birth_date` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| pg-sup-cccd-01 | `contact_cccd` | **HMAC** | MASK | - | TIER_1 |
| pg-sup-taxcode-01 | `tax_code` | **KEEP** | MASK | - | TIER_1 |
| pg-tick-body-01 | `body` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| pg-kyc-ocr-01 | `ocr_text` | **DROP** | KEEP | - | DEFAULT_FALLBACK |
| pg-kyc-filepath-01 | `file_path` | **DROP** | KEEP | - | DEFAULT_FALLBACK |
| mg-cust-contactname-01 | `company.contact_name` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| mg-cust-cccd-01 | `identity.cccd` | **HMAC** | MASK | - | TIER_1 |
| mg-cust-dob-01 | `identity.date_of_birth` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| mg-cust-notes-01 | `notes` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| mg-ord-shipname-01 | `shipment.name` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| mg-ord-shipaddr-01 | `shipment.address` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| mg-ord-piicccd-01 | `pii_ext.customer_cccd` | **HMAC** | MASK | - | TIER_1 |
| mg-ord-piinotes-01 | `pii_ext.order_notes` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| holdout-edge-tracking-notes-01 | `order_notes` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| holdout-edge-org-taxcode-01 | `tax_code` | **KEEP** | MASK | - | TIER_1 |
| holdout-edge-anon-seq-01 | `personal_notes` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| holdout-mg-edge-ordnotes-01 | `pii_ext.order_notes` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
| holdout-pg-emp-notes-01 | `notes` | **MASK** | KEEP | - | DEFAULT_FALLBACK |
