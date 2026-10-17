# FE-28: Ẩn Tài Khoản Mẫu Khỏi Bản Release

**Sprint**: Sprint 05 (Release hardening)  
**Trạng thái**: Done  
**Phân hệ**: `src/features/auth/components/LoginExperience.tsx`, `src/features/auth/components/DemoAccountPicker.tsx`, `src/features/auth/model/demoAccounts.ts`

## Vấn Đề
Màn `/login` luôn hiển thị khối "Chọn nhanh tài khoản mẫu" kèm username/mật khẩu (`dpo / dpo123`, `analyst / analyst123`), dòng "Chọn vai trò mẫu hoặc nhập thông tin ủy quyền của bạn", vạch "HOẶC NHẬP THÔNG TIN" và placeholder "VD: dpo hoặc analyst". Đưa lên production là lộ thông tin đăng nhập ngay trên trang công khai.

## Giải Pháp
1. Tách dữ liệu tài khoản mẫu ra `model/demoAccounts.ts` + hàm thuần `isDemoLoginEnabled(env)`:
   - Bật khi chạy dev (`import.meta.env.DEV`) hoặc khi build có `VITE_ENABLE_DEMO_LOGIN=true` (môi trường demo nội bộ).
   - **Tắt mặc định trên bản build production.**
2. Tách UI thẻ tài khoản mẫu ra `DemoAccountPicker.tsx` (giảm kích thước `LoginExperience`).
3. Khi tắt: không render khối tài khoản mẫu, vạch "HOẶC NHẬP THÔNG TIN"; mô tả đổi thành "Nhập tài khoản được cấp để tiếp tục"; placeholder trung tính "Nhập tên tài khoản".
4. Tài khoản cho ban giám khảo đưa qua kênh riêng (form nộp bài / Notion), không đặt trên trang.

## Nghiệm Thu
- Test model: `isDemoLoginEnabled` đúng cho dev / prod / prod + cờ.
- Test UI: bật → có thẻ và điền được `dpo123`; tắt → không còn chữ "tài khoản mẫu", "dpo123", "HOẶC NHẬP THÔNG TIN".
- `npm run build` + mở bản build: không thấy khối tài khoản mẫu.
