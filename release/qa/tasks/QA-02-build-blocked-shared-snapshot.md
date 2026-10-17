# QA-02: Không build được lượt quét mới khi đã có dataset phát hành, và dataset cũ bị ghi đè

**Lỗi:** BUG-02 · **Mức độ:** Nghiêm trọng · **Test bắt lỗi:** TC-LC-01 · **Phân hệ:** `src/api/sources.py`, `src/api/runs.py`

## Hiện tượng
- Có một dataset nguồn demo đang "Đã phát hành". DPO quét lại nguồn đó và bấm **Lưu**, thì nhận HTTP 409 với thông báo tiếng Anh: "Build blocked: Target snapshot is currently occupied by active PUBLISHED dataset id=8…". Thông báo không chỉ cách xử lý.
- Trên DB dev thật: dataset #2 (run 7) và dataset #8 (run 15) cùng trỏ `postgres://piiguard_snapshot/`. Run 15 đã ghi đè snapshot mà Analyst đang đọc của run 7.

## Nguyên nhân gốc
- Nguồn demo (`sql-demo`, `nosql-demo`) dùng **một** schema hoặc DB snapshot cố định cho mọi run. Chỉ nguồn do người dùng thêm mới được tách theo `_run{id}`.
- Đoạn kiểm tra chặn chỉ lấy dataset PUBLISHED **đầu tiên** (`db.scalar`), nên có lúc lọt và ghi đè.

## Giải pháp
- Mọi nguồn đều dùng snapshot riêng theo run: `{SNAPSHOT_SCHEMA}_run{id}` và `{MONGO_SNAPSHOT_DB}_run{id}`. Build run mới không còn đụng dataset đang phát hành. Thu hồi vẫn xóa đúng snapshot vì đọc từ `output_location`.
- Đoạn kiểm tra chặn giữ lại làm lưới an toàn: duyệt **tất cả** dataset PUBLISHED, thông báo bằng tiếng Việt và nêu rõ lượt quét cần thu hồi.
- Cập nhật pytest: `test_runs_pg.py`, `test_runs_pg_live.py`, `test_runs_mongo.py`, `test_runs_mongo_live.py` theo tên mới; dọn mọi schema/DB `_run*` sau test live.

## Nghiệm thu
- [x] `pytest` 317/317, `ruff check` sạch.
- [x] TC-LC-01 đạt: dataset #1 đang phát hành, run #2 vẫn build ra "Chờ phát hành".
