# PIIGuard VN — Backend

Backend API của PIIGuard VN: quét và review dữ liệu có khả năng chứa PII, tạo dataset đã bảo vệ và kiểm tra quyền truy cập trước khi phát hành.

## Tech stack

- Python 3.11
- FastAPI + Uvicorn
- Pydantic Settings
- SQLAlchemy với SQLite cho metadata ứng dụng
- PostgreSQL và MongoDB cho source/snapshot dữ liệu
- LangGraph/LangChain cho workflow scan tùy cấu hình
- Pytest và Ruff cho test/lint

## Yêu cầu

- Python 3.11+
- Docker và Docker Compose (nếu chạy PostgreSQL/MongoDB)
- OpenAI/provider API key chỉ cần khi bật AI scan

## Quick Start

### Cách 1: Chạy local với SQLite mặc định

```bash
git clone <repository-url>
cd P-138

python3.11 -m venv .venv
source .venv/bin/activate       # Windows: .venv\\Scripts\\activate

cp .env.example .env
pip install -r requirements.txt

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

API được expose tại `http://localhost:8001`; container backend vẫn lắng nghe port `8000`.

Nạp PostgreSQL fixture synthetic:

```bash
docker compose exec -T db \
  psql -U "${POSTGRES_USER:-postgres}" \
       -d "${POSTGRES_DB:-mydatabase}" \
       -v ON_ERROR_STOP=1 < data/fixtures/seed.sql
```

Xem log hoặc dừng stack:

```bash
docker compose logs -f backend
docker compose down
```

> Fixture trong `data/fixtures/seed.sql` chỉ chứa dữ liệu synthetic phục vụ demo/test. Không dùng secret hoặc dữ liệu thật trong repository.

## Cấu hình môi trường

Copy `.env.example` thành `.env`. Một số biến thường dùng:

| Biến | Mặc định | Mục đích |
| --- | --- | --- |
| `APP_ENV` | `development` | Môi trường chạy |
| `APP_HOST` / `APP_PORT` | `0.0.0.0` / `8000` | Host/port của API |
| `DATABASE_URL` | `sqlite:///./data/app.db` | DB metadata của ứng dụng |
| `SOURCE_DATABASE_URL` | trống | Kết nối source PostgreSQL chỉ đọc |
| `SNAPSHOT_DATABASE_URL` | trống | Kết nối DB snapshot đích |
| `ENABLE_PG_SNAPSHOT` | `false` | Bật pipeline snapshot PostgreSQL |
| `ENABLE_AI_SCAN` | `false` | Bật workflow AI khi chạy scan |
| `HMAC_SECRET` | dev value | Secret HMAC cho join key; phải đổi ngoài local |
| `CORS_ORIGINS` | `http://localhost:3000` | Origin được phép gọi API |

Không commit `.env`, API key, database password hoặc HMAC secret.

## API chính

Base URL: `/api/v1`

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| `POST` | `/sessions` | Public | Đăng nhập tài khoản demo |
| `GET` | `/me` | Authenticated | Lấy user hiện tại |
| `GET` | `/sources` | DPO | Liệt kê source, không trả credential |
| `POST` | `/runs` | DPO | Tạo run scan |
| `GET` | `/runs/{id}` | DPO | Xem trạng thái/profile |
| `PUT` | `/runs/{id}/decisions` | DPO | Lưu quyết định xử lý |
| `POST` | `/runs/{id}/build` | DPO | Build snapshot và verify |
| `GET` | `/datasets` | Analyst/DPO | Liệt kê dataset được phép |
| `POST` | `/datasets/{id}/publish` | DPO | Phát hành dataset |
| `POST` | `/datasets/{id}/revoke` | DPO | Thu hồi dataset |
| `GET` | `/datasets/{id}/preview` | Analyst | Preview output đã bảo vệ |

Token nhận được từ `POST /api/v1/sessions` được gửi qua header:

```http
Authorization: Bearer <access_token>
```

Ví dụ đăng nhập:

```bash
curl -X POST http://localhost:8000/api/v1/sessions \
  -H 'Content-Type: application/json' \
  -d '{"username":"dpo","password":"dpo123"}'
```

## Development commands

```bash
make test       # chạy toàn bộ test
make lint       # kiểm tra Ruff
make format     # format code
make typecheck  # mypy
make check      # lint + format + test
```

Chạy test trực tiếp:

```bash
APP_ENV=test ENABLE_AI_SCAN=false pytest tests/ -v
```

Test dùng SQLite riêng tại `data/test_verifier.db` và không cần database Docker hay API key.

## Deployment notes

Gate 2 chạy theo hướng demo local bằng Docker Compose trên máy demo, dùng fixture synthetic. Không dùng dữ liệu thật và không public PostgreSQL/MongoDB ra internet.

Hướng triển khai cho người dùng doanh nghiệp là on-premise hoặc private cloud/VPC của chính doanh nghiệp:

- PIIGuard chạy gần database nguồn.
- Source database dùng tài khoản read-only.
- Snapshot/protected output ghi sang database/schema riêng.
- Credential, HMAC secret và LLM key nằm trong env/secret store server-side.
- API không trả URI/password/secret/raw PII cho frontend.

## Cấu trúc backend

```text
src/
├── main.py                 # FastAPI app, lifespan, health check
├── config.py               # Settings từ environment
├── api/                    # routes, auth, dependencies
├── db/                     # SQLAlchemy models/session
├── connectors/             # PostgreSQL và snapshot connector
├── agents/                 # LangGraph workflow
├── detection/              # rule/regex/BM25/vector detection
├── services/               # scan và view generation
├── transform/              # MASK, DROP, HMAC
└── verifier/               # kiểm tra downstream SQL
```

## Quy ước bảo mật

- Source database phải được kết nối read-only; snapshot là vùng ghi riêng.
- Không trả raw PII, credential hoặc connection string qua API/log/report.
- Mọi endpoint cần kiểm tra role và trạng thái dataset ở backend.
- HMAC là keyed hash phục vụ join/mapping, không phải mã hóa để khôi phục dữ liệu.
- Khi thay đổi API hoặc biến môi trường, cập nhật README và test trong cùng pull request.
