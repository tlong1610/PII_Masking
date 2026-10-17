# FE-10: Nghị Định 13 Interactive Compliance Rules Drawer

**Sprint**: Sprint 04  
**Trạng thái**: Done  
**Phân hệ**: `src/features/compliance/components/Nd13RulesView.tsx`, `src/pages/DpoRulesPage.tsx`

---

## 1. Mô Tả Nhiệm Vụ (Task Description)

Hiện tại, mục "Nghị định 13 Rules" trên Sidebar (`AppShell.tsx`) là một ListItem tĩnh chưa thể tương tác. Nhiệm vụ này xây dựng một Drawer/Modal tra cứu pháp lý tương tác cao, giúp DPO có thể tra cứu nhanh các quy định pháp luật bất cứ lúc nào trong phiên làm việc.

---

## 2. Yêu Cầu Kỹ Thuật (Technical Requirements)

1. **Vị trí & Kích hoạt**:
   - Khi click vào item "Nghị định 13 Rules" trên Sidebar ➔ Mở Drawer bên phải hoặc Modal dialog.
   - Hỗ trợ phím tắt `Esc` hoặc nút đóng để quay lại màn hình làm việc mượt mà.
2. **Nội dung hiển thị**:
   - **Phân loại dữ liệu cá nhân theo NĐ 13**:
     - *Dữ liệu cá nhân Cơ bản (L2)*: Họ tên, ngày sinh, giới tính, nơi cư trú, số điện thoại, email... Sàn bảo mật: Tối thiểu `MASK` hoặc `HMAC`.
     - *Dữ liệu cá nhân Nhạy cảm (L3)*: Quan điểm chính trị/tôn giáo, tình trạng sức khỏe/bệnh án, đời tư tình dục, dữ liệu sinh trắc học, dữ liệu tài chính/ngân hàng, dữ liệu vị trí... Sàn bảo mật: Bắt buộc `MASK` hoặc `DROP` (cấm giữ `KEEP` trừ khi có ngoại lệ nghiệp vụ khẩn cấp có thời hạn).
     - *Dữ liệu Gián tiếp (L1)*: Mã định danh nội bộ, user ID, session token... Sàn bảo mật: Khuyến nghị `HMAC` để giữ liên kết.
   - **Điều khoản trọng yếu**:
     - Điều 9: Quyền của chủ thể dữ liệu (Rút lại sự đồng ý, yêu cầu xóa dữ liệu).
     - Điều 10, 11: Nghĩa vụ bảo vệ dữ liệu và bảo đảm an toàn thông tin.
     - Điều 17: Biện pháp bảo vệ dữ liệu cá nhân nhạy cảm.
     - Điều 24: Đánh giá tác động xử lý dữ liệu cá nhân (DPIA).
3. **Thiết kế UI**:
   - Dùng MUI `Drawer` hoặc `Dialog`, phong cách Material Design 3.
   - Dùng Accordion hoặc Tabs để phân tách các nhóm điều khoản, có thanh tìm kiếm nhanh từ khóa pháp lý.
