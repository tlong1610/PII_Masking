# Flow Spec — PIIGuard Shield

Tài liệu này đặc tả toàn bộ các luồng tương tác của người dùng trên PIIGuard Shield frontend, bao gồm luồng rà soát chính, luồng quản trị lịch sử phát hành & thu hồi (Revoke), và các phân hệ từ thanh Sidebar.

## 1. Cấu Trúc Điều Hướng Hai Nhánh Tại DPO Catalog Explorer (Phương Án 1)

Cột bên trái của DPO Workspace (`/dpo`) được phân định thành 2 phân nhánh nghiệp vụ:

```text
DPO Catalog Explorer (Cột bên trái)
  ├── 📂 Data Sources (Quét mới)
  │     ├── sql-demo (PostgreSQL)
  │     ├── nosql-demo (MongoDB)
  │     └── [+ Thêm cơ sở dữ liệu] ──> Mở AddSourceDialog
  │
  └── 📦 Published Snapshots (Lịch sử đã phát hành & Thu hồi)
        ├── customers_orders_v1 [PUBLISHED] ──> Click xem chi tiết & Nút REVOKE
        └── patient_records_v1 [REVOKED]   ──> Click xem lịch sử thu hồi
```

---

## 2. Luồng Nghiệp Vụ Quét & Phát Hành Mới (Data Sources Flow)

1. **Chọn hoặc Thêm Data Source:**
   - DPO chọn nguồn từ danh sách 📂 **Data Sources**, hoặc bấm `+ Thêm cơ sở dữ liệu` (`AddSourceDialog`), nhập URL (`postgresql://...`, `mongodb+srv://...`), bấm Test kết nối (`POST /sources/test`), và Lưu nguồn (`POST /sources`).
2. **Chọn phạm vi bảng trực quan (`SourceScopePickerDiagram`):**
   - Hệ thống tự động introspect schema (`GET /sources/{id}/scope`).
   - Sơ đồ tương tác với thuật toán bố cục `dagre` tự động hiển thị cấu trúc bảng, khóa chính (PK) và khóa ngoại (FK).
   - DPO tích chọn các bảng/collection cần quét và bấm "Bắt đầu quét" (`POST /runs`).
3. **Rà soát chính sách tại DPO Workspace:**
   - DPO chuyển đổi qua các tab có giá trị thực tiễn:
     - **Tab 0 — Overview & PII Schema:** Xem bảng các cột, phân loại NĐ 13, sàn bảo mật tối thiểu, chip đề xuất action.
     - **Tab 1 — Risk & Insights:** Xem Điểm rủi ro tất định FR-10 (0–100) và tỷ lệ bảo vệ L2/L3.
     - **Tab 2 — Audit History & Hash-Chain:** Xem sổ cái Merkle Root SHA-256 của phiên làm việc.
   - **Thao tác Drawer (`FieldPolicyDrawerContent`):** Click vào từng cột để mở Drawer: xem căn cứ pháp lý, đồng bộ khóa nối (Join Keys), xác nhận `UNKNOWN` thành Non-PII, nhập lý do ghi đè hoặc thiết lập thời hạn ngoại lệ (`exceptionUntil`).
4. **Build Snapshot & Downstream Verifier:**
   - DPO lưu quyết định (`PUT /runs/{id}/decisions`) và bấm "Xây dựng Dataset" (`POST /runs/{id}/build`).
   - Hệ thống chạy Verifier kiểm tra SQL JOIN / Mongo `$lookup` / aggregate metrics.
   - Nếu PASS (`VERIFIED`): DPO quan sát sơ đồ `ErdLineageDiagram` thể hiện các tag MASK, HMAC, KEEP, DROPPED, sau đó bấm **"Phát hành Dataset" (Publish)** (`POST /datasets/{id}/publish`).
   - Dataset được lưu trữ vĩnh viễn và xuất hiện trong danh mục 📦 **Published Snapshots**.

---

## 3. Luồng Xem Lại Lịch Sử Phát Hành & Thu Hồi (Published Snapshots & Revoke Flow)

Luồng giải quyết bài toán kiểm soát sau phát hành và xử lý khi hết hạn ngoại lệ:

```text
[DPO click Published Snapshots] ──> [Chọn Snapshot cần kiểm tra]
                                            │
                                            ▼
                               [Hiển thị chi tiết Snapshot]
                               - Tên DB/Snapshot đích
                               - Ngày phát hành & Người duyệt
                               - Danh sách cột đã che / ngoại lệ
                               - Trạng thái: PUBLISHED / REVOKED
                                            │
                                            ▼
                               [DPO click nút Bấm THU HỒI / REVOKE]
                                            │
                                            ▼
                      [Gọi POST /datasets/{id}/revoke]
                                            │
                                            ▼
                      [Trạng thái chuyển sang REVOKED]
            [Analyst lập tức bị ngắt quyền truy cập bản snapshot này]
```

