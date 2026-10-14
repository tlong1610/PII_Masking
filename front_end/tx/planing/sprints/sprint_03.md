# Sprint 03: Post-MVP UX Hardening & Visual Governance

**Trạng thái**: Hoàn thành (DONE)  
**Mục tiêu**: Nâng cao trải nghiệm thẩm định rủi ro PII cho DPO thông qua các sơ đồ trực quan hóa dữ liệu (Source Scope Picker Diagram, ERD Lineage Diagram) và cơ chế kết nối cơ sở dữ liệu động (PostgreSQL, MongoDB).

---

## 1. Phạm Vi Đã Triển Khai (Delivered Scope)

1. **Sơ đồ chọn phạm vi nguồn trực quan (`SourceScopePickerDiagram.tsx`)**:
   - Tích hợp `@xyflow/react` kết hợp thuật toán tự động bố cục `dagre`.
   - Hiển thị trực quan các bảng (Tables) và bộ sưu tập (Collections), số lượng trường dữ liệu, số bản ghi.
2. **Sơ đồ liên kết thực thể & Dòng chảy dữ liệu (`ErdLineageDiagram.tsx`)**:
   - Trực quan hóa mối quan hệ khóa ngoại (Foreign Keys) và trường liên kết (Join Keys).
   - Đánh dấu trạng thái bảo vệ đồng bộ (Consistent HMAC Masking) để tránh rò rỉ liên kết ngang.
3. **Kết nối cơ sở dữ liệu động (`AddSourceDialog.tsx`)**:
   - Hỗ trợ thêm nguồn cơ sở dữ liệu PostgreSQL trên Cloud (AWS RDS, GCP Cloud SQL, Supabase, Neon) và MongoDB Atlas qua `mongodb+srv://`.
   - Kiểm thử kết nối thời gian thực (Test Connection) và tự động nhận diện schema (Introspection).
   - Bảo mật tuyệt đối: Không lưu trữ plain-text URI hay mật khẩu vào state frontend.
4. **Không gian thẩm định DPO chuyên sâu (`CollapsibleTableGroup.tsx` & `FieldPolicyDrawerContent.tsx`)**:
   - Gom nhóm bảng có thể đóng/mở linh hoạt kèm công cụ tìm kiếm và bộ lọc trạng thái.
   - Thao tác áp dụng hàng loạt (Bulk Action) cho các trường cùng mức độ rủi ro.
   - Drawer chi tiết từng trường: Hiển thị phân loại NĐ 13 (Cơ bản L2, Nhạy cảm L3, Gián tiếp L1, Non-PII, UNKNOWN), sàn bảo mật bắt buộc, các lựa chọn che mờ (`MASK`, `HMAC`, `DROP`, `KEEP`), và xem dữ liệu mẫu thẩm định.
5. **Bộ kiểm thử chất lượng (Unit Tests)**:
   - Đạt 100% pass cho các mô hình nghiệp vụ: `sourceForm.test.ts`, `joinKeys.test.ts`, `reviewSummary.test.ts`, `decisionIssues.test.ts`, `fieldDecision.test.ts`.

---

## 2. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

- [x] DPO có thể thẩm định và quyết định chính sách dễ dàng qua Drawer và bảng gom nhóm, không phải cuộn xem một danh sách dài vô tận.
- [x] Sơ đồ Source Scope và ERD Lineage hiển thị mượt mà, layout tự động cân đối.
- [x] Form thêm nguồn dữ liệu động kiểm tra hợp lệ Zod schema và test kết nối an toàn.
- [x] Toàn bộ mã nguồn sạch lint, typecheck strict và vượt qua toàn bộ test suite.
