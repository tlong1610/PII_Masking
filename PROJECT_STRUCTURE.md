# 🏗️ Cấu Trúc Dự Án & Phân Chia Trách Nhiệm — PIIGuard Shield

> **Tài liệu hướng dẫn dành cho thành viên Team P-138.**  
> Đọc kỹ tài liệu này trước khi tạo branch và viết code để biết chính xác **mình cần code ở folder nào**, **giao tiếp với module khác ra sao**, và **tránh xung đột code (conflict)** khi mở Pull Request vào `develop`.

---

## 👥 Bảng Phân Công Tổng Quan

| Thành viên | Vai trò chính | Thư mục phụ trách | Trách nhiệm cốt lõi |
|---|---|---|---|
| **Nguyễn Đình Phúc** | **Team Lead & Frontend** | `frontend/**` | Giao diện React + Vite + TS (2 vai trò DPO & Analyst), kết nối API |
| **Đoàn Tuấn Long** | **Backend & PostgreSQL** | `src/api/`, `src/connectors/postgres/`, `src/transform/`, `src/verifier/` | FastAPI REST API, kết nối PostgreSQL, logic MASK/HMAC, downstream SQL join |
| **Trần Xuân Tùng** | **AI Engineer** | `src/agents/`, `src/services/`, `src/detection/`, `eval/` | LangGraph StateGraph, Prompt LLM Structured Outputs, Rule regex PII, Đánh giá AI |
| **Nguyễn Trung Kiên** | **Data Engineer** | `src/connectors/mongo/`, `data/fixtures/` | Kết nối MongoDB (PyMongo), chuẩn bị dataset mẫu có nhãn, kiểm thử lookup |

---

## ⚡ Danh Sách Cụ Thể Từng Người (Ai Code Folder/File Nào?)

> 💡 **Cách dùng:** Tìm tên của bạn bên dưới, copy đúng đường dẫn file/folder được giao để bắt đầu tạo nhánh và code.

### 🗄️ 1. Kiên — Data Engineer:
* **Các file & folder phụ trách code:**
  * `src/connectors/mongo_connector.py` — Adapter kết nối đọc collection và ghi snapshot MongoDB (PyMongo)
  * `src/verifier/mongo_verifier.py` — Script kiểm tra pipeline `$lookup` trên snapshot MongoDB sau che
  * `data/fixtures/mongo/` — Script seed 2 collections mẫu MongoDB (≤2.000 docs)
  * `data/fixtures/postgres/` — Phối hợp chuẩn bị dữ liệu mẫu cho 2 bảng PostgreSQL (≤2.000 rows)
  * `eval/benchmark_data.json` — Phối hợp gắn nhãn ground-truth cho bộ test eval
* **Tên nhánh Git:** `feature/data-<tên-tính-năng>` *(Ví dụ: `feature/data-mongo-connector`)*

---

### ⚙️ 2. Long — Backend & PostgreSQL:
* **Các file & folder phụ trách code:**
  * `src/api/auth.py` — API `POST /sessions` (xác thực role demo: DPO hoặc Analyst)
  * `src/api/runs.py` — API `POST /runs`, `GET /runs/{id}`, `PUT /runs/{id}/decisions`, `POST /runs/{id}/build`
  * `src/api/datasets.py` — API `GET /datasets`, `POST /datasets/{id}/publish`, `POST /datasets/{id}/revoke`, `GET /datasets/{id}/preview`
  * `src/connectors/postgres_connector.py` — Adapter đọc bảng nguồn và ghi snapshot đích PostgreSQL (psycopg)
  * `src/transform/mask_engine.py` — Logic che MASK (`***`) và DROP cột PII
  * `src/transform/hmac_hasher.py` — Logic băm HMAC-SHA256 giữ toàn vẹn khóa join
  * `src/verifier/sql_verifier.py` — Script chạy thử SQL JOIN trên snapshot PostgreSQL
  * `src/config.py` & `src/main.py` — Cấu hình CORS, .env, gom router FastAPI
* **Tên nhánh Git:** `feature/be-<tên-tính-năng>` *(Ví dụ: `feature/be-runs-api`)*

---

