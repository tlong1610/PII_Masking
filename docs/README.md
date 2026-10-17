# PIIGuard Docs Index

Đọc file này trước. `docs/README.md` là bản đồ tài liệu; các file còn lại được gom theo mục đích để team không phải mở từng file từ đầu.

## Đọc nhanh để hiểu dự án

| File | Khi nào đọc |
|---|---|
| [`../README.md`](../README.md) | Tổng quan dự án, cách chạy app, API chính |
| [`pdf/PIIGuard_Shield_Demo_Day.pdf`](pdf/PIIGuard_Shield_Demo_Day.pdf) | Hồ sơ tổng hợp 6 trang để chia sẻ Drive/Release, đọc khi không truy cập GitHub |
| [`core/MVP_STATUS_REPORT.md`](core/MVP_STATUS_REPORT.md) | Báo cáo nghiệm thu hoàn thành toàn diện giai đoạn P1 |
| [`core/SYSTEM_ARCHITECTURE.md`](core/SYSTEM_ARCHITECTURE.md) | Luồng DPO → scanner → snapshot → verifier → Analyst, 4 tabs DPO và giới hạn `KEEP`/PII |
| [`core/AI_ARCHITECTURE.md`](core/AI_ARCHITECTURE.md) | Rules, BM25, column stats, GLiNER NER cascade, HITL few-shot memory |
| [`core/prd.md`](core/prd.md) | Yêu cầu sản phẩm, scope, user stories, nghiệm thu P1 |
| [`core/GOLDEN_DATASET.md`](core/GOLDEN_DATASET.md) | Golden dataset, edge cases, eval và cách đọc kết quả |

## Báo cáo hiệu năng & Đánh giá

| File | Nội dung |
|---|---|
| [`../performance/sau_HITL/report_stream_a.md`](../performance/sau_HITL/report_stream_a.md) | Báo cáo đối chiếu Luồng A (Column-level): **100.00% Action Accuracy** trên 339 cột sau HITL |
| [`../performance/sau_HITL/report_stream_b.md`](../performance/sau_HITL/report_stream_b.md) | Báo cáo đối chiếu Luồng B (Free-text NER): **97.86% Recall**, 97.51% F1 với GLiNER Multi-PII |
| [`../eval/results/report_full.md`](../eval/results/report_full.md) | Báo cáo kết quả eval baseline ban đầu |

## Vận hành & Hướng dẫn

| File | Nội dung |
|---|---|
| [`guide/DEMO_FLOW.md`](guide/DEMO_FLOW.md) | Kịch bản trình diễn MVP 6 bước chi tiết cho DPO và Analyst |
| [`ops/CI_RUNNER_GUIDE.md`](ops/CI_RUNNER_GUIDE.md) | Self-hosted GitHub Actions runner trên Mac (`team-138`) |
| [`ops/TEAM_WORKFLOW.md`](ops/TEAM_WORKFLOW.md) | Quy trình Git, PR, Commit và kiểm soát chất lượng nhóm |
| [`ops/RELEASE_GUIDE.md`](ops/RELEASE_GUIDE.md) | Phát hành từ `develop` sang `main`, CI và triển khai |
| [`../front_end/tx/tasks/TASKS_INDEX.md`](../front_end/tx/tasks/TASKS_INDEX.md) | Trạng thái task FE; các sprint/ADR cũ chỉ giữ lịch sử |
| [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) | Cây thư mục thực tế (`front_end/`, `src/`, `performance/`) & phân chia trách nhiệm |

## Căn cứ và bằng chứng

| Đường dẫn | Nội dung |
|---|---|
| [`legal/`](legal/) | Luật/Nghị định PDF dùng làm căn cứ (Luật 91/2025/QH15, NĐ 356/2025/NĐ-CP) |
| [`archive/gate_2/README.md`](archive/gate_2/README.md) | Evidence Gate 2, giữ để đối chiếu lịch sử |
| [`archive/evidence/`](archive/evidence/) | Smoke test và evidence rời cũ |

## Tài liệu ít đọc / archive

| Đường dẫn | Nội dung |
|---|---|
| [`archive/FAQ_PHUC.md`](archive/FAQ_PHUC.md) | Ghi chú hỏi đáp cũ cho Phúc |
| [`archive/TUNG_TASKS.md`](archive/TUNG_TASKS.md) | Checklist cũ của Tùng |
| [`archive/DATASET_MAPPING.md`](archive/DATASET_MAPPING.md) | Mapping dataset cũ |
| [`archive/architecture_diagram.md`](archive/architecture_diagram.md) | Diagram rút gọn cũ |
| [`archive/ui-flow.md`](archive/ui-flow.md) | UI flow cũ |
| [`archive/brief.md`](archive/brief.md) | Brief cũ |
| [`guide/`](guide/) | Tài liệu guide/template dài, giữ lại để tham khảo |

## Asset

| Đường dẫn | Nội dung |
|---|---|
| [`assets/demo/`](assets/demo/) | Video demo |
| [`assets/brand/`](assets/brand/) | Brand asset |
| [`assets/ux/`](assets/ux/) | Board UX |
| [`assets/fe_design/`](assets/fe_design/) | Draw.io UI flow |
