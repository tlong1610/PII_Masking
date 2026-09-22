# Quy trình làm việc Team PIIGuard VN

**Dự án:** PIIGuard VN — Công cụ phát hiện và che giấu PII theo luật Việt Nam  
**Thời gian:** MVP 14 ngày (VinUni AI20K Cohort 4)  
**Team:** 4 người

---

## 🎯 Nguyên tắc cốt lõi

1. **KHÔNG BAO GIỜ push trực tiếp vào `main` & KHÔNG BAO GIỜ merge vào `main`** — Vi phạm = fail Gate 2!
   - `main` là nhánh production được bảo vệ nghiêm ngặt (Protected branch).
   - TUYỆT ĐỐI KHÔNG mở Pull Request target vào `main` trong suốt quá trình phát triển dự án.
   - MỌI Pull Request bắt buộc phải target base branch vào `develop`.
   - Thành viên TUYỆT ĐỐI KHÔNG được merge code vào `main` (Chỉ Team Lead mới release `develop` → `main` tại mốc Gate/Demo Day).
2. **MỌI thay đổi đều qua Pull Request vào `develop`** — Kể cả docs, config hay hotfix
3. **≥ 10 PR đã merge trước Gate 2** — Yêu cầu bắt buộc, không làm bù được
4. **Ít nhất 1 người review mỗi PR** — Bằng chứng team làm việc thật (chấm B4)
5. **PRD/docs phải sync với code** — AI agent đọc PRD để sinh code

---

## 📐 Cấu trúc nhánh (Branching Strategy)

> 📖 **Xem chi tiết ai làm folder/file nào tại:** [**PROJECT_STRUCTURE.md**](PROJECT_STRUCTURE.md)

```
main
 └── develop
      ├── feature/fe-dpo-review-dashboard     [Phúc - Frontend]
      ├── feature/be-runs-api                 [Long - Backend]
      ├── feature/ai-langgraph-scanner        [Tùng - AI Eng]
      ├── feature/data-mongo-connector        [Kiên - Data Eng]
      ├── docs/update-team-structure
      └── test/add-integration-tests
```

### Các loại nhánh

| Nhánh        | Mục đích                                  | Merge vào                       | Xóa sau merge |
| ------------ | ----------------------------------------- | ------------------------------- | ------------- |
| `main`       | Production-ready code, luôn deploy được   | — _(Chỉ Team Lead release)_     | Không         |
| `develop`    | Nhánh tích hợp chính, tiếp nhận tất cả PR | `main` _(chỉ tại Gate/Release)_ | Không         |
| `feature/*`  | Tính năng mới                             | `develop`                       | ✅ Có         |
| `bugfix/*`   | Sửa lỗi                                   | `develop`                       | ✅ Có         |
| `docs/*`     | Cập nhật tài liệu                         | `develop`                       | ✅ Có         |
| `test/*`     | Thêm/sửa tests                            | `develop`                       | ✅ Có         |
| `refactor/*` | Tái cấu trúc code                         | `develop`                       | ✅ Có         |
| `hotfix/*`   | Sửa lỗi khẩn cấp                          | `develop`                       | ✅ Có         |

> ⛔ **QUY TẮC BẤT DI BẤT DỊCH: KHÔNG BAO GIỜ MERGE VÀO `main`!**
>
> - Toàn bộ thành viên **KHÔNG ĐƯỢC PHÉP** merge bất kỳ nhánh nào (`feature/*`, `bugfix/*`, `docs/*`...) vào `main`.
> - Mọi Pull Request (PR) đều **BẮT BUỘC** chọn **Base: `develop`**.
> - Bất kỳ PR nào trỏ target base vào `main` sẽ bị từ chối / close ngay lập tức và yêu cầu mở lại vào `develop`.

---

## 🔤 Quy ước đặt tên nhánh

### Format: `<type>/<role-prefix>-<short-kebab-case-description>`

**Quy ước tiền tố vai trò (Role Prefix) để phân biệt nhánh của từng người:**

