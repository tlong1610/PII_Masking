# Run 04 — Xuất toàn bộ dataset và nhiều bộ phận dùng chung một DB

- **Ngày chạy:** 2026-10-18 · Nhánh `release/e2e-qa`
- **Lý do chạy:** phản hồi của chủ sản phẩm sau run 03:
  1. Nhiều bộ phận cùng lấy dữ liệu từ một database, nhưng mỗi bộ phận cần các bảng khác nhau.
  2. CSV tải về phải đủ các bảng để Analyst phân tích.
- **Kết quả:** **22/22 đạt** (49 giây). Lần chạy đầu có 9 test hỏng, 9 test không chạy. Nguyên nhân là môi trường: worktree mới, Vite tạo cache dependency nên lần mở `/login` đầu tiên quá 30 giây, các test chạy tuần tự sau đó bị kéo theo. Chạy lại khi cache đã có thì đạt hết, không phải sửa code.

## 1. Nhiều bộ phận, cùng database, khác bảng
- Đã hỗ trợ từ QA-02: mỗi lượt quét ghi snapshot vào vùng riêng (`<schema>_run{id}`), nên các dataset phát hành từ cùng một nguồn không ghi đè nhau.
- Test mới `test_departments_publish_different_tables_of_one_source_side_by_side`:
  - Hai lượt quét trên cùng `sql-demo`, một lượt chọn `customers`, một lượt chọn `orders`.
  - Cả hai build và phát hành đều thành công, cùng ở trạng thái PUBLISHED, mỗi dataset nằm trong một schema riêng.
- **Còn thiếu (chưa làm):** khi phát hành, hệ thống tự cấp quyền cho *mọi* Analyst, và frontend chưa có giao diện để DPO chọn bộ phận hay người nhận. API cấp và thu hồi quyền (`/datasets/{id}/grants`) đã có sẵn, nhưng hiện chỉ gọi được trực tiếp.

## 2. Tải toàn bộ dataset (BUG-09 → QA-09)

| Test | Nội dung |
| --- | --- |
| TC-AN-03 | ZIP có đúng 5 tệp CSV. Số dòng từng tệp bằng số dòng bảng nguồn. Không trùng cột, không có `ocr_text`, không có PII gốc. |
| TC-AN-03b | CSV bảng `customers` đủ mọi dòng, chỉ có cột của `customers`. |
| TC-AN-04 | Hai nút tải nằm gọn trong card. |

## Kiểm thử hồi quy

| Bộ | Kết quả |
| --- | --- |
| Backend `pytest` (gồm live Postgres/Mongo Docker) | 321 passed (thêm 3 test) |
| `ruff check src tests release` | sạch |
| Frontend `vitest run` | 188 passed (thêm 2 test cho `apiRequestFile`) |
| `tsc -b`, `eslint src` | sạch |
