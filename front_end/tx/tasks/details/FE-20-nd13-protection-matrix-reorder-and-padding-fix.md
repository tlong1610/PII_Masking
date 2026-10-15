# FE-20: Đảo Thứ Tự Ma Trận Bảo Vệ PII (L1 ➔ L2 ➔ L3) & Khắc Phục Lệch Padding Văn Bản Pháp Luật Nguồn (Compliance Tab Fixes)

**Sprint**: Sprint 04  
**Trạng thái**: Done  
**Phân hệ**: `src/features/compliance/components/Nd13RulesView.tsx`, `src/features/compliance/model/nd13Rules.ts`

---

## 1. Hiện Trạng & Vấn Đề (Current State & Problem)
1. **Thứ tự Cấp độ PII trong "Ma trận hành động bảo vệ" bị ngược (L3 ➔ L2 ➔ L1)**:
   - Tại Tab 3 "Ma trận hành động bảo vệ" trong trang Quy định pháp luật (`Nd13RulesView.tsx`), bảng đối chiếu đang hiển thị dòng L3 (Nhạy cảm) ở trên đầu, sau đó đến L2 (Cơ bản), rồi cuối cùng là L1 (Gián tiếp).
   - Điều này không đồng nhất với Tab 1 "Phân loại PII (L1 ➔ L2 ➔ L3)" và toàn bộ cấu trúc định danh của hệ thống PIIGuard Shield (chuẩn đi từ mức thấp lên cao: L1 ➔ L2 ➔ L3).
2. **Lệch padding phải vs trái ở khối "Văn Bản Pháp Luật Nguồn & Dẫn Chứng Trực Tiếp"**:
   - Khối `LegalSourcesSection` dùng MUI `<Grid container spacing={2}>` đặt trực tiếp trong `<Card sx={{ p: 2.5 }}>`.
   - Cơ chế của MUI Grid v5 sinh ra CSS `margin-left: -16px` và `width: calc(100% + 16px)` mà không có `margin-right: -16px`. Điều này kết hợp với `Card` có `overflow: hidden` khiến thẻ Paper thứ 2 (bên phải) bị đẩy sát mép viền ngoài, tạo cảm giác khoảng đệm bên phải (padding-right) bị hẹp bất đối xứng so với bên trái (padding-left).
3. **Chỉ số UI Style DNA chưa chuẩn hóa đồng nhất**:
   - Một số thành phần như `Card` văn bản nguồn, `ClassificationCard`, `ArticleCard` vẫn dùng `borderRadius: 2` (16px) thay vì chuẩn `theme.shape.borderRadius` (`borderRadius: 1.5`, tức 6px - 8px) theo Databricks Web UI Design System.
   - Bảng Ma trận bảo vệ chưa có tỷ lệ cột và căn giữa tối ưu cho các nhãn hành động (MASK, HMAC, DROP, KEEP).

---

## 2. Yêu Cầu Kỹ Thuật (Technical Requirements)

### A. Đảo thứ tự bảng Ma trận hành động bảo vệ (L1 ➔ L2 ➔ L3)
1. Khai báo model chuẩn `PII_ACTION_MATRIX` trong `src/features/compliance/model/nd13Rules.ts`:
   - **Dòng 1 (L1 — Gián tiếp)**:
     - Định nghĩa: *User ID, Session ID, Khóa nối liên kết*
     - MASK: Tùy chọn (Default)
     - HMAC: Khuyến nghị (Success)
     - DROP: Tùy chọn (Default)
     - KEEP: Cho phép (Info)
   - **Dòng 2 (L2 — Cơ bản)**:
     - Định nghĩa: *Họ tên, SĐT, CCCD, Email, Nơi cư trú*
     - MASK: Khuyến nghị (Success)
     - HMAC: Hợp lệ (Info)
     - DROP: Hợp lệ (Default)
     - KEEP: Có thời hạn (Warning)
   - **Dòng 3 (L3 — Nhạy cảm)**:
     - Định nghĩa: *Bệnh án, tài chính, tôn giáo, sinh trắc học*
     - MASK: Bắt buộc (Success)
     - HMAC: Tùy chọn (Default)
     - DROP: Bắt buộc (Success)
     - KEEP: Cấm tuyệt đối (Error)
2. Render bảng `Table` trong `Nd13RulesView.tsx` duyệt qua `PII_ACTION_MATRIX`, căn giữa các cột hành động, thêm nhãn Chip L1/L2/L3 có màu sắc tương ứng chuẩn trực quan.

### B. Khắc phục lỗi lệch Padding khối Văn Bản Pháp Luật Nguồn
1. Thay thế `<Grid container spacing={2}>` bằng CSS Grid container thuần MUI:
   ```tsx
   <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, width: '100%' }}>
   ```
   Loại bỏ hoàn toàn lỗi negative margin `calc(100% + 16px)` của MUI Grid, bảo đảm khoảng đệm padding trái và phải luôn bằng nhau 100% (`p: 2.5` đối xứng hai bên).
2. Chuẩn hóa `borderRadius: 1.5` cho Card văn bản nguồn và các card con.

### C. Đồng nhất Design DNA & Kiểm thử
1. Đưa tất cả `borderRadius: 2` về `borderRadius: 1.5` trong `Nd13RulesView.tsx`.
2. Bổ sung unit test trong `nd13Rules.test.ts` và `Nd13RulesView.test.tsx` kiểm chứng thứ tự hàng L1 ➔ L2 ➔ L3 và nội dung bảo vệ tương ứng.
3. Chạy toàn bộ test suites, typecheck, lint, build.

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
- [x] Bảng "Ma trận hành động bảo vệ" hiển thị đúng thứ tự L1 (Gián tiếp) ➔ L2 (Cơ bản) ➔ L3 (Nhạy cảm).
- [x] Khối "Văn Bản Pháp Luật Nguồn & Dẫn Chứng Trực Tiếp" có padding trái và phải hoàn toàn đối xứng, không còn hiện tượng padding phải bị hẹp.
- [x] Tất cả các Card và Container trên màn hình tuân thủ chuẩn `borderRadius: 1.5` (Databricks Design DNA).
- [x] 100% tests passing, 0 lỗi typecheck/lint, build thành công.

