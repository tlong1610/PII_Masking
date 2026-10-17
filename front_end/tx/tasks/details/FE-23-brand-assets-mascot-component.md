# FE-23: Brand Assets & Component Mascot / BrandLogo

**Sprint**: Sprint 05  
**Trạng thái**: Done  
**Phân hệ**: `public/`, `index.html`, `src/assets/mascot/`, `src/shared/ui/Mascot.tsx`, `src/shared/ui/BrandLogo.tsx`, `src/shared/ui/AppShell.tsx`, `src/features/auth/components/LoginExperience.tsx`

## Vấn Đề
- Logo là icon MUI `LayersOutlined` — không có nhận diện riêng; tab trình duyệt không có favicon.
- Ảnh mascot gốc là PNG 1254px ~1MB/ảnh; `pango-loading` có nền đen đặc, `pango-protected` có nền trắng đặc.

## Giải Pháp
1. Xử lý asset (script ngoài repo, Pillow): tách nền đặc bằng flood-fill từ 4 góc, cắt viền trong suốt, căn vuông, xuất:
   - `src/assets/mascot/pango-<state>.webp` (480px, ~25–50KB).
   - `public/favicon-32.png`, `public/apple-touch-icon.png`, `public/logo-192.png`, `public/logo-512.png`, `src/assets/brand/logo.webp`.
2. `index.html`: favicon, apple-touch-icon, `theme-color`, mô tả tiếng Việt.
3. `shared/ui/Mascot.tsx`: prop `pose` (7 tư thế), `size`, `label` (có label → ảnh có nghĩa; không có → trang trí `aria-hidden`), `float` (hiệu ứng bồng bềnh, tắt khi reduced motion). Ảnh có `width/height`, `loading="lazy"`, `decoding="async"`.
4. `shared/ui/BrandLogo.tsx`: logo app dùng chung cho AppShell và Login, thay `LayersOutlined`.

## Nghiệm Thu
- Test `Mascot`: đúng asset theo `pose`, trang trí vs có nghĩa (alt/aria-hidden).
- AppShell & Login hiển thị logo mới; favicon xuất hiện trên tab.
