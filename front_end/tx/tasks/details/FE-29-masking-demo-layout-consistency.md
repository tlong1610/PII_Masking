# FE-29: Sửa Vỡ Layout & Đồng Nhất Màn Demo Che Dữ Liệu (`/dpo/masking`)

**Sprint**: Sprint 05 (Release hardening)  
**Trạng thái**: Done  
**Phân hệ**: `src/features/compliance/components/MaskingDemoView.tsx`, `MaskingSandboxCard.tsx`, `TransformResultCard.tsx`, `MaskingMatrixTable.tsx`, `model/maskingDemos.ts`

## Hiện Trạng (chụp ở 1440px và 390px)
1. **Lưới 4 thẻ kết quả bị tràn**: `Grid` lệch phải ~16px so với nội dung, thẻ DROP vượt khỏi viền card cha (desktop) và cả 4 thẻ tràn mép phải (mobile).
2. **Tiêu đề thẻ xuống dòng xấu**: "2. CHE MỜ (MASK ***)", "3. BĂM MẬT MÃ (HMAC)" bị bẻ 2 dòng vì chip chiếm chỗ; chiều cao tiêu đề 4 thẻ lệch nhau.
3. **4 thẻ là 4 khối code copy-paste** (~250 dòng), mỗi thẻ tự đặt viền/màu khác nhau → khó giữ đồng nhất.
4. **Ngôn ngữ lẫn lộn**: "SECURITY & COMPLIANCE", "(Masking Showcase)", "(Live Sandbox)", "(Unified Protection Matrix)", "(Input Value)" — trong khi các màn khác dùng tiếng Việt.
5. **Icon tiêu đề sai nghĩa**: `PlayArrow` trông như nút bấm phát video.
6. **Bảng ma trận trên mobile**: không có độ rộng tối thiểu → mỗi ô bị bóp còn 1–2 chữ/dòng; tiêu đề "CHE MỜ (MASK ***)" và ô "*** (Mất khả năng Join)" xuống dòng.
7. **Mã HMAC trong bảng là chuỗi cố định** (hash của "test", "password"…), không khớp với sandbox.
8. **Dữ liệu mẫu giống người thật** ("Nguyễn Văn Phúc", email `phuc.nguyen@…`) — trái nguyên tắc dữ liệu giả lập của `AGENT.md`.
9. **Khoảng đệm khung nhập liệu quá lớn** (`p: 4`), input `minWidth` cố định dễ tràn ở màn hẹp.

## Giải Pháp
- Thay `Grid` bằng CSS grid (`display: grid`, `gridTemplateColumns: { xs: 1fr, sm: repeat(2,1fr), lg: repeat(4,1fr) }`, `gap`) — không margin âm, không tràn.
- Tách `TransformResultCard` dùng chung cho 4 thẻ (data-driven theo tone theme: `error`/`primary`/`success`/`default`); chip đặt dưới tiêu đề, tiêu đề 1 dòng.
- Việt hoá tiêu đề, giữ thuật ngữ kỹ thuật trong chip (`MASK`, `HMAC`, `DROP`); icon `ScienceOutlined` cho sandbox.
- Bảng: bọc `overflow-x: auto`, `minWidth` cho bảng, `whiteSpace: nowrap` cho cột mã; HMAC tính bằng `simulateHmacSha256(rawValue)` giống sandbox.
- Dữ liệu mẫu: thay bằng giá trị giả lập rõ ràng (`Nguyễn Văn A`, `0900000001`, `nguyenvana@example.com`…) và ghi chú "dữ liệu giả lập".
- Khung nhập: `p: { xs: 2, sm: 2.5 }`, input `flex: 1` thay `minWidth` cố định.

## Nghiệm Thu
- Test cập nhật theo tiêu đề mới; test HMAC bảng = HMAC sandbox; test không còn giá trị mẫu cũ.
- Chụp lại 1440px & 390px: không tràn, tiêu đề thẻ 1 dòng (desktop), bảng cuộn ngang trên mobile.
