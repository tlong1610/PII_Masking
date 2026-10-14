# Product Spec — PIIGuard Shield

PIIGuard Shield là nền tảng quản trị tuân thủ bảo vệ dữ liệu cá nhân (PII Governance Platform) cấp doanh nghiệp, chuyển đổi các cơ sở dữ liệu sản xuất thành các dataset an toàn, có chứng chỉ kiểm toán mật mã và kiểm thử downstream verifier.

## 1. Cam Kết Sản Phẩm (Product Promise)

Hệ thống kết nối tới cơ sở dữ liệu **PostgreSQL và MongoDB trên Cloud** (AWS RDS, GCP Cloud SQL, Supabase, Neon; MongoDB Atlas qua `mongodb+srv://`), cho phép DPO:
1. Quản lý trực quan cả hai nguồn: **Nguồn dữ liệu gốc (Data Sources)** để quét mới và **Lịch sử Snapshot đã phát hành (Published Snapshots)** để quản trị vòng đời.
2. Quét phát hiện và phân loại PII tự động theo Luật BV DLCN 2025 và Nghị định 13/2023/NĐ-CP.
3. **Thẩm định rủi ro bằng dữ liệu thực tế** trước khi phê duyệt chính sách che giấu (MASK, HMAC, DROP, KEEP).
4. Áp dụng cơ chế **Ngoại lệ bảo mật có thời hạn (`exceptionUntil`)** khi nghiệp vụ cần giữ nguyên PII.
5. Kiểm thử downstream verifier trước khi phát hành.
6. **Thu hồi (Revoke)** ngay lập tức các snapshot đã phát hành khi hết hạn ngoại lệ hoặc có sự cố rò rỉ dữ liệu.
7. Cung cấp không gian cho Analyst khai thác an toàn tuyệt đối mà không bao giờ tiếp cận PII thô (Zero Raw-PII).

## 2. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Duy nhất PostgreSQL & MongoDB**: Tập trung 100% tài nguyên tối ưu sâu cho SQL (PostgreSQL) và NoSQL (MongoDB). Loại bỏ hoàn toàn các Data Warehouse đắt đỏ (Snowflake/BigQuery).
2. **DPO thẩm định rủi ro bằng dữ liệu thực tế**: DPO là người chịu trách nhiệm pháp lý cao nhất, **có quyền xem data (Sample Data / Preview / Split view)** để phân loại chính xác và đánh giá đúng mức độ rủi ro trước khi duyệt chính sách.
3. **Zero Raw-PII cho Analyst**: Chuyên viên phân tích chỉ được truy cập các dataset ở trạng thái `PUBLISHED` (đã qua MASK, HMAC, DROP) và tải CSV an toàn đã tự động loại bỏ cột `DROPPED`.
4. **Bất biến & Có thể thu hồi (Immutable & Revocable)**:
   - Snapshot đã phát hành mang tính bất biến và được bảo chứng bởi Merkle Root SHA-256 trong Sổ cái Hash-Chain.
   - Khi hết hạn ngoại lệ, **không sửa đè (Update)** và **không xóa sổ (Delete)** để giữ vẹn nguyên bằng chứng kiểm toán.
   - Cơ chế chuẩn: **REVOKE bản cũ (ngắt quyền Analyst tức thì) ➔ RE-BUILD & PUBLISH bản mới (Snapshot v2 đã che mờ)**.
5. **Human-in-the-Loop (HITL)**: Mọi chính sách che mờ bắt buộc phải có DPO phê duyệt (`approval_id NOT NULL`) trước khi sinh snapshot vật lý.

## 3. Kiến Trúc Trải Nghiệm Người Dùng (UX Architecture)

### 3.1 Cột Catalog Explorer Bên Trái DPO (Phương Án 1 - Chuẩn Data Governance)
Cột điều hướng Catalog bên trái của DPO Workspace được chia thành 2 phân hệ rõ ràng:
1. 📂 **Data Sources (Nguồn dữ liệu gốc):**
   - Danh sách các database PostgreSQL / MongoDB đã kết nối.
   - Nút `+ Thêm cơ sở dữ liệu` (`AddSourceDialog`) hỗ trợ nhập connection string, test kết nối thời gian thực và introspect schema.
   - Khi chọn một source: Hiển thị sơ đồ **Source Scope Picker Diagram** (layout `dagre` tự động) để chọn bảng và kích hoạt quét PII mới.
