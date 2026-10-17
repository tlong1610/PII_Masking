# QA-04: "Tải CSV bảng customers" xuất cột của cả 5 bảng, tên cột bị trùng

**Lỗi:** BUG-04 · **Mức độ:** Cao (sai dữ liệu giao cho Analyst) · **Test bắt lỗi:** TC-AN-03 · **Phân hệ:** `AnalystDatasetExperienceMVP.tsx`

## Hiện tượng
File `run-1-snapshot.csv` có header gồm 52 cột của mọi bảng (`order_id`, `customer_id` lặp lại nhiều lần). Các dòng chỉ có giá trị ở cột của `customers`, còn lại để trống. File không mở đúng được trong Excel hoặc pandas.

## Nguyên nhân gốc
- API preview trả `columns` của **mọi** bảng trong dataset và `rows` của bảng đang chọn.
- Lưới hiển thị có lọc theo `source_path === selected_table`, nhưng `buildProtectedCsv` thì không lọc.

## Giải pháp
- `buildProtectedCsv` lọc cột theo `selected_table`, giống lưới hiển thị.
- Tên file thêm tên bảng: `run-1-snapshot-customers.csv`.

## Nghiệm thu
- [x] TC-AN-03 đạt: header không trùng, có `contact_name`, không có `ship_name`; không có PII gốc.
