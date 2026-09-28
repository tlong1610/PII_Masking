# PIIGuard VN - System Architecture

> Tài liệu này mô tả **luồng MVP đã chốt trong PRD** và cách các thành phần nối với nhau. MVP hỗ trợ chạy thật trên **PostgreSQL** và **MongoDB**. Kiến trúc dùng connector để có thể mở rộng thêm database sau này, nhưng không tuyên bố mọi database đều được hỗ trợ ngay.

## 1. Bài toán trong một câu

PIIGuard quét một database nguồn chỉ đọc, phát hiện các field có thể là PII, đưa profile đã lọc cho DPO duyệt, tạo một snapshot đã bảo vệ ở database đích, chạy hậu kiểm downstream rồi mới cho Analyst đọc bản đã phát hành.

## 2. Luồng chính

~~~mermaid
flowchart LR
    DPO[DPO] --> S1[Chọn source]
    S1 --> S2[Scan schema và field profile]
    S2 --> S3[DPO review decision]
    S3 --> S4[Build protected snapshot]
    S4 --> S5[Verifier hậu kiểm]
    S5 -->|PASS| S6[DPO publish]
    S5 -->|FAIL| E[FAILED - sửa decision hoặc tạo run mới]
    S6 --> A[Analyst preview và chạy tác vụ mẫu]

    SRC[(Database nguồn<br/>read-only)] --> S2
    S4 --> DST[(Snapshot database<br/>đích riêng)]
~~~

### Ý nghĩa từng bước

| Bước | Ai thực hiện | Kết quả |
|---|---|---|
| Chọn source | DPO | Chọn sql-demo hoặc nosql-demo |
| Scan | Backend | Field profile, classification và action đề xuất; không trả raw value |
| Review | DPO | Mỗi field có một quyết định MASK, HMAC, DROP hoặc KEEP |
| Build | Backend | Tạo snapshot mới, không ghi đè source |
| Verify | Backend | Kiểm tra policy, JOIN/$lookup, aggregate và schema output |
| Publish | DPO | Chỉ dataset VERIFIED mới được phát hành |
| Consume | Analyst | Chỉ đọc dataset PUBLISHED, không đọc source/staging |

Không có đường tắt từ scan hoặc build sang publish. Nếu verifier fail, dataset là FAILED và backend chặn publish.

## 3. Kiến trúc thành phần

~~~mermaid
flowchart TB
    subgraph Client[Client layer]
        FE[React + TypeScript UI]
        DPO_UI[DPO screens<br/>source / review / result]
        ANA_UI[Analyst screens<br/>dataset / preview / task]
        FE --> DPO_UI
        FE --> ANA_UI
    end

    subgraph API[Application layer - FastAPI]
        AUTH[Session và role guard]
        SOURCES[Sources API]
        RUNS[Runs API]
        DATASETS[Datasets API]
        SCAN[Scanner orchestration]
        TRANSFORM[Transform pipeline]
        VERIFY[Verifier]
        AUDIT[Audit events]
    end

    subgraph AppDB[Application state]
        META[(PostgreSQL app schema)]
    end

    subgraph Adapters[Source adapters]
        PG[PostgresConnector]
        MG[MongoConnector]
    end

    subgraph Sources[Demo source databases]
        PG_SRC[(PostgreSQL source<br/>read-only)]
        MG_SRC[(MongoDB source<br/>read-only)]
    end

    subgraph Outputs[Protected outputs]
        PG_SNAP[(PostgreSQL snapshot<br/>separate schema/database)]
        MG_SNAP[(MongoDB snapshot<br/>separate database)]
    end

    FE -->|HTTPS / REST| AUTH
    AUTH --> SOURCES
    AUTH --> RUNS
    AUTH --> DATASETS
    SOURCES --> META
    RUNS --> SCAN
    RUNS --> TRANSFORM
    RUNS --> VERIFY
    RUNS --> AUDIT
    DATASETS --> META
    SCAN --> PG
    SCAN --> MG
    PG --> PG_SRC
    MG --> MG_SRC
    TRANSFORM --> PG_SNAP
    TRANSFORM --> MG_SNAP
    VERIFY --> PG_SNAP
    VERIFY --> MG_SNAP
    RUNS --> META