### 🤖 3. Tùng — AI Engineer:
* **Các file & folder phụ trách code:**
  * `src/agents/state.py` — Schema trạng thái `AgentState` cho LangGraph
  * `src/agents/graph.py` — Luồng StateGraph tuần tự + điểm dừng chờ DPO review
  * `src/agents/nodes/` — Các node: `scanner_node.py`, `llm_classify_node.py`, `policy_node.py`
  * `src/detection/regex_patterns.py` — Regex CCCD (12 số), SĐT VN (10 số), Email, MST...
  * `src/detection/taxonomy.py` — Bộ phân loại dữ liệu theo Luật 91/2025/QH15 & NĐ 356
  * `src/detection/rule_engine.py` — Engine quét regex trên dữ liệu mẫu
  * `src/services/llm.py` & `src/services/prompts.py` — OpenAI client (`gpt-4.1-mini`) + Structured Outputs prompt
  * `eval/run_eval.py` — Script tính Precision (≥95%), Recall (≥90%) xuất kết quả ra `eval/results/`
* **Tên nhánh Git:** `feature/ai-<tên-tính-năng>` *(Ví dụ: `feature/ai-langgraph-scanner`)*

---

### 🎨 4. Phúc — Frontend & Team Lead:
* **Các file & folder phụ trách code:**
  * `frontend/src/api/` — `client.ts`, `runs.ts`, `datasets.ts` (gọi REST API sang backend)
  * `frontend/src/pages/dpo/` — Màn hình DPO: chọn nguồn, bảng review duyệt PII, báo cáo & publish
  * `frontend/src/pages/analyst/` — Màn hình Analyst: danh sách dataset đã duyệt, preview bảng dữ liệu
  * `frontend/src/components/` — Navbar, ConfirmModal, LoadingState, StatusBadge
  * `frontend/src/types/` — TypeScript types khớp với Pydantic backend
  * `frontend/package.json` & `frontend/vite.config.ts`
* **Tên nhánh Git:** `feature/fe-<tên-tính-năng>` *(Ví dụ: `feature/fe-dpo-review-screen`)*

---

## 🌳 Bản Đồ Cây Thư Mục & Phân Quyền Code

