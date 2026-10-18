# PIIGuard Shield

> Hỗ trợ DPO rà soát dữ liệu cá nhân trong PostgreSQL và MongoDB, duyệt biện pháp bảo vệ và chia sẻ dataset vẫn dùng được cho tác vụ phân tích đã kiểm tra.

**Mã đề:** DATA-06 · **Đội:** P-138 · **Chương trình:** VinUni AI20K Build Phase — Cohort 4  
**Bản thiết kế:** 21/09/2026 · **Trạng thái:** MVP/Gate 2 đã qua · **P1:** xem báo cáo nghiệm thu (số liệu tại thời điểm báo cáo)

---

## 🚀 Live Production & Release Links

| Hệ thống / Thành phần | Đường dẫn trực tuyến (Live URL) | Trạng thái | Ghi chú & Tài khoản Demo |
|---|---|:---:|---|
| **🌐 Frontend Web App** | [frontend-alpha-fawn-53.vercel.app](https://frontend-alpha-fawn-53.vercel.app) | 🟢 Live | Giao diện React SPA trên Vercel kết nối Cloud Backend |
| **⚡ Backend API Production** | [piiguard-vn-api.onrender.com](https://piiguard-vn-api.onrender.com) | 🟢 200 OK | FastAPI Docker trên Render Cloud chạy 24/7 |
| **📖 Interactive API Docs** | [piiguard-vn-api.onrender.com/docs](https://piiguard-vn-api.onrender.com/docs) | 🟢 Live | Swagger UI đầy đủ endpoints kiểm thử trực tiếp |
| **🩺 Health Check Probe** | [piiguard-vn-api.onrender.com/health](https://piiguard-vn-api.onrender.com/health) | 🟢 200 OK | Trả về `{"status":"ok","env":"production"}` |
| **📦 Docker Hub Release** | `docker.io/len1652/piiguard-api:latest` | 🟢 Verified | Linux amd64 Image production đóng gói sẵn |
| **🎬 Video Demo (3-5 phút)** | [Google Drive Demo Folder](https://drive.google.com/drive/folders/1OOIj4LYKQ4vIFTbjH8rg0DRRxJ7hNGoN?usp=sharing) | 🟢 Ready | Luồng E2E PostgreSQL/MongoDB ➔ DPO Review ➔ Masking ➔ Audit ➔ Analyst |
| **📊 Pitch Deck** | [pitch_deck.pdf](presentation/pitch_deck.pdf) · [.pptx](presentation/pitch_deck.pptx) | 🟢 Ready | 10 slide theo Brand DNA + [thumbnail video](presentation/thumbnail.png); hướng dẫn build tại [presentation/README.md](presentation/README.md) |

### 🔑 Tài Khoản Trải Nghiệm Demo (Demo Credentials)
- **DPO (Data Protection Officer):** `dpo` / `dpo123` (hoặc `dpo@piiguard.vn`) — Phân loại PII, cấu hình Masking/HMAC, thẩm định rủi ro và phát hành snapshot.
- **Data Analyst:** `analyst` / `analyst123` (hoặc `analyst@piiguard.vn`) — Truy cập và truy vấn snapshot dữ liệu đã được bảo vệ an toàn.

---

### 🗺️ Lộ Trình Đọc Tài Liệu Cho Ban Giám Khảo (Fast-Track Reading Guide)

Dành cho Ban Giám Khảo / Hội đồng đánh giá muốn nắm bắt nhanh dự án trong 3–10 phút:

1. ⏱️ **Bước 1 (2 phút — Tổng quan & Kết quả P1):**
   * Đọc phần **Giải pháp** và bảng **Báo cáo nghiệm thu P1** ngay bên dưới trong [README.md](README.md).
2. ⏱️ **Bước 2 (3 phút — Kiến trúc cốt lõi & 3 trụ cột thiết kế):**
   * Đọc bản tóm lược cấp cao tại [**`ARCHITECTURE.md`**](ARCHITECTURE.md):
     * *Giới hạn Zero Raw PII:* DPO duyệt metadata; xem cảnh báo bảo mật ngay dưới đây trước khi giới thiệu khả năng chia sẻ snapshot.
     * *Deep Content Inspection (Khoét sâu dữ liệu):* GLiNER Cascade đọc sâu text trong RAM, trừu tượng hóa an toàn về DPO.
     * *Chiến lược 5 hành động Masking:* Lý do không che thô `***` (HMAC giữ JOIN, REDACT giữ ngữ nghĩa NLP, MASK giữ phân tích).
3. ⏱️ **Bước 3 (5 phút — Thẩm định chuyên sâu theo từng tiêu chí):**
   * 🤖 **Thẩm định mô hình AI & NER:** [AI Architecture](docs/core/AI_ARCHITECTURE.md) (Luồng A: 100% Accuracy, Luồng B GLiNER: 97.86% Recall).
   * 🎬 **Thẩm định quy trình Demo 4 Tabs DPO:** [Kịch bản Demo 6 bước](docs/guide/DEMO_FLOW.md).
   * ⚖️ **Thẩm định Pháp lý & Tuân thủ:** [Đặc tả PRD Luật 91 & Nghị định 356](docs/core/prd.md) & [Báo cáo nghiệm thu P1](docs/core/MVP_STATUS_REPORT.md).
   * 🗂️ **Bản đồ tài liệu toàn dự án:** [docs/README.md](docs/README.md).

---

## Vấn đề (Problem)

DPO và đội dữ liệu mất công rà từng trường trước khi cung cấp dữ liệu cho Analyst. Họ vừa có thể bỏ sót dữ liệu cá nhân, vừa có thể làm hỏng phép liên kết nếu che khóa không nhất quán. Cần một quy trình có căn cứ, người duyệt và kiểm tra tác động trước khi chia sẻ.

## Giải pháp (Solution)

**PostgreSQL hoặc MongoDB → chọn bảng/collection → quét → DPO duyệt → build snapshot → verifier → publish → Analyst dùng.**

Các nguyên tắc không đổi trong P1:

- Source database chỉ đọc; output là snapshot/protected database riêng.
- DPO workspace không render raw source values; log và prompt LLM không được chứa raw PII. PII được `KEEP` theo ngoại lệ vẫn có thể xuất hiện trong published snapshot cho Analyst.
- Rules là baseline; LLM chỉ hỗ trợ field mơ hồ bằng metadata/statistics đã lọc.
- `HMAC` giữ lookup/join/mapping; `MASK` che field; `DROP` loại field; `KEEP` dành cho non-personal, nhưng hiện backend cũng chấp nhận ngoại lệ PII có hạn.
- Publish chỉ sau khi verifier pass.

**Giới hạn cần xử lý trước khi khẳng định “Zero Raw PII” tuyệt đối:** backend hiện cho phép DPO chọn `KEEP` cho trường PII khi có ngoại lệ, lý do và hạn; `KEEP` sao chép giá trị gốc sang snapshot có thể được Analyst xem sau khi publish. Các mục bên dưới phản ánh mục tiêu và báo cáo nghiệm thu P1, không thay thế kiểm tra bảo mật của bản phát hành hiện tại.

Căn cứ danh mục: [Luật 91/2025/QH15](https://chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroupid=3) và [Nghị định 356/2025/NĐ-CP, Điều 3–4](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/356-nd.signed.pdf). Mapping, độ phủ và giới hạn: [PRD](docs/core/prd.md).

## Target User

| Vai trò             | Giá trị nhận được                                                        |
| ------------------- | ------------------------------------------------------------------------ |
| DPO / Data reviewer | Review có căn cứ, quyết định rõ và bằng chứng xử lý                      |
| Analyst             | Dataset được phép dùng, có kiểm tra tác vụ và thời điểm snapshot rõ ràng |

## Trạng Thái P1 — Báo Cáo Nghiệm Thu

Các tỷ lệ và số bài test dưới đây là số liệu trong báo cáo nghiệm thu P1, không phải kết quả CI mới nhất. Khi phát hành, xem workflow hiện tại và chạy lại các phép kiểm tương ứng.

Bảng dưới ghi lại kết quả nghiệm thu 5 hạng mục P1 tại thời điểm lập báo cáo:

| Hạng mục P1 | Trọng tâm kiểm soát | Kết quả nghiệm thu |
| --- | --- | --- |
| **P1-1: Quét sâu field/patterns** | Quét sâu patterns trong PostgreSQL & MongoDB | **100% HOÀN THÀNH** — Luồng A đạt 100% Accuracy trên 339 cột doanh nghiệp sau HITL; Luồng B đạt 97.86% Recall, 97.16% Precision, 97.51% F1 với GLiNER zero-shot cascade. |
| **P1-2: Đồng bộ Risk Scorer** | Risk score / report / UI chip đồng bộ chuẩn FR-10 | **100% HOÀN THÀNH** — Điểm rủi ro tất định 0–100, Privacy Risk Report API (`GET /runs/{id}/report`), và UI chips đồng bộ hoàn toàn. |
| **P1-3: AI fallback & Memory** | Rules-only độc lập, LLM chỉ nhận metadata/stats | **100% HOÀN THÀNH** — Rules local chạy ổn định khi tắt AI; khi bật AI, LLM nhận thống kê phân phối rút gọn (`column_stats.py`) và bộ nhớ HITL Few-Shot Memory. |
| **P1-4: Bảo mật Audit & Log** | Không lộ raw PII, credential, API key | **Theo báo cáo nghiệm thu** — Sổ cái Merkle Root SHA-256 (`/audit/verify`); lưu ý ngoại lệ `KEEP` có thể đưa PII vào snapshot (xem cảnh báo phía trên). |
| **P1-5: CI/CD & Testing** | CI và tests | **Theo báo cáo nghiệm thu** — 317 backend tests, 160 frontend tests và Ruff sạch tại thời điểm báo cáo; xem CI mới nhất để xác nhận hiện trạng. |

PostgreSQL fixture chính nằm tại `data/fixtures/seed.sql` (14 bảng quan hệ, dữ liệu synthetic PII). MongoDB fixture tại `data/fixtures/mongo/seed_mongo.py` (91 customers, 830 orders). Toàn bộ dữ liệu là synthetic 100%. Sample values trong fixture/eval không được đưa vào prompt hoặc log; DPO workspace không render raw source values.

## Tech Stack

| Layer       | Lựa chọn                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Backend     | Python 3.11 + FastAPI + Pydantic                                                                                           |
| AI workflow | Rules/regex baseline; LangGraph + BM25/hybrid + LLM optional khi `ENABLE_AI_SCAN=true`; provider fallback: OpenRouter → OpenAI → Gemini |
| Frontend    | React + TypeScript + Vite                                                                                                  |
| Database    | PostgreSQL (CSDL quan hệ doanh nghiệp đầy đủ nhiều bảng) + MongoDB; psycopg + PyMongo; state trong schema PostgreSQL riêng |
| Protection  | MASK/DROP và Python HMAC-SHA-256; ChromaDB local chỉ dùng cho tri thức phân loại PII, không lưu raw source value          |
| DevOps      | Docker Compose + GitHub Actions; máy demo riêng, database không công khai                                                  |

Quyết định kiến trúc và phương án đánh đổi: [ARCHITECTURE.md](ARCHITECTURE.md) và [docs/core/SYSTEM_ARCHITECTURE.md](docs/core/SYSTEM_ARCHITECTURE.md).

## Quick Start

App cắm database bằng **connection string**, không ưu tiên upload file database. Có hai nhóm database:

```text
Input  = source database read-only
Output = protected snapshot database cho Analyst
```

PostgreSQL:

```env
SOURCE_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydatabase
SNAPSHOT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/snapshot_out
ENABLE_PG_SNAPSHOT=true
```

MongoDB:

```env
MONGO_URI=mongodb://admin:admin@localhost:27017/?authSource=admin
MONGO_DB=mydatabase
MONGO_SNAPSHOT_DB=mydatabase_protected
ENABLE_MONGO=true
```

Không commit `.env`, API key, password, HMAC secret hoặc connection string có credential.

AI scan mặc định có thể tắt để demo ổn định bằng luật local:

```env
ENABLE_AI_SCAN=false
```

Khi bật `ENABLE_AI_SCAN=true`, backend gọi LLM chỉ với metadata/statistics đã lọc, không gửi raw `sample_value`. Thứ tự provider trong code hiện tại là:

```text
OPENROUTER_API_KEY + MODEL_NAME
OPENAI_API_KEY + OPENAI_MODEL
GOOGLE_API_KEY -> gemini-3.5-flash-lite
```

`OPENAI_BASE_URL` hiện chưa được đọc trong `src/config.py`/`src/services/llm.py`; muốn dùng OpenAI-compatible gateway riêng cần sửa code trước khi ghi vào `.env` như cấu hình chính thức.

### 🚀 Hướng Dẫn Khởi Chạy Ứng Dụng

#### Cách 1: Khởi Chạy Local Dev (Khuyên dùng khi lập trình)

Cần mở 2 cửa sổ/tab Terminal song song:

##### 🔹 Bước 1: Khởi động Database & Seed Dữ Liệu Test
```bash
# 1. Bật container PostgreSQL (port 5432) & MongoDB (port 27017)
docker compose up -d db mongodb

# 2. Đợi 5s cho database sẵn sàng, sau đó nạp dữ liệu mẫu
# Nạp PostgreSQL fixture (14 bảng quan hệ, dữ liệu synthetic PII):
docker cp data/fixtures/postgres/seed.sql p-138-db-1:/tmp/seed.sql
docker exec p-138-db-1 psql -U postgres -d mydatabase -f /tmp/seed.sql

# Tạo sẵn DB snapshot đích cho luồng build:
docker exec p-138-db-1 psql -U postgres -c "CREATE DATABASE piiguard_snapshot_db;" || true
```

##### 🔹 Bước 2: Chạy Backend (Terminal 1)
```bash
# 1. Kích hoạt môi trường ảo Python & cài đặt dependencies
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2. Seed dữ liệu MongoDB (91 customers, 830 orders)
python data/fixtures/mongo/seed_mongo.py

# 3. Khởi chạy FastAPI server (Port 8000)
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
# Hoặc dùng lệnh: make run
```
* **API Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

##### 🔹 Bước 3: Chạy Frontend (Terminal 2)
```bash
cd front_end

# 1. Cài đặt dependencies (bắt buộc cho lần đầu)
npm install

# 2. Khởi chạy Vite dev server
npm run dev
```
* **Giao diện Web**: [http://localhost:5173](http://localhost:5173)

---

#### Cách 2: Khởi Chạy Toàn Bộ Bằng 1 Script Tự Động

Team đã chuẩn bị sẵn script tự động kiểm tra dependencies, bật Docker, nạp seed và chạy cả BE lẫn FE:
```bash
bash scripts/start-app.sh
```

---

#### 🔑 Tài Khoản Demo Đăng Nhập

| Vai trò | Username | Password | Quyền hạn chính |
| :--- | :--- | :--- | :--- |
| **DPO** (Data Protection Officer) | `dpo` | `dpo123` | Quét PII, review bảng, cấu hình che PII (MASK/HMAC/DROP), build snapshot, publish |
| **Data Analyst** | `analyst` | `analyst123` | Xem danh sách và dữ liệu preview của các snapshot đã được publish |

---

#### 🧪 Lệnh Kiểm Thử & Kiểm Tra Code

```bash
# Backend tests & linters
make test       # pytest
make lint       # ruff check
make format     # ruff format

# Frontend tests & linters
cd front_end && npm run test && npm run lint
```

Sau khi server chạy, mở `http://localhost:8000/docs`. Flow API chính:

```text
POST /sessions
GET /sources
GET /sources/{id}/scope
POST /runs
GET /runs/{id}
PUT /runs/{id}/decisions
POST /runs/{id}/build
POST /datasets/{id}/publish
GET /datasets/{id}/preview
```

Màn hình DPO trên frontend (`front_end/`):

| Đường dẫn               | Nội dung                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `/dpo`                  | Quét & duyệt: chọn nguồn (ô chọn trên breadcrumb), chọn phạm vi, quét, quyết định từng trường trên 4 tabs chuẩn hóa (Tổng quan & phân loại, Rủi ro & đánh giá, Nhật ký kiểm toán, Dữ liệu cho Analyst). **Lưu** = lưu quyết định + tạo/kiểm định bản dữ liệu đã bảo vệ; **Phát hành** cho mọi Analyst; **Thu hồi** để chỉnh lại |
| `/dpo/runs/:id`         | Mở lại một run (reload không mất trạng thái); khôi phục quyết định đã lưu; tab "Dữ liệu cho Analyst" có kết quả kiểm định và bản xem trước |
| `/dpo/runs`             | Nơi quản lý duy nhất: tab Chờ duyệt / Chờ phát hành / Đã phát hành / Lỗi; phát hành, thu hồi, xoá ngay trên danh sách (1 run = 1 dataset) |
| `/dpo/masking`          | Demo che mờ: Live Sandbox thử nghiệm kỹ thuật MASK, REDACT, HMAC, DROP trực tiếp và bảng ma trận kỹ thuật bảo vệ dữ liệu (FE-15, FE-19) |
| `/dpo/rules`            | Quy định Luật BV DLCN 2025 & NĐ 356: Ma trận bảo vệ L1 (Gián tiếp) → L2 (Cơ bản) → L3 (Nhạy cảm) kèm link nguồn pháp luật chính phủ (FE-16, FE-18, FE-20, FE-22) |
| `/dpo/datasets[/:id]`   | Chỉ còn để link cũ chạy được: chuyển sang `/dpo/runs` hoặc trang run của dataset              |
| `/dpo/audit`            | Nhật ký hoạt động: nhóm theo ngày, mỗi dòng một câu mô tả dễ hiểu (lọc Quét & duyệt / Phát hành / Nguồn / Đăng nhập); bấm để xem chi tiết sự kiện và mã băm toàn vẹn |

`sql-demo` và `nosql-demo` hiện là hai source demo trả từ backend. Nguồn do DPO đăng ký (`POST /sources`) nhận connection string, test connection, kiểm tra schema/database tồn tại, rồi cho DPO chọn bảng/collection trước khi quét:

- **Schema**: trường `namespace`; để trống thì lấy từ URL (`?options=-csearch_path%3Dsales` hoặc `?currentSchema=sales`), không có thì `public`. Mongo lấy database từ path của URL.
- **Allowlist** (`tables`): `/scope` chỉ liệt kê các bảng này và `POST /runs` từ chối (422) bảng ngoài danh sách.
- **Quét gì thì publish nấy**: snapshot chỉ chứa các bảng đã quét. Quan hệ chỉ được kiểm tra/verify khi cả hai đầu nằm trong run.
- **Bảng liên kết** (`link_scope`): khi bỏ bảng cha hoặc bảng trung gian (N–N), màn chọn phạm vi cảnh báo và cho thêm bảng đó dạng liên kết — chỉ giữ cột khóa nối (đề xuất HMAC, đầu kia cũng HMAC), cột khác đề xuất DROP. Analyst vẫn JOIN được mà không lộ thêm PII. Liên kết bị cắt (`cut_links`) và bảng liên kết được ghi vào audit của run.
- **Verifier** cho nguồn Postgres đăng ký: số dòng + `join_matched:<from>-><to>` (số dòng JOIN khớp trên snapshot phải bằng nguồn) + quét rò rỉ PII.

## GitHub Actions self-hosted runner (máy Phúc)

Runner `team-138-rin1652` được đăng ký cho repo P-138 với nhãn `team-138`. Thư mục `actions-runner/` là runtime của GitHub Runner, chỉ tồn tại local và không được commit.

Khi mở Mac và muốn CI nhận job, chạy trong terminal:

```bash
cd /Users/phucnguyen/Desktop/AI/team_build_phase/P-138/actions-runner
./run.sh
```

Giữ terminal này mở và để Mac thức, có mạng. Kiểm tra runner:

```bash
./svc.sh status
```

Không chạy `svc.sh` bằng `sudo`; runner macOS được cài dưới user hiện tại. Nếu gập máy làm Mac sleep, runner sẽ offline; job dùng `runs-on: self-hosted` sẽ chờ hoặc có thể fail nếu đang chạy.

## Project Structure

> 📖 **Xem bản đồ cây thư mục và phân chia trách nhiệm chi tiết cho từng thành viên tại:** [**docs/PROJECT_STRUCTURE.md**](docs/PROJECT_STRUCTURE.md)

| Đường dẫn                                                              | Nội dung                                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md)               | Phân chia trách nhiệm & cây thư mục chi tiết cho FE, BE, AI Eng, Data Eng      |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)                                   | Kiến trúc hệ thống, security boundary và deploy model                          |
| [`data/fixtures/postgres/README.md`](data/fixtures/postgres/README.md) | Hướng dẫn seed, 14 bảng quan hệ và đối soát PostgreSQL fixture                 |
| [`data/fixtures/mongo/README.md`](data/fixtures/mongo/README.md)       | Hướng dẫn seed, chỉ mục và đối soát MongoDB fixture (91 customers, 830 orders) |
| [`docs/README.md`](docs/README.md)                                      | Bản đồ tài liệu đang dùng                                                       |
| [`docs/core/prd.md`](docs/core/prd.md)                                      | Phạm vi, stories, HITL, lỗi, dữ liệu, stack, ambiguity và nghiệm thu           |
| [`docs/core/AI_ARCHITECTURE.md`](docs/core/AI_ARCHITECTURE.md)              | Luồng AI detection, provider, zero-raw-PII prompt và giới hạn hiện tại         |
| `src/`                                                                 | API, workflow, connectors, protection, verifier và metadata                    |
| `front_end/`                                                            | React dashboard                                                                |
| `eval/`, `tests/`                                                      | Fixture, nhãn, so sánh baseline và kiểm tra guardrail                          |
| `presentation/`                                                        | Demo script, số liệu thực tế và slide sau nghiệm thu                           |
| `.github/workflows/`                                                   | CI theo khung repo chương trình                                                |

## API Endpoints

Các endpoint chính:

| Endpoint                                  | Quyền           | Hành vi                                                                              |
| ----------------------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| `POST /sessions`                          | Tài khoản demo  | Xác thực; role do server quyết định                                                  |
| `GET /sources`                            | DPO             | Liệt kê nguồn demo + nguồn do DPO đăng ký, không trả credential                      |
| `POST /sources`, `POST /sources/test`     | DPO             | Đăng ký nguồn (URL mã hoá, không trả lại); kiểm tra kết nối và schema/database tồn tại |
| `GET /sources/{id}/scope`                 | DPO             | Bảng/collection (lọc theo allowlist), cột và `relationships` (FK, khoá logic, tham chiếu Mongo suy luận) |
| `POST /runs`                              | DPO             | Tạo run và quét `selected_scope` + bảng liên kết `link_scope`; 422 nếu ngoài allowlist |
| `GET /runs`                               | DPO             | Lịch sử run (mới nhất trước), lọc `?status=&source_id=`; chỉ trả số đếm              |
| `GET /runs/{id}`                          | DPO             | Tiến độ, field profile, quyết định đã lưu và trạng thái                              |
| `DELETE /runs/{id}`                       | DPO             | Xoá run và metadata; bị chặn (409) khi còn dataset VERIFIED/PUBLISHED; giữ nhật ký audit |
| `PUT /runs/{id}/decisions`                | DPO             | Review mọi trường; lưu phiên quyết định. Được sửa tới khi phát hành: run VERIFIED (hoặc FAILED ở verifier) quay về READY_TO_BUILD và dataset của run về STAGING (không phát hành được cho tới khi build lại); run PUBLISHED trả 422 — thu hồi trước |
| `POST /runs/{id}/build`                   | DPO             | Kiểm tra trạng thái và khóa nối trong phạm vi run, tạo bản dữ liệu đã bảo vệ và chạy verifier. Mỗi run có đúng một dataset: build lại dùng lại dataset đó (xoá kết quả verifier cũ) |
| `GET /runs/{id}/report`                   | DPO             | Trả về Privacy Risk Report (dạng HTML/JSON) đánh giá rủi ro PII                      |
| `GET /runs/{id}/risk-score`               | DPO             | Điểm rủi ro; số dòng đếm từ nguồn, `row_count_estimated=true` nếu không đếm được     |
| `GET /datasets`                           | DPO / Analyst   | DPO: mọi dataset (trừ FAILED) kèm thời điểm và số grant; Analyst: chỉ PUBLISHED được cấp quyền; lọc `?status=` |
| `GET /datasets/{id}`                      | DPO             | Chi tiết dataset, kết quả verifier, số cột theo MASK/HMAC/KEEP/DROP                  |
| `POST /datasets/{id}/publish`             | DPO             | Chỉ VERIFIED; tự cấp quyền cho mọi Analyst, ghi audit                               |
| `POST /datasets/{id}/revoke`              | DPO             | Xoá bản dữ liệu vật lý, huỷ mọi grant; run quay về READY_TO_BUILD (giữ quyết định) để sửa và phát hành lại |
| `GET /datasets/{id}/preview`              | DPO / Analyst   | Đọc dòng thật từ snapshot đã bảo vệ; `?table=&limit=` (tối đa 200)                   |
| `GET/POST /datasets/{id}/grants`, `DELETE /datasets/{id}/grants/{user_id}` | DPO | Xem / cấp / thu hồi quyền của Analyst trên dataset (kèm `username`); giao diện không còn dùng vì phát hành đã cấp quyền cho mọi Analyst |
| `GET /users?role=ANALYST`                 | DPO             | Danh sách người dùng để cấp quyền (chỉ id, username, role)                           |
| `GET /audit`, `GET /audit/verify`         | DPO             | Nhật ký kiểm toán lọc `?action=&actions=a,b&entity_type=&entity_id=&run_id=` (`run_id` gồm cả sự kiện của dataset thuộc run); mỗi sự kiện kèm `run_id`, `source_name` để hiển thị; kiểm tra chuỗi hash |

Không có endpoint cho Analyst đọc source hoặc nhập query tùy ý. Mọi endpoint kiểm tra quyền và trạng thái ở backend.

## P1 Control Rules

- Không merge nếu `ruff check .` hoặc `pytest` đỏ.
- Không thêm mock vào luồng DPO → build → publish → Analyst preview.
- Không gửi `sample_value` hoặc raw PII vào LLM/log/report/UI.
- Thay đổi scanner/policy phải cập nhật golden dataset hoặc evidence tương ứng.
- Gate 2 evidence được lưu tại [docs/archive/gate_2/README.md](docs/archive/gate_2/README.md); không sửa thành “đang làm” nữa.

## Team

Phân công triển khai được chọn cho kế hoạch; công suất thực tế cần xác minh ngày 1.

| Thành viên        | Trách nhiệm chính                                                              |
| ----------------- | ------------------------------------------------------------------------------ |
| Nguyễn Đình Phúc  | PO/Team Lead; frontend, scope, đối chiếu căn cứ, demo/pitch                    |
| Trần Xuân Tùng    | Rules/LLM, structured output, workflow phát hiện và đánh giá AI                |
| Nguyễn Trung Kiên | MongoDB connector, fixture/nhãn chuẩn, downstream và eval                      |
| Đoàn Tuấn Long    | Backend, PostgreSQL connector, writer/guardrail, phân quyền và môi trường demo |

Lịch thực hiện, giờ dự kiến và điểm cắt hiện theo Trello của team.

## License

MIT

## Đánh giá (Evaluation)

Chỉ số đánh giá (eval) chính thức của dự án phản ánh đầy đủ hiệu năng trước và sau HITL:

- **Báo cáo đối chiếu Luồng A (Column-level):** [`performance/sau_HITL/report_stream_a.md`](performance/sau_HITL/report_stream_a.md) — Đạt **100.00% Action Accuracy**, Precision 100%, Recall 100% trên 339 cột dữ liệu doanh nghiệp sau khi nạp DPO memory.
- **Báo cáo đối chiếu Luồng B (Free-text NER Redactor):** [`performance/sau_HITL/report_stream_b.md`](performance/sau_HITL/report_stream_b.md) — Kiến trúc 3 tầng Regex + FlashText + GLiNER Zero-Shot (`urchade/gliner_multi_pii-v1`) đạt **97.86% Recall**, **97.16% Precision**, **97.51% F1**.
- **Báo cáo tổng hợp ban đầu:** [`eval/results/report_full.md`](eval/results/report_full.md).

Để chạy lại quá trình đánh giá (eval), bạn có thể sử dụng lệnh sau:

```bash
PYTHONPATH=. python eval/run_eval_full.py
```

## Tài Liệu Dự Án

- [Assets dùng chung](assets/README.md) - SVG, mascot Pango, logo và cách dùng component trong frontend

- [PDF hồ sơ Demo Day](docs/pdf/PIIGuard_Shield_Demo_Day.pdf) - Tổng quan, demo, kiến trúc, AI và bằng chứng để tải về hoặc chia sẻ qua Drive/Release
 
- [Hướng Dẫn Phát Hành & Vận Hành Release](docs/ops/RELEASE_GUIDE.md) - Sổ tay phát hành, CI và triển khai Render/Vercel
- [Báo Cáo Hoàn Thành P1](docs/core/MVP_STATUS_REPORT.md) - Kết quả nghiệm thu lịch sử P1, có ghi chú giới hạn đã biết
- [Docs Index](docs/README.md) - Đọc file này trước để biết tài liệu nào còn dùng
- [System Architecture](docs/core/SYSTEM_ARCHITECTURE.md) - Luồng hệ thống end-to-end
- [AI Architecture](docs/core/AI_ARCHITECTURE.md) - Cách AI/rules/LLM đang được nối trong source
- [Golden Dataset](docs/core/GOLDEN_DATASET.md) - Tập nhãn chuẩn và cách eval
- [CI Runner Guide](docs/ops/CI_RUNNER_GUIDE.md) - Hướng dẫn self-hosted CI runner trên Mac
- [Gate 2 Archive](docs/archive/gate_2/README.md) - Bằng chứng cũ, giữ để đối chiếu