~~~

### Thành phần và trách nhiệm

| Thành phần | Trách nhiệm |
|---|---|
| Frontend | Hiển thị đúng vai trò và trạng thái; không tự quyết định quyền |
| Auth/session | Gán role ở server và kiểm tra DPO/Analyst ở backend |
| Sources API | Liệt kê source đã cấu hình, chỉ trả metadata an toàn |
| Runs API | Tạo run, lưu profile, lưu decision, approve và build |
| Scanner | Đọc metadata/profile qua connector; rules-first, AI là bước tùy chọn |
| Transform | Áp dụng action đã được DPO duyệt vào snapshot đích |
| Verifier | So sánh source và snapshot; quyết định VERIFIED hoặc FAILED |
| Datasets API | Preview, publish và revoke theo state guardrail |
| App database | Lưu user/session, run, field profile, decision, dataset, verifier result và audit |

MVP không dùng ChromaDB/vector store. Taxonomy và legal reference nhỏ, có cấu trúc; nếu sau này thêm RAG phải cập nhật PRD và đánh giá riêng.

## 4. Hai nhánh xử lý dữ liệu

### 4.1 PostgreSQL - SQL

~~~mermaid
flowchart TD
    A[Postgres source] --> B[Đọc schema, PK/FK và field metadata]
    B --> C[Profile field và scan rules]
    C --> D[DPO quyết định]
    D --> E[Copy sang snapshot schema/database]
    E --> F[Áp dụng MASK/DROP/HMAC/KEEP]
    F --> G[SQL JOIN và aggregate verifier]
    G --> H{Kết quả đạt?}
    H -->|Có| I[VERIFIED]
    H -->|Không| J[FAILED]
~~~

SQL P0 dùng fixture nhiều bảng, trong đó demo trọng tâm là customers và orders. Snapshot phải nằm ở vùng đích riêng; tài khoản đọc source không được có quyền ghi source.

### 4.2 MongoDB - NoSQL

~~~mermaid
flowchart TD
    A[MongoDB source] --> B[Đọc collections và flatten nested path]
    B --> C[Profile customers/orders]
    C --> D[DPO quyết định]
    D --> E[Copy sang protected database riêng]
    E --> F[Áp dụng MASK/DROP/HMAC/KEEP]
    F --> G[$lookup source và snapshot]
    G --> H{matched/unmatched giữ đúng?}
    H -->|Có| I[VERIFIED]
    H -->|Không| J[FAILED]
~~~

Mongo P0 dùng hai collection customers và orders. Field lồng nhau giữ đường dẫn dạng dấu chấm, ví dụ identity.cccd và pii_ext.customer_cccd.

Các cặp join chính phải xử lý nhất quán ở hai đầu:

~~~text
customers._id                  <-> orders.customer_id
customers.identity.cccd        <-> orders.pii_ext.customer_cccd
~~~

Verifier tự đếm kết quả thực tế; không hardcode 830. Với fixture hiện tại, expected baseline là 830 matched và 0 unmatched.

## 5. Scan và quyết định policy

~~~mermaid
flowchart LR
    P[Field profile đã lọc] --> R[Rules và regex]
    R --> Q{Đủ chắc chắn?}
    Q -->|Có| X[Classification + action proposal]
    Q -->|Chưa chắc| AI[AI tùy chọn<br/>chỉ nhận field name/type/statistics]
    AI --> X
    X --> DPO[DPO review]
    DPO --> DEC[Decision lưu vào app DB]
~~~

Scanner có thể dùng sample nội bộ để tính thống kê, nhưng các giá trị nguồn không được đi vào:

- API response;
- UI, preview, audit, report hoặc console log;
- prompt LLM;
- exception message hoặc evidence commit.

DPO cũng không xem raw PII. DPO chỉ thấy field path, type, pattern đã lọc, classification, lý do, quan hệ khóa và action đề xuất. Với UNKNOWN, DPO phải chọn action có căn cứ; không được dùng KEEP để bỏ qua cảnh báo.

