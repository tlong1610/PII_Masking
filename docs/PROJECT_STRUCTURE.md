# 🏗️ Cấu Trúc Dự Án & Phân Chia Trách Nhiệm — PIIGuard Shield

> **Tài liệu hướng dẫn dành cho thành viên Team P-138 — Cập nhật sau khi hoàn thành P1.**
> Tài liệu này mô tả chi tiết cây thư mục thực tế, phân chia trách nhiệm và quy tắc phối hợp mã nguồn giữa các thành viên.

---

## 👥 Bảng Phân Công Tổng Quan

| Thành viên | Vai trò chính | Thư mục phụ trách | Trách nhiệm cốt lõi |
|---|---|---|---|
| **Nguyễn Đình Phúc** | **Team Lead & Frontend** | `front_end/**` | Giao diện React + Vite + TS (DPO Workspace 4 tabs, Compliance Matrix, Live Sandbox, Run History, Audit Log, Analyst Preview), kết nối API |
| **Đoàn Tuấn Long** | **Backend & PostgreSQL** | `src/api/`, `src/connectors/postgres_connector.py`, `src/transform/`, `src/verifier/sql_verifier.py` | FastAPI REST API, kết nối PostgreSQL, logic MASK/HMAC/DROP, downstream SQL join verifier, auth/sessions |
| **Trần Xuân Tùng** | **AI Engineer** | `src/agents/`, `src/services/`, `src/detection/`, `eval/`, `performance/` | LangGraph StateGraph, Prompt LLM Structured Outputs, Column distribution stats, GLiNER NER Luồng B, HITL Few-Shot Memory, Đánh giá AI |
| **Nguyễn Trung Kiên** | **Data Engineer** | `src/connectors/mongo_connector.py`, `src/verifier/mongo_verifier.py`, `data/fixtures/` | Kết nối MongoDB (PyMongo), chuẩn bị dataset mẫu có nhãn (14 bảng PostgreSQL, MongoDB 91 customers / 830 orders), kiểm thử `$lookup` verifier |

---

## ⚡ Danh Sách Cụ Thể Từng Người (Ai Code Folder/File Nào?)

### 🗄️ 1. Kiên — Data Engineer:
* **Các file & folder phụ trách code:**
  * `src/connectors/mongo_connector.py` — Adapter kết nối đọc collection và ghi snapshot MongoDB (PyMongo)
  * `src/verifier/mongo_verifier.py` — Script kiểm tra pipeline `$lookup` trên snapshot MongoDB sau che
  * `data/fixtures/mongo/` — Script seed collections mẫu MongoDB (91 customers, 830 orders)
  * `data/fixtures/postgres/` — Phối hợp chuẩn bị dữ liệu mẫu cho 14 bảng quan hệ PostgreSQL (`seed.sql`)
  * `eval/golden_labels.json`, `eval/benchmark_data.json` — Phối hợp gắn nhãn ground-truth cho bộ test eval
* **Tên nhánh Git:** `feature/data-<tên-tính-năng>`

---

### ⚙️ 2. Long — Backend & PostgreSQL:
* **Các file & folder phụ trách code:**
  * `src/api/auth.py` — API `POST /sessions` (xác thực role demo: DPO hoặc Analyst)
  * `src/api/sources.py` — API `GET /sources`, `POST /sources`, `POST /sources/test`, `GET /sources/{id}/scope`
  * `src/api/runs.py` — API `POST /runs`, `GET /runs`, `GET /runs/{id}`, `PUT /runs/{id}/decisions`, `POST /runs/{id}/build`, `GET /runs/{id}/report`, `GET /runs/{id}/risk-score`
  * `src/api/datasets.py` — API `GET /datasets`, `POST /datasets/{id}/publish`, `POST /datasets/{id}/revoke`, `GET /datasets/{id}/preview`
  * `src/api/audit.py` — API `GET /audit`, `GET /audit/verify` (Merkle Hash-Chain)
  * `src/connectors/postgres_connector.py` — Adapter đọc bảng nguồn và ghi snapshot đích PostgreSQL (psycopg)
  * `src/transform/mask_engine.py` — Logic che MASK (`***`), REDACT và DROP cột PII
  * `src/transform/hmac_hasher.py` — Logic băm HMAC-SHA256 giữ toàn vẹn khóa join
  * `src/verifier/sql_verifier.py` — Script chạy thử SQL JOIN trên snapshot PostgreSQL
  * `src/config.py` & `src/main.py` — Cấu hình CORS, .env, gom router FastAPI