2. 📦 **Published Snapshots (Lịch sử Dataset đã phát hành):**
   - Danh sách toàn bộ các snapshot/database đã được DPO duyệt và phát hành cho Analyst.
   - Hiển thị nhãn trạng thái trực quan: `PUBLISHED` (Đang hoạt động - Xanh) hoặc `REVOKED` (Đã thu hồi - Đỏ).
   - Khi click vào một Snapshot: Hiển thị bảng chi tiết gồm vị trí lưu trữ (`output_location`), ngày phát hành, số dòng, chính sách che mờ đã áp dụng, kết quả Verifier.
   - Cung cấp nút bấm hành động nổi bật: **[THU HỒI / REVOKE]** để DPO ngắt quyền truy cập của Analyst khi hết hạn ngoại lệ hoặc có rủi ro.

### 3.2 DPO Workspace: Giữ Lại Các Tab Có Tác Dụng Thật
Màn hình chi tiết của DPO Workspace loại bỏ các tab mockup rác và giữ lại các tab có giá trị thực tiễn:
- **Tab 0 — Overview & PII Schema (Cốt lõi):** Bảng danh sách trường quét được, phân loại NĐ 13 (Cơ bản L2, Nhạy cảm L3, Gián tiếp L1, Non-PII, UNKNOWN), sàn bảo mật, và nút mở Inspector Drawer.
- **Tab 1 — Risk & Insights (Đo lường rủi ro):** Tỷ lệ bảo vệ L2/L3 (100%), Điểm rủi ro tất định FR-10 (0–100, Tier: Low/Medium/High/Critical), và biểu đồ phân bổ chính sách che mờ.
- **Tab 2 — Audit History & Hash-Chain (Kiểm toán theo ngữ cảnh):** Bảng sổ cái Merkle Root SHA-256 lưu lại toàn bộ các phiên Quét, Duyệt, Build và Publish của chính database đó.
*(Lưu ý: Xóa bỏ Tab Permissions & Grants cũ vì là mockup tĩnh không có backend; bỏ Tab Sample Data con bên trong vì đã đưa ra Sidebar thành Showcase riêng).*

### 3.3 Thanh Điều Hướng Sidebar (`AppShell.tsx`): 3 Phân Hệ Độc Lập
Mục **Security & Compliance** trên Sidebar cung cấp 3 công cụ cấp cao:
1. **Nghị định 13 Rules**: Nút bấm interactive mở Modal/Drawer tra cứu cẩm nang pháp lý, phân loại dữ liệu cá nhân cơ bản/nhạy cảm và sàn bảo mật tối thiểu.
2. **Sổ cái Hash-Chain**: Nút bấm interactive mở Trung tâm kiểm toán toàn vẹn Merkle Root SHA-256 toàn hệ thống kèm công cụ kiểm chứng chuỗi băm (Verify Chain Integrity).
3. **Demo che dữ liệu (Masking Showcase)**: Nằm ngay **DƯỚI SỔ CÁI**, mở giao diện so sánh trực quan đa chiều (Side-by-side: Raw vs MASK vs HMAC vs DROP vs KEEP) cho từng loại dữ liệu (Họ tên, SĐT, CCCD, Email, Địa chỉ, Bệnh án, Khóa nối...).

## 4. Quản Lý Vòng Đời Ngoại Lệ (Exception Lifecycle Management)

| Giai đoạn | Hành động / Trạng thái |
|---|---|
| **Cấp ngoại lệ** | DPO chọn `KEEP` trên trường PII trong Drawer ➔ Bắt buộc nhập **Lý do giải trình** + **Thời hạn ngoại lệ (`exceptionUntil`)** ➔ Ghi nhận vào Hash-Chain. |
| **Đang hiệu lực** | Snapshot được phát hành (`PUBLISHED`), Analyst có thể xem trường này phục vụ công việc khẩn cấp. |
| **Khi hết hạn** (`now > exceptionUntil`) | Quyền `KEEP` mất hiệu lực, vi phạm sàn bảo mật ➔ Risk Score nhảy lên mức High/Critical ➔ Báo cáo tuân thủ đánh dấu cảnh báo đỏ. |
| **Xử lý sau hết hạn** | DPO vào mục **Published Snapshots** bấm **REVOKE** bản cũ ➔ Chỉnh lại trường đó thành `MASK`/`HMAC` ➔ **BUILD & PUBLISH bản Snapshot v2** cho Analyst thay thế. |
