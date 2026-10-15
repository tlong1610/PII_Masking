# FE-17: Chuẩn Hóa Cơ Chế Che Mờ Dữ Liệu (Họ Tên và Toàn Bộ Các Trường) Thành `***` (Uniform Mask Placeholder)

**Sprint**: Sprint 04  
**Trạng thái**: Done  
**Phân hệ**: `src/features/compliance/model/maskingDemos.ts`, `src/features/compliance/components/`

---

## 1. Hiện Trạng & Vấn Đề (Current State & Problem)
- Trước đây, giá trị che mờ cho Họ và tên ("Nguyễn Văn Phúc") đang để là `N***** V** P***` (che mờ từng từ giữ chữ cái đầu), và các trường khác như SĐT (`091****678`), Email (`p***.n****n@enterprise.vn`), CCCD (`079******345`) dùng cơ chế che mờ cục bộ (Partial Masking).
- Theo thiết kế chuẩn của hệ thống dữ liệu PIIGuard Shield (tương thích trực tiếp với backend `src/transform/mask_engine.py` với `MASK_PLACEHOLDER = "***"`), hành vi MASK bản chất là thay thế hoàn toàn dữ liệu thô bằng ký tự đại diện `***`, triệt tiêu khả năng suy đoán dữ liệu.
- Yêu cầu người dùng: Đổi cơ chế che mờ của "Nguyễn Văn Phúc" thành `***`, và đồng thời áp dụng tương tự cho toàn bộ các trường che mờ khác thành `***`.

---

## 2. Yêu Cầu Kỹ Thuật Đã Triển Khai (Implemented Requirements)
1. **Cập nhật Domain Model (`maskingDemos.ts`)**:
   - Toàn bộ các bản ghi trong `MASKING_DEMO_ITEMS` (Họ tên, SĐT, CCCD, Email, Tài khoản ngân hàng, Hồ sơ y tế, Join key) đều có `maskValue: '***'` (chuẩn `MASK_PLACEHOLDER`).
   - Cập nhật ghi chú thuật toán (`algorithmNote`) và định dạng `preservesFormat: false` đồng nhất với cơ chế MASK tuyệt đối.
2. **Cập nhật Hàm Biến Đổi Tương Tác (`maskString`)**:
   - Hàm `maskString` trả về chuẩn đại diện `***` cho mọi giá trị đầu vào, mô phỏng đúng hành vi `apply_action(value, "MASK")` của backend `mask_engine.py`.
3. **Cập nhật Sandbox Thử Nghiệm (`MaskingSandboxCard.tsx`)**:
   - Đổi nhãn chip thành `Chuẩn MASK ***` và mô tả "Thay thế bằng ký tự đại diện (***), giấu hoàn toàn dữ liệu theo chuẩn MASK_PLACEHOLDER".
4. **Cập nhật Toàn Bộ Unit Tests**:
   - `maskingDemos.test.ts`: kiểm thử `maskString` đồng nhất trả về `***` cho mọi loại dữ liệu và `maskValue` của tất cả items đều chuẩn `***`.
   - `MaskingDemoView.test.tsx`: kiểm thử hiển thị `***` cho Sandbox và bảng Ma trận.
   - `MaskingShowcaseDialog.test.tsx`: kiểm thử chuyển đổi danh mục PII hiển thị `***`.

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
- [x] Dữ liệu mẫu "Nguyễn Văn Phúc" khi áp dụng MASK hiển thị chính xác là `***`.
- [x] Các trường dữ liệu khác (SĐT, Email, CCCD, Ngân hàng, Bệnh án, Khóa nối) đều hiển thị MASK là `***`.
- [x] Bảng Ma trận che mờ (`MaskingMatrixTable`) hiển thị cột MASK là `***` đồng nhất.
- [x] Hàm `maskString(input)` trả về `***` cho mọi dữ liệu thử nghiệm.
- [x] 100% tests (125/125), typecheck và lint vượt qua thành công không có warning/error.