### Policy actions

| Action | Dùng khi | Kết quả |
|---|---|---|
| MASK | Cần giữ hình dạng một phần nhưng không cần lookup | Che một phần/toàn bộ giá trị |
| HMAC | Field dùng để JOIN, lookup, mapping hoặc aggregate | Digest xác định bằng HMAC-SHA-256, có key_version, không khôi phục được |
| DROP | Không cần field hoặc field chưa xác định | Bỏ field khỏi snapshot |
| KEEP | Đã xác nhận non-personal hoặc cần cho nghiệp vụ | Giữ nguyên theo policy đã duyệt |

HMAC là pseudonymization một chiều, không gọi là encryption. Hai đầu khóa liên kết phải dùng cùng key version và cùng action; nếu không, build trả lỗi 422.

## 6. State machine và API flow

~~~mermaid
stateDiagram-v2
    [*] --> SCANNING: POST /runs
    SCANNING --> REVIEW_REQUIRED: scan đủ
    SCANNING --> FAILED: scan lỗi
    REVIEW_REQUIRED --> READY_TO_BUILD: đủ decisions
    REVIEW_REQUIRED --> FAILED: policy/scan không hợp lệ
    READY_TO_BUILD --> BUILDING: POST /runs/{id}/build
    BUILDING --> VERIFIED: transform + verifier pass
    BUILDING --> FAILED: verifier fail
    VERIFIED --> PUBLISHED: POST /datasets/{id}/publish
    PUBLISHED --> REVOKED: POST /datasets/{id}/revoke
    FAILED --> [*]
    REVOKED --> [*]
~~~

API chính theo flow:

| Nhóm | Endpoint | Vai trò |
|---|---|---|
| Session | POST /sessions | Đăng nhập demo, role do server gán |
| Source | GET /sources | DPO xem source metadata an toàn |
| Run | POST /runs, GET /runs/{id} | DPO tạo/xem run |
| Review | PUT /runs/{id}/decisions, POST /runs/{id}/approve | DPO duyệt policy |
| Build | POST /runs/{id}/build | DPO tạo snapshot và verifier |
| Dataset | GET /datasets, GET /datasets/{id}/preview | Analyst chỉ xem output được phép |
| Release | POST /datasets/{id}/publish, POST /datasets/{id}/revoke | DPO phát hành/thu hồi |

Frontend chỉ ẩn/hiện nút theo role để dễ dùng; backend vẫn phải kiểm tra role và state cho từng endpoint.

## 7. Dữ liệu lưu ở đâu?

~~~text
Database nguồn                 Snapshot đích                 App database
------------------             ------------------             ------------------
PostgreSQL/Mongo                PostgreSQL/Mongo               PostgreSQL schema app
read-only                       protected output               metadata only
PII gốc                         MASK/HMAC/DROP/KEEP            run/decision/audit
~~~

App database lưu metadata, không lưu raw source value:

- users/sessions và role;
- sources và manifest version;
- runs và trạng thái;
- field profiles;
- DPO decisions;
- datasets;
- verifier results;
- audit events.

Source và snapshot là hai vùng riêng. Build không ghi đè source. Mỗi run gắn với manifest/policy version; nếu source hoặc policy đổi thì phải tạo run mới hoặc chuyển run thành STALE.

## 8. Quyền truy cập

~~~mermaid
flowchart TD
    DPO[DPO] -->|scan / review / build / publish / revoke| API[FastAPI authorization]
    ANA[Analyst] -->|list / preview PUBLISHED / sample task| API
    API -->|DPO only| META[(App metadata)]
    API -->|Analyst read-only| PUB[(PUBLISHED snapshot)]
    API -. blocked .-> SRC[(Raw source)]
    API -. blocked .-> STG[(STAGING snapshot)]
~~~

| Actor | Được phép | Không được phép |
|---|---|---|
| DPO | Scan, review, quyết định, build, xem verifier, publish, revoke | Xem raw PII |
| Analyst | List dataset PUBLISHED, preview output đã xử lý, chạy tác vụ mẫu | Đọc source/staging, sửa policy, publish, xem raw PII |

