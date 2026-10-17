# QA-07: Hướng dẫn cho Analyst nói "Đã che một phần" trong khi giá trị bị thay toàn bộ bằng `***`

**Lỗi:** BUG-07 · **Mức độ:** Thấp (nội dung sai) · **Test bắt lỗi:** TC-AN-05 · **Phân hệ:** `model/policyLabels.ts`

## Hiện tượng
Tooltip cột và tab "Các cột & cách dùng" ghi "Đã che một phần: chỉ để nhận biết dạng dữ liệu". Nhưng hành động MASK (`MASK_PLACEHOLDER`) thay **toàn bộ** giá trị bằng `***`, nên Analyst không nhận biết được dạng dữ liệu nào.

## Giải pháp
Đổi câu thành "Đã che toàn bộ (***): chỉ cho biết cột có dữ liệu, không dùng để lọc hay ghép bảng."

Nếu sản phẩm muốn che một phần (`091***789`), backend đã có `partial_mask` (action `PARTIAL`). Việc đổi MASK sang PARTIAL là quyết định sản phẩm và pháp lý, không thuộc task này. Xem OBS-02.

## Nghiệm thu
- [x] TC-AN-05 đạt.
