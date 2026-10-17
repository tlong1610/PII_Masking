# FE-21: Chuẩn Hóa Trục Layout Toàn Trang & Loại Bỏ Lồng Viền Đôi (Standardize Page Layout & Remove Double Nesting)

**Sprint**: Sprint 04  
**Trạng thái**: Done  
**Phân hệ**: `src/features/compliance/components/MaskingDemoView.tsx`, `src/features/compliance/components/Nd13RulesView.tsx`

---

## 1. Hiện Trạng & Vấn Đề (Current State & Problem)
1. **Lệch trục thụt lề toàn trang giữa các tab (Double Padding & MaxWidth Indentation)**:
   - Toàn bộ ứng dụng được bọc bởi `AppShell` ([`AppShell.tsx`](../../../src/shared/ui/AppShell.tsx)) với padding chuẩn `p: { xs: 2, md: 3 }` (24px).
   - Các trang khác (`/dpo/rules`, `/dpo/runs`, `/dpo/datasets`, `/dpo/audit`) đều trả về trực tiếp `<Stack spacing={3}>` bắt đầu từ mép 24px và trải đều 100% màn hình.
   - Riêng trang Demo che dữ liệu ([`MaskingDemoView.tsx`](../../../src/features/compliance/components/MaskingDemoView.tsx)) lại bị bọc thêm `<Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>`. Hệ quả là trang bị thụt kép 48px và bị co cụm vào giữa, gây lệch trục thụt lề rõ rệt khi người dùng chuyển đổi qua lại giữa các tab trên Sidebar.
2. **Lồng viền đôi & thụt cấp 3 tầng ở Ma trận hành động bảo vệ**:
   - Tại Tab 3 của [`Nd13RulesView.tsx`](../../../src/features/compliance/components/Nd13RulesView.tsx), bảng đối chiếu được đặt trong `<Box sx={{ p: { xs: 2, md: 3 } }}>` và bọc thêm `<TableContainer component={Paper} variant="outlined">`.
   - Cấu trúc này tạo ra 2 lớp khung viền Paper lồng nhau (Double Paper Border) và thụt vào trong tới 3 cấp (`24px padding + 1px viền + 14px cell`), không đồng nhất với cấu trúc bảng tràn viền (Edge-to-Edge) chuẩn Databricks như tại `DatasetListView`, `AuditEventsTable` và `RunHistoryView`.

---

## 2. Yêu Cầu Kỹ Thuật (Technical Requirements)

### A. Chuẩn hóa Layout Trang Demo Che Dữ Liệu (`MaskingDemoView.tsx`)
1. Bỏ container `<Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>`.
2. Trả về trực tiếp `<Stack spacing={3}>` giống các trang DPO khác, để `AppShell` làm điểm kiểm soát padding duy nhất.
3. Toàn bộ các thẻ trong trang tự động bung đều 100% chiều ngang, thẳng hàng hoàn toàn với các tab khác trên Sidebar.

### B. Khử Lớp Viền Lồng Đôi Bảng Ma Trận Pháp Lý (`Nd13RulesView.tsx`)
1. Đưa `TableContainer` ra ngoài `<Box sx={{ p: 3 }}>`, đặt trực tiếp dưới thanh điều hướng Tabs của `Paper`.
2. Bỏ `component={Paper} variant="outlined"` trên `TableContainer` để tránh tạo viền kép lồng nhau.
3. Bảng ma trận hiển thị tràn viền (Edge-to-Edge) bên trong Paper cha, thẳng hàng hoàn hảo với đường phân cách của Tabs phía trên.
4. Điều chỉnh padding cho Tab 0 và Tab 1 về chuẩn `p: { xs: 2, md: 2.5 }` (20px) đồng bộ với khối `LegalSourcesSection` phía trên.

### C. Kiểm thử & Đảm bảo chất lượng
1. Đảm bảo 100% test suites, typecheck, lint, build chạy thành công.

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
- [x] Trang Demo che dữ liệu không còn bị thụt kép và co cụm maxWidth, dàn đều 100% thẳng trục với tất cả các trang khác.
- [x] Bảng Ma trận bảo vệ tại Tab 3 không còn 2 lớp khung viền lồng nhau, hiển thị edge-to-edge chuyên nghiệp chuẩn Databricks UI.
- [x] 100% tests passing, 0 lỗi typecheck/lint, build thành công.