- `feature/fe-...` — Dành cho Phúc (Frontend & UI Flow)
- `feature/be-...` — Dành cho Long (Backend FastAPI & PostgreSQL)
- `feature/ai-...` — Dành cho Tùng (AI LangGraph & Detection Rules)
- `feature/data-...` — Dành cho Kiên (Data Fixtures & MongoDB)
- `docs/...` — Cập nhật tài liệu (Dùng chung)
- `bugfix/...` — Sửa lỗi (Dùng chung)
- `test/...` — Viết unit/integration tests (Dùng chung)

**✅ TỐT:**

```bash
feature/fe-dpo-scan-review
feature/be-runs-api-endpoints
feature/ai-pii-regex-detector
feature/data-mongo-connector-adapter
docs/update-prd-after-mentor-feedback
bugfix/handle-null-values-in-cccd
test/add-unit-tests-for-tokenizer
```

**❌ TỆ (TRÁNH):**

```bash
phuc-branch              # Không rõ làm gì
new-feature              # Quá chung chung
update                   # Không có ngữ cảnh
feature_pii_detection    # Dùng underscore thay vì dấu gạch ngang
feature/PII-Detection    # Viết hoa không cần thiết
```

### Độ dài tên nhánh

- **Tối thiểu:** 3 từ có nghĩa
- **Tối đa:** 5 từ
- **Nếu quá dài:** Rút gọn nhưng giữ nguyên ý nghĩa

**Ví dụ:**

- ❌ `feature/scanner` → quá ngắn
- ✅ `feature/database-scanner`
- ✅ `feature/pii-detection-engine`
- ❌ `feature/implement-advanced-postgresql-table-scanner-with-regex` → quá dài
- ✅ `feature/postgres-scanner-with-regex` → vừa đủ

---

## 💬 Quy ước Commit Message (theo Conventional Commits)

### Format: `<type>(<scope>): <subject>`

**Type (bắt buộc):**

- `feat` — Tính năng mới
- `fix` — Sửa lỗi
- `docs` — Thay đổi tài liệu (README, PRD, brief...)
- `test` — Thêm/sửa tests
- `refactor` — Tái cấu trúc code (không thêm feature, không fix bug)
- `chore` — Công việc bảo trì (cập nhật dependencies, config...)

**Scope (tùy chọn nhưng khuyến khích):**

- `agent` — LangGraph agent logic
- `api` — FastAPI endpoints
- `db` — Database models, migrations
- `scanner` — PII detection scanner
- `masking` — Masking/tokenization logic
- `config` — Configuration files
- `ci` — CI/CD workflows

**Subject:**

- Viết thường, không dấu chấm cuối
- Dùng động từ ở hiện tại: "add" không phải "added"
- Tối đa 50 ký tự

### Ví dụ

**✅ TỐT:**

```bash
feat(scanner): add PostgreSQL table scanner
fix(masking): handle null values in CCCD column
docs(prd): update PRD with masking strategy after mentor feedback
test(scanner): add unit tests for PII detection
refactor(agent): extract tokenization logic to separate module
chore(deps): update langchain to 0.3.0
```

**❌ TỆ:**

```bash
update code                    # Quá chung chung
fixed bug                      # Không nói bug nào
Added new feature.             # Viết hoa + dấu chấm
WIP                            # Work In Progress không được commit vào develop
asdfasdf                       # Vô nghĩa
Merge branch 'main'            # Git tự sinh, không cần sửa
```

### Commit message dài (khi cần)

```bash
git commit -m "feat(scanner): add Vietnamese phone number detection" \\
  -m "" \\
  -m "- Support 10-digit format (0XXXXXXXXX)" \\
  -m "- Support 11-digit format (84XXXXXXXXX)" \\
  -m "- Add regex pattern for both formats" \\
  -m "" \\
  -m "Closes #12"
```

---

## 🚀 Quy trình làm việc (Git Workflow)

### 1️⃣ Bắt đầu task mới

```bash
# 1. Đảm bảo develop mới nhất
git checkout develop
git pull origin develop

# 2. Tạo nhánh mới TỪ develop
git checkout -b feature/database-scanner

# 3. Kiểm tra đang ở đúng nhánh
git branch
# * feature/database-scanner  ← dấu * ở đây
#   develop
#   main
```

