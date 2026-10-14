# FE-11: Sổ Cái Hash-Chain & Merkle Root Audit Center

**Sprint**: Sprint 04  
**Trạng thái**: In Progress  
**Phân hệ**: `src/shared/ui/AppShell.tsx`, `src/features/piiReview/components/`

---

## 1. Mô Tả Nhiệm Vụ (Task Description)

Tích hợp trung tâm kiểm toán Sổ cái mật mã toàn hệ thống, truy cập trực tiếp từ mục "Sổ cái Hash-Chain" trên Sidebar (`AppShell.tsx`). Giúp DPO, kiểm toán viên độc lập và các bên liên quan xem xét toàn bộ chuỗi băm Merkle Root SHA-256 bảo chứng cho các phiên quét, phê duyệt, build và publish dataset.

---

## 2. Yêu Cầu Kỹ Thuật (Technical Requirements)

1. **Vị trí & Điều hướng**:
   - Nút bấm "Sổ cái Hash-Chain" trên Sidebar kích hoạt mở Modal toàn màn hình hoặc Drawer kiểm toán cấp hệ thống.
2. **Cấu trúc dữ liệu Sổ cái (Audit Block Structure)**:
   - `block_index`: Thứ tự khối trong chuỗi liên tục (0, 1, 2, ...).
   - `timestamp`: Thời điểm ghi nhận khối (ISO 8601).
   - `session_id` / `run_id`: Định danh phiên xử lý.
   - `action_type`: `SCAN`, `POLICY_APPROVAL`, `BUILD_SNAPSHOT`, `PUBLISH`, `REVOKE`.
   - `dpo_signer`: Email / Tên DPO phê duyệt (`dpo@company.com`).
   - `merkle_root`: Mã băm gốc Merkle Root 64 ký tự hex (SHA-256) đại diện cho toàn bộ các trường và chính sách đã duyệt.
   - `prev_hash`: Mã băm của khối kiểm toán liền trước.
   - `signature`: Chữ ký mật mã HMAC/RSA xác nhận khối không bị chỉnh sửa.
3. **Tính năng Kiểm chứng Toàn vẹn (Verify Chain Integrity)**:
   - Cung cấp nút bấm **"Kiểm chứng chuỗi băm (Verify Integrity)"**:
   - Khi bấm: Duyệt qua chuỗi khối, tính toán lại hash `SHA-256(prev_hash + merkle_root + timestamp)` và đối chiếu với hash lưu trữ.
   - Hiển thị badge: `Chuỗi băm hợp lệ 100% — Không phát hiện can thiệp` (Màu xanh lá) hoặc cảnh báo đỏ nếu phát hiện sai lệch.
