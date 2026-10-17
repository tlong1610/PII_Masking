# Sprint 05: Brand Identity & Linh Vật Pango

**Trạng thái**: Hoàn thành (DONE)  
**Thời gian**: 17/10/2026 → 18/10/2026 (trước hạn nộp Demo Day 18/10 23:00)  
**Mục tiêu**: Đưa linh vật tê tê **Pango** và logo mới vào giao diện để sản phẩm có nhận diện riêng, đồng thời biến các trạng thái chờ/rỗng/lỗi/thành công thành khoảnh khắc dễ hiểu cho DPO và Analyst.

**Nguồn thiết kế**: Figma — [PIIGuard Shield — Pango Mascot Kit](https://www.figma.com/design/xcSramnWgGISlpaGiHe4MQ) (component `Pango`, 7 biến thể `State`, component `Logo`).

---

## 1. Bối Cảnh

- Logo hiện tại là icon MUI `LayersOutlined` trong ô vuông xanh — không có nhận diện riêng, trùng với nhiều app khác.
- Trạng thái chờ/rỗng/lỗi chỉ có spinner hoặc icon xám; khi demo, người xem không thấy hệ thống "đang làm gì".
- Team đã có bộ 7 tư thế mascot + 1 logo (PNG 1254px, ~1MB/ảnh, 2 ảnh có nền đặc).

## 2. Bảng Trạng Thái → Tư Thế Mascot

| State (Figma) | Asset | Dùng ở đâu |
| --- | --- | --- |
| `Default` | `pango-default.webp` | Màn đăng nhập (brand panel), empty state chung |
| `Scanning` | `pango-scanning.webp` | DPO đang quét PII |
| `Detected` | `pango-detected.webp` | Dự phòng: cảnh báo phát hiện PII (chưa gắn màn hình) |
| `Awaiting` | `pango-awaiting.webp` | Chưa lưu quyết định / Analyst chưa có dataset |
| `Loading` | `pango-loading.webp` | Tải nguồn dữ liệu, tải danh sách dataset |
| `Error` | `pango-error.webp` | `StateNotice kind="error"`, verifier FAILED, đã thu hồi |
| `Protected` | `pango-protected.webp` | Dữ liệu đã qua kiểm định / đã phát hành |

## 3. Phạm Vi & Task

| ID | Task | Kết quả |
| --- | --- | --- |
| FE-23 | Brand assets & component `Mascot` / `BrandLogo` | Asset WebP tối ưu, favicon, `shared/ui/Mascot.tsx`, logo mới ở AppShell + Login |
| FE-24 | Mascot cho trạng thái rỗng / lỗi / đang tải | `StateNotice` + `MascotLoader`, DPO scanning, Analyst empty/loading |
| FE-25 | Mascot cho kết quả kiểm định & màn đăng nhập | `SnapshotTab` (Awaiting / Protected / Error), Pango trên brand panel |
| FE-26 | Tài liệu & bằng chứng | TASKS_INDEX, README_FE, link Figma |
| FE-27 | Sửa port proxy dev của Vite | `/api` → 8000, ghi đè bằng `VITE_PROXY_TARGET` |
| FE-28 | Ẩn tài khoản mẫu khỏi bản release | Không lộ `dpo/dpo123` trên trang đăng nhập production |
| FE-29 | Sửa vỡ layout & đồng nhất `/dpo/masking` | Lưới thẻ không tràn, tiếng Việt thống nhất, bảng responsive, dữ liệu giả lập |
| FE-30 | Phụ đề sidebar bị cắt | Phụ đề hiển thị trọn vẹn |

## 4. Nguyên Tắc

- Mascot là **trang trí**: `alt=""` + `aria-hidden` khi đã có tiêu đề chữ; không thay thế thông điệp trạng thái.
- Asset ≤ 60KB/ảnh (WebP 480px), lazy-load, có `width`/`height` để không giật layout.
- Hiệu ứng nhẹ (bồng bềnh 3s) và tắt khi `prefers-reduced-motion`.
- Không đổi luồng nghiệp vụ, API hay test hiện có ngoài phần UI trạng thái.

## 5. Nghiệm Thu

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` sạch.
- Test mới cho `Mascot`, `StateNotice` (mascot theo `kind`), `SnapshotTab` (tư thế theo trạng thái dataset).
- Kiểm tra thủ công: Login, DPO workspace (chưa có nguồn / đang quét / tab Dữ liệu cho Analyst), Analyst (đang tải / chưa có dataset).
