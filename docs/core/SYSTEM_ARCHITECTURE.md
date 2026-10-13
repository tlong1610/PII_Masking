# PIIGuard Shield - System Architecture

Tài liệu này mô tả luồng hệ thống hiện tại của PIIGuard Shield sau MVP. P1 vẫn tập trung **PostgreSQL** và **MongoDB**; các database khác để sau.

## 1. Ý tưởng chính

PIIGuard nhận một database nguồn, quét field có khả năng chứa PII, để DPO duyệt cách xử lý, rồi tạo một database/snapshot mới đã được bảo vệ cho Analyst dùng.

```text
Input  = database gốc của doanh nghiệp
Output = protected database/snapshot đã MASK/HMAC/DROP/KEEP
```

Ví dụ:

```text
PostgreSQL input  : mydatabase.public.customers
PostgreSQL output : snapshot_out.piiguard_snapshot.customers

MongoDB input     : mydatabase.customers
MongoDB output    : mydatabase_protected.customers
```

## 2. Cách cắm database

Hệ thống không ưu tiên upload file database. Cách đúng là dùng **connection string** để backend kết nối vào database đang chạy.

PostgreSQL:

```env
SOURCE_DATABASE_URL=postgresql://user:password@host:5432/source_db
SNAPSHOT_DATABASE_URL=postgresql://user:password@host:5432/snapshot_db
ENABLE_PG_SNAPSHOT=true
```

MongoDB:

```env
MONGO_URI=mongodb://user:password@host:27017/?authSource=admin
MONGO_DB=source_db
MONGO_SNAPSHOT_DB=source_db_protected
ENABLE_MONGO=true
```

Ý nghĩa:

| Biến | Vai trò |
|---|---|
| `SOURCE_DATABASE_URL` | PostgreSQL nguồn, chỉ đọc |
| `SNAPSHOT_DATABASE_URL` | PostgreSQL đích để ghi bản đã xử lý |
| `MONGO_URI` | URI kết nối MongoDB |
| `MONGO_DB` | MongoDB nguồn |
| `MONGO_SNAPSHOT_DB` | MongoDB đích để ghi bản đã xử lý |

API không được trả password, URI có credential, raw PII hoặc HMAC secret ra frontend.

## 3. Luồng Chính

```mermaid
flowchart LR
    A[DPO selects source] --> B[Test connection + read scope]
    B --> C[DPO selects tables/collections]
    C --> D[Scan selected scope]
    D --> E[Rules/AI proposes actions]
    E --> F[DPO reviews decisions]
    F --> G[Build protected snapshot]
    G --> H[Verifier checks downstream]
    H -->|PASS| I[DPO publishes dataset]
    H -->|FAIL| J[Fix decisions or rerun]
    I --> K[Analyst previews published dataset]

    SRC[(Source DB<br/>read-only)] --> B
    D --> SRC
    G --> OUT[(Protected DB<br/>snapshot output)]
```

Không quét toàn bộ schema mặc định. DPO phải chọn bảng/collection trong scope đã đọc được, sau đó backend chỉ scan phạm vi đã chọn. Không có đường tắt từ scan sang publish. Dataset chỉ được publish khi verifier pass.

## 4. Thành phần hệ thống

```mermaid
flowchart TB
    FE[React Frontend] --> API[FastAPI Backend]

    API --> AUTH[Role/state guard]
    API --> SOURCES[Sources API]
    API --> RUNS[Runs API]
    API --> DATASETS[Datasets API]
    API --> APPDB[(App DB metadata)]

    RUNS --> SCAN[Scanner]
    SCAN --> RULES[Rules/regex/BM25]
    SCAN --> LLM[Optional LangGraph/LLM<br/>metadata/statistics only]

    SOURCES --> PG[(PostgreSQL source)]
    SOURCES --> MG[(MongoDB source)]

    RUNS --> TRANSFORM[Transform pipeline]
    TRANSFORM --> PGOUT[(PostgreSQL snapshot)]
    TRANSFORM --> MGOUT[(MongoDB protected DB)]

    PGOUT --> VERIFY[Verifier]
    MGOUT --> VERIFY
    VERIFY --> DATASETS
```

| Thành phần | Trách nhiệm |
|---|---|
| Frontend | Hiển thị source, review, build, publish, preview |
| Sources API | Liệt kê source an toàn, test connection, đọc scope, không trả credential |
| Runs API | Tạo run trên table/collection đã chọn, lưu profile, decision, build |
| Scanner | Tạo field profile và action proposal |
| Transform | Áp dụng MASK/HMAC/DROP/KEEP vào output |
| Verifier | Kiểm tra JOIN, aggregate hoặc `$lookup` |
| Datasets API | Publish, revoke, list, preview |
| App DB | Lưu metadata, không lưu raw source value |

Chi tiết AI detection nằm ở [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md). Tóm tắt: `ENABLE_AI_SCAN=false` chạy rules-only; `ENABLE_AI_SCAN=true` mới gọi LLM qua provider fallback OpenRouter → OpenAI → Gemini. Prompt LLM chỉ nhận metadata/statistics đã lọc, không nhận raw `sample_value`.

## 5. PostgreSQL branch

