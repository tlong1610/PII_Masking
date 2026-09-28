# PIIGuard VN - MVP Demo Flow

## Status Hệ Thống

**Frontend**: http://localhost:5173  
**Backend API**: http://localhost:8001/api/v1
**Database**: PostgreSQL + MongoDB đang chạy

---

## Luồng Demo MVP (5 Bước)

### Bước 1: Login DPO
- Tài khoản: dpo / dpo123
- Vai trò: Data Protection Officer
- Sau login: Vào workspace DPO

### Bước 2: Quét PII
- Chọn SQL demo source
- Click "Bắt Đầu Quét"
- Backend phát hiện 5 fields:
  * customer_id → HMAC
  * full_name → MASK
  * phone → MASK
  * email → MASK
  * notes → DROP

### Bước 3: Review & Approve
- DPO xem classification
- Giữ nguyên hoặc thay đổi actions
- Click "Phê Duyệt"

### Bước 4: Build Dataset
- Click "Xây Dựng Dataset"
- Backend apply masking rules
- Tạo snapshot với data đã che

### Bước 5: Analyst View
- Login analyst / analyst123
- Xem dataset PUBLISHED
- Chỉ thấy dữ liệu đã masked

---

## Nguyên Tắc Bảo Mật

**No-Raw-Value**: Không ai thấy PII gốc  
**Phân Quyền**: DPO build, Analyst chỉ đọc  
**Tuân Thủ**: Nghị định 13/2025 VN

---

## Trạng Thái

✅ Frontend: Login + UI hoạt động
✅ Frontend: Button click gọi API thật qua `realPiiReviewApi`
🚧 E2E thật: chờ backend hoàn tất bỏ stub theo Trello BE task

## Demo Workaround

Nếu backend chưa sẵn sàng, demo phần UI + giải thích API contract. Không mark FE API task done cho tới khi flow E2E chạy qua backend thật.
