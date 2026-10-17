# Run 01 — Baseline trên `develop` @ `7625ff6` (trước khi sửa)

- **Ngày chạy:** 2026-10-18
- **Lệnh:** `npx playwright test`, chạy trên worktree sạch của `develop` (cổng 8020/5184)
- **Kết quả:** **4 đạt · 8 fail · 9 không chạy** (5,6 phút)

| Test | Kết quả | Lỗi liên quan |
| --- | --- | --- |
| TC-DPO-01 Đăng nhập DPO | ✓ | |
| TC-DPO-02/03 Chọn phạm vi + quét | ✓ | |
| TC-DPO-04 KPI số cột PII | ✘ | BUG-06: số lớn 53 ≠ L3+L2+L1 = 21 |
| TC-DPO-05 … TC-DPO-10 | không chạy | Chuỗi DPO chạy tuần tự, dừng tại TC-DPO-04 |
| TC-AN-01 … TC-AN-06 | ✘ | Không có dataset phát hành (hệ quả của chuỗi DPO dừng) |
| TC-AN-07 Analyst bị chặn khỏi DPO | ✓ | |
| TC-SEC-01 Sai mật khẩu | ✓ | |
| TC-SEC-02 Phiên sau deep link | ✘ | BUG-01: bị đẩy về `/login` |
| TC-SEC-03, TC-LC-01, TC-LC-02 | không chạy | Chuỗi guardrail tuần tự dừng tại TC-SEC-02 |

## Lỗi xác nhận ngoài test tự động (dò thủ công bằng Playwright trên cùng commit)
Các test không chạy được ở vòng này đã được dò thủ công trước khi viết spec. Chi tiết trong [`logs/ERROR_LOG.md`](../logs/ERROR_LOG.md):
- **BUG-02:** build run #17 trả 409 "Build blocked…"; dataset #2 bị run #15 ghi đè snapshot.
- **BUG-03:** nút "Tải CSV bảng customers" gãy 3 dòng.
- **BUG-04:** CSV 52 cột trộn 5 bảng.
- **BUG-05:** URL báo cáo có `&token=`.
- **BUG-07:** "Đã che một phần" sai với `***`.
