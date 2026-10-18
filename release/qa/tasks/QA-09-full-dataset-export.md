# QA-09: Analyst không tải được toàn bộ dataset

**Lỗi:** BUG-09 · **Mức độ:** Cao (Analyst nhận thiếu dữ liệu mà không biết) · **Test bắt lỗi:** TC-AN-03, TC-AN-03b · **Phân hệ:** `src/api/datasets.py`, `AnalystDatasetExperienceMVP.tsx`

## Hiện tượng
- Analyst chỉ tải được bảng đang xem, không có cách lấy cả 5 bảng một lần.
- CSV được ghép trong trình duyệt từ API xem trước nên tối đa 200 dòng. Bảng lớn hơn bị cắt mà không có cảnh báo.

## Giải pháp
- **Backend:** thêm `GET /api/v1/datasets/{id}/export`.
  - Không có `table`: trả về ZIP, mỗi bảng một tệp `<bảng>.csv`, đủ mọi dòng đọc từ snapshot đã bảo vệ.
  - Có `?table=`: trả về CSV của riêng bảng đó, cũng đủ mọi dòng.
  - Dùng chung bộ kiểm tra quyền với preview (`_readable_dataset`): Analyst phải được cấp quyền, dataset phải ở trạng thái PUBLISHED, đã thu hồi thì bị chặn.
  - Không bao giờ xuất cột bị DROP.
  - CSV có BOM UTF-8 để Excel đọc đúng tiếng Việt.
  - Mỗi lần xuất ghi audit `export_dataset` kèm danh sách bảng.
- **Frontend:**
  - Nút chính **Tải toàn bộ (N bảng, ZIP)**, nút phụ **Tải CSV bảng X**.
  - Bỏ phần ghép CSV trong trình duyệt và giới hạn 200 dòng.

## Nghiệm thu
- [x] `tests/test_api/test_datasets.py`:
  - ZIP đủ bảng, header đúng các cột không bị DROP.
  - Xuất một bảng trả về CSV; bảng lạ trả 404.
  - Có audit `export_dataset`.
  - Chặn khi chưa phát hành, khi không có grant và khi chưa đăng nhập.
- [x] TC-AN-03: ZIP có đúng 5 tệp, số dòng mỗi tệp bằng bảng nguồn, không có `ocr_text`, không có PII gốc.
- [x] TC-AN-03b: CSV bảng `customers` đủ mọi dòng, chỉ có cột của `customers`.
- [x] TC-AN-04: hai nút nằm gọn trong card.
