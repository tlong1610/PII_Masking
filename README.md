# PIIGuard Shield

> Hỗ trợ DPO rà soát dữ liệu cá nhân trong PostgreSQL và MongoDB, duyệt biện pháp bảo vệ và chia sẻ dataset vẫn dùng được cho tác vụ phân tích đã kiểm tra.

**Mã đề:** DATA-06 · **Đội:** P-138 · **Chương trình:** VinUni AI20K Build Phase — Cohort 4  
**Bản thiết kế:** 21/09/2026 · **Trạng thái:** MVP/Gate 2 đã qua · Đang control P1

Đây là tài liệu vận hành sau MVP. Mục tiêu hiện tại là kiểm soát P1: giữ app chạy thật, quét sâu hơn vào dữ liệu/field trong PostgreSQL và MongoDB hiện có, và không làm rơi guardrail bảo vệ PII.

## Vấn đề (Problem)

DPO và đội dữ liệu mất công rà từng trường trước khi cung cấp dữ liệu cho Analyst. Họ vừa có thể bỏ sót dữ liệu cá nhân, vừa có thể làm hỏng phép liên kết nếu che khóa không nhất quán. Cần một quy trình có căn cứ, người duyệt và kiểm tra tác động trước khi chia sẻ.

## Giải pháp (Solution)

**PostgreSQL hoặc MongoDB → chọn bảng/collection → quét → DPO duyệt → build snapshot → verifier → publish → Analyst dùng.**

Các nguyên tắc không đổi trong P1:

- Source database chỉ đọc; output là snapshot/protected database riêng.
- DPO không xem raw PII; UI/API/report/prompt/log không được lộ raw value.
- Rules là baseline; LLM chỉ hỗ trợ field mơ hồ bằng metadata/statistics đã lọc.
- `HMAC` giữ lookup/join/mapping; `MASK` che field; `DROP` loại field; `KEEP` chỉ cho non-personal.
- Publish chỉ sau khi verifier pass.