```mermaid
flowchart TD
    A[PostgreSQL source] --> B[Read schema / tables / PK / FK]
    B --> C[DPO selects tables]
    C --> D[Profile selected fields]
    D --> E[DPO decisions]
    E --> F[Write snapshot schema/database]
    F --> G[Apply MASK/HMAC/DROP/KEEP]
    G --> H[SQL JOIN + aggregate verifier]
    H --> I{PASS?}
    I -->|yes| J[VERIFIED]
    I -->|no| K[FAILED]
```

PostgreSQL fixture nằm tại `data/fixtures/seed.sql`. Source phải là read-only. Snapshot nằm ở database/schema đích riêng. Backend không scan toàn bộ PostgreSQL schema nếu DPO chỉ chọn một số bảng.

## 6. MongoDB branch

```mermaid
flowchart TD
    A[MongoDB source] --> B[Read collections]
    B --> C[DPO selects collections]
    C --> D[Profile selected nested paths]
    D --> E[DPO decisions]
    E --> F[Write protected database]
    F --> G[Apply MASK/HMAC/DROP/KEEP]
    G --> H[$lookup verifier]
    H --> I{PASS?}
    I -->|yes| J[VERIFIED]
    I -->|no| K[FAILED]
```

MongoDB fixture dùng `customers` và `orders`. Field lồng nhau giữ path dạng dấu chấm:

```text
identity.cccd
contact.phone
pii_ext.customer_cccd
```

Các khóa join/lookup phải xử lý cùng action ở hai đầu:

```text
customers._id           <-> orders.customer_id
customers.identity.cccd <-> orders.pii_ext.customer_cccd
```

Nếu DPO chọn lệch action ở hai đầu khóa, build phải trả lỗi `422`.

## 7. Policy actions

| Action | Dùng khi | Output |
|---|---|---|
| `MASK` | Cần che giá trị, không cần join | `[REDACTED]` hoặc che một phần |
| `HMAC` | Field cần lookup/join/mapping ổn định | HMAC-SHA-256 một chiều, có `key_version` |
| `DROP` | Không cần field hoặc quá rủi ro | Không ghi field vào snapshot |
| `KEEP` | Đã xác nhận non-personal/cần nghiệp vụ | Giữ trong output |

HMAC không phải encryption. Không gọi là mã hóa hai chiều vì không khôi phục được raw value.

## 8. Quyền truy cập

| Actor | Được phép | Không được phép |
|---|---|---|
| DPO | Scan, review, build, verifier, publish, revoke | Xem raw PII |
| Analyst | List/preview dataset `PUBLISHED` | Xem source, staging, policy, raw PII |

Backend phải kiểm tra quyền và trạng thái, không chỉ ẩn nút ở frontend.

## 9. API flow

| Bước | Endpoint | Vai trò |
|---|---|---|
| Login | `POST /sessions` | DPO/Analyst |
| List source | `GET /sources` | DPO |
| Read scope | `GET /sources/{id}/scope` | DPO |
| Create run | `POST /runs` | DPO chọn table/collection rồi mới scan |
| Review run | `GET /runs/{id}` | DPO |
| Save decisions | `PUT /runs/{id}/decisions` | DPO |
| Build snapshot | `POST /runs/{id}/build` | DPO |
| Publish | `POST /datasets/{id}/publish` | DPO |
| Revoke | `POST /datasets/{id}/revoke` | DPO |
| List datasets | `GET /datasets` | DPO/Analyst |
| Preview output | `GET /datasets/{id}/preview` | DPO/Analyst |

Hiện có `sql-demo` và `nosql-demo`. Source động cho doanh nghiệp: user nhập connection string, backend test connection, đọc scope, rồi chạy cùng flow trên.

## 10. Trạng thái cần nhớ

Đã có nền:

- PostgreSQL/MongoDB demo source;
- scanner/rules/eval;
- DPO decision;
- build snapshot pipeline;
- verifier;
- dataset publish/revoke/list/preview guardrail.

Cần kiểm tra kỹ trước demo:

- `GET /datasets/{id}/preview?table=&limit=` đọc dòng thật từ protected snapshot (Postgres schema hoặc Mongo `<db>_protected_run<id>`); publish giữ nguyên `output_location` vật lý để preview/revoke dùng được. Placeholder `[REDACTED]`/`hmac_stub_*` chỉ còn cho nguồn demo stub;
- source động chưa được coi là xong nếu vẫn chỉ dùng `_DEMO_SOURCES`;
- mọi evidence/report/log không được chứa raw PII, credential hoặc API key.

## 11. File code liên quan

| File | Vai trò |
|---|---|
| `src/api/sources.py` | Source registry/API |
| `src/api/runs.py` | Run, decisions, build |
| `src/api/datasets.py` | Dataset publish/revoke/list/preview |
| `src/connectors/postgres_connector.py` | PostgreSQL reader |
| `src/connectors/mongo_connector.py` | MongoDB reader |
| `src/transform/pg_pipeline.py` | PostgreSQL snapshot |
| `src/transform/mongo_pipeline.py` | MongoDB protected snapshot |
| `src/verifier/sql_verifier.py` | SQL downstream verifier |
| `src/verifier/mongo_verifier.py` | Mongo `$lookup` verifier |
| `src/detection/` | Rules/taxonomy/eval support |
