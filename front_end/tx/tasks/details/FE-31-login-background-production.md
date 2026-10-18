# FE-31: Khôi phục nền đăng nhập trên bản deploy

**Sprint**: Sprint 05 (Release hardening)
**Trạng thái**: Done
**Phân hệ**: `src/features/auth/components/LoginExperience.tsx`

## Vấn đề và nguyên nhân

Trang `/login` production chỉ hiện màu xanh dự phòng; trình duyệt trả `background-image: none`.
Vite chuyển SVG nền thành `data:image/svg+xml,...` chứa dấu nháy đơn. CSS `url(...)` không được bao bằng dấu nháy khiến URL bị trình duyệt loại bỏ. Development phục vụ SVG qua đường dẫn nên không gặp lỗi này.

## Thực hiện

- Bao URL ảnh nền bằng dấu nháy kép trong `backgroundImage`.
- Giữ nguyên SVG, bảng màu, mascot và bố cục.
- Kiểm tra bằng build production thật, không chỉ bằng dev server hoặc jsdom.

## Nghiệm thu

- [x] TypeScript/Vite build và frontend tests thành công.
- [x] Bản production local có `background-image` hợp lệ và tải được SVG.
- [x] So sánh trực quan desktop và mobile: nền có gradient, họa tiết; form vẫn dùng được.
- [x] Ghi lại kết quả, phân biệt bản đã sửa local với bản public chưa deploy lại.

## Kết quả kiểm tra — 18/10/2026

- `npm run build`: pass; `npm test`: 42 files, 184 tests pass.
- `npm run lint -- --ignore-pattern '.vite/**'`: pass. Lệnh lint mặc định gặp lỗi parser trên cache `.vite/deps/*.js` không được track; không thay đổi cấu hình lint trong task này.
- Vite preview tại `http://127.0.0.1:4173/login`: trình duyệt xác nhận background là SVG data URL hợp lệ, hiển thị gradient, chấm lưới và các họa tiết mạng/khiên.
- Kiểm tra desktop 1280×720 và mobile 390×844: không tràn ngang, form và nút đăng nhập hiển thị đủ.
- Bản public trước sửa: `background-image: none`; localhost build sau sửa: `url("data:image/svg+xml,...")`.
- Thay đổi trên nhánh `codex/fix-login-background-production`; đã deploy production từ commit `fdf9732` ngày 18/10/2026. URL public: https://frontend-alpha-fawn-53.vercel.app/login. Vercel deployment `dpl_8LaEYnwf1Vz5cr2Zp4jgK8bamjhK` ở trạng thái READY; kiểm tra trực tiếp xác nhận SVG nền hợp lệ và không tràn ngang. Dev server cũ ở cổng 5173 có lỗi phân giải alias khi kiểm tra; bằng chứng nghiệm thu dùng build production thật qua Vite preview.