### 2️⃣ Làm việc và commit

```bash
# Làm code, test locally...

# Xem những file đã thay đổi
git status

# Stage các file cần commit (KHÔNG dùng git add .)
git add src/scanner/postgres_scanner.py
git add tests/unit/test_postgres_scanner.py

# Commit với message rõ ràng
git commit -m "feat(scanner): implement PostgreSQL table scanner"

# Commit thường xuyên (mỗi 1-2 giờ làm việc)
# Mỗi commit nên tập trung vào 1 thay đổi logic
```

**⚠️ KHÔNG BAO GIỜ:**

- `git add .` → dễ commit nhầm file (.env, **pycache**, .DS_Store)
- `git commit -am "update"` → bỏ qua việc review file trước khi commit

### 3️⃣ Push lên remote

```bash
# Lần đầu push nhánh mới (cần -u để set upstream)
git push -u origin feature/database-scanner

# Lần sau chỉ cần
git push
```

**💡 Push code hàng ngày** — Không đợi đến khi "hoàn thiện":

- Backup code
- Teammate thấy được progress
- AI log gắn với commit → mentor thấy được quá trình làm việc

### 4️⃣ Tạo Pull Request

#### Trên GitHub UI:

1. Vào repo → Tab "Pull requests" → "New pull request"
2. **Base:** `develop` ← **Compare:** `feature/database-scanner`  
   _(⚠️ **CỰC KỲ QUAN TRỌNG:** GitHub UI thường mặc định chọn Base là `main`. Bạn **BẮT BUỘC** phải bấm dropdown đổi Base thành `develop`. **TUYỆT ĐỐI KHÔNG ĐỂ BASE LÀ `main`**!)_
3. Điền title và description theo template
4. **Request review** từ ít nhất 1 teammate
5. Assign cho chính mình
6. Add labels nếu có (enhancement, bug, documentation...)

#### Hoặc dùng GitHub CLI (nhanh hơn):

```bash
gh pr create \\
  --base develop \\
  --title "feat(scanner): PostgreSQL table scanner" \\
  --body "Implements basic scanner connecting to PostgreSQL and detecting PII in tables.

## Changes
- Add \`PostgresScanner\` class
- Implement regex detection for CCCD, email, phone
- Add unit tests

## Testing
\\\`\\\`\\\`bash
pytest tests/unit/test_postgres_scanner.py -v
\\\`\\\`\\\`

## Checklist
- [x] Code chạy được locally
- [x] Đã thêm tests
- [x] Tests pass
- [x] Không có hardcoded secrets
- [ ] Đã review bởi teammate"
```

### 5️⃣ Template PR Description (bắt buộc)

Repo đã có template sẵn ở `.github/PULL_REQUEST_TEMPLATE.md`, nhưng cần customize cho từng PR:

```markdown
## Thay đổi gì

[Mô tả ngắn gọn 2-3 câu]

## Loại thay đổi

- [ ] \`feat\` — tính năng mới
- [ ] \`fix\` — sửa lỗi
- [ ] \`docs\` — cập nhật tài liệu (PRD, brief, README...)
- [ ] \`test\` — thêm/sửa tests
- [ ] \`refactor\` — tái cấu trúc
- [ ] \`chore\` — công việc bảo trì

## Chi tiết kỹ thuật

- File nào thay đổi
- Logic chính là gì
- Dependencies mới (nếu có)

## Cách test

\\\`\\\`\\\`bash

# Command để chạy test

pytest tests/unit/test_scanner.py -v
\\\`\\\`\\\`

## Screenshots (nếu có UI)

[Đính kèm ảnh]

## Checklist (BẮT BUỘC)

- [ ] Code chạy được locally
- [ ] Tests pass: \`pytest\`
- [ ] Lint pass: \`ruff check .\`
- [ ] **KHÔNG có API key / token / credential trong diff** (kể cả \`.env.example\`)
- [ ] Nếu sửa PRD/docs: đã kiểm tra nội dung đúng và link không chết
- [ ] Ít nhất 1 teammate đã review

## Liên quan

Closes #[issue-number]
Related to #[issue-number]
```

