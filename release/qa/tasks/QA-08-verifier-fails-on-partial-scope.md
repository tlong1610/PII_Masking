# QA-08: Build lỗi "UndefinedTable" khi phạm vi quét không có đủ `orders` + `customers` + `order_details`

**Lỗi:** BUG-08 · **Mức độ:** Cao · **Test bắt lỗi:** TC-LC-01 · **Phân hệ:** `src/verifier/sql_verifier.py`

## Hiện tượng
DPO quét nguồn `SQL demo` chỉ với `customers` + `orders`, rồi bấm Lưu. Lượt quét chuyển sang "Lỗi"; kết quả kiểm định có một dòng `postgres_snapshot_pipeline` Không đạt với chi tiết "Pipeline error: UndefinedTable". Lỗi đã có từ `develop`, không do QA-02 gây ra.

## Nguyên nhân gốc
- `run_postgres_verifiers` (nhánh nguồn demo) luôn chạy `verify_join_hmac` (`orders` ⨝ `customers`) và `verify_aggregate_revenue` (thêm `order_details`).
- Snapshot chỉ chứa các bảng trong phạm vi quét, nên phép kiểm tra tham chiếu bảng không tồn tại và cả pipeline đổ lỗi.

## Giải pháp
- Chỉ chạy một phép kiểm tra baseline khi **mọi** bảng nó cần đã được build: join HMAC cần `orders` và `customers`; doanh thu cần thêm `order_details`.
- `zero_raw_pii_egress` vẫn luôn chạy.
- Gọi với `tables=None` thì giữ nguyên hành vi cũ (đủ bộ demo).
- Thêm pytest `test_demo_checks_run_only_when_their_tables_were_built`.

## Nghiệm thu
- [x] `pytest` 318/318, `ruff` sạch.
- [x] TC-LC-01 đạt: run #2 (customers + orders) build ra "Chờ phát hành".