Credential database chỉ nằm ở server environment/secret store. API không trả URI, password, HMAC secret hoặc raw value.

## 9. Connector contract và mở rộng database

Hai adapter P0 cùng trả về contract chung:

~~~text
inspect_scope()   -> tables/collections, counts, supported scope
profile_fields()  -> field path, type, relation, safe statistics
read_batches()    -> batch dữ liệu nội bộ cho transform
~~~

Phần writer/snapshot và verifier tách khỏi reader. Vì vậy kiến trúc có thể thêm MySQL hoặc database khác bằng connector mới, nhưng mỗi engine vẫn phải có:

1. adapter đọc schema/profile;
2. transform writer an toàn;
3. verifier downstream riêng;
4. fixture, golden labels và test;
5. cập nhật tài liệu và evidence.

**P0:** PostgreSQL + MongoDB. **P1/P2:** database engine khác, connection UI động, local LLM, dữ liệu phi cấu trúc và các policy nâng cao.

## 10. Mapping với code hiện tại

| Vùng code | Vai trò |
|---|---|
| src/api/auth.py | Session và role |
| src/api/sources.py | Source registry/API |
| src/api/runs.py | Run, decision, approve, build và state guardrail |
| src/api/datasets.py | Dataset list/preview/publish/revoke |
| src/connectors/postgres_connector.py | PostgreSQL reader |
| src/connectors/mongo_connector.py | MongoDB reader, nested path và relations |
| src/transform/pg_pipeline.py | PostgreSQL snapshot/transform |
| src/transform/hmac_hasher.py | HMAC-SHA-256 và key version |
| src/verifier/sql_verifier.py | SQL JOIN/aggregate verifier |
| src/verifier/mongo_verifier.py | MongoDB $lookup verifier |
| src/detection/ | Taxonomy, regex, rules và eval support |
| src/db/models.py | App metadata models |
| tests/ | Unit/API/connector/verifier tests |

### Trạng thái triển khai cần nhớ

Đây là kiến trúc mục tiêu của MVP. Khi code chưa nối được connector thật, không được ghi là đã hoàn thành chỉ vì API trả response. Dấu hiệu cần xử lý trước demo là:

- POST /runs còn fallback field profile stub;
- POST /runs/{id}/build còn nhánh verifier stub;
- Mongo connector/verifier chưa được gọi xuyên suốt API flow;
- chưa có test/evidence cho cả SQL và Mongo end-to-end.

Khi các điểm trên được nối thật và test pass, flow trên mới được xem là MVP end-to-end.

## 11. P0, P1 và nguyên tắc mở rộng

### P0 - Demo end-to-end

- PostgreSQL source read-only, snapshot riêng, transform và SQL verifier;
- MongoDB customers/orders, nested path, snapshot riêng và $lookup verifier;
- DPO/Analyst role guardrail;
- no-raw-value trong UI, API, log, report và LLM prompt;
- publish chỉ sau VERIFIED;
- fixture, golden labels, holdout và downstream expected results.

### P1/P2 - Mở rộng sau khi P0 ổn định

- thêm connector SQL/NoSQL khác;
- UI cấu hình database động nhưng credential vẫn ở server-side;
- local LLM/on-prem cho doanh nghiệp;
- dữ liệu phi cấu trúc như document, image, voice và OCR;
- policy SYNTHESIZE nếu có yêu cầu và eval riêng.

Mọi mở rộng phải giữ nguyên nguyên tắc: source chỉ đọc, snapshot tách riêng, action do DPO duyệt, verifier trước publish và không đưa raw PII ra ngoài boundary được phép.

## 12. Liên kết tài liệu

- Product scope và acceptance criteria: [docs/prd.md](prd.md)
- Màn hình và user flow: [docs/ui-flow.md](ui-flow.md)
- Kiến trúc tổng quát: [ARCHITECTURE.md](../ARCHITECTURE.md)
- Cấu trúc repo: [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md)
- Hướng dẫn tích hợp frontend/backend: [docs/FRONTEND_BACKEND_INTEGRATION.md](FRONTEND_BACKEND_INTEGRATION.md)

