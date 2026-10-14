# PIIGuard Docs Index

Đọc file này trước. `docs/README.md` là bản đồ tài liệu; các file còn lại được gom theo mục đích để team không phải mở từng file từ đầu.

## Đọc nhanh để hiểu dự án

| File | Khi nào đọc |
|---|---|
| [`../README.md`](../README.md) | Tổng quan dự án, cách chạy app, API chính |
| [`core/MVP_STATUS_REPORT.md`](core/MVP_STATUS_REPORT.md) | Trạng thái sau MVP và P1 đang control gì |
| [`core/SYSTEM_ARCHITECTURE.md`](core/SYSTEM_ARCHITECTURE.md) | Luồng DPO → scanner → snapshot → verifier → Analyst |
| [`core/AI_ARCHITECTURE.md`](core/AI_ARCHITECTURE.md) | Rules, BM25/LLM optional, zero raw PII |
| [`core/prd.md`](core/prd.md) | Yêu cầu sản phẩm, scope, user stories, nghiệm thu |
| [`core/GOLDEN_DATASET.md`](core/GOLDEN_DATASET.md) | Golden dataset, edge cases, eval và cách đọc kết quả |

## Vận hành

| File | Nội dung |
|---|---|
| [`ops/CI_RUNNER_GUIDE.md`](ops/CI_RUNNER_GUIDE.md) | Self-hosted GitHub Actions runner trên Mac |
| [`../eval/results/report_full.md`](../eval/results/report_full.md) | Kết quả eval hiện có |

## Căn cứ và bằng chứng

| Đường dẫn | Nội dung |
|---|---|
| [`legal/`](legal/) | Luật/Nghị định PDF dùng làm căn cứ |
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
| [`archive/guide/`](archive/guide/) | Tài liệu guide/template dài, giữ lại để tham khảo |

## Asset

| Đường dẫn | Nội dung |
|---|---|
| [`assets/demo/`](assets/demo/) | Video demo |
| [`assets/brand/`](assets/brand/) | Brand asset |
| [`assets/ux/`](assets/ux/) | Board UX |
| [`assets/fe_design/`](assets/fe_design/) | Draw.io UI flow |
