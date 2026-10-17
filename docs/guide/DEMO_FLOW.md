# PIIGuard Shield - Demo Flow (P1 Completed)

## Status Hệ Thống

**Frontend Web**: [http://localhost:5173](http://localhost:5173)
**Backend API**: [http://localhost:8000](http://localhost:8000) (hoặc `http://localhost:8001` khi chạy Docker Compose)
**Database**: Cloud PostgreSQL / MongoDB Atlas (kèm local dev container)
**Trạng thái**: Giai đoạn P1 đã hoàn thành toàn diện (100% backend & frontend tests pass)

---

## Luồng Demo Hoàn Chỉnh (6 Bước)

### Bước 1: Login DPO
- Tài khoản: `dpo` / `dpo123`
- Vai trò: Data Protection Officer
- Sau login: Vào workspace DPO với 4 tab chức năng chuẩn hóa, thanh công cụ chọn nguồn và breadcrumb quản trị.

### Bước 2: Chọn Nguồn & Khám Phá Phạm Vi (Scope Selection)
- Chọn nguồn dữ liệu **Cloud PostgreSQL** hoặc **Cloud MongoDB Atlas** (hỗ trợ thêm nguồn động qua Connection URL an toàn).
- Quan sát sơ đồ quan hệ bảng (**Source Scope Picker Diagram**) với thuật toán bố cục `dagre` tự động, kiểm tra các khóa chính (PK) và khóa ngoại (FK).
- Hệ thống tự động kiểm tra và đưa ra cảnh báo `ScopeLinkWarnings`: khi bỏ bảng cha hoặc bảng trung gian N–N, DPO có thể chọn thêm **Bảng liên kết** (`link_scope`) — chỉ giữ khóa nối HMAC, cột khác DROP — để Analyst vẫn JOIN được mà không rò rỉ dữ liệu thừa.
- Chọn phạm vi và bấm **"Bắt đầu quét"**.

### Bước 3: Thẩm Định Rủi Ro & Phê Duyệt Chính Sách (HITL Review)
- **Nguyên tắc Zero Raw PII**: DPO thẩm định rủi ro dựa trên siêu dữ liệu, data shape, thống kê phân phối định tính (`column_stats.py`) và mức độ nhạy cảm pháp lý; tuyệt đối không hiển thị PII thô.
- **Tab 0 — Tổng quan & phân loại PII:** Bảng danh sách cột nhóm theo bảng (`CollapsibleTableGroup`), lọc theo Action (`ReviewToolbar`), chip đề xuất (`PolicyChips`).
- **Tab 1 — Rủi ro & đánh giá (`RiskInsightsTab`):** Xem điểm rủi ro tất định FR-10 (0–100), tỷ lệ bảo vệ L2/L3, và phân bố chính sách.
- Mở **Inspector Drawer** để điều chỉnh chính sách từng trường:
  * Xem căn cứ pháp lý theo Luật 91/2025/QH15 và NĐ 356/2025/NĐ-CP.
  * Tự động cảnh báo và đồng bộ hành động cho khóa nối (Join Keys).
  * Chuyển trường `UNKNOWN` thành Non-PII (kèm lý do).
  * Nhập lý do bắt buộc khi ghi đè khuyến nghị của AI hoặc thiết lập hạn chót ngoại lệ (`exceptionUntil`).
- Bấm **"Lưu quyết định"**: Backend ghi nhận vào bộ nhớ HITL Few-Shot Memory (`dpo_few_shot_memory.json`) để tự học cho các lần quét sau.

### Bước 4: Xây Dựng Snapshot & Downstream Verification
- Bấm **"Xây dựng Dataset"** (`POST /runs/{id}/build`):
  * Backend thực thi transform pipeline: áp dụng MASK, REDACT (GLiNER cascade cho văn bản tự do), HMAC-SHA-256 (cho khóa join), DROP, KEEP.
  * Dữ liệu được ghi sang cơ sở dữ liệu snapshot vật lý riêng biệt (`piiguard_snapshot_db` / `prod_db_protected`).
  * Downstream Verifier tự động chạy các bài test kiểm tra tính toàn vẹn (SQL JOIN, MongoDB `$lookup`, aggregate metrics).
- DPO kiểm tra tab **"Dữ liệu cho Analyst"**: xem kết quả Verifier (số dòng khớp, join match, zero leak).
- Khi Verifier PASS, DPO bấm **"Phát hành" (Publish)**: tự động cấp quyền truy cập an toàn cho toàn bộ Analyst.

### Bước 5: Xem Demo Che Mờ & Ma Trận Pháp Lý
- Điều hướng tới **Demo Che Mờ** (`/dpo/masking`):
  * Trải nghiệm **Live Sandbox**: gõ văn bản thử nghiệm chứa email, SĐT, CCCD để xem cơ chế MASK, REDACT, HMAC tức thời.
  * Xem **Bảng ma trận kỹ thuật bảo vệ dữ liệu**: so sánh chi tiết cơ chế và trường hợp áp dụng.
- Điều hướng tới **Quy định pháp luật** (`/dpo/rules`):
  * Xem ma trận phân loại chuẩn mực: L1 (Gián tiếp) $\rightarrow$ L2 (Cơ bản) $\rightarrow$ L3 (Nhạy cảm).
  * Nhấp các link văn bản pháp luật chính thức trích từ Cổng thông tin Chính phủ.
- Điều hướng tới **Nhật Ký Kiểm Toán** (`/dpo/audit`):
  * Xem nhật ký hoạt động nhóm theo ngày, câu văn tự nhiên dễ hiểu, kiểm tra Merkle Root SHA-256.

### Bước 6: Analyst Khai Thác An Toàn
- Đăng nhập: `analyst` / `analyst123`.
- Chỉ thấy các dataset ở trạng thái **PUBLISHED**.
- **Không thấy PII gốc của các trường đã che:** Data Grid preview hiển thị dữ liệu đã MASK/HMAC/REDACT/DROP. Trường PII được DPO duyệt `KEEP` theo ngoại lệ sẽ hiện nguyên giá trị — tránh dùng ngoại lệ này trong kịch bản demo.
- Xem sơ đồ ERD của snapshot để nắm cấu trúc bảng phục vụ viết truy vấn phân tích.
- Tải file CSV an toàn (tự động loại bỏ các cột `DROPPED` và áp dụng mask/HMAC).

---

## Nguyên Tắc Bảo Mật & Quản Trị Cốt Lõi

* **Zero Raw PII (mục tiêu)**: DPO UI không render raw source value; LLM prompt, report và audit log không chứa PII thô. Giới hạn đã biết: ngoại lệ PII `KEEP` đưa giá trị gốc vào snapshot cho Analyst.
* **Sổ cái kiểm toán bất biến**: Mọi quyết định và phiên bản snapshot được ghi nhận vào Hash-Chain Merkle Root SHA-256 (`/audit/verify`).
* **1 Run = 1 Dataset**: Vòng đời run và dataset được quản lý hợp nhất; hành vi Thu hồi (Revoke) xóa snapshot vật lý và đưa run về `READY_TO_BUILD` để DPO có thể tinh chỉnh và build lại.
* **Tuân thủ pháp lý**: Căn cứ danh mục Luật Bảo vệ dữ liệu cá nhân 2025 (Luật số 91/2025/QH15), Nghị định 356/2025/NĐ-CP.
