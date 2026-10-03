# ❓ FAQ - Câu Hỏi Thường Gặp

## 🤖 Về CI Runner

### Q: Runner service có tự động chạy khi mở Mac không?
✅ **CÓ**. Runner đã được cài dưới dạng LaunchAgent và sẽ:
- Tự động start khi Mac boot
- Chạy ngầm không cần terminal
- Check: `launchctl list | grep actions.runner`

### Q: Khi gập Mac thì CI có chạy không?
⚠️ **KHÔNG**. Khi Mac sleep:
- Runner process tạm dừng
- Jobs đang chạy bị pause
- Khi mở Mac lại → runner tự động resume
- **Nhưng**: Jobs đã pause quá lâu sẽ timeout

**Khuyến nghị**: Không gập Mac khi có PR đang chạy CI, hoặc setting Mac không sleep khi cắm điện.

### Q: Đồng đội commit lên có hưởng service này không?
✅ **CÓ**. Tất cả commits/PRs vào repo P-138 sẽ:
- Trigger CI workflow
- Chạy trên Mac của bạn (nếu Mac đang bật)
- Fallback về GitHub hosted runner nếu Mac offline

### Q: actions-runner có 5000+ files, có sao không?
✅ **Bình thường**. Đó là GitHub Actions runtime:
- Node.js runtime
- Action dependencies
- Logs và cache
- **Đã có trong .gitignore** - không commit vào Git

---

## 📊 Về Golden Dataset

### Q: Golden dataset là gì?
Tập dữ liệu test **đã được gán nhãn chuẩn** để:
- Đánh giá accuracy của PII detection
- Compare rule-based vs LLM
- Regression testing
- Minh chứng cho mentor

### Q: Golden dataset nằm ở đâu?
```
eval/golden_labels.json         # 37KB, 100+ test cases
eval/benchmark_data.json        # 37KB, data mẫu
eval/run_eval_full.py          # Script chạy eval
```

### Q: Mentor nói "data chưa đủ" - thiếu gì?
Cần bổ sung:
1. **Edge cases**: email công ty vs cá nhân, tracking code vs CCCD
2. **Negative cases**: product code, invoice number (không phải PII)
3. **Multimodal**: ảnh CCCD, voice recordings

Xem chi tiết: [docs/GOLDEN_DATASET.md](./GOLDEN_DATASET.md)

---

## 📝 Về Log Scripts

### Q: Files log_hook.py, log_redaction.py, submit_log.py là gì?
Đây là **AI logging system** để track lịch sử chat với AI:
- `log_hook.py` - Hook ghi log từ AI tools
- `log_redaction.py` - Redact sensitive info
- `submit_log.py` - Submit log lên grading server

**Có nên commit?**
- ❌ Nếu chứa API keys, credentials
- ✅ Nếu chỉ là scripts (không có data)
- Hiện tại: **Để uncommitted**, team review trước khi commit

---

## 🐛 Về Lỗi CI

### Q: CI báo lỗi "account payments failed" - là gì?
GitHub Actions free tier **hết quota** hoặc billing issue.

**Giải pháp**: 
✅ Đã setup self-hosted runner trên Mac của bạn
- Jobs sẽ chạy trên Mac thay vì GitHub cloud
- Không tốn quota
- Cần Mac luôn bật

### Q: CI luôn fail với lint errors - làm sao fix?
```bash
# Chạy local để fix
source .venv/bin/activate
ruff check . --fix
pytest tests/
git add .
git commit -m "fix: lint và test errors"
git push
```

---

## 🖥️ Về Backend/Frontend

### Q: Backend health endpoint không trả về gì?
Backend container đang chạy nhưng **unhealthy**:
```bash
# Check logs
docker logs p-138-backend-1

# Restart nếu cần
docker-compose restart backend
```

### Q: Frontend báo "Lỗi khi quét dữ liệu"?
Có thể do:
1. Backend chưa ready
2. API endpoint chưa implement
3. Database connection issue

**Test**:
```bash
# Test backend health
curl http://localhost:8001/health

# Test frontend
open http://localhost:5173/login
# Login: dpo/dpo123 hoặc analyst/analyst123
```

---

## 🎯 Về Tasklist cho Tùng

### Q: Các task trong checklist là gì?
Xem chi tiết: [docs/TUNG_TASKS.md](./TUNG_TASKS.md)

**Priorities**:
1. ✅ Core PII Detection (rules/regex)
2. 🔧 Fix Mismatches (tax_code → MASK, ocr_text → DROP)
3. 🧪 Testing (tracking code ≠ CCCD, order ID ≠ PII)
4. 🔒 Security (không gửi sample_value vào LLM)
5. 📊 Evaluation (precision/recall với golden dataset)

### Q: sample_value là gì? Tại sao không gửi vào LLM?
`sample_value` là **giá trị thật** từ database, ví dụ:
- `"033254456184"` (số CCCD thật)
- `"user@example.vn"` (email thật)

**Không gửi vào LLM** vì:
- Vi phạm privacy (raw PII)
- Mentor yêu cầu: "on-premise, không raw data lên AI"
- Chỉ gửi **metadata**: field_path, data_type, schema statistics

---

## 🔍 Về Ruff Check & Pytest

### Q: `ruff check .` làm gì?
**Ruff** là Python linter (fast code checker):
- Check code style (PEP 8)
- Find unused imports
- Detect syntax issues
- Auto-fix với `--fix`

### Q: Pytest fail - làm sao debug?
```bash
# Chạy với verbose
pytest -v tests/

# Chạy một test cụ thể
pytest tests/test_api/test_datasets.py -v

# Show print statements
pytest -s tests/
```

---

## 📱 Quick Commands

### Start Everything
```bash
cd /Users/phucnguyen/Desktop/AI/team_build_phase/P-138

# Backend + DB
docker-compose up -d

# Frontend (terminal mới)
cd front_end && npm run dev
```

### Check Status
```bash
# Containers
docker ps

# Runner
launchctl list | grep actions.runner

# Git
git status
```

### Run Quality Checks
```bash
source .venv/bin/activate
ruff check . --fix
pytest tests/
```

---

## 📚 Tài Liệu Liên Quan

- [CI_RUNNER_GUIDE.md](./CI_RUNNER_GUIDE.md) - Chi tiết về CI runner
- [GOLDEN_DATASET.md](./GOLDEN_DATASET.md) - Giải thích golden dataset
- [TUNG_TASKS.md](./TUNG_TASKS.md) - Checklist cho Tùng
- [README.md](../README.md) - Tổng quan dự án
