# Evaluation Report (Rule-Based Only)

- **Tổng số test cases:** 72
- **Độ chính xác tổng thể (Overall Accuracy):** 84.72%
- **Độ chính xác trên các nhãn quy tắc hỗ trợ:** 87.88% (29/33)

## Các ca dự đoán SAI (Failed Cases)

| ID | Trường dữ liệu (Field) | Golden Label | Kỳ vọng Rule Engine | Thực tế Rule Engine |
|---|---|---|---|---|
| pg-ord-notes-01 | `order_notes` | FREE_TEXT_PII | **UNKNOWN** | TRACKING_CODE |
| pg-ord-freight-01 | `freight` | FINANCIAL_AMOUNT | **MONEY_ALONE** | UNKNOWN |
| pg-ord-date-01 | `order_date` | TRANSACTION_DATE | **UNKNOWN** | TRACKING_CODE |
| mg-ord-id-01 | `_id` | TRANSACTION_ID | **TRACKING_CODE** | UNKNOWN |
| mg-ord-freight-01 | `shipment.freight` | FINANCIAL_AMOUNT | **MONEY_ALONE** | TRACKING_CODE |
| mg-ord-shipname-01 | `shipment.name` | RECIPIENT_NAME | **UNKNOWN** | TRACKING_CODE |
| mg-ord-shipaddr-01 | `shipment.address` | STREET_ADDRESS | **UNKNOWN** | TRACKING_CODE |
| mg-ord-piinotes-01 | `pii_ext.order_notes` | FREE_TEXT_PII | **UNKNOWN** | TRACKING_CODE |
| holdout-edge-tracking-notes-01 | `order_notes` | FREE_TEXT_PII | **UNKNOWN** | TRACKING_CODE |
| holdout-edge-freight-num-01 | `freight` | FINANCIAL_AMOUNT | **MONEY_ALONE** | UNKNOWN |
| holdout-mg-edge-ordnotes-01 | `pii_ext.order_notes` | FREE_TEXT_PII | **UNKNOWN** | TRACKING_CODE |
