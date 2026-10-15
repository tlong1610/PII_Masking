# FE-18: Cung Cấp Link Nguồn Dẫn Chứng Văn Bản Pháp Luật Cho Tab Quy Định Pháp Luật (External Legal Document Sources)

**Sprint**: Sprint 04  
**Trạng thái**: Done  
**Phân hệ**: `src/features/compliance/`, `src/pages/DpoRulesPage.tsx`

---

## 1. Hiện Trạng & Vấn Đề (Current State & Problem)
- Tab "Quy định pháp luật" (`/dpo/rules`) hiện liệt kê các nhóm quy tắc phân loại PII (L1, L2, L3) và các điều khoản luật trọng yếu dạng văn bản tóm tắt nội bộ.
- Tuy nhiên, giao diện hoàn toàn chưa có liên kết dẫn chứng (citation / source URLs) ra tận văn bản pháp luật chính thức trên web để người dùng và DPO tự kiểm chứng đối chiếu.
- Trong toàn bộ hệ thống PIIGuard Shield, 2 văn bản pháp luật chủ lực được áp dụng xuyên suốt là:
  1. **Luật Bảo vệ Dữ liệu Cá nhân 2025 (Luật số 91/2025/QH15)** do Quốc hội ban hành.
  2. **Nghị định 356/2025/NĐ-CP** do Chính phủ ban hành quy định chi tiết thi hành Luật.
- Yêu cầu: Bổ sung nguồn dữ liệu chuẩn hóa, tích hợp đường dẫn trực tiếp (external links ra Thư Viện Pháp Luật / Cổng Thông Tin Chính Phủ) cho 2 luật chủ lực và từng điều khoản, kèm unit test kiểm tra tính chính xác của nguồn dữ liệu.

---

## 2. Yêu Cầu Kỹ Thuật Đã Triển Khai (Implemented Requirements)

### A. Cập Nhật Domain Model (`src/features/compliance/model/nd13Rules.ts`)
1. **Định nghĩa kiểu dữ liệu `LegalDocumentSource`**:
   - `id`: Mã định danh (VD: `luat-91-2025`, `nghi-dinh-356-2025`).
   - `code`: Số hiệu văn bản (`Luật số 91/2025/QH15`, `Nghị định 356/2025/NĐ-CP`).
   - `title`: Tên gọi đầy đủ của luật / nghị định.
   - `promulgatedBy`: Cơ quan ban hành (Quốc hội, Chính phủ).
   - `effectiveDate`: Ngày có hiệu lực thi hành.
   - `summary`: Tóm tắt phạm vi điều chỉnh và nội dung cốt lõi.
   - `officialUrl`: URL trực tiếp đến toàn văn văn bản pháp luật trên Thư Viện Pháp Luật.
   - `primaryBadge`: Nhãn phân loại vai trò (`Luật Cốt Lõi`, `Nghị Định Hướng Dẫn Trọng Tâm`).
   - `keyArticles`: Các điều khoản trọng điểm áp dụng trong app.
2. **Khai báo hằng số `OFFICIAL_LEGAL_DOCUMENTS`**:
   - Chứa 2 văn bản pháp luật chủ lực của hệ thống.
3. **Cập nhật `PiiClassificationRule` & `Nd13Article`**:
   - Bổ sung `legalBasis` và `sourceUrl` cho từng cấp độ L1, L2, L3 và từng điều khoản luật.

### B. Cập Nhật Giao Diện UI (`Nd13RulesView.tsx` & `Nd13RulesDrawer.tsx`)
1. **Khối Banner Căn Cứ Pháp Lý Nguồn (2 Văn Bản Chủ Lực)**:
   - Hiển thị nổi bật ngay trên đầu trang với 2 thẻ card tương ứng cho Luật 91/2025/QH15 và NĐ 356/2025/NĐ-CP.
   - Mỗi thẻ có nút bấm `Tra cứu toàn văn trên Thư Viện Pháp Luật` kèm `OpenInNewIcon` (`target="_blank" rel="noopener noreferrer"`).
2. **Thẻ Phân Loại PII (L1, L2, L3)**:
   - Hiển thị căn cứ pháp lý cụ thể kèm link dẫn chứng mở văn bản gốc.
3. **Thẻ Điều Khoản Luật Trọng Yếu**:
   - Bổ sung nút bấm / link dẫn đến đúng điều khoản luật tương ứng trên web.

### C. Kiểm Thử (Unit Tests)
1. `nd13Rules.test.ts`:
   - Xác minh `OFFICIAL_LEGAL_DOCUMENTS` có đầy đủ 2 văn bản pháp luật cốt lõi.
   - Kiểm tra mọi URL nguồn đều có định dạng hợp lệ (`https://thuvienphapluat.vn/...`).
   - Kiểm tra mọi rule và article đều có `sourceUrl` hợp lệ.
2. `Nd13RulesView.test.tsx` & `Nd13RulesDrawer.test.tsx`:
   - Kiểm tra render đúng 2 thẻ văn bản luật với link ngoài và thuộc tính `target="_blank"`, `rel="noopener noreferrer"`.

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
- [x] Tab Quy định pháp luật hiển thị rõ ràng 2 văn bản pháp lý chủ lực: Luật 91/2025/QH15 & NĐ 356/2025/NĐ-CP.
- [x] Người dùng click vào link/nút tra cứu thì mở ra toàn văn văn bản pháp luật trên web trong tab mới.
- [x] Từng nhóm cấp độ PII và điều khoản luật có trích dẫn điều khoản và đường dẫn nguồn.
- [x] 100% tests (131/131 passed), typecheck và lint vượt qua thành công.
