# ✅ Task Checklist cho Tùng - PIIGuard Shield

## 🎯 Priority 1: Core PII Detection

- [ ] **Chạy rules/regex cho các loại PII chính**
  - CCCD (12 số)
  - Email cá nhân
  - Số điện thoại VN
  - Ngày sinh
  - Địa chỉ
  
- [ ] **Giữ luồng: rules → BM25/LLM optional → proposal**
  - Rule-based là bắt buộc chạy
  - BM25 và LLM chỉ bật khi cần (ENABLE_AI_SCAN=false mặc định)

## 🔧 Priority 2: Fix Mismatches

- [ ] **Sửa mismatch tax_code thành MASK**
  - Tax code không nên DROP, nên MASK
  - Cập nhật trong detection rules
  
- [ ] **Sửa mismatch ocr_text thành DROP**
  - OCR text thô từ ảnh CCCD phải DROP
  - Không lưu trữ raw OCR output

- [ ] **Sửa mismatch file_path thành DROP**
  - File path có thể chứa thông tin nhạy cảm
  - DROP nếu có path đến ảnh CCCD/cá nhân

## 🧪 Priority 3: Testing & Validation

- [ ] **Test tracking code không bị nhận nhầm CCCD**
  - Mã đơn hàng/tracking không phải PII
  - Đảm bảo regex không false positive

- [ ] **Test order ID không phải PII**
  - Order ID, invoice number không phải sensitive data
  - Cho phép lưu trữ bình thường

- [ ] **Test email tổ chức**
  - Email công ty (@company.vn) khác với email cá nhân
  - Có thể cho phép hoặc mask nhẹ hơn

- [ ] **Test số tiền đúng riêng**
  - Số tiền giao dịch không phải PII
  - Phân biệt với số CCCD (12 chữ số)

## 🔒 Priority 4: Security & Privacy

- [ ] **Không gửi sample_value vào LLM**
  - Chỉ gửi metadata: field_path, data_type, schema
  - sample_value chỉ dùng cho rule-based local

- [ ] **Không log raw PII trong console/report**
  - Mask hoặc redact trước khi log
  - Chỉ log metadata và statistics

- [ ] **Chỉ gửi field/path/type/schema statistics đã lọc**
  - Aggregate statistics: count, null_rate, distinct_count
  - Không gửi actual values

## 📝 Priority 5: Documentation

- [ ] **Ghi rõ report_full.md là full pipeline**
  - Bao gồm: rule-based + BM25 + LLM (nếu bật)
  - Chi tiết về từng tier detection

- [ ] **Ghi rõ report.md là rule-only**
  - Chỉ có kết quả từ regex/rule-based
  - Fast mode, không cần AI

## 🧹 Priority 6: Code Quality

- [ ] **Xóa hoặc giải thích scratch_*.py**
  - Các file scratch là temporary/experimental
  - Xóa hoặc move vào /tests/playground/

- [ ] **Bổ sung dependency tqdm nếu còn import**
  - Kiểm tra tất cả imports
  - Đảm bảo requirements.txt đầy đủ

- [ ] **Chạy eval PostgreSQL riêng**
  - Test với database mẫu (northwind)
  - Đảm bảo không ảnh hưởng production

## 📊 Priority 7: Metrics & Evaluation

- [ ] **Xuất precision/recall/action accuracy**
  - So sánh với golden_labels.json
  - Tính metrics cho từng loại PII

- [ ] **Chạy pytest và full eval**
  - `pytest tests/` phải pass
  - `python eval/run_eval_full.py` phải hoàn thành

## 🚀 Priority 8: Final Delivery

- [ ] **Commit/PR kết quả**
  - Tạo nhánh: `feature/tung-pii-detection-fixes`
  - Commit message rõ ràng
  - PR vào `develop` (không phải `main`)

---

## 📌 Notes

- **Golden Dataset**: Đã có tại `eval/golden_labels.json` (37KB, ~100+ test cases)
- **Eval Scripts**: `run_eval_full.py` và `run_eval_field_profile.py`
- **Test Database**: `data/northwind_full_no_demo.sql`
- **CI/CD**: Đã setup self-hosted runner, sẽ tự động chạy khi push

## 🆘 Cần Help?

- Backend API: http://localhost:8001
- Frontend: http://localhost:5173
- Mentor feedback: Xem chat history về masking strategies
