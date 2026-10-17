# QA-01: Phiên đăng nhập bị xóa khi rời trang lúc đang kiểm tra phiên

**Lỗi:** BUG-01 · **Mức độ:** Cao · **Test bắt lỗi:** TC-SEC-02 · **Phân hệ:** `front_end/src/features/auth`

## Hiện tượng
Đăng nhập DPO xong, mở ngay một trang khác (gõ URL, bấm F5, mở link). Kết quả là bị đẩy về `/login` và phải đăng nhập lại.

## Nguyên nhân gốc
- `fetchCurrentUser` nuốt **mọi** lỗi và trả `null`, kể cả lỗi mạng và request bị hủy khi trang điều hướng.
- `AuthProvider` hiểu `null` là "token hết hạn", nên gọi `logout()` và xóa phiên trong `localStorage` ngay lúc trang đang tắt.
- Trang mới mở lên không còn phiên.

## Giải pháp
- `fetchCurrentUser` chỉ trả `null` khi server trả **401**. Các lỗi khác được ném ra.
- `AuthProvider` bắt lỗi đó và **giữ** phiên. Nếu token thật sự hết hạn, request API kế tiếp nhận 401 và vẫn đăng xuất qua `UNAUTHORIZED_EVENT`.

## Nghiệm thu
- [x] Unit test mới trong `authApi.test.ts`: 401 trả `null`; lỗi mạng ném ra.
- [x] TC-SEC-02 đạt: đăng nhập, mở ngay `/dpo/runs`, F5, vẫn đăng nhập.
