# FE-24: Mascot Cho Trạng Thái Rỗng / Lỗi / Đang Tải

**Sprint**: Sprint 05  
**Trạng thái**: Done  
**Phân hệ**: `src/shared/ui/StateNotice.tsx`, `src/shared/ui/MascotLoader.tsx`, `src/features/piiReview/components/DpoReviewExperienceMVP.tsx`, `src/features/piiReview/components/AnalystDatasetExperienceMVP.tsx`

## Vấn Đề
- `StateNotice` chỉ có icon `InboxOutlined` / `ErrorOutline` 40px.
- Đang quét PII và đang tải nguồn chỉ có `CircularProgress`; demo không truyền đạt được "hệ thống đang làm gì".
- Empty state của Analyst tự vẽ icon xám với màu hardcode (`#F3F4F6`, `#6B7280`, `#111827`).

## Giải Pháp
1. `StateNotice`: thay icon bằng `Mascot` (empty → `default`, error → `error`), thêm prop `pose` để ghi đè. Dùng ở mọi nơi đang gọi `StateNotice` (DPO, lịch sử quét, nhật ký kiểm toán, dataset detail).
2. `MascotLoader` (shared): mascot + `CircularProgress`/thông điệp, `role="status"`, `aria-live="polite"`.
3. DPO: đang tải nguồn → `MascotLoader pose="loading"`; đang quét → `pose="scanning"` giữ nguyên câu mô tả cũ.
4. Analyst: đang tải → `MascotLoader pose="loading"`; chưa có dataset → `StateNotice` (pose `awaiting`) thay khối tự vẽ, bỏ màu hardcode.

## Nghiệm Thu
- Test `StateNotice` chọn đúng mascot theo `kind`/`pose`; test `MascotLoader` có `role="status"`.
- Test cũ của DPO/Analyst vẫn pass.
