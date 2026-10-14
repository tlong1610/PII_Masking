# PIIGuard Shield - MVP Demo Flow

## Status Hệ Thống

**Frontend**: http://localhost:5173  
**Backend API**: http://localhost:8001/api/v1  
**Database**: Cloud PostgreSQL / MongoDB Atlas (kèm local dev container)

---

## Luồng Demo Hoàn Chỉnh (5 Bước)

### Bước 1: Login DPO
- Tài khoản: `dpo` / `dpo123`
- Vai trò: Data Protection Officer
- Sau login: Vào workspace DPO với 5 tab chức năng và sơ đồ quan hệ trực quan.

### Bước 2: Chọn Nguồn & Quét PII
- Chọn nguồn dữ liệu **Cloud PostgreSQL** hoặc **Cloud MongoDB Atlas** (hỗ trợ thêm nguồn động qua Connection URL).
- Xem sơ đồ quan hệ bảng (**Source Scope Picker Diagram**) với thuật toán bố cục `dagre` tự động, kiểm tra các khóa chính (PK) và khóa ngoại (FK).
- Chọn phạm vi bảng cần quét và bấm **"Bắt đầu quét"**.
- Scanner phát hiện các trường dữ liệu và đề xuất hành động:
  * `customer_id` → `HMAC` (Khóa nối bắt buộc đồng bộ)
  * `full_name` → `MASK`
  * `phone` → `MASK`
  * `email` → `MASK`
  * `notes` → `DROP`

### Bước 3: Thẩm định Rủi ro & Phê duyệt (HITL Review)
- **DPO có quyền xem data (Sample Data / Preview / Split view)** để thẩm định mức độ nhạy cảm và đánh giá rủi ro thực tế.
- Xem điểm rủi ro tất định (Deterministic Risk Score 0–100) theo chuẩn FR-10.
- DPO mở **Inspector Drawer** để điều chỉnh chính sách từng trường:
  * Xem căn cứ pháp lý theo NĐ 13/2023/NĐ-CP và Luật BV DLCN 2025.
  * Tự động cảnh báo và đồng bộ hành động cho khóa nối (Join Keys).
  * Xác nhận trường `UNKNOWN` không phải dữ liệu cá nhân (kèm lý do).
  * Nhập lý do bắt buộc khi ghi đè khuyến nghị của AI hoặc thiết lập hạn chót ngoại lệ (`exceptionUntil`).
- Bấm **"Phê duyệt & Lưu chính sách"**.

### Bước 4: Xây Dựng Dataset & Downstream Verification
- Bấm **"Xây dựng Dataset"**.
- Backend thực thi transform pipeline áp dụng chính sách MASK, HMAC, DROP, KEEP và sinh snapshot vật lý.
- Downstream Verifier tự động kiểm tra tính toàn vẹn (SQL JOIN, `$lookup`, aggregate metrics).
- DPO xem sơ đồ **ERD Lineage Diagram** thể hiện rõ các trường đã biến đổi trên snapshot.
- Khi Verifier PASS, DPO bấm **"Phát hành" (Publish)**.

### Bước 5: Analyst Khai Thác An Toàn
- Đăng nhập: `analyst` / `analyst123`.
- Chỉ xem được các dataset ở trạng thái **PUBLISHED**.
- **Tuyệt đối KHÔNG thấy PII gốc:** Dữ liệu hiển thị qua Data Grid đã được che mờ hoàn toàn.
- Xem sơ đồ ERD của snapshot để nắm cấu trúc bảng phục vụ viết truy vấn phân tích.
- Tải file CSV an toàn (tự động loại bỏ các cột `DROPPED` và áp dụng mask).

---

## Nguyên Tắc Bảo Mật & Quản Trị

* **DPO xem data để đánh giá rủi ro**: DPO là người chịu trách nhiệm pháp lý cao nhất, được quyền xem data (sample/raw preview) để phân loại chính xác và quản trị rủi ro.
* **Zero Raw-PII cho Analyst**: Chuyên viên phân tích tuyệt đối không tiếp cận dữ liệu gốc.
* **Sổ cái kiểm toán bất biến**: Mọi quyết định và phiên bản snapshot được ghi nhận vào Hash-Chain Merkle Root SHA-256.
* **Tuân thủ pháp lý**: Luật Bảo vệ dữ liệu cá nhân 2025 (Luật số 91/2025/QH15), Nghị định 356/2025/NĐ-CP và Nghị định 13/2023/NĐ-CP.
