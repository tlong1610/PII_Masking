# Evidence: FieldProfile Rules-based Scanner (Gate 2)

## 1. Schema & Contract
Hệ thống ở Gate 2 giao tiếp qua `FieldProfile` thay vì `ColumnProfile` (chứa `samples: list[str]`). 
Điều này đảm bảo **Zero-PII** ở cấp độ input/output (không có dữ liệu raw PII lọt vào log, prompt, hay report).

**Cấu trúc JSON đầu vào (Sample):**
```json
{
  "engine": "postgresql",
  "table_or_collection": "customers",
  "path": "cccd",
  "data_type": "string",
  "null_count": 0,
  "distinct_count": 91,
  "statistics": {"min_len": 12, "max_len": 12, "pattern": "XXXXXXXXXXXX"}
}
```

## 2. Kết quả Quét (Rules-only Mode)
Lệnh đánh giá: `python eval/run_eval_field_profile.py --mode rules`

| ID | Trường (Path) | Action Kỳ Vọng | Action Thực Tế | Khớp | Tầng Quyết Định |
|---|---|---|---|---|---|
| fp-pg-cust-cccd-01 | `cccd` | HMAC | HMAC | ✅ | TIER_1_RULES |
| fp-pg-ord-tracking-01 | `tracking_code` | KEEP | KEEP | ✅ | TIER_1_RULES |
| fp-mg-identity-cccd-01 | `identity.cccd` | HMAC | HMAC | ✅ | TIER_1_RULES |
| fp-mg-pii-ext-cccd-01 | `pii_ext.customer_cccd` | HMAC | HMAC | ✅ | TIER_1_RULES |
| fp-pg-sup-taxcode-01 | `tax_code` | KEEP | KEEP | ❌ | DEFAULT_FALLBACK |

*(Note: Case `tax_code` của Supplier là mã số thuế tổ chức. Ở chế độ Rules-only không có LLM, hệ thống bị mập mờ và rơi vào `DEFAULT_FALLBACK` KEEP. LLM sẽ xử lý case này tốt hơn)*
