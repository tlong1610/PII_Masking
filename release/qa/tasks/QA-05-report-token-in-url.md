# QA-05: Báo cáo tuân thủ mở bằng URL chứa token phiên (`?token=…`)

**Lỗi:** BUG-05 · **Mức độ:** Cao (bảo mật) · **Test bắt lỗi:** TC-DPO-09, TC-SEC-03 · **Phân hệ:** `DpoReviewExperienceMVP.tsx`, `src/api/deps.py`

## Hiện tượng
Bấm "Báo cáo tuân thủ" thì mở tab `…/runs/1/report?format=html&token=<bearer token>`. Token phiên DPO bị lộ ở các chỗ sau:
- Lịch sử trình duyệt.
- Access log của server và proxy.
- Ảnh chụp màn hình.
- Link copy gửi đi.
Backend nhận `?token=` ở **mọi** endpoint, không riêng báo cáo.

## Giải pháp
- Frontend mở tab trống ngay khi bấm (để không bị chặn popup). Sau đó tải HTML báo cáo bằng `fetch` có header `Authorization` (`fetchRunReportHtml` → `apiRequestText` mới trong `shared/api/client.ts`) và hiển thị qua blob URL.
- Backend bỏ hẳn tham số `token` khỏi `get_current_token` và `get_current_user`, chỉ nhận header Bearer.
- `test_report_api.py` đổi kỳ vọng: HTML qua header trả 200; `?token=` trả 401.

## Nghiệm thu
- [x] TC-DPO-09 đạt: URL báo cáo không có `token=`, nội dung đúng.
- [x] TC-SEC-03 đạt: `GET /runs?token=…` trả 401.
