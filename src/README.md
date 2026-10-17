# PIIGuard Shield — Backend

Backend API của PIIGuard Shield: quét và review dữ liệu có khả năng chứa PII, tạo dataset đã bảo vệ và kiểm tra quyền truy cập trước khi phát hành. Đã hoàn thành toàn diện Giai đoạn 1 (P1).

## Tech Stack

- Python 3.11
- FastAPI + Uvicorn
- Pydantic v2 + Pydantic Settings
- SQLAlchemy với SQLite cho metadata ứng dụng (`app.db`)
- PostgreSQL (psycopg) và MongoDB (PyMongo) cho source/snapshot dữ liệu
- AI & NLP Detection:
  - Regex Engine (`rule_engine.py`)
  - BM25 Lexical Engine (`bm25_engine.py`)
  - Column Distribution Statistics (`column_stats.py`)
  - Free-text Cascade NER (`dict_ner.py` FlashText + `ml_ner.py` GLiNER Zero-Shot Multi-PII)
  - HITL Few-Shot In-Context Memory (`hitl_feedback.py`)
  - LangGraph workflow & LLM Gateway (`llm.py`: OpenAI / OpenRouter / Gemini fallback)
- Merkle Root Hash-Chain Audit Logger (`src/api/audit.py`)
- Pytest (317 tests) và Ruff cho kiểm thử / linter

## Yêu Cầu Môi Trường

- Python 3.11+
- Docker và Docker Compose (chạy container PostgreSQL 5432 và MongoDB 27017)
- API key nhà cung cấp LLM (OpenAI, OpenRouter hoặc Google Gemini) khi bật `ENABLE_AI_SCAN=true`

## Quick Start

### Cách 1: Chạy local với SQLite mặc định

```bash
git clone <repository-url>
cd P-138

python3.11 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

cp .env.example .env
pip install -r requirements.txt

# Khởi động database qua Docker
docker compose up -d db mongodb

# Nạp seed fixtures (14 bảng PostgreSQL + 2 collections MongoDB)
docker cp data/fixtures/postgres/seed.sql p-138-db-1:/tmp/seed.sql
docker exec p-138-db-1 psql -U postgres -d mydatabase -f /tmp/seed.sql
docker exec p-138-db-1 psql -U postgres -c "CREATE DATABASE piiguard_snapshot_db;" || true
python data/fixtures/mongo/seed_mongo.py

# Khởi động API ở http://localhost:8000
make run
```

Khi server khởi động, backend tự tạo `data/app.db` và seed hai tài khoản demo:

| Username | Password | Role |
| --- | --- | --- |
| `dpo` | `dpo123` | `DPO` |
| `analyst` | `analyst123` | `ANALYST` |

Kiểm tra server:

```bash
curl http://localhost:8000/health
# {"status":"ok","env":"development"}
```

