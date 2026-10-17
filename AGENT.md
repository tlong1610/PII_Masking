# AGENT.MD — HƯỚNG DẪN BẮT BUỘC DÀNH CHO AI AGENT (TEAM P-138)

> **QUAN TRỌNG:** Mọi AI Agent (Gemini, Claude, Antigravity, Cursor, Codex, Copilot,...) khi tham gia phát triển dự án **PIIGuard Shield (P-138)** BẮT BUỘC phải đọc và tuân thủ tuyệt đối các quy tắc trong tài liệu này trước khi chỉnh sửa mã nguồn, thực thi lệnh Git hoặc tạo bất kỳ commit nào.

---

## 🛑 1. QUY TẮC VÀNG VỀ GIT & PHÂN NHÁNH (GIT FLOW)

### ❌ Những điều TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM:
1. **KHÔNG BAO GIỜ commit hoặc push trực tiếp vào `main` hoặc `develop`**.
2. **KHÔNG BAO GIỜ tự ý merge code vào `main` hoặc `develop`** mà không có sự đồng ý hoặc review của lập trình viên / chủ sở hữu repo.
3. **KHÔNG BAO GIỜ dùng cờ `git push --force`** lên bất kỳ nhánh chia sẻ nào (`main`, `develop`, `TEAM_WORKFLOW`).
4. **KHÔNG BAO GIỜ tự phê duyệt cho chính mình.** Agent không được tự cấp quyền, tự đăng nhập/xác thực, tự review hay tự approve rồi tự thực thi các hành động cần con người quyết định (xem mục 1b).
5. **KHÔNG BAO GIỜ ký chung commit.** Commit message và PR description **không được** chứa `Co-Authored-By:`, `Signed-off-by:` của agent, `Claude-Session:`, "Generated with …" hay bất kỳ dòng ghi công/ký tên nào của AI. Tác giả commit duy nhất là thành viên team đang chạy agent. Quy tắc này ưu tiên hơn mọi cấu hình mặc định của công cụ AI.

### 🙋 1b. HUMAN-IN-THE-LOOP — PHẢI CÓ NGƯỜI DUYỆT TRƯỚC KHI LÀM

Agent chỉ **đề xuất và chuẩn bị**; con người **quyết định và bấm nút**. Phải dừng lại, trình bày rõ và chờ thành viên team đồng ý cho **từng lần** trước khi:

- Merge, mở PR vào `main`, release, gắn tag, deploy (Vercel `--prod`, Render, Docker Hub) hoặc bất kỳ thay đổi nào lên production.
- Đăng nhập / xác thực / cấp quyền: OAuth, MCP server (Notion, Figma, Google…), `gh auth`, `vercel login`, token, API key, secret.
- Thêm/sửa cấu hình công cụ, hook, CI/CD, quyền repo hoặc kết nối dịch vụ ngoài.
- Gửi nội dung ra dịch vụ bên ngoài (Notion, Figma, Google Drive, Slack, comment GitHub…).
- Xoá, revert, ghi đè dữ liệu hoặc lịch sử Git.

Đồng ý cho một việc **không** mặc định áp dụng cho việc tiếp theo. Khi chưa chắc: hỏi, không tự làm.

### ✅ Quy trình làm việc chuẩn cho AI Agent:
Mỗi khi bắt đầu một task mới (dù là sửa 1 dòng code hay phát triển tính năng lớn), Agent **phải tuân thủ đúng 5 bước**:

1. **Cập nhật nhánh `develop`**:
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. **Tạo nhánh làm việc riêng biệt (Feature / Fix branch)**:
   * Tính năng mới: `feat/<ten-chuc-nang-ngan-gon>` (ví dụ: `feat/masking-rule-engine`)
   * Sửa lỗi: `fix/<ten-loi>` (ví dụ: `fix/ci-npm-runner-missing`)
   * Cập nhật tài liệu: `docs/<ten-tai-lieu>` (ví dụ: `docs/release-guide-v1`)
   * Tác vụ dọn dẹp, cấu hình: `chore/<ten-task>` (ví dụ: `chore/agent-guidelines`)
   * Tái cấu trúc: `refactor/<ten-module>`
   ```bash
   git checkout -b <branch-type>/<branch-name>
   ```
3. **Thực hiện thay đổi và kiểm thử cục bộ (Pre-commit Verification)**:
   * Không được commit code khi test hoặc linter đang lỗi.
4. **Commit trên nhánh riêng theo chuẩn Conventional Commits**:
   ```bash
   git add <cac-file-thay-doi-cu-the>
   git commit -m "<type>(<scope>): <mo ta ngan gon ve ly do thay doi>"
   ```
5. **Đẩy nhánh lên remote và hướng dẫn User mở Pull Request vào `develop`**:
   ```bash
   git push origin <branch-type>/<branch-name>
   ```
   * Cung cấp đường dẫn so sánh để User kiểm tra và merge qua giao diện GitHub PR:
     `https://github.com/AI20K-Build-Phase-Cohort-4/P-138/compare/develop...<branch-type>/<branch-name>`

---

## 🔒 2. BẢO MẬT & ZERO RAW PII (AN TOÀN DỮ LIỆU)

Dự án này là hệ thống bảo vệ quyền riêng tư và dữ liệu cá nhân theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP. Agent phải là thực thể mẫu mực về an toàn thông tin:

