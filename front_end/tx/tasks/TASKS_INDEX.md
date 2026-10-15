# Frontend Tasks Index — PIIGuard Shield

| ID | Task | Sprint | Trạng Thái | Mô Tả & Chi Tiết |
| --- | --- | --- | --- | --- |
| **FE-01** | Build UI MVP screens | Sprint 01 | **done** | Các màn hình cơ bản `/login`, `/dpo`, `/analyst` ([chi tiết](details/FE-01-ui-mvp.md)) |
| **FE-02** | Connect real backend APIs | Sprint 02 | **done** | Tích hợp `realPiiReviewApi` & Zod validation ([chi tiết](details/FE-02-api-integration.md)) |
| **FE-03** | Harden auth/session flow | Sprint 02 | **done** | Định tuyến phân quyền DPO vs Analyst ([chi tiết](details/FE-03-auth-session.md)) |
| **FE-04** | Add tests and quality gates | Sprint 02 | **done** | Vitest, RTL, Typecheck strict, Boundaries ([chi tiết](details/FE-04-tests-quality.md)) |
| **FE-05** | Add image scan flow | Post-MVP | **closed** | Đã đóng: Out of scope (không triển khai tính năng quét ảnh OCR) ([chi tiết](details/FE-05-image-scan.md)) |
| **FE-06** | Redesign DPO decision workspace | Sprint 03 | **done** | Không gian thẩm định DPO chuyên sâu ([chi tiết](details/FE-06-dpo-decision-workspace.md)) |
| **FE-07** | Harden API error and edge states | Sprint 03 | **done** | Xử lý lỗi 401, 403, 404, 409, 422, 500 an toàn ([chi tiết](details/FE-07-api-error-edge-states.md)) |
| **FE-08** | Add dynamic database source UI | Sprint 03 | **done** | Hỗ trợ PostgreSQL & MongoDB Cloud ([chi tiết](details/FE-08-dynamic-database-source.md)) |
| **FE-09** | Runtime evidence and video demo | Sprint 03 | **done** | Kịch bản demo và bằng chứng kiểm thử hoàn chỉnh ([chi tiết](details/FE-09-runtime-evidence-video.md)) |
| **FE-10** | Nghị định 13 Compliance Rules Page | Sprint 04 | **done** | Trang toàn màn hình `/dpo/rules` tra cứu pháp lý NĐ 13 3 tabs ([chi tiết](details/FE-10-nd13-compliance-rules.md)) |
| **FE-11** | Sổ cái Hash-Chain & Merkle Root Audit | Sprint 04 | **done** | Chuỗi khối kết nối trực quan, drawer xem chi tiết SHA-256 hex 64 ký tự & kiểm chứng Merkle root ([chi tiết](details/FE-11-hash-chain-audit-center.md)) |
| **FE-12** | Sidebar Masking Showcase (Demo che) | Sprint 04 | **done** | Màn hình đối chiếu đa chiều đặt ngay dưới Sổ cái trên Sidebar ([chi tiết](details/FE-12-masking-showcase-sidebar.md)) |
| **FE-13** | DPO Catalog Explorer & Revocation UI | Sprint 04 | **closed** | Đã đóng: Chuyển giao dev khác phụ trách ([chi tiết](details/FE-13-published-snapshots-revoke.md)) |
| **FE-14** | DPO Tabs Cleanup & Exception Lifecycle | Sprint 04 | **done** | Tối giản 3 tabs cốt lõi, loại bỏ tab thừa, hỗ trợ exceptionUntil ([chi tiết](details/FE-14-dpo-tabs-cleanup-exception-lifecycle.md)) |
| **FE-15** | Streamline Masking Demo Tab | Sprint 04 | **done** | Trang `/dpo/masking` tinh gọn, loại bỏ sub-tabs rườm rà, tập trung ma trận che mờ và sandbox thử nghiệm ([chi tiết](details/FE-15-streamline-masking-demo.md)) |
| **FE-16** | Legal Compliance Framework & PII Ordering | Sprint 04 | **done** | Cập nhật tab Quy định pháp luật, sắp xếp chuẩn L1 ➔ L2 ➔ L3, chuẩn hóa văn bản luật ([chi tiết](details/FE-16-compliance-legal-framework-and-levels-reorder.md)) |
| **FE-17** | Standardize All Masking to `***` | Sprint 04 | **done** | Đổi cơ chế che mờ họ tên và mọi trường dữ liệu thành `***` bảo mật, đồng nhất chuẩn MASK_PLACEHOLDER ([chi tiết](details/FE-17-standardize-name-masking-placeholder.md)) |
| **FE-18** | Legal Source Links & Citations | Sprint 04 | **done** | Tích hợp liên kết dẫn chứng văn bản pháp luật chính thức (Luật 91/2025 & NĐ 356) cho tab Quy định pháp luật ([chi tiết](details/FE-18-legal-source-links.md)) |
| **FE-19** | Rebalance Masking Showcase UI | Sprint 04 | **done** | Tái cấu trúc cân bằng UI màn hình Demo che dữ liệu (Sandbox 4 thẻ & Ma trận tỷ lệ vàng) theo chuẩn Databricks Design System DNA ([chi tiết](details/FE-19-rebalance-masking-showcase-ui.md)) |

Quy tắc: Chỉ chuyển trạng thái sang `done` khi mã nguồn, unit test và kiểm thử biên hoàn thành 100%.
