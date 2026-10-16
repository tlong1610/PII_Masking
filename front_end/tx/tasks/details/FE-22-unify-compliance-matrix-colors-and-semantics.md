# FE-22: Chuẩn Hóa Bảng Màu DNA & Ngữ Nghĩa Ma Trận Bảo Vệ PII (Unify Compliance Matrix Colors & Semantics)

**Sprint**: Sprint 04  
**Trạng thái**: Done  
**Phân hệ**: `src/features/compliance/components/Nd13RulesView.tsx`, `src/features/compliance/model/nd13Rules.ts`

---

## 1. Hiện Trạng & Vấn Đề (Current State & Problem)
1. **Màu sắc và thuật ngữ hành động phân tán, thiếu hệ thống ("tùm lum tào lao")**:
   - Cùng một bản chất là phương án được phép/tùy chọn, bảng lại dùng tới 3 từ khác nhau: *"Tùy chọn"*, *"Hợp lệ"*, *"Cho phép"*.
   - Màu sắc chip bị gán tùy tiện: "Hợp lệ" ở cột HMAC có màu xanh dương (`info`), nhưng "Hợp lệ" ở cột DROP lại có màu xám (`default`); "Cho phép" lại dùng `info`.
   - "Bắt buộc" và "Khuyến nghị" cùng dùng chung màu xanh lá (`success`), khiến người dùng không thể phân biệt được đâu là quy định **bắt buộc theo luật** và đâu là **khuyến nghị kỹ thuật tối ưu**.
2. **Lặp từ và vỡ hàng ở cột "Cấp độ PII"**:
   - Cột Cấp độ PII đang render: `<Chip label={row.level} />` và bên cạnh là `<Typography>{row.levelLabel}</Typography>`.
   - Vì `row.levelLabel` vốn đã chứa `"L1 — Gián tiếp"` nên UI hiển thị thành `[L1] L1 — Gián tiếp` (chữ L1 bị lặp lại 2 lần). Khi chiều rộng cột hẹp, `[L1]` rớt thành dòng trên và `L1 — Gián tiếp` rớt thành dòng dưới, gây mất thẩm mỹ.

---

## 2. Kế Hoạch Chuẩn Hóa Màu Sắc DNA & Ngữ Nghĩa (Design & Color Plan)

### A. Chuẩn hóa 5 Mức Độ Pháp Lý Theo Bảng Màu Databricks DNA
Toàn bộ ma trận hành động được quy chuẩn về đúng 5 trạng thái với màu ngữ nghĩa (Semantic Palette) cố định từ `theme.ts`:

| Trạng thái | Thuật ngữ chuẩn | Ý nghĩa pháp lý / kỹ thuật | Màu sắc Databricks DNA | Mã Token / Background |
| :--- | :--- | :--- | :--- | :--- |
| **BẮT BUỘC** | **Bắt buộc** | Yêu cầu pháp lý tối thiểu bắt buộc của Luật & Nghị định | **Databricks Navy (`primary`)** | `color="primary"` (`#1B51A4`), nền `#EBF3FB`, chữ navy đậm |
| **KHUYẾN NGHỊ** | **Khuyến nghị** | Phương án bảo vệ tối ưu nhất (Best Practice) | **Emerald Green (`success`)** | `color="success"` (`#16A34A`), nền `#ECFDF5`, chữ xanh lá đậm |
| **HỢP LỆ** | **Hợp lệ** | Phương án hợp chuẩn, được phép cấu hình khi cần | **Neutral Slate (`default`)** | `color="default"` (`#4B5563`), nền `#F3F4F6`, viền nhẹ `#E5E7EB` |
| **CÓ ĐIỀU KIỆN** | **Có thời hạn** | Ngoại lệ rủi ro, cần DPO phê duyệt & có hạn dùng | **Amber Warning (`warning`)** | `color="warning"` (`#D97706`), nền `#FFFBEB`, chữ hổ phách |
| **CẤM TUYỆT ĐỐI** | **Cấm tuyệt đối**| Vi phạm an toàn nghiêm trọng, hệ thống chặn hoàn toàn | **Crimson Error (`error`)** | `color="error"` (`#DC2626`), nền `#FEF2F2`, chữ đỏ san hô |

### B. Bảng Đối Chiếu Ma Trận Mới Sau Khi Chuẩn Hóa
1. **L1 — Gián tiếp** (*User ID, Session ID, Khóa nối liên kết*):
   - MASK: **Hợp lệ** (`default`)
   - HMAC: **Khuyến nghị** (`success`)
   - DROP: **Hợp lệ** (`default`)
   - KEEP: **Hợp lệ** (`default`)
2. **L2 — Cơ bản** (*Họ tên, SĐT, CCCD, Email, Nơi cư trú*):
   - MASK: **Khuyến nghị** (`success`)
   - HMAC: **Hợp lệ** (`default`)
   - DROP: **Hợp lệ** (`default`)
   - KEEP: **Có thời hạn** (`warning`)
3. **L3 — Nhạy cảm** (*Bệnh án, tài chính, tôn giáo, sinh trắc học*):
   - MASK: **Bắt buộc** (`primary`)
   - HMAC: **Hợp lệ** (`default`)
   - DROP: **Bắt buộc** (`primary`)
   - KEEP: **Cấm tuyệt đối** (`error`)

### C. Khắc Phục Lặp Từ Cột "Cấp Độ PII"
- Hiển thị badge kết hợp tên phân loại duy nhất, không lặp lại:
  - `<Chip label="L1" color="info" size="small" />` + `<Typography>Gián tiếp</Typography>`
  - `<Chip label="L2" color="warning" size="small" />` + `<Typography>Cơ bản</Typography>`
  - `<Chip label="L3" color="error" size="small" />` + `<Typography>Nhạy cảm</Typography>`
- Giữ nguyên tooltip hoặc text `L1 — Gián tiếp` cho khả năng tiếp cận và kiểm thử (accessibility & testing).

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
- [x] Bảng Ma trận không còn lẫn lộn từ ngữ ("Tùy chọn", "Cho phép" được thống nhất thành "Hợp lệ").
- [x] Màu sắc tuân thủ nghiêm ngặt 5 trạng thái DNA (Bắt buộc = Primary Navy, Khuyến nghị = Success Green, Hợp lệ = Neutral Gray, Có thời hạn = Warning Amber, Cấm tuyệt đối = Error Red).
- [x] Cột Cấp độ PII không còn hiển thị lặp từ `[L1] L1 — Gián tiếp`.
- [x] 100% tests passing, 0 lỗi typecheck/lint, build thành công.

