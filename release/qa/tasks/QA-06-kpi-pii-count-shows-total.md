# QA-06: Thẻ "Cột PII phát hiện" hiển thị tổng số cột thay vì số cột PII

**Lỗi:** BUG-06 · **Mức độ:** Trung bình (số liệu sai trên màn chính) · **Test bắt lỗi:** TC-DPO-04 · **Phân hệ:** `RunKpiCards.tsx`

## Hiện tượng
- Thẻ ghi "Cột PII phát hiện **53** cột" trong khi chỉ có L3 2 + L2 17 + L1 2 = **21** cột PII. 53 là tổng số cột, gồm cả 32 cột "Khác".
- Lịch sử quét và báo cáo tuân thủ đều ghi 21, nên các màn mâu thuẫn nhau.

## Giải pháp
Số lớn hiển thị `L3 + L2 + L1`, đơn vị đổi thành "/ 53 cột", giữ nguyên thanh phân bổ và chú giải.

## Nghiệm thu
- [x] TC-DPO-04 đạt: số lớn = L3 + L2 + L1.
