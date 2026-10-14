# PIIGuard Shield - Kiến Trúc Hệ Thống

Tài liệu này là bản tóm lược kiến trúc của PIIGuard Shield. Bản chi tiết hơn nằm ở [docs/core/SYSTEM_ARCHITECTURE.md](docs/core/SYSTEM_ARCHITECTURE.md).

## 1. Tổng Quan

PIIGuard Shield giúp DPO (Data Protection Officer) tự động quét, đánh giá rủi ro và tạo một dataset đã được bảo vệ trước khi chia sẻ cho Analyst.

Luồng P0:

```text
Cloud PostgreSQL / MongoDB Atlas source
  -> scanner phát hiện PII (Rules/Regex + AI/LLM)
  -> rules/agent đề xuất action (MASK, HMAC, DROP, KEEP)
  -> DPO xem data, thẩm định rủi ro & phê duyệt (HITL)
  -> build protected snapshot vật lý
  -> verifier kiểm tra tính toàn vẹn (SQL JOIN / $lookup / aggregate)
  -> publish cho Analyst sử dụng an toàn
```

Hệ thống hỗ trợ các cơ sở dữ liệu **PostgreSQL và MongoDB lưu trữ trên Cloud** (Cloud SQL, AWS RDS, Supabase, Neon, MongoDB Atlas) và cho phép kết nối động qua Connection URL (`postgresql://`, `mongodb+srv://`).

## 2. Sơ Đồ Kiến Trúc

```mermaid
flowchart TB
    subgraph Client["Frontend (React 18 + Vite + MUI)"]
        SCOPE_PICKER["Source Scope Picker Diagram<br/>(Bố cục Dagre tự động)"]
        DPO_UI["DPO Review Workspace<br/>(5 Tabs + Drawer + Data Inspection)"]
        ERD_UI["ERD Lineage Diagram<br/>(Visual Lineage & PK/FK)"]
        ANA_UI["Analyst Workspace<br/>(Data Grid Preview & CSV Export)"]
        SCOPE_PICKER --> DPO_UI
        DPO_UI --> ERD_UI
        ERD_UI --> ANA_UI
    end

    subgraph API["FastAPI Backend (/api/v1)"]
        AUTH["Session & Role Guard (JWT)"]
        SOURCES["Sources API (Test connection & Read scope)"]
        RUNS["Runs API (Scan, Decisions, Build)"]
        DATASETS["Datasets API (Publish, Revoke, Preview)"]
        RISK["Risk Score API (FR-10 Deterministic)"]
        SCANNER["Điều phối Scanner"]
        POLICY["DPO Decisions & Exceptions"]
        TRANSFORM["Snapshot Transform Pipeline"]
        VERIFY["Downstream Verifier"]
        AUDIT["Hash-Chain Audit Events (Merkle Root)"]
    end

    subgraph Internal["AI / Detection Engine"]
        RULES["Regex / Rules / Taxonomy NĐ 13"]
        RETRIEVAL["BM25 / Context Matching"]
        LLM["LLM Gateway (Metadata only)"]
    end

    subgraph AppState["Metadata ứng dụng"]
        APPDB[("App DB<br/>runs/decisions/datasets/audit")]
    end

    subgraph CloudSources["Nguồn dữ liệu Cloud (Read-only)"]
        PG_SRC[("Cloud PostgreSQL source<br/>(AWS RDS / Cloud SQL / Neon)")]
        MG_SRC[("Cloud MongoDB source<br/>(MongoDB Atlas / Cluster)")]
    end

    subgraph Outputs["Đầu ra đã bảo vệ"]
        PG_OUT[("PostgreSQL Snapshot / View")]
        MG_OUT[("MongoDB Protected DB")]
    end

    Client -->|REST /api/v1| AUTH
    AUTH --> SOURCES
    AUTH --> RUNS
    AUTH --> DATASETS
    AUTH --> RISK
    RUNS --> SCANNER
    SCANNER --> RULES
    SCANNER --> RETRIEVAL
    SCANNER --> LLM
    RUNS --> POLICY
    RUNS --> TRANSFORM
    TRANSFORM --> VERIFY
    VERIFY --> DATASETS
    RUNS --> AUDIT
    SOURCES --> APPDB
    RUNS --> APPDB
    DATASETS --> APPDB
    SCANNER --> PG_SRC
    SCANNER --> MG_SRC
    TRANSFORM --> PG_OUT
    TRANSFORM --> MG_OUT
    VERIFY --> PG_OUT
    VERIFY --> MG_OUT
```

## 3. Trách Nhiệm Từng Thành Phần

| Thành phần | File chính | Trách nhiệm |
| --- | --- | --- |
| **Frontend** | `front_end/src/` | Giao diện DPO (5 Tabs, Scope Picker Diagram, ERD Lineage, Policy Drawer) & Analyst (Data Grid, CSV Export). Kết nối API thật qua `realPiiReviewApi.ts`. |
| **API** | `src/api/` | REST endpoints, JWT auth, kiểm tra role DPO/Analyst và trạng thái pipeline. |
| **App DB** | `src/db/` | Chỉ lưu metadata: source config, run, decision, dataset, verifier result, hash-chain audit log. |
| **Models** | `src/models/schemas.py` | Pydantic contract giữa API, scanner và FE. |
| **Connectors** | `src/connectors/` | Kết nối Cloud PostgreSQL / MongoDB đọc schema/profile/scope an toàn. |
| **Detection** | `src/detection/` | Regex, rules, taxonomy NĐ 13 / Luật BV DLCN 2025, BM25 context. |
| **Agent / LLM** | `src/agents/`, `src/services/llm.py` | Hỗ trợ phân loại các trường mập mờ; prompt chỉ nhận metadata và thống kê. |
| **Transform** | `src/transform/` | Áp dụng MASK, DROP, HMAC, KEEP vào snapshot vật lý đích. |
| **Verifier** | `src/verifier/` | Kiểm tra SQL JOIN / aggregate hoặc Mongo `$lookup` trước khi publish. |
| **Eval** | `eval/` | Golden labels, expected downstream, báo cáo precision/recall. |