Căn cứ danh mục: [Luật 91/2025/QH15](https://chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroupid=3) và [Nghị định 356/2025/NĐ-CP, Điều 3–4](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/356-nd.signed.pdf). Mapping, độ phủ và giới hạn: [PRD](docs/core/prd.md).

## Target User

| Vai trò             | Giá trị nhận được                                                        |
| ------------------- | ------------------------------------------------------------------------ |
| DPO / Data reviewer | Review có căn cứ, quyết định rõ và bằng chứng xử lý                      |
| Analyst             | Dataset được phép dùng, có kiểm tra tác vụ và thời điểm snapshot rõ ràng |

## Trạng Thái P1

Dự án đã hoàn thành MVP/Gate 2. P1 không phải mở thêm loại database hay cấu trúc dữ liệu mới; P1 là quét sâu hơn vào dữ liệu hiện có, tăng edge cases và làm bằng chứng tốt hơn.

| Đã có từ MVP | P1 đang control | Để sau |
| --- | --- | --- |
| PostgreSQL + MongoDB live flow | Quét sâu field/value patterns trong dataset hiện có | — (Chỉ tập trung PostgreSQL + MongoDB) |
| MASK/DROP/HMAC + verifier | Đồng bộ risk chip/report/evidence | Realtime CDC |
| DPO review + Analyst preview | Golden dataset nhiều ca khó hơn; AI fallback rõ hơn | KMS/SSO/production hardening |

PostgreSQL fixture chính nằm tại `data/fixtures/seed.sql`. Đây là dữ liệu mô phỏng 100%, dựa trên schema Northwind và được bổ sung PII Việt Nam synthetic như CCCD, số điện thoại, email, mã số thuế, ticket hỗ trợ và OCR text từ hồ sơ KYC giả lập. Golden dataset phải có nhãn chuẩn theo field, ca âm dễ nhầm, expected policy và expected downstream result. Nếu file nhãn nội bộ cần `sample_value` để eval, các giá trị đó chỉ dùng trong fixture/eval và không được hiển thị trong UI, report, prompt hoặc log.

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
| `/dpo`                  | Quét & duyệt: chọn nguồn, quét PII, quyết định từng trường, tạo snapshot                     |
| `/dpo/runs/:id`         | Mở lại một run (reload không mất trạng thái); khôi phục quyết định đã lưu                    |
| `/dpo/runs`             | Lịch sử quét, lọc theo trạng thái, đi tiếp tới bước kế tiếp; xoá từng run hoặc nhiều run đã chọn |
| `/dpo/datasets`         | Snapshots & datasets theo trạng thái (chờ phát hành / đã phát hành / đã thu hồi)             |
| `/dpo/datasets/:id`     | Chi tiết: verifier, xem trước dữ liệu đã bảo vệ, phát hành / thu hồi, cấp quyền Analyst      |
| `/dpo/audit`            | Nhật ký kiểm toán và trạng thái chuỗi hash                                                   |

`sql-demo` và `nosql-demo` hiện là hai source demo trả từ backend. Source động cho doanh nghiệp phải nhận connection string, test connection, đọc scope, cho DPO chọn bảng/collection, rồi mới scan PII trong phạm vi đã chọn.

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

> 📖 **Xem bản đồ cây thư mục và phân chia trách nhiệm chi tiết cho từng thành viên tại:** [**PROJECT_STRUCTURE.md**](PROJECT_STRUCTURE.md)

| Đường dẫn                                                              | Nội dung                                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md)                         | Phân chia trách nhiệm & cây thư mục chi tiết cho FE, BE, AI Eng, Data Eng      |
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
| `GET /sources/{id}/scope`                 | DPO             | Bảng/collection, cột và `relationships` (FK, khoá logic, tham chiếu Mongo suy luận) |
| `POST /runs`                              | DPO             | Tạo run và quét chỉ các bảng/collection đã chọn                                      |
| `GET /runs`                               | DPO             | Lịch sử run (mới nhất trước), lọc `?status=&source_id=`; chỉ trả số đếm              |
| `GET /runs/{id}`                          | DPO             | Tiến độ, field profile, quyết định đã lưu và trạng thái                              |
| `DELETE /runs/{id}`                       | DPO             | Xoá run và metadata; bị chặn (409) khi còn dataset VERIFIED/PUBLISHED; giữ nhật ký audit |
| `PUT /runs/{id}/decisions`                | DPO             | Review mọi trường; lưu phiên quyết định                                              |
| `POST /runs/{id}/build`                   | DPO             | Xác nhận, kiểm tra trạng thái, tạo staging và verifier                               |
| `GET /runs/{id}/report`                   | DPO             | Trả về Privacy Risk Report (dạng HTML/JSON) đánh giá rủi ro PII                      |
| `GET /runs/{id}/risk-score`               | DPO             | Điểm rủi ro; số dòng đếm từ nguồn, `row_count_estimated=true` nếu không đếm được     |
| `GET /datasets`                           | DPO / Analyst   | DPO: mọi dataset (trừ FAILED) kèm thời điểm và số grant; Analyst: chỉ PUBLISHED được cấp quyền; lọc `?status=` |
| `GET /datasets/{id}`                      | DPO             | Chi tiết dataset, kết quả verifier, số cột theo MASK/HMAC/KEEP/DROP                  |
| `POST /datasets/{id}/publish`             | DPO             | Chỉ VERIFIED; ghi audit và cho Analyst dùng                                          |
| `POST /datasets/{id}/revoke`              | DPO             | Xoá snapshot vật lý, huỷ mọi grant                                                   |
| `GET /datasets/{id}/preview`              | DPO / Analyst   | Đọc dòng thật từ snapshot đã bảo vệ; `?table=&limit=` (tối đa 200)                   |
| `GET/POST /datasets/{id}/grants`, `DELETE /datasets/{id}/grants/{user_id}` | DPO | Xem / cấp / thu hồi quyền của Analyst trên dataset (kèm `username`) |
| `GET /users?role=ANALYST`                 | DPO             | Danh sách người dùng để cấp quyền (chỉ id, username, role)                           |
| `GET /audit`, `GET /audit/verify`         | DPO             | Nhật ký kiểm toán lọc `?action=&entity_type=&entity_id=`; kiểm tra chuỗi hash        |

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

Chỉ số đánh giá (eval) chính thức của dự án được lấy từ báo cáo chi tiết tại file [eval/results/report_full.md](eval/results/report_full.md).
Xin vui lòng tham khảo file này để xem các kết quả đo lường, precision, recall trên tập dữ liệu chuẩn.

Để chạy lại quá trình đánh giá (eval), bạn có thể sử dụng lệnh sau:

```bash
PYTHONPATH=. python eval/run_eval_full.py
```

## Tài Liệu Dự Án

- [Docs Index](docs/README.md) - Đọc file này trước để biết tài liệu nào còn dùng
- [P1 Control Status](docs/core/MVP_STATUS_REPORT.md) - Trạng thái sau MVP và việc P1 đang kiểm soát
- [System Architecture](docs/core/SYSTEM_ARCHITECTURE.md) - Luồng hệ thống end-to-end
- [AI Architecture](docs/core/AI_ARCHITECTURE.md) - Cách AI/rules/LLM đang được nối trong source
- [Golden Dataset](docs/core/GOLDEN_DATASET.md) - Tập nhãn chuẩn và cách eval
- [CI Runner Guide](docs/ops/CI_RUNNER_GUIDE.md) - Hướng dẫn self-hosted CI runner trên Mac
- [Gate 2 Archive](docs/archive/gate_2/README.md) - Bằng chứng cũ, giữ để đối chiếu