### 6️⃣ Review Code

#### Người tạo PR:

- **Tự review trước** — đọc lại diff trên GitHub, tìm lỗi chính tả, logic sai
- Tag reviewer: `@username can you review this?`
- Trả lời comments của reviewer

#### Reviewer:

- Đọc description để hiểu context
- Check code logic, edge cases, naming conventions
- Check tests có cover đủ không
- **KHÔNG được approve nếu:**
  - Tests không pass (có ❌ đỏ trên PR)
  - Có hardcoded secrets
  - Code không chạy được
  - Commit message không theo chuẩn

**Comment types:**

- **❗ Blocking:** Phải fix mới merge được
- **💡 Suggestion:** Nên sửa nhưng không blocking
- **❓ Question:** Hỏi để hiểu rõ hơn

**Ví dụ review comment tốt:**

```
❗ Line 45: Nên check \`if cccd is None\` trước khi gọi \`.strip()\`
để tránh AttributeError.

💡 Line 78: Có thể extract hàm \`validate_cccd_format()\` ra riêng
để dễ test và tái sử dụng.

❓ Tại sao dùng regex này thay vì regex kia?
```

### 7️⃣ Merge Pull Request

**Điều kiện merge:**

- ⛔ **Target Base Branch BẮT BUỘC là `develop`** — Kiểm tra kỹ trước khi bấm merge: nếu thấy Base đang là `main`, DỪNG LẠI NGAY! Đổi base về `develop`. **KHÔNG BAO GIỜ merge vào `main`**.
- ✅ Ít nhất 1 approval từ teammate
- ✅ All CI checks pass (tests, lint)
- ✅ No merge conflicts
- ✅ Description đã điền đầy đủ

**Cách merge:**

1. GitHub UI: Click "Squash and merge" (khuyến khích) hoặc "Merge pull request"
2. GitHub CLI: `gh pr merge <PR-number> --squash`

**Sau khi merge:**

```bash
# Xóa nhánh remote (GitHub tự động suggest)
# Xóa nhánh local
git checkout develop
git pull origin develop
git branch -d feature/database-scanner  # -D nếu force delete

# Tiếp tục task mới
git checkout -b feature/pii-masking-engine
```

---

## 🔄 Đồng bộ với develop (khi có conflicts)

### Tình huống: Teammate merge PR khác vào develop, nhánh của bạn bị outdated

```bash
# 1. Đảm bảo code local đã commit
git status  # Nên là "nothing to commit, working tree clean"

# 2. Fetch thay đổi mới nhất từ remote
git fetch origin

# 3. Merge develop vào nhánh hiện tại
git merge origin/develop

# 4. Nếu có conflicts:
# - Git sẽ list các file conflict
# - Mở file, tìm dòng <<<<<< HEAD
# - Quyết định giữ code nào
# - Xóa các marker <<<<<<<, =======, >>>>>>>
# - Stage và commit

git add <resolved-files>
git commit -m "merge: resolve conflicts with develop"

# 5. Push lên để cập nhật PR
git push
```

### Tránh conflicts từ đầu:

- Pull develop mỗi sáng trước khi bắt đầu làm
- Tạo PR nhỏ, merge nhanh (< 300 dòng code)
- Phân chia task để 2 người không sửa cùng 1 file

---

## 📋 Quy tắc đặc biệt cho Gate 1 & Gate 2

### Gate 1 (Tuần 1-2): Chốt đề tài

**4 deliverables bắt buộc đi qua PR:**

1. `docs/brief.md` → PR: `docs/add-one-page-brief`
2. `docs/prd.md` → PR: `docs/add-prd-for-gate-1`
3. `docs/ui-flow.md` → PR: `docs/add-wireframe-and-ui-flow`
4. `README.md` (cập nhật) → PR: `docs/update-readme-project-info`

**⚠️ Yêu cầu đặc biệt:**

