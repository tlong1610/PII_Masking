# FE-25: Mascot Cho Kết Quả Kiểm Định & Màn Đăng Nhập

**Sprint**: Sprint 05  
**Trạng thái**: Done  
**Phân hệ**: `src/features/piiReview/components/SnapshotTab.tsx`, `src/features/auth/components/LoginExperience.tsx`

## Vấn Đề
- Tab "Dữ liệu cho Analyst" chỉ dùng `Alert` cho mọi trạng thái; khoảnh khắc "dữ liệu đã được bảo vệ" — điểm nhấn của demo — không nổi bật.
- Brand panel màn đăng nhập chỉ có chữ và icon.

## Giải Pháp
1. `SnapshotTab`: thêm banner trạng thái có mascot, giữ nguyên nội dung `Alert` hiện tại:
   - Chưa lưu / `STAGING` → `awaiting`.
   - `REVOKED` / `FAILED` → `error`.
   - `VERIFIED` / `PUBLISHED` → `protected` + câu "Dữ liệu đã qua kiểm định…".
2. Login: Pango `default` (bồng bềnh) trên brand panel màn hình rộng; màn hẹp giữ logo nhỏ để form không bị đẩy xuống.

## Nghiệm Thu
- Test `SnapshotTab`: đúng tư thế mascot theo `datasetStatus`.
- Test đăng nhập hiện có vẫn pass.
