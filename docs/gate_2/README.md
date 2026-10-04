# MVP Gate 2 Submission - PIIGuard VN

Tài liệu này tổng hợp toàn bộ các yêu cầu đầu ra cho **Gate 2 (MVP)** của dự án PIIGuard VN.

---

## 1. Video Demo 3 phút (End-to-End)
- **Link Video:** **https://drive.google.com/drive/folders/1OOIj4LYKQ4vIFTbjH8rg0DRRxJ7hNGoN?usp=sharing**
- **Nội dung:** Video quay lại luồng chạy thực tế của Agent từ đầu đến cuối: nhận input (PostgreSQL/MongoDB) → quét PII → LLM đề xuất masking → DPO duyệt trên UI → áp dụng policy.

## 2. Architecture Diagram
- Sơ đồ components và luồng dữ liệu (Data Flow) chi tiết nằm tại file: **[ARCHITECTURE.md](../../ARCHITECTURE.md)**

## 3. Pull Requests (>= 10 PR merged)
- Nhóm đã thực hiện làm việc nhóm và code review nghiêm túc. Hiện tại repo đã có hơn **50 Pull Requests** được merge thành công.

## 4. README.md (Setup & Sample Queries)
- Hướng dẫn cài đặt môi trường, cấu hình biến môi trường (`.env`), cấu trúc thư mục, API endpoints và **Sample Queries (cURL)** nằm tại file gốc của dự án: **[README.md](../../README.md)**

---

## 5. Eval Evidences - 5 Manual Test Cases với Output Thực Tế

> **HƯỚNG DẪN CHO THÀNH VIÊN TEAM:** Hãy chạy UI, chụp ảnh màn hình (DPO Review hoặc API Response) cho 5 trường dưới đây, lưu vào `front_end/screenshots/` (với đúng tên file) để hoàn thiện mục này!

### Test Case 1: Tên Khách Hàng (Tên Người - Định danh cơ bản)
- **Bảng/Cột:** `customers` / `contact_name`
- **Phân loại kỳ vọng (Agent Output):** `FULL_NAME` (L2 - Basic)
- **Hành động đề xuất (Action):** `MASK`
- **Căn cứ pháp lý:** Luật 91/2025/QH15 Điều 9 Khoản 1
- **Bằng chứng (Screenshot thực tế):**
> `![Evidence 1 - Name](../../front_end/screenshots/tc1_name.png)`

### Test Case 2: Căn Cước Công Dân (Định danh nhạy cảm cao)
- **Bảng/Cột:** `customers` / `cccd`
- **Phân loại kỳ vọng (Agent Output):** `CCCD` (L3 - Sensitive)
- **Hành động đề xuất (Action):** `HMAC` (để giữ khả năng JOIN mapping)
- **Căn cứ pháp lý:** Luật 91/2025/QH15 Điều 9 Khoản 2; NĐ 356/2025/NĐ-CP Điều 4
- **Bằng chứng (Screenshot thực tế):**
> `![Evidence 2 - CCCD](../../front_end/screenshots/tc2_cccd.png)`

### Test Case 3: Số Điện Thoại (PII cơ bản)
- **Bảng/Cột:** `customers` / `mobile_phone`
- **Phân loại kỳ vọng (Agent Output):** `PHONE_VN` (L2 - Sensitive)
- **Hành động đề xuất (Action):** `MASK`
- **Căn cứ pháp lý:** Luật 91/2025/QH15 Điều 9 Khoản 1
- **Bằng chứng (Screenshot thực tế):**
> `![Evidence 3 - Phone](../../front_end/screenshots/tc3_phone.png)`

### Test Case 4: Cột Dữ Liệu Tự Do (Free Text PII / Notes)
- **Bảng/Cột:** `customers` / `personal_notes`
- **Phân loại kỳ vọng (Agent Output):** `FREE_TEXT_PII` (L3 - Sensitive)
- **Hành động đề xuất (Action):** `MASK`
- **Căn cứ pháp lý:** Luật 91/2025/QH15 Điều 9 Khoản 1 & 2
- **Bằng chứng (Screenshot thực tế):**
> `![Evidence 4 - Notes](../../front_end/screenshots/tc4_notes.png)`

### Test Case 5: Mã Vận Đơn (Không Phải PII - Edge Case)
- **Bảng/Cột:** `orders` / `tracking_code`
- **Phân loại kỳ vọng (Agent Output):** `TRACKING_NUMBER` (L0 - Non-Personal)
- **Hành động đề xuất (Action):** `KEEP`
- **Căn cứ pháp lý:** Luật 91/2025/QH15 Điều 2 (Mã logistics nghiệp vụ)
- **Bằng chứng (Screenshot thực tế):**
> `![Evidence 5 - Tracking](../../front_end/screenshots/tc5_tracking.png)`

---

## Phụ lục: Kiến trúc Fallback (Zero-PII Prompting)
Khi TIER_1_RULES không chắc chắn (ambiguous, hoặc ca âm bản cần context như mã số thuế doanh nghiệp), luồng sẽ đi vào nhánh `fp_llm_node`. Prompt LLM đã được làm sạch, hoàn toàn không chứa giá trị raw:
```text
THÔNG TIN TRƯỜNG DỮ LIỆU CẦN PHÂN TÍCH:
- Engine Database: {engine}
- Tên Bảng/Collection: {table}
- Đường dẫn trường (Path): {path}
- Kiểu dữ liệu: {data_type}
- Tổng số dòng Null / Dòng phân biệt (Distinct): {null_count} / {distinct_count}
- Thống kê hình thái học (Shape/Length): {statistics_json}
```
*(LLM nhận diện context table để phân biệt PII cá nhân và mã hệ thống, trả về output chính xác mà KHÔNG làm lộ PII).*
