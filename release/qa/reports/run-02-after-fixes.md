# Run 02 — Sau lượt sửa đầu (QA-01 … QA-07)

- **Ngày chạy:** 2026-10-18 · Nhánh `release/e2e-demo-video`
- **Kết quả lần 2a:** **18 đạt · 2 fail · 1 không chạy**

| Test | Kết quả | Phân tích | Xử lý |
| --- | --- | --- | --- |
| TC-DPO-07 | ✘ (lần chạy trước 2a) | **Lỗi của test:** app khóa hẳn lựa chọn "Giữ nguyên" với L3 (`Cấm với L3`), chặt hơn kịch bản dự kiến | Test kiểm tra lựa chọn bị vô hiệu hóa |
| TC-AN-03 | ✘ | **Báo động giả:** cột `orders.ship_name` trong seed Northwind chứa tên công ty, trùng `customers.company_name` (không phải PII, giữ nguyên hợp lệ). Ghi nhận OBS-05 | Bỏ `orders.ship_name` khỏi mẫu dò rò rỉ |
| TC-LC-01 | ✘ | **Lỗi thật mới, BUG-08:** build run chỉ gồm `customers` và `orders` báo "Pipeline error: UndefinedTable". Verifier demo luôn truy vấn `order_details` | Task [QA-08](../tasks/QA-08-verifier-fails-on-partial-scope.md) |
| TC-LC-02 | không chạy | Chuỗi tuần tự dừng tại TC-LC-01 | |

- **Kết quả lần 2b** (sau QA-08 và chỉnh mẫu dò): **20 đạt · 1 fail**.
- TC-LC-02 fail vì **lỗi của test**: đọc `name` trong khi API trả `dataset_name`. Đã sửa test.
