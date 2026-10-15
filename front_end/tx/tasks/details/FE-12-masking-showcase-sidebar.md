# FE-12: Sidebar Masking Showcase ("Demo Che Dữ Liệu")

**Sprint**: Sprint 04  
**Trạng thái**: Done  
**Phân hệ**: `src/pages/DpoLayout.tsx`, `src/features/compliance/components/MaskingShowcaseDialog.tsx`

---

## 1. Mô Tả Nhiệm Vụ (Task Description)

Di chuyển và nâng cấp màn hình Demo che dữ liệu từ một tab nhỏ bên trong Analyst Workspace thành một phân hệ Showcase độc lập trên Sidebar (`AppShell.tsx`).
Vị trí bắt buộc: **Nằm ngay DƯỚI mục "Sổ cái Hash-Chain"** trên Sidebar.

Màn hình này cho phép người dùng (cả DPO và Analyst) hình dung cách thức che mờ dữ liệu trực quan theo từng loại PII cụ thể, đối chiếu các kỹ thuật che giấu khác nhau.

---

## 2. Yêu Cầu Kỹ Thuật (Technical Requirements)

1. **Vị trí trên Sidebar (`AppShell.tsx`)**:
   - Nằm ngay dưới "Sổ cái Hash-Chain".
   - Icon: `VisibilityOffOutlined` hoặc `SecurityOutlined`.
   - Nhãn: "Demo che dữ liệu" (kèm badge "Showcase").
2. **Giao diện Trải nghiệm (Showcase Experience)**:
   - **Thanh chọn loại dữ liệu (Data Type Selector)**:
     - Họ và tên (Full Name)
     - Số điện thoại (Phone Number)
     - Căn cước công dân / CMND (National ID / CCCD)
     - Địa chỉ Email (Email Address)
     - Địa chỉ nơi ở (Physical Address)
     - Số tài khoản ngân hàng / Thẻ tín dụng (Bank Account / Card)
     - Thông tin sức khỏe / Bệnh án (Medical Record)
     - Khóa nối / Định danh quan hệ (Join Key / Foreign Key)
   - **Bảng đối chiếu Đa chiều (Side-by-Side Comparison)**:
     - `Raw Value`: Dữ liệu gốc minh họa.
     - `MASK (Che mờ định dạng)`: Ví dụ `091****890`, `n****n@domain.com`, `0790******12`.
     - `HMAC (Mã băm bí mật)`: Mã băm 64-char hex bảo toàn tính liên kết nối (Joinable) mà không lộ giá trị.
     - `DROP (Loại bỏ cột)`: Cột bị triệt tiêu hoàn toàn, không xuất hiện trong output vật lý.
     - `KEEP (Ngoại lệ giữ nguyên)`: Cảnh báo rủi ro cao, bắt buộc có `exceptionUntil`.
   - **Hộp giải thích kỹ thuật (Technical Explainer Box)**:
     - Phân tích cơ chế toán học / thuật toán đằng sau phương pháp (ví dụ: Format-Preserving Encryption/Masking, Salted SHA-256 HMAC).