```text
P-138/
├── frontend/                          👉 [PHÚC - FRONTEND]
│   ├── src/
│   │   ├── api/                       # Client gọi backend API (/api/v1/...)
│   │   ├── components/                # UI components (Header, Modal, Badge, Loading)
│   │   ├── pages/                     # Màn hình DPO & Analyst theo docs/ui-flow.md
│   │   │   ├── Login.tsx              # Chọn tài khoản demo (DPO / Analyst)
│   │   │   ├── dpo/                   # Dashboard duyệt PII & phát hành snapshot
│   │   │   └── analyst/               # Dashboard xem preview & chạy tác vụ
│   │   ├── types/                     # TypeScript interfaces
│   │   └── App.tsx                    # React Router
│   ├── package.json
│   └── vite.config.ts
│
├── src/                               👉 [BACKEND + AI + DATA CHUNG TRONG PYTHON]
│   │
│   ├── api/                           👉 [LONG - BACKEND]
│   │   ├── auth.py                    # POST /sessions (Role DPO / Analyst)
│   │   ├── runs.py                    # POST /runs, GET /runs/{id}, PUT /runs/{id}/decisions
│   │   ├── datasets.py                # GET /datasets, POST /datasets/{id}/publish, /preview
│   │   └── routes.py                  # Gom các router con lại
│   │
│   ├── agents/                        👉 [TÙNG - AI ENGINEER]
│   │   ├── state.py                   # Định nghĩa AgentState cho LangGraph
│   │   ├── graph.py                   # Xây dựng StateGraph (kết nối nodes, human approval)
│   │   └── nodes/                     # Từng bước trong graph (scanner, llm_classify, policy)
│   │
│   ├── detection/                     👉 [TÙNG - AI ENGINEER]
│   │   ├── regex_patterns.py          # Bộ regex phát hiện CCCD, Phone, Email, MST...
│   │   ├── taxonomy.py                # Danh mục phân loại dữ liệu theo Luật 91 & NĐ 356
│   │   └── rule_engine.py             # Engine chạy regex trên profile cột
│   │
│   ├── connectors/                    👉 [LONG & KIÊN - DATABASE CONNECTORS]
│   │   ├── base.py                    # Base Connector Interface chung (đọc schema, sample)
│   │   ├── postgres_connector.py      # [LONG]: Đọc bảng nguồn Postgres, ghi snapshot đích
│   │   └── mongo_connector.py         # [KIÊN]: Đọc collection MongoDB, ghi snapshot đích
│   │
│   ├── transform/                     👉 [LONG - BACKEND]
│   │   ├── hmac_hasher.py             # Băm HMAC-SHA256 cho khóa liên kết (giữ tính toàn vẹn join)
│   │   └── mask_engine.py             # Che dữ liệu (MASK toàn bộ ***, DROP cột)
│   │
│   ├── verifier/                      👉 [LONG & KIÊN - VERIFICATION]
│   │   ├── sql_verifier.py            # [LONG]: Kiểm tra SQL join trên snapshot đã che
│   │   └── mongo_verifier.py          # [KIÊN]: Kiểm tra MongoDB lookup trên snapshot đã che
│   │
│   ├── services/                      👉 [TÙNG & LONG - SHARED SERVICES]
│   │   ├── llm.py                     # [TÙNG]: Khởi tạo ChatOpenAI client
│   │   └── prompts.py                 # [TÙNG]: System prompts, few-shot examples & output schema
│   │
│   ├── models/                        👉 [CHUNG - PYDANTIC SCHEMAS]
│   │   └── schemas.py                 # Contract dữ liệu trao đổi giữa API, Agent, Database
│   │
│   ├── config.py                      👉 [LONG]: Quản lý biến môi trường (.env)
│   └── main.py                        👉 [LONG]: FastAPI app entry point & CORS
│
├── data/fixtures/                     👉 [KIÊN - DATA ENGINEER]
│   ├── postgres/                      # Script seed 2 bảng mẫu PostgreSQL (≤2000 records)
│   └── mongo/                         # Script seed 2 collections mẫu MongoDB (≤2000 docs)
│
├── eval/                              👉 [TÙNG & KIÊN - EVALUATION EVIDENCE]
│   ├── run_eval.py                    # Script chạy benchmark đo Precision, Recall, F1
│   ├── benchmark_data.json            # Dataset test có nhãn ground-truth
│   └── results/                       # Lưu kết quả eval nộp cho BTC (Deliverable #10)
│
├── tests/                             👉 [CHUNG - UNIT & INTEGRATION TESTS]
│   ├── unit/                          # Test từng function riêng biệt
│   └── integration/                   # Test end-to-end API & Agent flow
│
├── docs/                              👉 [CHUNG / PHÚC - TÀI LIỆU DỰ ÁN]
│   ├── brief.md                       # One-page brief
│   ├── prd.md                         # Product Requirements Document
│   └── ui-flow.md                     # Thiết kế UI & trạng thái màn hình
│
├── scripts/                           👉 [SCRIPTS HỖ TRỢ / HOOKS BTC]
│   ├── log_antigravity.py             # Tự động ghi nhận log AI
│   └── setup_hooks.sh                 # Cài đặt pre-push hook
│
├── TEAM_WORKFLOW.md                   👉 [QUY TRÌNH GIT, PR, COMMIT CHO CẢ TEAM]
└── README.md                          👉 [TỔNG QUAN DỰ ÁN]
```

---

## 🎯 Chi Tiết Trách Nhiệm Từng Vị Trí

### 1. 🎨 Frontend (Nguyễn Đình Phúc)
- **Khu vực:** Toàn quyền trong thư mục `frontend/`.
- **Stack:** React, TypeScript, Vite, TailwindCSS (nếu dùng) / Vanilla CSS, Lucide icons.
- **Nhiệm vụ cụ thể:**
  1. Khởi tạo project trong `frontend/` bằng Vite.
  2. Xây dựng 2 luồng trải nghiệm người dùng theo đúng [docs/ui-flow.md](docs/ui-flow.md):
     - **DPO:** Xem danh sách nguồn (`/sources`) $\rightarrow$ Khởi động quét $\rightarrow$ Bảng HITL duyệt đề xuất PII $\rightarrow$ Xem báo cáo kiểm tra downstream $\rightarrow$ Bấm Publish/Revoke.
     - **Analyst:** Xem danh sách Dataset đã duyệt $\rightarrow$ Preview dữ liệu đã che $\rightarrow$ Chạy tác vụ phân tích cố định.
  3. Bắt buộc có đủ các trạng thái giao diện: *Loading, Error, Empty state, Confirm Modal thao tác rủi ro cao* (Tiêu chí chấm Gate 1).
  4. Giao tiếp với Backend qua REST API tiền tố `/api/v1/...`.

