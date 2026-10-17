---
description: "Strict git workflow: Never commit directly to main/develop, always create feature branches and test before commit"
activation: always-on
---

# Agent Git Workflow & Team Standards

Trước khi thực hiện bất kỳ thay đổi nào hoặc gõ lệnh git, bạn **BẮT BUỘC** phải tuân theo hướng dẫn tại [AGENT.md](../../AGENT.md):

1. **Tuyệt đối KHÔNG commit hoặc push trực tiếp vào `main` hoặc `develop`**.
2. **Luôn tạo nhánh làm việc riêng** (`feat/*`, `fix/*`, `docs/*`, `chore/*`) từ `develop`.
3. **Chạy kiểm thử trước khi commit**:
   - Backend: `ruff check src/ tests/` và `pytest tests/`
   - Frontend: `npm run build` và `npm test` (trong `front_end/`)
4. **Không commit secret, `.env`, tokens hay raw PII**.
5. **Đẩy nhánh lên remote và hướng dẫn User mở Pull Request vào `develop`**.
