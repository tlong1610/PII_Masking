# Product Spec — PIIGuard Shield

> Đây là đặc tả mục tiêu. Một số hạng mục Catalog/Revocation được thiết kế theo FE-13 (task đã đóng/chuyển giao), không mặc định là UI đang có. Giao diện DPO hiện tại có 4 tab. **Lưu ý bảo mật:** backend cho phép ngoại lệ `KEEP` trên PII với lý do và thời hạn; khi publish, giá trị gốc có thể vào snapshot cho Analyst. Vì vậy cam kết Zero Raw-PII bên dưới là mục tiêu cần kiểm chứng, chưa phải bảo đảm tuyệt đối của code hiện hành.

PIIGuard Shield là nền tảng quản trị tuân thủ bảo vệ dữ liệu cá nhân (PII Governance Platform) cấp doanh nghiệp, chuyển đổi các cơ sở dữ liệu sản xuất thành các dataset an toàn, có chứng chỉ kiểm toán mật mã và kiểm thử downstream verifier.

## 1. Cam Kết Sản Phẩm (Product Promise)

Hệ thống kết nối tới cơ sở dữ liệu **PostgreSQL và MongoDB trên Cloud** (AWS RDS, GCP Cloud SQL, Supabase, Neon; MongoDB Atlas qua `mongodb+srv://`), cho phép DPO:
1. Quản lý trực quan cả hai nguồn: **Nguồn dữ liệu gốc (Data Sources)** để quét mới và **Lịch sử Snapshot đã phát hành (Published Snapshots)** để quản trị vòng đời.
2. Quét phát hiện và phân loại PII tự động theo Luật BV DLCN 2025 (91/2025/QH15) và Nghị định 356/2025/NĐ-CP.
3. **Thẩm định rủi ro bằng bằng chứng đã khử nhạy cảm** trước khi phê duyệt chính sách che giấu (MASK, HMAC, DROP, KEEP).
4. Cho phép DPO ghi nhận ngoại lệ có hạn (`exceptionUntil`) khi nghiệp vụ cần giữ nguyên PII; hiện backend kiểm tra hạn lúc lưu quyết định, nhưng chưa tự thu hồi snapshot khi ngoại lệ hết hạn.
5. Kiểm thử downstream verifier trước khi phát hành.
6. **Thu hồi (Revoke)** ngay lập tức các snapshot đã phát hành khi hết hạn ngoại lệ hoặc có sự cố rò rỉ dữ liệu.
7. Cung cấp dataset đã được xử lý cho Analyst; ngoại lệ PII `KEEP` hiện có thể để giá trị gốc trong snapshot, nên chưa thể hứa Zero Raw-PII tuyệt đối.

## 2. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Duy nhất PostgreSQL & MongoDB**: Tập trung 100% tài nguyên tối ưu sâu cho SQL (PostgreSQL) và NoSQL (MongoDB). Loại bỏ hoàn toàn các Data Warehouse đắt đỏ (Snowflake/BigQuery).
2. **DPO thẩm định rủi ro bằng bằng chứng đã khử nhạy cảm**: DPO là người chịu trách nhiệm pháp lý cao nhất, review field profile, data shape, thống kê, đề xuất AI và protected preview; DPO không xem raw source value.
3. **Quyền Analyst**: Chuyên viên phân tích chỉ được truy cập dataset `PUBLISHED`; cột `DROPPED` bị loại khỏi preview/export. PII được `KEEP` theo ngoại lệ vẫn có thể hiện nguyên giá trị trong snapshot.
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
- **Tab 0 — Overview & PII Schema (Cốt lõi):** Bảng danh sách trường quét được, phân loại theo NĐ 356 (Cơ bản L2, Nhạy cảm L3, Gián tiếp L1, Non-PII, UNKNOWN), sàn bảo mật, và nút mở Inspector Drawer.
- **Tab 1 — Risk & Insights (Đo lường rủi ro):** Tỷ lệ bảo vệ L2/L3 (100%), Điểm rủi ro tất định FR-10 (0–100, Tier: Low/Medium/High/Critical), và biểu đồ phân bổ chính sách che mờ.
- **Tab 2 — Audit History & Hash-Chain (Kiểm toán theo ngữ cảnh):** Bảng sổ cái Merkle Root SHA-256 lưu lại toàn bộ các phiên Quét, Duyệt, Build và Publish của chính database đó.
- **Tab 3 — Dữ liệu cho Analyst:** Xem trạng thái và preview của snapshot đã bảo vệ, theo quyền hiện có.
*(Lưu ý: Xóa bỏ Tab Permissions & Grants cũ vì là mockup tĩnh không có backend; bỏ Tab Sample Data con bên trong vì đã đưa ra Sidebar thành Showcase riêng).*

### 3.3 Thanh Điều Hướng Sidebar (`AppShell.tsx`): 3 Phân Hệ Độc Lập
Mục **Security & Compliance** trên Sidebar cung cấp 3 công cụ cấp cao:
1. **Quy định pháp luật**: Nút bấm interactive mở Modal/Drawer tra cứu cẩm nang pháp lý, phân loại dữ liệu cá nhân cơ bản/nhạy cảm và sàn bảo mật tối thiểu.
2. **Sổ cái Hash-Chain**: Nút bấm interactive mở Trung tâm kiểm toán toàn vẹn Merkle Root SHA-256 toàn hệ thống kèm công cụ kiểm chứng chuỗi băm (Verify Chain Integrity).
3. **Demo che dữ liệu (Masking Showcase)**: Nằm ngay **DƯỚI SỔ CÁI**, mở giao diện so sánh trực quan đa chiều (Side-by-side: Raw vs MASK vs HMAC vs DROP vs KEEP) cho từng loại dữ liệu (Họ tên, SĐT, CCCD, Email, Địa chỉ, Bệnh án, Khóa nối...).

## 4. Quản Lý Vòng Đời Ngoại Lệ (Exception Lifecycle Management)

| Giai đoạn | Hành động / Trạng thái |
|---|---|
| **Cấp ngoại lệ** | DPO chọn `KEEP` trên trường PII trong Drawer ➔ Bắt buộc nhập **Lý do giải trình** + **Thời hạn ngoại lệ (`exceptionUntil`)** ➔ Ghi nhận vào Hash-Chain. |
| **Đang hiệu lực** | Nếu DPO publish snapshot, Analyst được xem snapshot; PII được `KEEP` theo ngoại lệ có thể hiện nguyên giá trị. |
| **Khi hết hạn** (`now > exceptionUntil`) | Backend hiện không tự đổi quyết định, cảnh báo hay thu hồi snapshot chỉ vì thời hạn đã qua. |
| **Xử lý mong muốn** | Cần người vận hành thu hồi snapshot và build/publish bản thay thế; Catalog Explorer FE-13 đang đóng/chuyển giao, nên đây chưa phải luồng UI được bảo đảm. |
