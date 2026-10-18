# Kịch bản 02 — Luồng Analyst khai thác dữ liệu đã bảo vệ

**Spec tự động:** [`specs/02-analyst-flow.spec.ts`](../specs/02-analyst-flow.spec.ts)
**Vai trò:** Analyst (`analyst` / `analyst123`) · **Tiền điều kiện:** Kịch bản 01 đã phát hành một dataset.

| Mã | Bước | Kết quả mong đợi |
| --- | --- | --- |
| TC-AN-01 | Đăng nhập Analyst | Vào `/analyst`; danh sách "Dataset đã phát hành" có `run-{id}-snapshot`, nhãn "Kiểm định đạt n/n" |
| TC-AN-02 | Lần lượt xem 5 bảng | Mỗi bảng có dữ liệu; không có PII gốc; `kyc_documents` **không** có cột `ocr_text`, `file_path` (đã DROP) |
| TC-AN-03 | Bấm **Tải toàn bộ (ZIP)** | ZIP có đúng 5 tệp `<bảng>.csv`; mỗi tệp có số dòng bằng bảng nguồn (không chỉ trang xem trước), không trùng tên cột, không có cột bị DROP (`ocr_text`), không có PII gốc |
| TC-AN-03b | Chọn `customers`, bấm **Tải CSV bảng customers** | Chỉ có cột của `customers`, đủ mọi dòng, không có cột bảng khác, không có PII gốc |
| TC-AN-04 | Quan sát header dataset | Hai nút tải nằm gọn trong card, chữ trên một dòng, không bị cắt |
| TC-AN-05 | Tab "Các cột & cách dùng" | Giải thích đúng từng cách biến đổi; không hứa "che một phần" khi giá trị bị thay toàn bộ bằng `***` |
| TC-AN-06 | Tab "Quan hệ giữa các bảng" | Sơ đồ có các bảng `public.customers`, `public.orders` |
| TC-AN-07 | Mở `/dpo`; gọi `/runs`, `/sources`, `/audit` bằng token Analyst | UI báo "Không có quyền truy cập"; API trả 403 |
