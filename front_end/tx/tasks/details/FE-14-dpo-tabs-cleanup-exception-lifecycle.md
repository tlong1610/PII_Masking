# FE-14: DPO Workspace Tabs Cleanup & Exception Until Lifecycle

**Sprint**: Sprint 04  
**Trạng thái**: Done  
**Phân hệ**: `src/features/piiReview/components/DpoReviewExperienceMVP.tsx`, `src/features/piiReview/components/FieldPolicyDrawerContent.tsx`

---

## 1. Mô Tả Nhiệm Vụ (Task Description)

1. Tinh giản và làm sạch hệ thống Tabs trong DPO Workspace: Loại bỏ các tab mockup tĩnh vô nghĩa (Tab Permissions & Grants) và di chuyển các tab dữ liệu mẫu ra Sidebar Showcase, chỉ giữ lại đúng 3 Tabs cốt lõi có giá trị thực tiễn.
2. Tích hợp quản lý vòng đời ngoại lệ có thời hạn (`exceptionUntil`) cho các trường dữ liệu được DPO phê duyệt `KEEP`: Bắt buộc nhập lý do và ngày hết hạn; cảnh báo trực quan khi hết hạn để kích hoạt luồng Thu hồi (Revoke) ➔ Tái xuất bản v2.

---

## 2. Yêu Cầu Kỹ Thuật (Technical Requirements)

1. **Cấu Trúc 3 Tabs DPO Workspace**:
   - **Tab 0 — Overview & PII Schema**:
     - Bảng danh sách các trường quét được gom theo bảng/collection (`CollapsibleTableGroup`).
     - Hiển thị mức độ rủi ro, phân loại NĐ 13, và sàn bảo mật tối thiểu.
     - Nút mở Inspector Drawer (`FieldPolicyDrawerContent`).
   - **Tab 1 — Risk & Insights**:
     - Thẻ chỉ số: Tỷ lệ bảo vệ L2/L3 (100%), Điểm rủi ro tất định FR-10 (0–100, thang phân loại Low/Medium/High/Critical).
     - Biểu đồ phân bổ hành động bảo vệ (`MASK`, `HMAC`, `DROP`, `KEEP`).
   - **Tab 2 — Audit History & Hash-Chain**:
     - Bảng lịch sử kiểm toán riêng của phiên: Log toàn bộ sự kiện quét, chỉnh sửa chính sách, build snapshot, và Merkle Root SHA-256.
   - *(Loại bỏ triệt để Tab Permissions & Grants cũ).*
2. **Quản Lý Vòng Đời Ngoại Lệ (`exceptionUntil`)**:
   - Trong `FieldPolicyDrawerContent.tsx`: Khi DPO chuyển hành động sang `KEEP` trên trường PII:
     - Hiển thị cảnh báo rủi ro màu cam/đỏ: *Ngoại lệ bảo mật — Dữ liệu sẽ không được che mờ*.
     - Bắt buộc nhập **Lý do giải trình (Justification Reason)** (tối thiểu 10 ký tự).
     - Bắt buộc chọn **Ngày hết hạn ngoại lệ (`exceptionUntil`)** qua DatePicker (tối đa 30 ngày).
   - **Cảnh Báo Hết Hạn (Expiration Warning)**:
     - Nếu ngày hiện tại `now > exceptionUntil`:
       - Hiển thị Chip cảnh báo đỏ nhấp nháy: `EXPIRED — SECURITY VIOLATION`.
       - Risk Score tự động tăng lên mức High/Critical.
       - Gợi ý hành động cho DPO: **Thu hồi snapshot cũ (Revoke) ➔ Re-build và Publish snapshot mới (v2)**.