* **Tên nhánh Git:** `feature/be-<tên-tính-năng>`

---

### 🤖 3. Tùng — AI Engineer:
* **Các file & folder phụ trách code:**
  * `src/agents/state.py` — Schema trạng thái `AgentState` cho LangGraph
  * `src/agents/graph.py` — Luồng StateGraph tuần tự + điểm dừng chờ DPO review
  * `src/agents/nodes/` — Các node: scanner, field profile, LLM classify
  * `src/detection/regex_patterns.py` — Regex CCCD, SĐT VN, Email, MST, Bank Account...
  * `src/detection/taxonomy.py` — Bộ phân loại dữ liệu theo Luật 91/2025/QH15 & NĐ 356/2025/NĐ-CP & NĐ 13/2023/NĐ-CP
  * `src/detection/rule_engine.py` — Engine quét regex trên profile cột
  * `src/detection/column_stats.py` — Tính toán thống kê phân phối cột an toàn (không gửi raw value)
  * `src/detection/dict_ner.py` — Tra cứu từ điển FlashText cho tên người, địa danh
  * `src/detection/ml_ner.py` & `src/detection/ner_orchestrator.py` — Cascade NER (Regex + FlashText + GLiNER Zero-Shot `urchade/gliner_multi_pii-v1`)
  * `src/detection/hitl_feedback.py` — Cơ chế HITL In-Context Memory tự học từ quyết định DPO
  * `src/services/llm.py` & `src/services/prompts.py` — OpenAI/OpenRouter/Gemini client + Structured Outputs prompt
  * `eval/run_eval_full.py`, `eval/run_eval_field_profile.py` — Scripts chạy benchmark
  * `performance/` — Báo cáo đánh giá hiệu năng Luồng A & Luồng B sau HITL (`report_stream_a.md`, `report_stream_b.md`)
* **Tên nhánh Git:** `feature/ai-<tên-tính-năng>`

---

### 🎨 4. Phúc — Frontend & Team Lead:
* **Các file & folder phụ trách code:**
  * `front_end/src/features/auth/` — Đăng nhập, session storage, Role guard
  * `front_end/src/features/piiReview/` — DPO Review Workspace (4 Tabs: Tổng quan PII, Rủi ro FR-10, Kiểm toán, Dữ liệu cho Analyst), Scope Picker Diagram, FieldReviewTable, PolicyChips, Inspector Drawer
  * `front_end/src/features/compliance/` — Live Masking Sandbox, Masking Matrix Table, Ma trận NĐ 13 (L1->L2->L3) kèm link nguồn pháp luật chính phủ
  * `front_end/src/features/runHistory/` — Quản lý lịch sử Run & gom Dataset (1 Run = 1 Dataset, Revoke, Publish)
  * `front_end/src/features/auditLog/` — Nhật ký kiểm toán diễn giải ngôn ngữ tự nhiên theo ngày, bộ lọc hoạt động
  * `front_end/src/features/datasets/` — Bảng Preview dữ liệu an toàn cho Analyst, Verifier results
  * `front_end/src/pages/` — Toàn bộ pages định tuyến trong React Router
  * `front_end/package.json` & `front_end/vite.config.ts`
* **Tên nhánh Git:** `feature/fe-<tên-tính-năng>`

---

## 🌳 Bản Đồ Cây Thư Mục Thực Tế