### Các bước chi tiết:
1. **Xem lại lịch sử:** DPO bấm vào danh mục 📦 **Published Snapshots** ở cột trái để duyệt danh sách toàn bộ các database/snapshot đã phát hành trong quá khứ.
2. **Kiểm tra thông tin chi tiết:** Khi click vào một snapshot, màn hình chính hiển thị:
   - Thông tin kết nối và schema đích an toàn (`output_location`).
   - Thời gian phát hành, người phê duyệt, và phiên bản chính sách.
   - Các cột có gắn cờ ngoại lệ (`is_exception: true`) kèm ngày hết hạn (`exception_until`).
3. **Thao tác Thu hồi (Revoke):**
   - Khi ngoại lệ hết hạn hoặc phát hiện nguy cơ rò rỉ, DPO bấm nút **[Thu hồi / Revoke]** màu đỏ.
   - Hộp thoại xác nhận yêu cầu DPO xác nhận hành động.
   - Frontend kích hoạt hook `useRevokeDataset()` gọi `POST /datasets/{id}/revoke`.
   - Trạng thái dataset lập tức chuyển thành `REVOKED`.
   - **Tác động an toàn:** Trang của Analyst (`/analyst`) lập tức loại bỏ dataset này khỏi danh sách truy cập, ngăn chặn việc rò rỉ PII tức thì.

---

## 4. Các Luồng Công Cụ Trên Thanh Sidebar (`AppShell.tsx`)

Mục **Security & Compliance** trên Sidebar cung cấp 3 lối vào độc lập:

```text
Sidebar: Security & Compliance
  ├── 1. [Nghị định 13 Rules]       ──> Mở Interactive Compliance Modal / Drawer
  ├── 2. [Sổ cái Hash-Chain]       ──> Mở Cryptographic Audit Ledger Center
  └── 3. [Demo che dữ liệu]         ──> Mở Masking Showcase (nằm DƯỚI SỔ CÁI)
```

### Luồng 4.1: Tra Cứu Quy Tắc Nghị Định 13 (Interactive Rules Hub)
1. Người dùng bấm **"Nghị định 13 Rules"** trên Sidebar từ bất kỳ màn hình nào.
2. Hệ thống mở Modal/Drawer hiển thị:
   - Bảng quy chuẩn Điều 2 Khoản 3 (PII cơ bản) và Điều 2 Khoản 4 (PII nhạy cảm).
   - Yêu cầu sàn bảo mật tối thiểu (Minimal Masking Floor) cho từng loại dữ liệu.
   - Tìm kiếm nhanh theo tên trường hoặc loại PII.

### Luồng 4.2: Sổ Cái Kiểm Toán Hash-Chain Toàn Hệ Thống (Audit Ledger Center)
1. Người dùng bấm **"Sổ cái Hash-Chain"** trên Sidebar.
2. Hệ thống mở trung tâm kiểm toán Merkle Root:
   - Xem toàn bộ lịch sử các block kiểm toán (Timestamp, Actor, Action, Merkle Root Hash SHA-256).
   - Nút **"Kiểm chứng toàn vẹn" (Verify Chain Integrity)** để chạy thuật toán xác thực chuỗi băm bất biến.
   - Lọc theo loại hành động (`SCAN`, `DECISION`, `BUILD`, `PUBLISH`, `REVOKE`).

### Luồng 4.3: Demo Che Dữ Liệu Tương Tác (Masking Demo Showcase — Dưới Sổ Cái)
1. Người dùng bấm **"Demo che dữ liệu"** nằm ngay **dưới Sổ cái** trên Sidebar.
2. Hệ thống mở không gian Showcase tương tác riêng biệt:
   - Danh sách các loại dữ liệu mẫu: Họ và tên, Số điện thoại, CCCD/CMND, Email, Địa chỉ, Hồ sơ bệnh án, Khóa nối ID.
   - Bảng so sánh trực quan đa chiều (Side-by-side):
     * Dữ liệu gốc mô phỏng (Raw Sample).
     * Khi áp dụng **`MASK`** (Che mờ: `0912***789`, `n***@gmail.com`).
     * Khi áp dụng **`HMAC`** (Băm một chiều bảo toàn tính join).
     * Khi áp dụng **`DROP`** (Cắt bỏ hoàn toàn khỏi bảng).
     * Khi áp dụng **`KEEP`** (Giữ nguyên kèm điều kiện ngoại lệ).
   - Giúp DPO, Analyst và khách hàng hiểu rõ ngay bản chất kỹ thuật mà không cần phải chạy qua cả quy trình scan.
