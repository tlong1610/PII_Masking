# FE-11: Sổ Cái Hash-Chain & Merkle Root Audit Center

**Sprint**: Sprint 04  
**Trạng thái**: In Progress (Cần tái thiết kế UI vì click vào chưa ưng ý)  
**Phân hệ**: `src/shared/ui/AppShell.tsx`, `src/features/auditLog/components/`, `src/pages/DpoAuditPage.tsx`

---

## 1. Hiện Trạng & Vấn Đề (Current State & UX Pain Point)

- **Backend & Logic đã có (PR #74)**:
  - API backend `/api/v1/audit` và `/api/v1/audit/chain-status` đã hoạt động thật.
  - Đã có hook `useAuditEvents` và `useAuditChainStatus` kiểm chứng chuỗi hash trên server.
- **Vấn đề "Chưa ưng"**:
  - Giao diện hiện tại (`AuditLogView`, `AuditEventsTable`) mới chỉ là một bảng danh sách log dạng phẳng thông thường như admin log, **chưa toát lên bản chất của một Sổ cái Hash-Chain mật mã (Cryptographic Ledger)**.
  - Trên Sidebar mục điều hướng đang để tên là "Nhật ký kiểm toán" thay vì **"Sổ cái Hash-Chain"**.
  - Thiếu tính trực quan hóa chuỗi khối (Block lineage), mắt xích liên kết `prev_hash ➔ block_hash ➔ merkle_root`, và thiếu hiệu ứng tương tác khi bấm nút kiểm chứng tính toàn vẹn chuỗi.

---

## 2. Yêu Cầu Cải Tiến Thiết Kế (UI/UX Redesign Requirements)

1. **Đổi tên & Vị trí trên Sidebar (`DpoLayout.tsx` & `AppShell.tsx`)**:
   - Tên hiển thị chuẩn: **"Sổ cái Hash-Chain"** (kèm icon `AccountTreeOutlined` hoặc `LockClockOutlined`).
2. **Khu vực Tổng quan & Kiểm chứng Mật mã (Cryptographic Verification Center)**:
   - Banner kiểm chứng nổi bật:
     - Badge trạng thái chuỗi: `Chuỗi băm toàn vẹn (Verified Chain)` với màu xanh Emerald.
     - Hiển thị công khai **Head Hash (SHA-256)** và tổng số khối (`total_events`).
     - Nút bấm **"Kiểm chứng toàn vẹn (Verify Chain Integrity)"**: Khi click, hiển thị animation quét qua từng block và xác nhận không có bất kỳ mắt xích nào bị can thiệp.
3. **Trực quan hóa Chuỗi Khối (Visual Hash-Chain / Block Timeline)**:
   - Thay vì chỉ là bảng phẳng, hỗ trợ chế độ xem **Dòng chảy khối băm (Chain Flow / Block Cards)**:
     - Mỗi block hiển thị: `Block #ID`, `Action` (Quét, Duyệt chính sách, Build, Publish, Revoke), `DPO Signer`, `Timestamp`.
     - Hiển thị rõ cặp liên kết: `Prev Hash` ➔ `Block Hash` ➔ `Merkle Root`.
     - Đường nối mũi tên giữa các block thể hiện tính liên tục, bất biến của chuỗi.
4. **Drawer Chi Tiết Khối (Block Inspection Drawer)**:
   - Khi click vào bất kỳ khối nào trong chuỗi ➔ Mở Drawer bên phải hiển thị toàn bộ chứng chỉ mật mã:
     - Merkle Root SHA-256 đầy đủ (64 ký tự hex) kèm nút Copy.
     - Payload metadata (số trường PII được bảo vệ, chính sách tương ứng).
     - Chữ ký xác thực DPO và thuật toán băm áp dụng.
