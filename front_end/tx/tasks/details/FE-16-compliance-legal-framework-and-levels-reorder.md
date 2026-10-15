# FE-16: Legal Compliance Framework & PII Levels Ordering (L1 ➔ L2 ➔ L3)

**Sprint**: Sprint 04  
**Trạng thái**: Done  
**Phân hệ**: `src/features/compliance/`, `src/pages/DpoRulesPage.tsx`, `src/pages/DpoLayout.tsx`

---

## 1. Hiện Trạng & Vấn Đề (Current State & Problem)
1. **Tên gọi & Văn bản Luật**: Tab điều hướng và tiêu đề đang gắn cứng "Nghị định 13", trong khi khung pháp lý bảo vệ dữ liệu cá nhân hiện nay đã chuyển dịch sang **Luật Bảo vệ Dữ liệu Cá nhân** và các quy định pháp luật hiện hành. Cần đổi tên tab và tinh chỉnh văn bản cho phù hợp, tránh chỉ đề cập riêng một nghị định đơn lẻ.
2. **Trật tự phân loại L1, L2, L3 bị lộn xộn**: Trước đây thứ tự mảng đang xếp là `L2 ➔ L3 ➔ L1`, gây khó hiểu cho người dùng. Cần sắp xếp theo trật tự logic tăng dần về cấp độ bảo mật:
   - **L1**: Dữ liệu gián tiếp / Định danh kỹ thuật / Khóa nối bảng (Indirect / Technical ID)
   - **L2**: Dữ liệu cá nhân cơ bản (Basic PII: Họ tên, SĐT, Email, CCCD...)
   - **L3**: Dữ liệu cá nhân nhạy cảm (Sensitive PII: Sức khỏe, tài chính, sinh trắc học...)

---

## 2. Yêu Cầu Kỹ Thuật (Technical Requirements)

### A. Đổi Tên Tab & Nội Dung Text
- **Sidebar (`DpoLayout.tsx`)**: Đổi nhãn từ `"Nghị định 13 Rules"` thành **`"Quy định pháp luật"`**.
- **Trang toàn màn hình (`Nd13RulesView.tsx`)**:
  - Tiêu đề: **"Quy Định Pháp Luật & Chuẩn Bảo Vệ Dữ Liệu"**.
  - Mô tả: Bao quát cả Luật Bảo vệ Dữ liệu Cá nhân và các Nghị định hướng dẫn thi hành.
  - Cập nhật text trong Drawer và mô tả các điều khoản cho trung lập, chuyên nghiệp.

### B. Sắp Xếp Lại Trật Tự L1 ➔ L2 ➔ L3
- Cập nhật mảng `PII_CLASSIFICATION_RULES` trong `src/features/compliance/model/nd13Rules.ts`:
  1. **L1** (Gián tiếp / Khóa nối) đặt đầu tiên.
  2. **L2** (Cơ bản) đặt thứ hai.
  3. **L3** (Nhạy cảm) đặt thứ ba.
- Cập nhật các component hiển thị tương ứng (`Nd13RulesView.tsx`, `Nd13RulesDrawer.tsx`).

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
- [ ] Sidebar hiển thị tên tab "Quy định pháp luật" trỏ đến `/dpo/rules`.
- [ ] Màn hình quy định pháp luật hiển thị thẻ L1 đầu tiên, sau đó đến L2, cuối cùng là L3.
- [ ] Toàn bộ nội dung văn bản được chuẩn hóa, không còn thiên vị một nghị định cũ.
- [ ] Unit tests và typecheck 100% sạch.
