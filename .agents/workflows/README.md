# Phân công AI Agent — Team P-138

Mọi agent đều phải tuân thủ [`AGENT.md`](../../AGENT.md) và các quy tắc trong [`../rules/`](../rules/) (Git flow, Zero Raw PII, kiểm thử trước khi commit).

| Ai | Phụ trách | Vì sao |
| --- | --- | --- |
| **Claude** | Backend và logic agent (risk score, K-anonymity, kế hoạch xử lý), thiết kế kiến trúc, viết doc (doc evaluation của Haru), review code | Mạnh về lập luận nhiều bước, viết tài liệu, đọc cả codebase |
| **Codex** | Frontend (đã có [`front_end/AGENTS.md`](../../front_end/AGENTS.md) riêng), ghép mascot vào UI | Nhận task rõ, làm theo spec, tạo PR gọn |
| **Antigravity** | Chạy thử UI thật trên trình duyệt, kiểm tra luồng demo end-to-end, quay lỗi | Có agent điều khiển trình duyệt, hợp để test như người dùng |
| **Human** | Quyết định phạm vi, chốt contract, duyệt, chuẩn bị demo/pitch, làm việc với team, phân bổ nhiệm vụ cho các agent | Những thứ AI không thể tự quyết |

> **Phân công không gắn cứng.** Bảng trên là mặc định, không phải ràng buộc. Nếu một agent hết quota hoặc làm kém ở việc nào, chuyển việc đó sang agent khác ngay. Agent nhận việc phải đọc lại spec/contract và tuân thủ cùng bộ quy tắc như agent trước.

## Workflows

- [`log.md`](log.md) — Ghi log AI thủ công cho web tool (ChatGPT, Gemini Web, Claude.ai…).
