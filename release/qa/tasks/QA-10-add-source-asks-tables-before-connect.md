# QA-10: Form "Thêm nguồn dữ liệu" hỏi tên bảng trước khi kết nối

**Lỗi:** BUG-10 · **Mức độ:** Trung bình (UX) · **Nguồn:** phản hồi của chủ sản phẩm · **Phân hệ:** `AddSourceDialog.tsx`, `POST /sources/test`

## Hiện tượng
Form bắt gõ tay "Schema" và "Bảng cần quét (ngăn cách bằng dấu phẩy)" khi chưa kết nối. DPO chưa biết nguồn có những bảng nào. Gõ sai một tên thì bảng đó bị bỏ qua mà không ai biết.

## Giải pháp
- **Bỏ ô "Bảng cần quét".** Bảng được chọn ở bước "Chọn phạm vi" của mỗi lượt quét, từ danh sách thật của nguồn (đã có sẵn). Mỗi lượt quét chọn bảng riêng, nên nhiều bộ phận dùng chung một nguồn được.
- **Schema/Database chọn từ danh sách.**
  - `POST /sources/test` trả thêm `namespaces` và `default_namespace`, chỉ gồm tên.
  - Danh sách bỏ schema hệ thống, `admin`/`local`/`config` và các vùng snapshot của PIIGuard.
  - Tài khoản không có quyền liệt kê thì danh sách chỉ có namespace trong URL.
  - Sau khi kiểm tra kết nối thành công, ô nhập đổi thành danh sách chọn.
- API `POST /sources` vẫn nhận `tables` để giữ tương thích, nhưng form không gửi nữa.

## Nghiệm thu
- [x] `test_user_sources.py`:
  - Kiểm tra kết nối trả danh sách namespace và không lộ mật khẩu.
  - Danh sách bỏ namespace hệ thống và vùng snapshot.
  - Không có quyền liệt kê thì quay về namespace trong URL.
- [x] `AddSourceDialog.test.tsx`:
  - Form không có ô bảng.
  - Sau khi kiểm tra kết nối, Schema thành danh sách chọn và giá trị đã chọn được gửi lên.
- [x] Chạy thật trên Postgres và Mongo Docker local: chỉ trả về `public` và `mydatabase`, vùng snapshot bị ẩn.