```text
P-138/
├── front_end/                         👉 [PHÚC - FRONTEND]
│   ├── src/
│   │   ├── app/                       # App root & Provider setup
│   │   ├── features/                  # Feature-Sliced modules
│   │   │   ├── auth/                  # Login, session, role guards
│   │   │   ├── piiReview/             # DPO Review 4 tabs, diagram, drawer, chips
│   │   │   ├── compliance/            # Masking sandbox & NĐ 13 rules matrix
│   │   │   ├── runHistory/            # Lịch sử run, hợp nhất dataset
│   │   │   ├── auditLog/              # Nhật ký kiểm toán readable dạng câu
│   │   │   └── datasets/              # Preview table, verifier results
│   │   ├── pages/                     # DPO & Analyst pages (Router)
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DpoWorkspacePage.tsx   # /dpo và /dpo/runs/:id
│   │   │   ├── DpoRunHistoryPage.tsx  # /dpo/runs
│   │   │   ├── DpoMaskingDemoPage.tsx # /dpo/masking (Live Sandbox)
│   │   │   ├── DpoRulesPage.tsx       # /dpo/rules (Ma trận NĐ 13)
│   │   │   ├── DpoAuditPage.tsx       # /dpo/audit
│   │   │   └── AnalystWorkspacePage.tsx # /analyst
│   │   ├── shared/                    # UI dùng chung (AppShell, ConfirmDialog...)
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── src/                               👉 [BACKEND + AI + DATA CHUNG TRONG PYTHON]
│   ├── api/                           👉 [LONG - BACKEND]
│   │   ├── auth.py                    # POST /sessions, /sessions/logout
│   │   ├── sources.py                 # GET/POST /sources, /sources/test, /scope
│   │   ├── runs.py                    # POST /runs, GET /runs/{id}, /decisions, /build, /report, /risk-score
│   │   ├── datasets.py                # GET /datasets, /publish, /revoke, /preview
│   │   ├── audit.py                   # GET /audit, /audit/verify
│   │   └── routes.py                  # Gom các router con lại
│   │
│   ├── agents/                        👉 [TÙNG - AI ENGINEER]
│   │   ├── state.py                   # Schema trạng thái AgentState cho LangGraph
│   │   ├── graph.py                   # Xây dựng StateGraph
│   │   └── nodes/                     # Scanner nodes & field profile nodes
│   │
│   ├── detection/                     👉 [TÙNG - AI ENGINEER]
│   │   ├── regex_patterns.py          # Bộ regex phát hiện CCCD, Phone, Email, MST...
│   │   ├── taxonomy.py                # Danh mục phân loại dữ liệu theo Luật 91 & NĐ 356
│   │   ├── rule_engine.py             # Engine chạy regex trên profile cột
│   │   ├── column_stats.py            # Thống kê phân phối an toàn cho LLM
│   │   ├── dict_ner.py                # FlashText dictionary lookup
│   │   ├── ml_ner.py                  # GLiNER Zero-Shot wrapper
│   │   ├── ner_orchestrator.py        # Cascade NER Luồng B (Regex + Dict + GLiNER)
│   │   └── hitl_feedback.py           # Vòng lặp học từ quyết định DPO
│   │
│   ├── connectors/                    👉 [LONG & KIÊN - DATABASE CONNECTORS]
│   │   ├── base.py                    # Base Connector Interface
│   │   ├── postgres_connector.py      # [LONG]: Đọc nguồn Postgres, ghi snapshot đích
│   │   └── mongo_connector.py         # [KIÊN]: Đọc nguồn MongoDB, ghi snapshot đích
│   │
│   ├── transform/                     👉 [LONG - BACKEND]
│   │   ├── hmac_hasher.py             # Băm HMAC-SHA256 cho khóa liên kết
│   │   └── mask_engine.py             # Che dữ liệu (MASK, REDACT, DROP)
│   │
│   ├── verifier/                      👉 [LONG & KIÊN - VERIFICATION]
│   │   ├── sql_verifier.py            # [LONG]: Kiểm tra SQL join trên snapshot đã che
│   │   └── mongo_verifier.py          # [KIÊN]: Kiểm tra MongoDB $lookup trên snapshot đã che
│   │
│   ├── services/                      👉 [TÙNG & LONG - SHARED SERVICES]
│   │   ├── llm.py                     # [TÙNG]: Khởi tạo LLM client (OpenAI/OpenRouter/Gemini)
│   │   ├── prompts.py                 # [TÙNG]: System prompts & output schemas
│   │   ├── risk_scorer.py             # [LONG & TÙNG]: Tính toán điểm rủi ro FR-10
│   │   └── report_generator.py        # [LONG]: Sinh Privacy Risk Report
│   │
│   ├── models/schemas.py              👉 [CHUNG - PYDANTIC SCHEMAS]
│   ├── config.py                      👉 [LONG]: Quản lý biến môi trường (.env)
│   └── main.py                        👉 [LONG]: FastAPI app entry point & CORS
│
├── data/fixtures/                     👉 [KIÊN - DATA ENGINEER]
│   ├── postgres/                      # Script seed 14 bảng mẫu PostgreSQL (seed.sql)
│   └── mongo/                         # Script seed MongoDB (91 customers, 830 orders)
│
├── eval/                              👉 [TÙNG & KIÊN - EVALUATION EVIDENCE]
│   ├── golden_labels.json             # Dataset nhãn chuẩn
│   ├── benchmark_data.json            # Dataset test
│   └── results/                       # Báo cáo đánh giá ban đầu
│
├── performance/                       👉 [TÙNG & TEAM - HIỆU NĂNG SAU HITL]
│   ├── sau_HITL/                      # Báo cáo Luồng A (100% Accuracy), Luồng B (97.86% Recall)
│   └── hitl_memory/                   # Bộ nhớ DPO Few-Shot runtime & RAG corpus
│
├── tests/                             👉 [CHUNG - 317 TESTS PYTEST]
│   ├── test_api/                      # API endpoint tests
│   ├── test_detection/                # Rules, column stats, GLiNER NER tests
│   ├── test_services/                 # Risk scorer, report, run scanner tests
│   ├── test_transform/                # HMAC, MASK, REDACT tests
│   └── test_verifier/                 # SQL join & Mongo lookup verifier tests
│
├── docs/                              👉 [CHUNG / PHÚC - TÀI LIỆU DỰ ÁN]
│   ├── core/                          # PRD, System Architecture, AI Architecture, Status Report
│   ├── ops/                           # CI Runner guide, TEAM_WORKFLOW
│   └── ops/TEAM_WORKFLOW.md           👉 [QUY TRÌNH GIT, PR, COMMIT CHO CẢ TEAM]
│
└── README.md                          👉 [TỔNG QUAN DỰ ÁN]
```

