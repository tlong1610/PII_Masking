# Frontend Backlog — PIIGuard Shield

Tài liệu quản lý lộ trình phát triển giao diện người dùng (Frontend Backlog) theo kiến trúc Feature-Sliced Design, tuân thủ nghiêm ngặt quy định tại `front_end/AGENTS.md`.

---

## 1. Tổng Quan Các Sprint

| Sprint | Trọng Tâm | Trạng Thái | Deliverables Chính |
|---|---|---|---|
| **Sprint 01** | UI MVP Baseline | **Hoàn thành (DONE)** | Screens `/login`, `/dpo`, `/analyst`, phân quyền theo role, trạng thái loading/empty/error |
| **Sprint 02** | Real API Integration | **Hoàn thành (DONE)** | Tích hợp `realPiiReviewApi`, Zod validation tại boundary, DPO Scan/Review/Build, Analyst Preview |
| **Sprint 03** | Visual Hardening & Dynamic Sources | **Hoàn thành (DONE)** | `SourceScopePickerDiagram` (dagre layout), `ErdLineageDiagram`, `AddSourceDialog` (PostgreSQL/MongoDB Cloud), Field Policy Drawer, Collapsible Table Groups |
| **Sprint 04** | Governance Hub & Lifecycle | **Hoàn thành (DONE)** | Quy định pháp luật (L1 ➔ L2 ➔ L3), Sổ cái Hash-Chain Audit Center, Demo Che Dữ Liệu (/dpo/masking), Tinh giản 3 tabs DPO & Exception Lifecycle |

---

## 2. Chi Tiết Sprint 04 & Tasks

- **FE-10: Nghị định 13 Interactive Compliance Rules Drawer**
  - Mở từ Sidebar (`AppShell.tsx`), tra cứu nhanh các điều khoản Điều 9, 10, 11, 17, 24.
  - Phân loại dữ liệu Cơ bản (L2) vs Nhạy cảm (L3) vs Gián tiếp (L1) và sàn bảo mật tối thiểu.
- **FE-11: Sổ cái Hash-Chain & Merkle Root Audit Center**
  - Mở từ Sidebar (`AppShell.tsx`), hiển thị sổ cái toàn hệ thống các phiên duyệt, khối băm SHA-256, chữ ký số DPO.
  - Công cụ kiểm chứng tính toàn vẹn chuỗi băm (Verify Chain Integrity).
- **FE-12: Sidebar Masking Showcase ("Demo che dữ liệu")**
  - Đặt ngay DƯỚI "Sổ cái Hash-Chain" trên Sidebar (`AppShell.tsx`).
  - Giao diện so sánh trực quan đa chiều (Side-by-side: Raw vs MASK vs HMAC vs DROP vs KEEP) cho mọi loại PII phổ biến.
- **FE-13: DPO Catalog Explorer — Option 1 & Dataset Revocation**
  - Cột Catalog chia 2 nhánh: 📂 Data Sources (quét mới) và 📦 Published Snapshots (lịch sử & quản trị).
  - Tích hợp nút bấm **[THU HỒI / REVOKE]** kết nối `useRevokeDataset()` / `api.revokeDataset()`.
- **FE-14: DPO Workspace Tabs Cleanup & Quản lý vòng đời ngoại lệ**
  - Giữ lại 3 tabs có giá trị thật: Tab 0 (Overview & PII Schema), Tab 1 (Risk & Insights), Tab 2 (Audit History & Hash-Chain).
  - Loại bỏ các tab mockup tĩnh (Permissions & Grants).
  - Quản lý hạn ngoại lệ `KEEP` (`exceptionUntil`), cảnh báo vi phạm khi hết hạn và kích hoạt quy trình Thu hồi ➔ Tái xuất bản v2.

---

## 3. Backlog Hậu MVP (Post-MVP / Future)

1. **P1 — Báo cáo tuân thủ & Xuất chứng chỉ kiểm toán (PDF Export)**:
   - Xuất tài liệu Đánh giá tác động xử lý dữ liệu cá nhân (DPIA) theo mẫu Phụ lục Nghị định 13.
   - Kèm mã băm Merkle Root SHA-256 và chữ ký điện tử DPO.
2. **P2 — MongoDB Nested Object Path Selector**:
   - Trực quan hóa và cho phép chọn sâu các trường nested trong Document (ví dụ `profile.contact.phones[0]`).
3. **P2 — Webhook & Real-time Notification**:
   - Gửi cảnh báo tức thì qua Slack/Teams/Email cho các hệ thống downstream khi một snapshot bị Thu hồi (Revoked).
4. **Out of Scope — OCR/Image/Voice Scan**:
   - Quét file ảnh / PDF scan / voice không thuộc phạm vi cho đến khi backend cung cấp API AI chuyên dụng.