Tài liệu API: [Swagger UI](http://localhost:8000/docs) · [ReDoc](http://localhost:8000/redoc)

### Cách 2: Chạy đầy đủ bằng Docker Compose

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
```

API được expose tại `http://localhost:8002/api/v1` (mapping `8002:8000` trong `docker-compose.yml`); container backend lắng nghe port `8000`. Frontend mặc định gọi `http://localhost:8000/api/v1`, nên khi chạy bằng Compose cần đặt `VITE_API_URL=http://localhost:8002/api/v1`.

## Cấu Hình Môi Trường (.env)

| Biến | Mặc định | Mục đích |
| --- | --- | --- |
| `APP_ENV` | `development` | Môi trường chạy (`development`, `production`, `test`) |
| `APP_HOST` / `APP_PORT` | `0.0.0.0` / `8000` | Host/port của API |
| `DATABASE_URL` | `sqlite:///./data/app.db` | CSDL metadata ứng dụng |
| `SOURCE_DATABASE_URL` | `postgresql://...` | Kết nối source PostgreSQL chỉ đọc |
| `SNAPSHOT_DATABASE_URL` | `postgresql://...` | Kết nối CSDL snapshot đích (`piiguard_snapshot_db`) |
| `ENABLE_PG_SNAPSHOT` | `true` | Bật pipeline snapshot PostgreSQL |
| `MONGO_URI` / `MONGO_DB` | `mongodb://...` | Kết nối source MongoDB chỉ đọc |
| `MONGO_SNAPSHOT_DB` | `mydatabase_protected` | CSDL MongoDB snapshot đích |
| `ENABLE_MONGO` | `true` | Bật pipeline MongoDB |
| `ENABLE_AI_SCAN` | `false` | Bật workflow AI hỗ trợ phân loại qua LLM |
| `ENABLE_NER` | `true` | Bật mô hình GLiNER zero-shot cho văn bản tự do |
| `HMAC_SECRET` | dev value | Secret HMAC-SHA-256 cho khóa join |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Origins được phép gọi API |

> Tuyệt đối không commit `.env`, API key, database password hoặc HMAC secret.

## API Endpoints Chính

Tiền tố router: `/api/v1`

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| `POST` | `/sessions` | Public | Đăng nhập tài khoản demo (`dpo` hoặc `analyst`) |
| `GET` | `/me` | Authenticated | Thông tin user và role từ token |
| `GET` | `/sources` | DPO | Liệt kê danh sách nguồn dữ liệu (không trả credential) |
| `POST` | `/sources`, `/sources/test` | DPO | Đăng ký nguồn CSDL mới; kiểm tra kết nối động |
| `GET` | `/sources/{id}/scope` | DPO | Introspect bảng, cột, khóa chính/ngoại và relationships |
| `POST` | `/runs` | DPO | Tạo phiên quét PII (chọn bảng và `link_scope`) |
| `GET` | `/runs` | DPO | Lịch sử run (mới nhất trước, lọc status/source) |
| `GET` | `/runs/{id}` | DPO | Trạng thái run, tiến độ, và danh sách field profiles |
| `PUT` | `/runs/{id}/decisions` | DPO | Lưu quyết định của DPO (học vào few-shot memory) |
| `POST` | `/runs/{id}/build` | DPO | Xây dựng snapshot vật lý và chạy Downstream Verifier |
| `GET` | `/runs/{id}/report` | DPO | Privacy Risk Report (HTML/JSON) đánh giá rủi ro PII |
| `GET` | `/runs/{id}/risk-score` | DPO | Điểm rủi ro tất định FR-10 (0–100) |
| `GET` | `/datasets` | Analyst/DPO | Danh sách dataset được phép truy cập |
| `POST` | `/datasets/{id}/publish` | DPO | Phát hành dataset (tự động cấp quyền cho mọi Analyst) |
| `POST` | `/datasets/{id}/revoke` | DPO | Thu hồi dataset, xóa snapshot, đưa run về `READY_TO_BUILD` |
| `GET` | `/datasets/{id}/preview` | Analyst/DPO | Xem trước dữ liệu an toàn đã che mờ (Zero Raw PII) |
| `GET` | `/audit`, `/audit/verify` | DPO | Nhật ký kiểm toán và kiểm tra tính toàn vẹn Merkle Root |

Token nhận được từ `POST /api/v1/sessions` được gửi qua header:

```http
Authorization: Bearer <access_token>
```

## Lệnh Phát Triển & Kiểm Thử

```bash
make test       # Chạy 317 tests pytest
make lint       # Kiểm tra ruff check
make format     # Format code với ruff format
make check      # lint + test
```

## Cấu Trúc Mã Nguồn Backend

```text
src/
├── main.py                 # FastAPI app entry point, lifespan, CORS, mount routes
├── config.py               # Pydantic Settings từ environment
├── api/                    # routes, auth, runs, sources, datasets, audit, deps
├── db/                     # SQLAlchemy models & session
├── connectors/             # PostgreSQL và MongoDB connectors
├── agents/                 # LangGraph workflow, nodes, graph
├── detection/              # rule_engine, column_stats, dict_ner, ml_ner, hitl_feedback
├── services/               # run_scanner, risk_scorer, report_generator, llm
├── transform/              # mask_engine (MASK, REDACT, DROP), hmac_hasher (HMAC)
└── verifier/               # Downstream Verifiers (SQL join & Mongo $lookup)
```

## Quy Ước Bảo Mật Cốt Lõi

- **Zero Raw PII**: Không gửi raw value vào LLM prompt hay log. Ngoại lệ: `PUT /runs/{id}/decisions` chấp nhận `KEEP` cho trường PII khi có `is_exception`, `reason` và `exception_until` còn hạn (`src/api/runs.py`); giá trị gốc khi đó được giữ trong snapshot.
- **Source Database Read-Only**: Kết nối nguồn luôn ở chế độ chỉ đọc; snapshot ghi sang vùng riêng.
- **HMAC Join Key Integrity**: Giữ toàn vẹn quan hệ phân tích bằng băm HMAC-SHA-256 có salt.
- **Tamper-Evident Audit**: Mọi hành động của DPO và hệ thống được băm chuỗi Merkle Root SHA-256.
