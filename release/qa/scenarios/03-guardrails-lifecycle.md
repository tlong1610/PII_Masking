# Kịch bản 03 — Rào chắn bảo mật & vòng đời dataset

**Spec tự động:** [`specs/03-guardrails-lifecycle.spec.ts`](../specs/03-guardrails-lifecycle.spec.ts)
**Tiền điều kiện:** Kịch bản 01 đã phát hành một dataset.

| Mã | Bước | Kết quả mong đợi |
| --- | --- | --- |
| TC-SEC-01 | Đăng nhập `dpo` với mật khẩu sai | Báo "Tài khoản hoặc mật khẩu không chính xác.", vẫn ở `/login` |
| TC-SEC-02 | Đăng nhập DPO rồi mở ngay `/dpo/runs`, tải lại trang | Vẫn đăng nhập, thấy "Lịch sử lượt quét" |
| TC-SEC-03 | Gọi `GET /runs?token=<token DPO>` không kèm header | 401 — token không được nhận qua URL |
| TC-LC-01 | Khi dataset trước vẫn đang phát hành, quét lại cùng nguồn (2 bảng) và bấm **Lưu** | Build thành công, trạng thái "Chờ phát hành"; không còn "Build blocked" |
| TC-LC-02 | Thu hồi dataset đã phát hành từ Lịch sử quét, rồi đăng nhập Analyst | Tab "Đã phát hành (0)"; Analyst không còn thấy dataset đó |
