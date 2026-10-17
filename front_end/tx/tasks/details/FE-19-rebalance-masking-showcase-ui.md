# FE-19: Tái Cấu Trúc Cân Bằng UI Màn Hình Demo Che Dữ Liệu Theo Design DNA Databricks (Rebalance Masking Showcase UI)

**Sprint**: Sprint 04  
**Trạng thái**: Done  
**Phân hệ**: `src/features/compliance/components/MaskingSandboxCard.tsx`, `src/features/compliance/components/MaskingMatrixTable.tsx`, `src/features/compliance/components/MaskingDemoView.tsx`

---

## 1. Hiện Trạng & Vấn Đề (Current State & Problem)
1. **Lệch trục & mất cân bằng thị giác ở 4 thẻ biến đổi (Live Sandbox)**:
   - Thẻ số 3 "BĂM MẬT MÃ (HMAC)" hiển thị toàn bộ 64 ký tự hex (`3af0a4bfe884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721`) gây rớt dòng 3–4 hàng, trong khi thẻ số 2 "CHE MỜ (MASK ***)" chỉ hiển thị đúng 3 ký tự `***`.
   - Các thẻ không có hộp chứa giá trị (Value Box) đồng nhất chiều cao, khiến chiều cao của 4 thẻ chênh lệch lớn, đường chân trang (footer notes) bị xô lệch, không thẳng hàng.
   - Thẻ số 2 dùng token màu `primary.50` (không tồn tại trong hệ thống theme của Databricks DNA).
2. **Khu vực nhập liệu thử nghiệm (Input & Mẫu nhanh) chưa tối ưu**:
   - Trường nhập liệu `TextField` kéo giãn `fullWidth` trên màn hình 1400px gây cảm giác trống trải và mất cân đối với các khối bên dưới.
   - Các chip mẫu nhanh dàn trải rời rạc bên dưới thay vì được tích hợp hài hòa vào thanh điều khiển.
3. **Tỷ lệ cột trong Ma Trận Che Mờ (`MaskingMatrixTable`) chưa hợp lý**:
   - Cột "Che mờ (MASK ***)" chiếm tới 18% chiều rộng bảng chỉ để chứa 3 dấu sao `***`, gây lãng phí diện tích hiển thị.
   - Trong khi đó, cột "Cơ chế bảo vệ" chứa văn bản giải thích pháp lý & nghiệp vụ chi tiết lại chỉ được chia 20%, khiến nội dung bị bó hẹp, ngắt dòng liên tục.
4. **Sai lệch chỉ số UI Style DNA**:
   - Chỉ số `borderRadius` đang dùng tự do `borderRadius: 2` (16px) thay vì chuẩn `theme.shape.borderRadius` (6px - 8px) theo Databricks Web UI Design System quy định tại `app/theme/theme.ts`.

---

## 2. Yêu Cầu Kỹ Thuật (Technical Requirements)

### A. Tái cấu trúc Hộp Thử Nghiệm (`MaskingSandboxCard.tsx`)
1. **Chuẩn hóa Hộp Hiển Thị Giá Trị (Value Container Box)**:
   - Cả 4 thẻ biến đổi (RAW, MASK, HMAC, DROP) sử dụng hộp chứa có cùng chiều cao cố định `minHeight: 52px` (hoặc `height: 52px`), `display: 'flex'`, `alignItems: 'center'`.
   - Riêng chuỗi HMAC 64 ký tự: Rút gọn hiển thị dạng `3af0a4bf...11ef721` kèm Tooltip xem toàn văn mã băm SHA-256 và nút copy nhanh tiện dụng.
   - Sử dụng đúng màu nền Databricks DNA: Card MASK dùng `primary.light` (`#EBF3FB`), Card HMAC dùng `success.light` (`#ECFDF5`), Card RAW dùng `error.light` (`#FEF2F2`).
   - Căn chỉnh `justifyContent: 'space-between'` cho thẻ Paper để chân trang (mô tả ý nghĩa) luôn thẳng hàng ngang 100%.
2. **Thiết kế lại Thanh Điều Khiển Nhập Liệu (Input Control Bar)**:
   - Bố cục thanh nhập liệu kèm mẫu nhanh cân xứng, gọn gàng, touch target ≥48px.

### B. Tái cấu trúc Tỷ Lệ Cột Ma Trận (`MaskingMatrixTable.tsx`)
1. **Phân bổ lại tỷ lệ cột tối ưu (Golden Ratio)**:
   - Loại dữ liệu: `20%` (Tên + mô tả)
   - Cấp độ PII: `8%` (Chip L1/L2/L3 gọn gàng)
   - Dữ liệu gốc (RAW): `16%`
   - Che mờ (MASK ***): `10%` (Tối ưu không gian cho `***`)
   - Mã băm nối (HMAC): `16%` (Rút gọn 16 ký tự đầu kèm tooltip)
   - Cơ chế bảo vệ: `30%` (Mở rộng để văn bản giải thích thoáng, dễ đọc)
2. **Chuẩn hóa Design System DNA**:
   - Border radius: Đưa về chuẩn `theme.shape.borderRadius` (6px - 8px).
   - Padding bảng: `TableCell` padding chuẩn Databricks (8px 14px).

### C. Cập nhật Kiểm Thử (Unit Tests)
- Kiểm tra render chuẩn xác 4 thẻ biến đổi với giá trị và nhãn chip.
- Kiểm tra tính tương tác của Sandbox khi thay đổi giá trị hoặc chọn chip mẫu.
- Đảm bảo 100% tests, typecheck và lint đạt chuẩn.

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
- [x] 4 thẻ biến đổi (RAW, MASK, HMAC, DROP) có chiều cao bằng nhau, chân thẻ thẳng hàng, không bị vỡ bố cục do chuỗi HMAC.
- [x] Thẻ MASK dùng màu nền `primary.light` chuẩn theme Databricks DNA.
- [x] Bảng Ma trận che mờ có tỷ lệ cột cân đối: cột MASK tinh gọn (10%), cột Cơ chế bảo vệ mở rộng (30%) giúp chữ không bị co cụm.
- [x] Thanh điều khiển nhập liệu và mẫu nhanh cân xứng, chuyên nghiệp.
- [x] 100% test suites pass, 0 lỗi typecheck/lint.
