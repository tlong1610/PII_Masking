# 🏆 Golden Dataset - Tập Dữ Liệu Chuẩn

## 📌 Golden Dataset Là Gì?

**Golden Dataset** (hay **Gold Standard Dataset**) là tập dữ liệu test **đã được gán nhãn chuẩn** bởi chuyên gia, dùng để:

1. **Đánh giá độ chính xác** của hệ thống PII detection
2. **So sánh kết quả** giữa các phương pháp (rules-only vs AI-assisted)
3. **Regression testing** - đảm bảo code mới không làm giảm accuracy
4. **Minh chứng** cho mentor/khách hàng về chất lượng

## 📂 Vị Trí Trong Dự Án

```
eval/
├── golden_labels.json          # 37KB - 100+ test cases đã gán nhãn
├── benchmark_data.json         # 37KB - data mẫu để test
├── expected_downstream.json    # 3KB - kỳ vọng về downstream impact
├── run_eval_full.py           # Script chạy full evaluation
└── run_eval_field_profile.py  # Script đánh giá từng field
```

## 🎯 Cấu Trúc Golden Labels

Mỗi test case trong `golden_labels.json`:

```json
{
  "id": "pg-cust-cccd-01",
  "source": "postgres",
  "table": "customers",
  "field_path": "cccd",
  "sample_value": "033254456184",
  "data_type": "string",
  "category": "sensitive",
  "taxonomy_id": "CCCD",
  "legal_basis": "Luật 91/2025/QH15 Điều 9 Khoản 2; NĐ 356/2025/NĐ-CP Điều 4",
  "expected_action": "HMAC",
  "reason": "Số CCCD 12 chữ số... Cần áp dụng HMAC có salt cố định...",
  "is_edge_case": false,
  "split": "dev"
}
```

### Các Trường Quan Trọng

- **taxonomy_id**: Loại PII (CCCD, EMAIL, PHONE, DOB...)
- **expected_action**: Hành động đúng theo code hiện tại (HMAC, MASK, DROP, KEEP)
- **legal_basis**: Căn cứ pháp lý (Luật 91/2025/QH15...)
- **reason**: Giải thích tại sao chọn action này
- **is_edge_case**: True nếu là trường hợp khó (edge case)

## 📊 Các Loại PII Trong Golden Dataset

| Taxonomy ID | Mô Tả | Expected Action | Ví Dụ |
|------------|-------|----------------|-------|
| CCCD | Số CMND/CCCD 12 số | HMAC | 033254456184 |
| EMAIL | Email cá nhân | MASK | user@example.vn |
| PHONE | SĐT Việt Nam | MASK | 0327540543 |
| DOB | Ngày sinh | MASK | 1990-07-12 |
| TAX_CODE | Mã số thuế | MASK | 0123456789 |
| ADDRESS | Địa chỉ nhà | MASK | 123 Lê Lợi, Q1... |
| ORDER_ID / TRACKING_CODE | Mã đơn hàng / mã vận đơn | KEEP | ORD-2024-001 |
| AMOUNT / MONEY_ALONE | Số tiền đứng riêng | KEEP | 1250000 |

## 🧪 Chạy Evaluation

### Full Evaluation (rules/BM25 + AI-assisted nếu bật)
```bash
cd /Users/phucnguyen/Desktop/AI/team_build_phase/P-138
source .venv/bin/activate
python eval/run_eval_full.py
```

### Rule-Only Evaluation  
```bash
# Nhanh hơn, không cần LLM
ENABLE_AI_SCAN=false python eval/run_eval_full.py
```

### Field Profile Evaluation
```bash
# Đánh giá từng field riêng
python eval/run_eval_field_profile.py
```

## 📈 Metrics Quan Trọng

### 1. Precision (Độ Chính Xác)
```
Precision = TP / (TP + FP)
```
- Trong số các field **bị đánh dấu là PII**, bao nhiêu % **thực sự là PII**?
- Target: **≥ 95%** (tránh false positive - đánh nhầm data bình thường)

### 2. Recall (Độ Phủ)
```
Recall = TP / (TP + FN)
```
- Trong số các field **thực sự là PII**, bao nhiêu % **được phát hiện đúng**?
- Target: **≥ 90%** (tránh miss PII thật)

### 3. Action Accuracy
```
Action Accuracy = Correct Actions / Total Detected
```
- Trong số PII đã phát hiện, bao nhiêu % **chọn đúng action** (HMAC vs MASK vs DROP)?
- Target: **≥ 85%**

## 🎓 Mentor Feedback

> "data mẫu của team a thấy vẫn chưa đủ á, hoặc a chưa cảm nhận đủ. cảm giác ít quá"

### Cần Bổ Sung:

1. **Thêm edge cases**:
   - Email công ty vs email cá nhân
   - Tracking code vs CCCD (đều 12 số)
   - Số tiền vs số điện thoại
   - Mã đơn hàng có chứa số điện thoại

2. **Thêm negative cases** (không phải PII):
   - Product codes
   - Invoice numbers
   - Timestamps
   - Amounts

3. **Không mở rộng sang cấu trúc dữ liệu mới trong P1**:
   - Ảnh/voice chỉ ghi nhận là rủi ro tương lai
   - P1 tập trung quét sâu các field/value patterns trong PostgreSQL và MongoDB hiện có

## 🚀 Next Steps

- [ ] Tùng: Chạy eval với golden dataset hiện tại
- [ ] Phúc: Bổ sung thêm edge cases vào golden_labels.json
- [ ] Team: Review precision/recall, fix các false positives
- [ ] Kiên: Chuẩn bị demo với golden dataset

## 📝 Cách Thêm Test Case Mới

```python
# Thêm vào eval/golden_labels.json
{
  "id": "pg-prod-code-01",  # Unique ID
  "source": "postgres",
  "table": "products",
  "field_path": "product_code",
  "sample_value": "PRD-2024-12345",
  "data_type": "string",
  "category": "non_sensitive",  # NOT sensitive!
  "taxonomy_id": "PRODUCT_CODE",
  "legal_basis": "N/A",
  "expected_action": "KEEP",
  "reason": "Mã sản phẩm không phải PII, cho phép giữ nguyên trong snapshot phân tích",
  "is_edge_case": false,
  "split": "dev"
}
```

## 🔗 Related Files

- `tests/test_api/test_datasets.py` - API tests
- `data/fixtures/postgres/compute/audit_postgres_golden_labels.py` - Generate script
- `eval/results/postgres_golden_evidence.json` - Kết quả chạy eval
- `docs/core/AI_ARCHITECTURE.md` - Giải thích rules/AI/LLM và nguyên tắc không gửi raw sample vào LLM

