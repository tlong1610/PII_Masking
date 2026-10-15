# Sprint 04: Governance Hub, Audit Ledger & Dataset Lifecycle Management

**Trạng thái**: Đang triển khai (IN PROGRESS)  
**Mục tiêu**: Nâng cấp PIIGuard Shield thành nền tảng quản trị tuân thủ toàn diện: tích hợp cẩm nang pháp lý Nghị định 13, Trung tâm kiểm toán Sổ cái Hash-Chain, Showcase Demo che dữ liệu trực quan trên Sidebar, và quản lý vòng đời Snapshot đã phát hành (Option 1 Catalog Explorer & Revocation).

---

## 1. Bối Cảnh & Động Lực (Context & Motivation)

Sau khi hoàn thành Sprint 03 với các sơ đồ trực quan (Source Scope Diagram, ERD Lineage Diagram) và kết nối cơ sở dữ liệu động (PostgreSQL / MongoDB), hệ thống cần hoàn thiện các tính năng quản trị cao cấp:
1. DPO cần công cụ tra cứu tức thì các quy tắc pháp lý Nghị định 13/2023/NĐ-CP và Luật BV DLCN 2025 ngay khi đang thẩm định rủi ro.
2. DPO và kiểm toán viên cần kiểm chứng tính toàn vẹn của chuỗi băm (Merkle Root SHA-256) trên toàn hệ thống.
3. Cả DPO và Analyst cần một không gian trực quan riêng biệt để xem demo che mờ đa chiều (Side-by-side: Raw vs MASK vs HMAC vs DROP vs KEEP) theo từng loại dữ liệu, thay vì giấu trong một tab nhỏ của Analyst.
4. DPO cần quản trị vòng đời các dataset đã phát hành: xem lịch sử các snapshot và thực hiện **Thu hồi (Revoke)** khi hết hạn ngoại lệ (`exceptionUntil`) hoặc có sự cố bảo mật.

---

## 2. Phạm Vi Thực Hiện (Scope)

### Task 1: Nghị định 13 Interactive Compliance Drawer (`FE-10`)
- Tích hợp nút bấm interactive tại mục Security & Compliance trên Sidebar (`AppShell.tsx`).
- Mở Drawer/Modal tra cứu pháp lý:
  - Phân loại Dữ liệu cá nhân Cơ bản (L2) vs Nhạy cảm (L3) vs Gián tiếp (L1).
  - Trích dẫn Điều 9, 10, 11, 17, 24 của Nghị định 13/2023/NĐ-CP.
  - Sàn bảo mật kỹ thuật bắt buộc tương ứng cho từng nhóm dữ liệu.

### Task 2: Sổ Cái Hash-Chain & Merkle Root Audit Center (`FE-11`)
- Tích hợp nút bấm interactive trên Sidebar (`AppShell.tsx`) mở Trung tâm Sổ cái toàn hệ thống.
- Hiển thị danh sách các khối kiểm toán: Session ID, DPO Phê duyệt, Merkle Root SHA-256, Khóa HMAC, Chữ ký số, Timestamp.
- Cung cấp tính năng "Verify Chain Integrity" kiểm tra chuỗi băm tính toán lại có khớp 100% với Sổ cái hay không.

### Task 3: Showcase Demo Che Dữ Liệu Trên Sidebar (`FE-12`)
- Đặt mục điều hướng **"Demo che dữ liệu" ngay DƯỚI "Sổ cái Hash-Chain"** trên Sidebar (`AppShell.tsx`).
- Màn hình Showcase tương tác đa chiều:
  - Chọn loại dữ liệu: Họ tên, Số điện thoại, CCCD/CMND, Email, Địa chỉ, Số tài khoản ngân hàng, Thông tin sức khỏe/Bệnh án, Khóa nối (Join Key).
  - So sánh trực quan dạng Side-by-side: `Raw Value` vs `MASK` vs `HMAC` vs `DROP` vs `KEEP`.
  - Giải thích thuật toán ứng dụng (Format-Preserving Masking, SHA-256 HMAC với Secret Salt).

### Task 4: DPO Catalog Explorer — Option 1 & Thu Hồi Dataset (`FE-13`)
- Tái cấu trúc Catalog bên trái DPO Workspace thành 2 phân hệ:
  - 📂 **Data Sources**: Quản lý kết nối PostgreSQL & MongoDB, chọn nguồn để quét mới.
  - 📦 **Published Snapshots**: Xem toàn bộ lịch sử dataset đã phát hành với nhãn trạng thái `PUBLISHED` (Xanh) hoặc `REVOKED` (Đỏ).
- Khi chọn một snapshot: Hiển thị chi tiết metadata, chính sách bảo vệ đã dùng, kết quả Verifier.
- Tích hợp nút bấm **[THU HỒI / REVOKE]** kết nối trực tiếp với hook `useRevokeDataset()` / `api.revokeDataset()`.

### Task 5: Dọn Dẹp DPO Workspace Tabs & Quản Lý Vòng Đời Ngoại Lệ (`FE-14`)
- Tinh giản DPO Workspace còn đúng 3 tab có giá trị thực tiễn:
  - **Tab 0 — Overview & PII Schema**: Bảng trường quét được, sàn bảo mật, Field Policy Drawer, chọn ngày `exceptionUntil`.
  - **Tab 1 — Risk & Insights**: Điểm rủi ro tất định FR-10 (0–100), Tỷ lệ bảo vệ L2/L3, Biểu đồ phân bổ action.
  - **Tab 2 — Audit History & Hash-Chain**: Sổ cái Merkle Root theo ngữ cảnh của chính database đó.
- Loại bỏ Tab Permissions & Grants cũ (mockup tĩnh).
- Quy trình hết hạn ngoại lệ: Đánh dấu vi phạm cảnh báo đỏ khi `now > exceptionUntil`, hướng dẫn luồng Thu hồi (Revoke) ➔ Tái xuất bản v2.

### Task 6: Tinh Giản Tab Demo Che Dữ Liệu (`FE-15`)
- Chuyển "Demo che dữ liệu" thành một Tab / Route toàn màn hình chuẩn trên Sidebar (`/dpo/masking`).
- Loại bỏ hệ thống tab con phân mảnh (họ tên, sđt, địa chỉ...) vì bản chất mask là `***`.
- Xây dựng bảng đối chiếu ma trận duy nhất (RAW vs MASK `***` vs HMAC vs DROP) và hộp tương tác thử nghiệm real-time.

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

- [ ] Click "Nghị định 13 Rules" trên Sidebar mở Drawer tra cứu chuẩn xác, có thể đóng mở mượt mà.
- [ ] Click "Sổ cái Hash-Chain" trên Sidebar mở Trung tâm kiểm toán mật mã với đầy đủ Merkle Root và nút kiểm chứng toàn vẹn.
- [ ] Mục "Demo che dữ liệu" hiển thị ngay dưới "Sổ cái Hash-Chain" trên Sidebar, cho phép tương tác so sánh các chế độ che cho mọi loại PII.
- [ ] DPO Catalog phân tách rõ 2 nhóm Data Sources và Published Snapshots.
- [ ] DPO có thể xem lịch sử các snapshot và bấm nút Revoke để chuyển trạng thái sang `REVOKED`.
- [ ] DPO Workspace chỉ còn 3 tabs hoạt động mượt mà, không còn tab mockup tĩnh.
- [ ] Khi chọn ngoại lệ `KEEP`, bắt buộc nhập lý do và thời hạn `exceptionUntil`.
- [ ] Không có lỗi lint, typecheck; toàn bộ tests cũ và mới đều pass.
