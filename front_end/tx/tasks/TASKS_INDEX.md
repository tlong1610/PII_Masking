# Frontend Tasks Index — PIIGuard Shield

| ID | Task | Sprint | Trạng Thái | Mô Tả & Chi Tiết |
| --- | --- | --- | --- | --- |
| **FE-01** | Build UI MVP screens | Sprint 01 | **done** | Các màn hình cơ bản `/login`, `/dpo`, `/analyst` ([chi tiết](details/FE-01-ui-mvp.md)) |
| **FE-02** | Connect real backend APIs | Sprint 02 | **done** | Tích hợp `realPiiReviewApi` & Zod validation ([chi tiết](details/FE-02-api-integration.md)) |
| **FE-03** | Harden auth/session flow | Sprint 02 | **done** | Định tuyến phân quyền DPO vs Analyst ([chi tiết](details/FE-03-auth-session.md)) |
| **FE-04** | Add tests and quality gates | Sprint 02 | **done** | Vitest, RTL, Typecheck strict, Boundaries ([chi tiết](details/FE-04-tests-quality.md)) |
| **FE-05** | Add image scan flow | Post-MVP | **blocked** | Tạm hoãn: Đợi backend bổ sung OCR/Image AI API ([chi tiết](details/FE-05-image-scan.md)) |
| **FE-06** | Redesign DPO decision workspace | Sprint 03 | **done** | Không gian thẩm định DPO chuyên sâu ([chi tiết](details/FE-06-dpo-decision-workspace.md)) |
| **FE-07** | Harden API error and edge states | Sprint 03 | **done** | Xử lý lỗi 401, 403, 404, 409, 422, 500 an toàn ([chi tiết](details/FE-07-api-error-edge-states.md)) |
| **FE-08** | Add dynamic database source UI | Sprint 03 | **done** | Hỗ trợ PostgreSQL & MongoDB Cloud ([chi tiết](details/FE-08-dynamic-database-source.md)) |
| **FE-09** | Runtime evidence and video demo | Sprint 03 | **done** | Kịch bản demo và bằng chứng kiểm thử hoàn chỉnh ([chi tiết](details/FE-09-runtime-evidence-video.md)) |
| **FE-10** | Nghị định 13 Compliance Rules Drawer | Sprint 04 | **in-progress** | Drawer tra cứu pháp lý tương tác từ Sidebar ([chi tiết](details/FE-10-nd13-compliance-rules.md)) |
| **FE-11** | Sổ cái Hash-Chain & Merkle Root Audit | Sprint 04 | **in-progress** | Đã có backend & trang audit log nhưng giao diện click vào chưa ưng; cần tái thiết kế giao diện Sổ cái Hash-Chain trực quan dạng chuỗi khối Merkle Root ([chi tiết](details/FE-11-hash-chain-audit-center.md)) |
| **FE-12** | Sidebar Masking Showcase (Demo che) | Sprint 04 | **in-progress** | Showcase so sánh đa chiều đặt dưới Sổ cái ([chi tiết](details/FE-12-masking-showcase-sidebar.md)) |
| **FE-13** | DPO Catalog Explorer & Revocation UI | Sprint 04 | **in-progress** | Phương án 1: Data Sources vs Snapshots & Thu hồi ([chi tiết](details/FE-13-published-snapshots-revoke.md)) |
| **FE-14** | DPO Tabs Cleanup & Exception Lifecycle | Sprint 04 | **in-progress** | 3 tabs cốt lõi, hạn ngoại lệ `exceptionUntil` ([chi tiết](details/FE-14-dpo-tabs-cleanup-exception-lifecycle.md)) |

Quy tắc: Chỉ chuyển trạng thái sang `done` khi mã nguồn, unit test và kiểm thử biên hoàn thành 100%.
