# FE-15: Streamline Masking Demo Tab & Unified Comparison View

**Sprint**: Sprint 04  
**Trạng thái**: Done  
**Phân hệ**: `src/pages/DpoMaskingDemoPage.tsx`, `src/features/compliance/components/MaskingDemoView.tsx`, `src/pages/DpoLayout.tsx`

---

## 1. Hiện Trạng & Vấn Đề (Current State & Problem)
1. **Chưa có Tab/Trang Độc Lập**: Hiện tại, mục "Demo che dữ liệu" trên Sidebar (`DpoLayout.tsx`) mở một Dialog Modal (`MaskingShowcaseDialog.tsx`) thay vì là một trang Tab toàn màn hình nhất quán với các mục khác (`/dpo`, `/dpo/runs`, `/dpo/datasets`, `/dpo/audit`, `/dpo/rules`).
2. **Quá Nhiều Tab Con Không Cần Thiết**: Bản chất của hành động MASK là thay thế chuỗi ký tự bằng dấu sao (`***`). Việc chia thành 7–8 tabs con (Họ tên, SĐT, CCCD, Email, Địa chỉ, Tài khoản, Bệnh án...) khiến người dùng phải click từng tab chỉ để xem kết quả `***`, gây thừa thãi, tốn thao tác và làm rối trải nghiệm.

---

## 2. Yêu Cầu Kỹ Thuật (Technical Requirements)

### A. Chuyển Thành Tab / Route Toàn Màn Hình (`/dpo/masking`)
- Thêm route `routes.dpoMasking = '/dpo/masking'`.
- Đăng ký route trong `App.tsx` dưới layout DPO (`DpoLayout.tsx`).
- Sidebar hiển thị tab "Demo che dữ liệu" chuyển trang mượt mà như `/dpo/rules` và `/dpo/audit`.

### B. Tinh Giản Giao Diện — Loại Bỏ Tabs Con Rườm Rà
- **Không chia tab con**: Bỏ hệ thống tabs/chips chọn từng loại dữ liệu con (Họ tên, SĐT, Địa chỉ, Email...).
- **Bảng đối chiếu tổng hợp trực quan (Unified Comparison Matrix)**:
  - Hiển thị trực tiếp các phương thức xử lý PII trong cùng 1 giao diện gọn gàng:
    1. **RAW**: Dữ liệu gốc (Không bảo vệ).
    2. **MASK**: Che mờ bằng `***` (Bảo tồn format, che giấu danh tính).
    3. **HMAC**: Băm mật mã SHA-256 (Bảo toàn khả năng liên kết dữ liệu / Joinable).
    4. **DROP**: Loại bỏ triệt để trường thông tin.
    5. **KEEP**: Ngoại lệ tạm thời (cảnh báo nguy cơ rủi ro cao).
- **Hộp Thử Nghiệm Tương Tác Trực Tiếp (Interactive Sandbox)**:
  - Cho phép người dùng gõ chuỗi bất kỳ (hoặc bấm chọn nhanh 1-2 mẫu điển hình) và thấy ngay tức thì:
    - Giá trị sau khi MASK (`***`).
    - Giá trị sau khi băm HMAC SHA-256.
    - Trạng thái DROP.
  - Người dùng hiểu ngay bản chất kỹ thuật chỉ trong 5 giây mà không cần bấm qua lại 8 tabs.

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
- [ ] Truy cập `/dpo/masking` hiển thị trang toàn màn hình trong `DpoLayout`.
- [ ] Giao diện gọn gàng, không còn hệ thống tab con phân mảnh.
- [ ] Có bảng so sánh tổng hợp trực quan giữa RAW, MASK (`***`), HMAC, DROP.
- [ ] Có hộp nhập liệu thử nghiệm tương tác real-time.
- [ ] Unit tests đầy đủ, typecheck 0 lỗi.