- **PRD phải có đủ mục 5, 6, 9:**
  - Mục 5: Human-in-the-loop
  - Mục 6: Xử lý lỗi & giới hạn
  - Mục 9: Known Ambiguities
- **UI Flow phải có ≥ 6 màn hình:**
  - Vai trò 1 (ví dụ: Data Engineer)
  - Vai trò 2 (ví dụ: Compliance Officer)
  - Xác nhận hành động rủi ro
  - Đang xử lý (loading state)
  - Lỗi / không trả lời được
  - Trạng thái rỗng (empty state)

**🚫 KHÔNG được:**

- Push trực tiếp `docs/*.md` vào develop/main
- Commit file `.env` (chứa API key)
- Để PRD stale khi code đã thay đổi

### Gate 2 (Tuần 3-4): Demo 1

**Yêu cầu bắt buộc:**

- ✅ **≥ 10 PR đã merge** — Không làm bù được, bắt đầu từ tuần 1
- ✅ **CI/CD đang chạy** — File `.github/workflows/ci.yml` có sẵn
- ✅ **Tests pass** — Ít nhất unit tests cho core logic
- ✅ **AI log đã hoạt động** — Chạy `setup_hooks.sh`

**💡 Tips:**

- Tạo PR cho mọi thứ, kể cả docs, kể cả 1 dòng code
- Review nhanh (trong ngày) để không block teammate
- Squash commits khi merge để giữ history sạch

---

## 🛡️ Security & Best Practices

### 1. KHÔNG BAO GIỜ commit secrets

**❌ TRÁNH:**

```python
# WRONG - hardcoded API key
GEMINI_API_KEY = "AIzaSyC..."
```

**✅ ĐÚNG:**

```python
# RIGHT - load from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env")
```

**File `.env` đã nằm trong `.gitignore`** — Nhưng nếu lỡ commit:

1. **Đổi API key ngay lập tức** trên dashboard provider
2. Xóa khỏi git history bằng `git filter-repo` hoặc BFG Repo-Cleaner
3. Force push (sau khi thông báo team)

### 2. Kiểm tra trước khi commit

```bash
# Luôn check status trước
git status

# Nếu thấy file lạ (.env, __pycache__, .DS_Store):
git reset HEAD <file>  # Unstage
# Hoặc thêm vào .gitignore

# Check diff để đảm bảo chỉ commit những gì cần thiết
git diff --staged
```

### 3. Pre-commit checks

Repo đã có sẵn pre-commit hooks. Kích hoạt:

```bash
# Setup hooks (chỉ chạy 1 lần)
bash scripts/setup_hooks.sh

# Từ giờ, mỗi lần commit sẽ tự động:
# - Check syntax errors
# - Run ruff linter
# - Validate commit message format
# - Check for hardcoded secrets
```

---

## 🆘 Xử lý tình huống khẩn cấp

### "Tôi vừa commit .env chứa API key!"

```bash
# 1. ĐỔI API KEY NGAY trên dashboard provider
# 2. Nếu chưa push:
git reset --soft HEAD~1        # Undo commit, giữ changes
git reset HEAD .env            # Unstage .env
git commit -m "feat: ..."      # Commit lại không có .env

# 3. Nếu đã push nhưng chưa ai pull:
# ĐỔI KEY TRƯỚC, sau đó:
git push --force-with-lease

# 4. Nếu đã có người pull:
# Thông báo team, đổi key, dùng git-filter-repo
```

### "Tôi commit nhầm vào main thay vì develop!"

```bash
# 1. Tạo nhánh mới từ commit đó
git branch feature/rescue-commit

# 2. Reset main về vị trí cũ
git checkout main
git reset --hard origin/main

# 3. Tiếp tục làm việc trên nhánh mới
git checkout feature/rescue-commit
git push -u origin feature/rescue-commit
# Tạo PR: feature/rescue-commit → develop
```

### "Lỡ tạo PR target vào main thay vì develop!"

```bash
# Không cần đóng PR và tạo lại từ đầu:
# 1. Mở trang PR trên GitHub
# 2. Bấm nút "Edit" ở góc trên bên phải tiêu đề PR (cạnh title)
# 3. Ở mục "base:", bấm vào dropdown và chọn "develop" thay vì "main"
# 4. Bấm "Save"
```

