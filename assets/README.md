# Assets dùng chung - PIIGuard Shield

Bộ tài sản có sẵn trong repo để đồng đội lấy về khi clone/pull code.

## Mascot Pango và logo

![Logo PIIGuard Shield](brand/logo.webp)

![Pango](mascot/pango-default.webp)

| File | Trạng thái |
| --- | --- |
| [pango-default.webp](mascot/pango-default.webp) | Mặc định / chào đón |
| [pango-scanning.webp](mascot/pango-scanning.webp) | Đang quét |
| [pango-detected.webp](mascot/pango-detected.webp) | Phát hiện PII |
| [pango-awaiting.webp](mascot/pango-awaiting.webp) | Chờ duyệt / chờ dữ liệu |
| [pango-loading.webp](mascot/pango-loading.webp) | Đang tải |
| [pango-error.webp](mascot/pango-error.webp) | Lỗi |
| [pango-protected.webp](mascot/pango-protected.webp) | Đã bảo vệ |
| [logo.webp](brand/logo.webp) | Logo ứng dụng |

Pango và logo hiện là ảnh **WebP**, chưa có bản vector SVG trong source.

## SVG có sẵn

- [Brand DNA](svg/piiguard-brand-dna.svg) - bảng nhận diện thương hiệu.
- [UX board](svg/piiguard-user-experience-board.svg) - sơ đồ trải nghiệm.
- [Login background](svg/login-background.svg) - nền màn hình đăng nhập.

Đây là các SVG của dự án, không phải bộ icon Pango dạng vector.

## Dùng trong frontend

App đang dùng bản tại [`front_end/src/assets`](../front_end/src/assets/) thông qua các component có sẵn:

```tsx
import { BrandLogo, Mascot, MascotLoader } from '@/shared/ui';

<BrandLogo size={32} />
<Mascot pose="scanning" size={120} float />
<MascotLoader pose="loading" title="Đang tải dữ liệu" />
```

Thư mục `assets/` ở gốc là bản sao để chia sẻ. Khi đổi ảnh, cập nhật bản trong `front_end/src/assets` và bản chia sẻ tương ứng để hai nơi đồng nhất. Chi tiết tích hợp nằm trong [README frontend](../front_end/README_FE.md#brand--mascot-pango).

## Nguồn và link chia sẻ

- [Figma - Pango Mascot Kit](https://www.figma.com/design/xcSramnWgGISlpaGiHe4MQ)
- [Assets trên Drive (chỉ xem)](https://drive.google.com/drive/folders/1pKfrhXcCfpEoYfcBqcPg5I34EmV-Fz1R)