## 4. Luồng Dữ Liệu & Phê Duyệt

```mermaid
sequenceDiagram
    actor DPO
    participant FE as Frontend
    participant API as FastAPI
    participant SRC as Cloud Source DB
    participant DET as Rules/AI Scanner
    participant OUT as Snapshot DB
    participant VER as Downstream Verifier
    actor ANA as Analyst

    DPO->>FE: Đăng nhập & xem/thêm Cloud Source (Postgres / Mongo Atlas)
    FE->>API: GET /sources/{id}/scope
    API->>SRC: Đọc schema / table / PK / FK
    FE-->>DPO: Hiển thị Source Scope Picker Diagram
    DPO->>FE: Chọn các bảng cần quét & bấm "Bắt đầu quét"
    FE->>API: POST /runs
    API->>SRC: Đọc metadata & sample (chỉ đọc)
    API->>DET: Phân loại PII theo NĐ 13 / Luật BV DLCN 2025
    DET-->>API: Đề xuất chính sách che mờ (MASK, HMAC, DROP, KEEP)
    API-->>FE: Trả kết quả run cho DPO
    Note over DPO,FE: DPO xem sample data & thẩm định rủi ro
    DPO->>FE: Tinh chỉnh policy qua Drawer (đồng bộ Join Keys, lý do ghi đè)
    FE->>API: PUT /runs/{id}/decisions
    FE->>API: POST /runs/{id}/build
    API->>OUT: Ghi protected snapshot vật lý
    API->>VER: So sánh source với protected output (Downstream check)
    VER-->>API: VERIFIED hoặc FAILED
    Note over DPO,FE: DPO xem ERD Lineage Diagram của snapshot
    DPO->>FE: Bấm "Phát hành" (Publish) nếu VERIFIED
    FE->>API: POST /datasets/{id}/publish
    ANA->>FE: Đăng nhập, mở dataset PUBLISHED
    FE->>API: GET /datasets/{id}/preview (table, limit)
    FE-->>ANA: Hiển thị dữ liệu đã che & cho phép tải CSV an toàn
```

## 5. Nguyên Tắc Bảo Mật & Phân Quyền Bất Di Bất Dịch

1. **Nguyên tắc đối với DPO:**
   * DPO là người chịu trách nhiệm pháp lý và thẩm định rủi ro tuân thủ. **DPO CÓ THỂ XEM DATA (Sample data / Preview / Split view)** trong quá trình review để đánh giá đúng mức độ rủi ro, phân loại PII chính xác và xác thực các trường mơ hồ (`UNKNOWN`).
   * Mọi quyết định ghi đè gợi ý của AI hoặc giữ nguyên cột PII (ngoại lệ) bắt buộc phải nhập lý do và được ghi vào Sổ cái kiểm toán bất biến (Hash-Chain Merkle Root).
2. **Nguyên tắc đối với Analyst:**
   * **Zero Raw-PII cho Analyst:** Analyst tuyệt đối không bao giờ được xem dữ liệu PII thô. Analyst chỉ được truy cập các dataset ở trạng thái `PUBLISHED` (đã qua MASK, HMAC, DROP).
3. **Bảo mật cơ sở dữ liệu:**
   * Nguồn Cloud PostgreSQL và MongoDB luôn ở chế độ chỉ đọc (read-only).
   * Snapshot/protected output được ghi vào database hoặc schema đích riêng biệt.
   * API tuyệt đối không trả connection URI chứa mật khẩu, credential, hoặc khóa HMAC bí mật ra ngoài frontend.
4. **Tính toàn vẹn liên kết (Join Key Integrity):**
   * Các cặp trường là khóa nối giữa các bảng (PK/FK hoặc `$lookup`) bắt buộc phải áp dụng cùng hành động (`HMAC` hoặc `KEEP`). Không được phép áp dụng `MASK` hoặc `DROP` làm phá vỡ quan hệ liên kết dữ liệu.
5. **Cổng chặn phát hành:**
   * Backend chặn phát hành nếu Downstream Verifier chưa đánh dấu `VERIFIED`.

## 6. Mô Hình Triển Khai

* **Data Sources:** Cơ sở dữ liệu Cloud PostgreSQL (AWS RDS, GCP Cloud SQL, Supabase, Neon) và Cloud MongoDB Atlas.
* **Backend:** FastAPI, Python 3.11+, SQLAlchemy, PyMongo, Pydantic v2.
* **Frontend:** React 18, TypeScript strict, Vite, MUI, `@xyflow/react` (React Flow) với thuật toán bố cục `dagre`.
* **CI/CD & Demo:** Hỗ trợ chạy cục bộ qua Docker Compose và triển khai cloud (Render, Cloud Run, Cloud SQL).