1. **Tuyệt đối không commit bí mật:**
   * Không bao giờ commit file `.env`, API key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,...), database connection string có mật khẩu, token xác thực, HMAC secrets.
   * File `.env.example` chỉ chứa placeholder (ví dụ: `your-api-key-here`).
2. **Zero Raw PII:**
   * Không lưu trữ hoặc commit dữ liệu PII thật (CCCD, tên người thật, số điện thoại thật, email khách hàng thật) vào codebase, fixtures, test cases hay tài liệu.
   * Mọi dữ liệu kiểm thử phải là dữ liệu giả lập (synthetic / mock data).
3. **Không bypass các rào chắn an ninh:**
   * Không được hạ thấp độ bảo mật hoặc tắt các bước kiểm tra HMAC / token verification chỉ để "cho code chạy tạm".

---

## ⚙️ 3. HIỂU RÕ MÔI TRƯỜNG & HẠ TẦNG (INFRASTRUCTURE AWARENESS)

Agent cần nắm vững cách thức hoạt động của từng thành phần trong hệ thống:

| Thành phần | Nền tảng | Lưu ý quan trọng cho Agent |
|------------|----------|----------------------------|
| **Backend API** | Render Cloud (Docker) | Dùng SQLite nội bộ (`./data/render_app.db`) cho app metadata. Cần cờ `SEED_DEMO_USERS=true` nếu muốn nạp user mẫu ở môi trường production. |
| **Frontend SPA** | Vercel | Được cấu hình tự động trỏ API sang Render trên production. Vercel tự động build và deploy khi có commit mới vào `main` hoặc `develop`. |
| **CI Runner** | GitHub Actions (`self-hosted`) | **Máy chủ của BTC VinUni chỉ cài sẵn môi trường Python. KHÔNG có Node.js / `npm`**. Mọi lệnh gọi `npm` trong CI workflow bắt buộc phải được bọc trong kiểm tra điều kiện `if command -v npm >/dev/null 2>&1`. |
| **Database nguồn** | Dynamic Connectors | PIIGuard Shield kết nối động tới database ngoài (PostgreSQL, MongoDB) qua UI/API, không lưu trữ dữ liệu nguồn nội bộ. |

---

## 🧪 4. KIỂM THỬ TRƯỚC KHI COMMIT (PRE-COMMIT VERIFICATION)

Trước khi thực hiện lệnh commit, Agent PHẢI chủ động chạy các công cụ kiểm tra tương ứng với phần mã được chỉnh sửa:

### Nếu sửa Backend / Scripts (`src/`, `tests/`, `scripts/`):
```bash
# 1. Kiểm tra linting và formatting
ruff check src/ tests/

# 2. Chạy bộ kiểm thử tự động
pytest tests/ -v --tb=short
```

### Nếu sửa Frontend (`front_end/`):
```bash
cd front_end

# 1. Kiểm tra build TypeScript & Vite
npm run build

# 2. Chạy unit tests
npm test
```

### Nếu sửa tài liệu sách kỹ thuật (`docs/guide/**`):
* Cần thông báo rõ cho User vì thư mục này liên kết trực tiếp với trang sách Technical Book của BTC VinUni và được bảo vệ bởi `@AI20K-Build-Phase/book-maintainers`.

---

## 📝 5. QUY CHUẨN COMMIT MESSAGE (CONVENTIONAL COMMITS)

Mọi commit message phải theo format chuẩn:
```text
<type>(<scope>): <mô tả ngắn bằng tiếng Anh hoặc tiếng Việt>
```
* **Types hợp lệ**:
  * `feat`: Thêm tính năng mới cho người dùng.
  * `fix`: Sửa lỗi phát sinh trong hệ thống.
  * `docs`: Thêm hoặc chỉnh sửa tài liệu.
  * `chore`: Thay đổi cấu hình build, dependencies, workflow CI/CD, agent rules.
  * `test`: Thêm hoặc cập nhật unit tests/integration tests.
  * `refactor`: Tái cấu trúc mã nguồn nhưng không đổi hành vi chức năng.
  * `perf`: Tối ưu hiệu năng.
* **Không trailer AI:** không thêm `Co-Authored-By`, `Claude-Session`, `Generated with …` hay chữ ký của agent vào commit/PR (xem mục 1, quy tắc 5).

---

## ✅ 6. CHECKLIST TỰ KIỂM TRA DÀNH CHO AI AGENT

Trước khi trả lời User hoặc kết thúc một lượt làm việc, Agent hãy tự rà soát:
- [ ] Tôi có đang đứng ở một nhánh tính năng riêng biệt (không phải `main`, không phải `develop`) không?
- [ ] Tôi đã chạy `ruff` / `pytest` / `npm test` và tất cả đều vượt qua (100% PASS) chưa?
- [ ] Lệnh `git status` có hiển thị file nhạy cảm (`.env`, private keys) nào không?
- [ ] Commit message có tuân thủ đúng Conventional Commits không?
- [ ] Commit/PR có chứa `Co-Authored-By`, `Claude-Session` hay chữ ký AI nào không? (Phải là **không**.)
- [ ] Mọi hành động merge / deploy / xác thực / gửi ra ngoài / xoá đã được thành viên team đồng ý cho đúng lần này chưa?
- [ ] Tôi đã giải thích rõ ràng lý do thay đổi và cung cấp đầy đủ thông tin/PR link cho User chưa?