### "PR của tôi có quá nhiều conflicts!"

```bash
# Option 1: Merge develop vào nhánh
git checkout feature/my-branch
git merge develop
# Giải quyết conflicts, commit, push

# Option 2: Rebase (nếu chưa có ai review PR)
git checkout feature/my-branch
git rebase develop
# Giải quyết conflicts từng commit
git push --force-with-lease
```

### "Tôi làm nhiều thứ trên 1 nhánh, giờ muốn tách PR!"

```bash
# 1. Tạo nhánh backup
git checkout feature/big-branch
git branch feature/big-branch-backup

# 2. Tạo nhánh mới cho từng phần
git checkout develop
git checkout -b feature/part-1

# 3. Cherry-pick commits cần thiết
git cherry-pick <commit-hash-1>
git cherry-pick <commit-hash-2>

# 4. Tạo PR cho từng nhánh nhỏ
```

---

## 📊 Theo dõi tiến độ

### Checklist hàng ngày (Daily Standup)

- [ ] Pull develop mới nhất
- [ ] Review ≥ 1 PR của teammate (nếu có)
- [ ] Push code ít nhất 1 lần (backup + transparency)
- [ ] Check CI status của PR đang mở

### Checklist hàng tuần

- [ ] Số lượng PR merged: \_\_\_ / 10 (target: ≥ 2 PR/tuần)
- [ ] PRD/docs đã sync với code chưa?
- [ ] Tests coverage: \_\_\_ %
- [ ] AI log có hoạt động không?

### Dashboard theo dõi

- **GitHub Insights:** `github.com/AI20K-Build-Phase-Cohort-4/P-138/pulse`
- **PR stats:** Số PR mở / merged / closed
- **Contributor activity:** Ai commit nhiều nhất, ai cần support

---

## 📚 Tài liệu tham khảo

### Trong repo này:

- [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) — Bản đồ cây thư mục & phân chia trách nhiệm chi tiết cho 4 thành viên
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — Hướng dẫn đóng góp chung
- [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) — Template PR
- [`docs/prd.md`](docs/prd.md) — Product Requirements Document
- [`docs/brief.md`](docs/brief.md) — One-page brief
- [`README.md`](README.md) — Tổng quan dự án

### External:

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [AI20K Gate 1 Requirements](docs/gate-1-requirements.md) — Chi tiết yêu cầu Gate 1

---

## ❓ FAQ

**Q: Tôi có thể tạo PR hoặc merge vào `main` không?**  
A: **TUYỆT ĐỐI KHÔNG.** Không một thành viên nào được tạo PR hay merge code vào `main`. Toàn bộ PR phải trỏ target base vào `develop`. Nhánh `main` chỉ do Team Lead đồng bộ từ `develop` khi release chính thức tại các mốc Gate.

**Q: Tôi có thể push trực tiếp vào develop không?**  
A: KHÔNG. Mọi thay đổi phải qua PR, kể cả hotfix.

**Q: PR nhỏ nhất có thể bao nhiêu dòng code?**  
A: 1 dòng cũng được. Ví dụ: sửa typo trong README.

**Q: Nên tạo PR khi nào?**  
A: Khi feature/fix hoàn thành và tests pass. KHÔNG tạo "WIP" PR để mở trước.

**Q: Nếu 2 người đang làm feature liên quan, phải branch từ đâu?**  
A: Vẫn từ `develop`. Người làm xong trước merge vào develop, người sau pull develop và giải quyết conflicts.

**Q: Có cần viết tests cho mọi PR không?**  
A: Không bắt buộc cho docs/chore. Bắt buộc cho feat/fix logic quan trọng.

**Q: Branch feature/ có thể tồn tại bao lâu?**  
A: Tối đa 2-3 ngày. Nếu quá 3 ngày chưa merge, chia nhỏ thành nhiều PR.

---

**📅 Last updated:** 2026-09-22  
**👥 Maintainer:** Team Leader — cập nhật file này khi có quy trình mới