---

## 🤝 4 Quy Tắc Phối Hợp Tránh Đụng Code (Contract-First)

### 1. Thống nhất Data Schema trước khi code (`src/models/schemas.py`)
Mọi dữ liệu trao đổi giữa Backend, AI Agent và Frontend đều thông qua Pydantic model trong `src/models/schemas.py`.

### 2. Không sửa chéo folder của nhau
- Phúc commit code trong `front_end/`.
- Tùng commit code trong `src/agents/`, `src/services/`, `src/detection/`, `eval/`, `performance/`.
- Long commit code trong `src/api/`, `src/connectors/postgres*`, `src/transform/`.
- Kiên commit code trong `src/connectors/mongo*`, `data/fixtures/`.
- Nếu cần sửa file cấu hình chung (`src/config.py`, `src/models/schemas.py`, `requirements.txt`), hãy thảo luận trong nhóm trước.

### 3. Quy tắc Git Branching & Merge (Từ [ops/TEAM_WORKFLOW.md](ops/TEAM_WORKFLOW.md))
- Mọi nhánh rẽ nhánh từ `develop`.
- Mọi PR bắt buộc target base vào `develop`.
- Không merge vào `main` trước các mốc Gate chính thức.

### 4. Biến Môi Trường (`.env`)
- Khai báo mẫu biến mới vào `.env.example`.
- Tuyệt đối không commit file `.env` thật lên Git.