---

### 2. ⚙️ Backend & PostgreSQL (Đoàn Tuấn Long)
- **Khu vực:** `src/api/`, `src/connectors/postgres_connector.py`, `src/transform/`, `src/verifier/sql_verifier.py`, `src/main.py`, `src/config.py`.
- **Stack:** Python 3.11, FastAPI, Pydantic v2, psycopg3.
- **Nhiệm vụ cụ thể:**
  1. Xây dựng API endpoints chuẩn RESTful theo [README.md](README.md#api-endpoints):
     - Xác thực demo (`POST /sessions` - gán role DPO / Analyst).
     - Quản lý Run & Duyệt (`POST /runs`, `GET /runs/{id}`, `PUT /runs/{id}/decisions`).
     - Quản lý Snapshot & Dataset (`POST /runs/{id}/build`, `POST /datasets/{id}/publish`, `GET /datasets`).
  2. Viết **PostgreSQL Connector**: đọc schema, trích xuất dữ liệu mẫu, tạo bảng snapshot mới ở vùng đích (không ghi đè nguồn).
  3. Viết **Transform Engine**:
     - `mask_engine.py`: Che giá trị PII (MASK toàn bộ thành `***`, hoặc DROP cột).
     - `hmac_hasher.py`: Băm HMAC-SHA256 với secret key từ `.env` cho các trường khóa liên kết.
  4. Viết **SQL Verifier**: Kiểm tra chạy lại truy vấn SQL JOIN giữa 2 bảng snapshot sau khi băm xem kết quả phân tích có còn toàn vẹn không.
  5. Cấu hình Docker Compose chạy PostgreSQL demo trên mạng nội bộ.

---

### 3. 🤖 AI Engineer (Trần Xuân Tùng)
- **Khu vực:** `src/agents/`, `src/services/`, `src/detection/`, `eval/`.
- **Stack:** LangGraph, LangChain, OpenAI API (`gpt-4.1-mini-2025-04-14`), Pydantic Structured Outputs.
- **Nhiệm vụ cụ thể:**
  1. Viết **Bộ phát hiện PII (`src/detection/`)**:
     - Regex cho các loại PII cơ bản Việt Nam: CCCD (12 số), Số điện thoại VN (đầu 03, 05, 07, 08, 09), Email, Mã số thuế cá nhân.
     - Căn cứ theo danh mục pháp lý: Luật Bảo vệ dữ liệu cá nhân (Luật 91/2025/QH15) và Nghị định 356/2025/NĐ-CP.
  2. Xây dựng **LangGraph Agent (`src/agents/`)**:
     - Định nghĩa `AgentState` trong `state.py`.
     - Xây dựng `StateGraph` tuyến tính:
       `Scanner (Rule/Regex)` $\rightarrow$ `LLM Phân loại trường mơ hồ` $\rightarrow$ **Break point (Tạm dừng chờ DPO review)** $\rightarrow$ `Hoàn tất đề xuất`.
     - Quản lý System Prompt và JSON Structured Outputs chuẩn trong `src/services/prompts.py`.
  3. Xây dựng **Evaluation Pipeline (`eval/`)**:
     - Viết `run_eval.py` chạy trên tập benchmark để đo **Precision ≥95%**, **Recall ≥90%**.
     - Xuất báo cáo ra file `eval/results/evaluation_report.md` (Ăn trọn điểm **Deliverable #10: Evaluation Evidence** cho Demo Day).

---

### 4. 🗄️ Data Engineer & MongoDB (Nguyễn Trung Kiên)
- **Khu vực:** `src/connectors/mongo_connector.py`, `src/verifier/mongo_verifier.py`, `data/fixtures/`.
- **Stack:** MongoDB, PyMongo, JSON/BSON, Pandas/Faker (tạo dữ liệu giả lập).
- **Nhiệm vụ cụ thể:**
  1. Chuẩn bị **Bộ dữ liệu mẫu (Fixtures) (`data/fixtures/`)**:
     - Tạo 2 bảng mẫu cho PostgreSQL và 2 collections mẫu cho MongoDB (mỗi nguồn ≤2.000 bản ghi, ≤20 trường).
     - Dữ liệu phải có đầy đủ: trường PII rõ ràng (CCCD, SĐT, Email), trường mơ hồ (ghi chú, mã định danh nội bộ), và trường khóa liên kết (user_id, customer_code).
     - **Tuyệt đối không dùng dữ liệu thật** (tuân thủ nguyên tắc bảo mật của cuộc thi).
  2. Viết **MongoDB Connector**: đọc collection, trích xuất schema mẫu của NoSQL, ghi snapshot sang database đích riêng.
  3. Viết **Mongo Verifier**: Kiểm tra chạy lại phép `$lookup` (tương đương JOIN) trên 2 collection snapshot sau khi băm HMAC.
  4. Phối hợp với Tùng chuẩn bị nhãn ground-truth cho tập dữ liệu benchmark trong `eval/`.

---

## 🤝 4 Quy Tắc Phối Hợp Tránh Đụng Code (Contract-First)

### 1. Thống nhất Data Schema trước khi code (`src/models/schemas.py`)
- Mọi dữ liệu trao đổi giữa Backend, AI Agent và Frontend đều thông qua Pydantic model trong `src/models/schemas.py`.
- **Ví dụ:** Khi quét xong một trường, AI trả về gì?
  ```python
  class FieldScanResult(BaseModel):
      engine: str              # "POSTGRESQL" hoặc "MONGODB"
      table_or_collection: str
      path: str                # ví dụ "customers.phone" hoặc "identity.cccd"
      data_type: str
      classification: str      # "PERSONAL_BASIC", "PERSONAL_SENSITIVE", "NON_PERSONAL", "UNKNOWN"
      action_proposal: str     # "MASK", "DROP", "HMAC", "KEEP"
      reason: str              # Căn cứ hoặc lý do đề xuất
      decision_tier: str       # "regex", "retrieval", "llm", "human_review"
      evidence_scores: dict    # score đã lọc nếu có; không bắt buộc confidence chung
  ```
  Detector nội bộ có thể dùng `sample_values` để regex/rule/BM25 chạy chính xác, nhưng API/UI/app DB/LLM prompt chỉ nhận bản đã lọc, không có raw `sample_value`.
  Khi Tùng và Long thống nhất schema này, Tùng cứ việc cho Agent trả ra đúng định dạng, Long cứ việc dựa vào định dạng này để lưu DB và trả về cho Frontend Phúc hiển thị.

### 2. Không sửa chéo folder của nhau
- Phúc chỉ commit code trong `frontend/`.
- Tùng chỉ commit code trong `src/agents/`, `src/services/`, `src/detection/`, `eval/`.
- Long chỉ commit code trong `src/api/`, `src/connectors/postgres*`, `src/transform/`.
- Kiên chỉ commit code trong `src/connectors/mongo*`, `data/fixtures/`.
- Nếu cần sửa file cấu hình chung (`src/config.py`, `src/models/schemas.py`, `requirements.txt`), hãy nhắn tin trong nhóm để thống nhất trước!

### 3. Quy tắc Git Branching & Merge (Nhắc lại từ [TEAM_WORKFLOW.md](TEAM_WORKFLOW.md))
- **Mọi nhánh tạo ra từ `develop`:**
  - Frontend: `feature/fe-<tên-tính-năng>`
  - Backend: `feature/be-<tên-tính-năng>`
  - AI: `feature/ai-<tên-tính-năng>`
  - Data: `feature/data-<tên-tính-năng>`
- **Mọi PR bắt buộc target base vào `develop`**:
  - ⛔ **TUYỆT ĐỐI KHÔNG BAO GIỜ MERGE VÀO `main`!**
  - Cần ít nhất 1 thành viên khác review và approve trước khi merge.

### 4. Biến Môi Trường (`.env`)
- Khi cần dùng biến mới, phải khai báo mẫu vào file `.env.example` để teammate biết và copy sang `.env` của họ.
- **Tuyệt đối KHÔNG commit file `.env` chứa API Key thật lên Git!**

---

*Tài liệu này được biên soạn bởi Team Leader Nguyễn Đình Phúc — Cập nhật lần cuối: 22/09/2026.*
