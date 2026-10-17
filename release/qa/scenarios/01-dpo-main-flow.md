# Kịch bản 01 — Luồng chính của DPO (quét → duyệt → build → kiểm định → phát hành)

**Spec tự động:** [`specs/01-dpo-main-flow.spec.ts`](../specs/01-dpo-main-flow.spec.ts)
**Vai trò:** DPO (`dpo` / `dpo123`) · **Nguồn:** `SQL demo` (PostgreSQL local, dữ liệu tổng hợp)
**Phạm vi quét:** `customers`, `orders`, `order_details`, `support_tickets`, `kyc_documents`

Các test case chạy nối tiếp trên cùng một lượt quét. Mỗi test đều fail nếu trình duyệt có lỗi console hoặc API trả 5xx.

| Mã | Bước | Kết quả mong đợi |
| --- | --- | --- |
| TC-DPO-01 | Đăng nhập DPO bằng cách gõ tài khoản/mật khẩu | Vào `/dpo`, thấy "Lượt quét mới", nhãn "Không trả về giá trị PII gốc", nguồn `SQL demo` |
| TC-DPO-02 | Bỏ chọn tất cả rồi chọn 5 bảng trong danh sách | Dòng tóm tắt ghi "Đã chọn 5/…" |
| TC-DPO-03 | Bấm **Bắt đầu quét** | Chuyển sang `/dpo/runs/{id}`, trạng thái "Chờ duyệt"; không có cột nào ghi "LLM unavailable" |
| TC-DPO-04 | Đọc thẻ KPI "Cột PII phát hiện" | Số lớn = L3 + L2 + L1 (không phải tổng số cột) |
| TC-DPO-05 | Rà toàn bộ màn review | Không xuất hiện bất kỳ giá trị PII gốc nào (so với mẫu lấy từ DB nguồn) |
| TC-DPO-06 | Mở Inspector cột `orders.ship_city`, đổi Giữ nguyên → Che dữ liệu, lưu không ghi lý do | Báo "Bắt buộc ghi lý do cho quyết định này."; ghi lý do rồi lưu → bảng hiện "Che dữ liệu" |
| TC-DPO-07 | Mở `kyc_documents.ocr_text` (L3), mở danh sách hành động | Lựa chọn "Giữ nguyên" bị vô hiệu hóa, ghi chú "Cấm với L3" (lớp chặn thứ hai: validate "Dữ liệu nhạy cảm (L3) không được giữ nguyên.") |
| TC-DPO-08 | Bấm **Lưu** (lưu quyết định + build snapshot) | Trạng thái "Chờ phát hành"; tab "Dữ liệu cho Analyst" ghi "Đã qua kiểm định"; `policy_complete`, `sql_join_hmac`, `zero_raw_pii_egress` đều "Đạt"; bản xem trước không có PII gốc |
| TC-DPO-09 | Bấm **Báo cáo tuân thủ** | Báo cáo mở ở tab mới, URL **không** chứa `token=`; báo cáo không có PII gốc |
| TC-DPO-10 | Bấm **Phát hành** → xác nhận | Trạng thái "Đã phát hành"; Nhật ký hoạt động "nguyên vẹn" và có đủ Quét PII, Lưu quyết định, Tạo dữ liệu cho Analyst, Phát hành |

## Kiểm tra thủ công bổ sung (khi quay demo)
- Sơ đồ quan hệ ở bước chọn phạm vi hiển thị đủ bảng, kéo/zoom được.
- Thông báo toast "Đã quét xong: … cột cần duyệt" xuất hiện sau khi quét.
