# Evidence: Gate 2 LLM E2E (Zero-PII Prompting)

## 1. Kiến trúc Fallback
Khi TIER_1_RULES không chắc chắn (ambiguous, hoặc ca âm bản cần context như mã số thuế doanh nghiệp), luồng sẽ đi vào nhánh `fp_llm_node`. Node này đã được bảo vệ (guard) bằng biến môi trường `ENABLE_AI_SCAN`.

## 2. LLM Prompt Template (Zero-PII)
Prompt đã được làm sạch, hoàn toàn không chứa tham số `samples`:

```text
THÔNG TIN TRƯỜNG DỮ LIỆU CẦN PHÂN TÍCH:
- Engine Database: {engine}
- Tên Bảng/Collection: {table}
- Đường dẫn trường (Path): {path}
- Kiểu dữ liệu: {data_type}
- Tổng số dòng Null / Dòng phân biệt (Distinct): {null_count} / {distinct_count}
- Thống kê hình thái học (Shape/Length): {statistics_json}
```

## 3. Kết quả Quét (Full AI Mode)
Lệnh đánh giá: `python eval/run_eval_field_profile.py --mode full`

| ID | Trường (Path) | Action Kỳ Vọng | Action Thực Tế | Khớp | Tầng Quyết Định |
|---|---|---|---|---|---|
| fp-pg-cust-cccd-01 | `cccd` | HMAC | HMAC | ✅ | TIER_1_RULES |
| fp-pg-ord-tracking-01 | `tracking_code` | KEEP | KEEP | ✅ | TIER_1_RULES |
| fp-mg-identity-cccd-01 | `identity.cccd` | HMAC | HMAC | ✅ | TIER_1_RULES |
| fp-mg-pii-ext-cccd-01 | `pii_ext.customer_cccd` | HMAC | HMAC | ✅ | TIER_1_RULES |
| fp-pg-sup-taxcode-01 | `tax_code` | KEEP | KEEP | ✅ | TIER_3_LLM |

*(Note: LLM nhận diện được table là `suppliers` (Nhà cung cấp), từ đó suy luận `tax_code` là của tổ chức -> Trả về KEEP thành công ở tầng `TIER_3_LLM`. Output không chứa PII raw)*
