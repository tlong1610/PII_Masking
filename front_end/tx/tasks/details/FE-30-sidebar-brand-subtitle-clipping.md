# FE-30: Sửa Chữ Phụ Đề Sidebar Bị Cắt

**Sprint**: Sprint 05 (Release hardening)  
**Trạng thái**: Done  
**Phân hệ**: `src/shared/ui/AppShell.tsx`

## Vấn Đề
Ở mọi trang DPO, dòng phụ đề dưới "PIIGuard Shield" trên sidebar bị cắt cụt giữa chữ: "Bảo vệ dữ liệu cho doanh nghiệ" (không có dấu "…"), trông như lỗi.

## Giải Pháp
- Cho khối chữ thương hiệu `minWidth: 0` và phụ đề `noWrap` (cắt bằng "…" thay vì cắt ngang chữ), kèm `title` để hover xem đủ.
- Rút gọn phụ đề còn "Bảo vệ dữ liệu cá nhân" để vừa chiều rộng sidebar 240px.

## Nghiệm Thu
- Chụp lại sidebar 1440px: phụ đề hiển thị trọn vẹn.
- Test AppShell hiện có vẫn pass.
