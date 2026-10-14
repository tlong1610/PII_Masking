# PIIGuard Shield - System Architecture

Tài liệu này mô tả chi tiết kiến trúc hệ thống của PIIGuard Shield, phản ánh đúng thực tế mã nguồn (FastAPI backend + React frontend) và các tính năng mới nhất đã triển khai.

## 1. Ý Tưởng Chính & Định Hướng Nguồn Dữ Liệu

PIIGuard Shield kết nối tới các cơ sở dữ liệu **PostgreSQL** và **MongoDB lưu trữ trên Cloud** (hoặc on-premise), quét tự động để phát hiện các trường dữ liệu cá nhân (PII), cho phép DPO thẩm định rủi ro và phê duyệt chính sách, sau đó sinh ra một database/snapshot vật lý mới đã được che giấu an toàn cho Analyst sử dụng.

```text
Input  = Cloud PostgreSQL / MongoDB Atlas gốc của doanh nghiệp
Output = Protected Database / Snapshot đã MASK / HMAC / DROP / KEEP
```

Ví dụ triển khai:
* **Cloud PostgreSQL**:
  * Nguồn: `postgresql://user:pass@aws-rds-host:5432/enterprise_db` (Schema: `public.customers`, `public.orders`)
  * Đích đã bảo vệ: `snapshot_out.piiguard_snapshot`
* **Cloud MongoDB Atlas**:
  * Nguồn: `mongodb+srv://user:pass@cluster0.mongodb.net/prod_db` (Collections: `customers`, `orders`)
  * Đích đã bảo vệ: `prod_db_protected`

## 2. Kết Nối Database Linh Hoạt (Cloud Connection Strings)

Hệ thống hỗ trợ cả cấu hình tĩnh qua file môi trường lẫn **thêm nguồn động từ giao diện người dùng (Add Data Source Dialog)**:

### 2.1 Cấu hình tĩnh qua biến môi trường (.env)
```env
# Cloud PostgreSQL
SOURCE_DATABASE_URL=postgresql://user:password@cloud-pg-host:5432/source_db
SNAPSHOT_DATABASE_URL=postgresql://user:password@cloud-pg-host:5432/snapshot_db
ENABLE_PG_SNAPSHOT=true

# Cloud MongoDB (hỗ trợ mongodb+srv cho Atlas)
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB=source_db
MONGO_SNAPSHOT_DB=source_db_protected
ENABLE_MONGO=true
```

### 2.2 Thêm nguồn động từ Frontend (Dynamic Sources)
* Hỗ trợ scheme: `postgresql://`, `postgres://`, `mongodb://`, `mongodb+srv://`.
* API kiểm tra kết nối thời gian thực: `POST /api/v1/sources/test`.
* API nạp phạm vi dữ liệu (introspection): `GET /api/v1/sources/{id}/scope` đọc danh sách bảng/collection, số dòng, kiểu dữ liệu, khóa chính (PK) và khóa ngoại (FK).
* **An toàn tuyệt đối:** Backend không bao giờ trả mật khẩu, connection URI chứa credential hoặc khóa bí mật HMAC ra phía Frontend.

## 3. Luồng Vận Hành Toàn Diện (End-to-End Workflow)

```mermaid
flowchart TD
    A[DPO chọn hoặc thêm Cloud Source] --> B[Test kết nối & Introspect Schema Scope]
    B --> C[DPO xem Source Scope Picker Diagram & chọn bảng]
    C --> D[Quét PII: Rules/Regex mặc định + AI/LLM phân loại nâng cao]
    D --> E[DPO Review Workspace với 5 Tabs]
    E -->|Thẩm định rủi ro| E1[Xem Sample Data: Đánh giá dữ liệu thực tế]
    E -->|Điều chỉnh chính sách| E2[Inspector Drawer: MASK/HMAC/DROP/KEEP + Căn cứ pháp lý]
    E --> F[Kích hoạt Build Protected Snapshot]
    F --> G[Downstream Verifier: Kiểm tra SQL JOIN / $lookup / Aggregate]
    G -->|PASS| H[DPO xem ERD Lineage Diagram & bấm Publish]
    G -->|FAIL| I[Báo lỗi 422 / Cảnh báo lệch khóa nối -> Yêu cầu DPO điều chỉnh]
    H --> J[Analyst Workspace: Preview bảng, xem ERD, tải CSV an toàn]
```

## 4. Kiến Trúc Thành Phần Hệ Thống

```mermaid
flowchart TB
    subgraph Frontend["React Frontend (Vite + MUI + React Flow)"]
        SCOPE_UI["SourceScopePickerDiagram<br/>(Bố cục dagre tự động)"]
        DPO_UI["DpoReviewExperienceMVP<br/>(5 Tabs + Inspector Drawer)"]
        ERD_UI["ErdLineageDiagram<br/>(Visual Lineage & PK/FK)"]
        ANA_UI["AnalystDatasetExperienceMVP<br/>(Data Grid + CSV Export)"]
    end

    subgraph API["FastAPI Backend (/api/v1)"]
        AUTH["Auth & Role Guards"]
        SOURCES_API["Sources API (Test & Introspect)"]
        RUNS_API["Runs API (Scan, Decision, Build)"]
        DATASETS_API["Datasets API (Publish, Revoke, Preview)"]
        RISK_API["Risk Score API (FR-10 Deterministic)"]
    end

    subgraph CoreEngine["Processing & Intelligence Engine"]
        SCANNER["Scanner & Profiler"]
        RULES["Rules / Regex / Taxonomy"]
        LLM["LangGraph / LLM Gateway (Metadata only)"]
        TRANSFORM["Snapshot Transform Pipeline"]
        VERIFY["Downstream Verifier (SQL & Mongo)"]
        AUDIT["Hash-Chain Audit Logger (Merkle Root)"]
    end

    subgraph DataSources["Cloud Data Sources"]
        PG_CLOUD[("Cloud PostgreSQL<br/>(AWS RDS / GCP Cloud SQL / Neon)")]
        MG_CLOUD[("Cloud MongoDB<br/>(MongoDB Atlas)")]
    end

    subgraph Snapshots["Protected Output Storage"]
        PG_OUT[("PostgreSQL Protected Snapshot")]
        MG_OUT[("MongoDB Protected DB")]
    end

    Frontend -->|HTTPS REST| API
    API --> CoreEngine
    CoreEngine --> DataSources
    CoreEngine --> Snapshots
```

## 5. Chi Tiết Các Phân Hệ Frontend (FE Components)

1. **Source Scope Picker Diagram (`SourceScopePickerDiagram.tsx`):**
   * Sử dụng `@xyflow/react` kết hợp thuật toán tính toán tọa độ tự động `dagre`.
   * Hiển thị bảng/collection trực quan dưới dạng node, liệt kê danh sách cột, icon nhận diện PK/FK.
   * Vẽ đường liên kết (edges) thể hiện quan hệ dữ liệu sẵn có; hỗ trợ hover highlight các trường liên kết tương ứng.
   * Checkbox chọn phạm vi quét trực tiếp trên từng node.
2. **DPO Review Experience (`DpoReviewExperienceMVP.tsx`):**
   * **Bố cục 5 Tabs chuẩn hóa:**
     * **Tab 0 — Overview & PII Schema:** Bảng danh sách cột, phân loại theo NĐ 13 (Cơ bản L2 / Nhạy cảm L3 / Gián tiếp L1 / Non-PII / UNKNOWN), sàn bảo mật tối thiểu, chip đề xuất action và trạng thái review.
     * **Tab 1 — Sample Data:** **DPO có quyền xem dữ liệu (sample data / preview)** để đánh giá mức độ nhạy cảm và rủi ro thực tế trước khi phê duyệt.
     * **Tab 2 — Permissions & Grants:** Giao diện kiểm soát phân quyền RBAC cho vai trò DPO và Analyst.
     * **Tab 3 — Audit History & Hash-Chain:** Sổ cái kiểm toán toàn vẹn mật mã với mã băm Merkle Root SHA-256.
     * **Tab 4 — Risk & Insights:** Điểm rủi ro tất định (Deterministic Risk Score 0–100) theo chuẩn FR-10, tỷ lệ bảo vệ L2/L3, và biểu đồ phân bổ hành động che mờ.
3. **Inspector Drawer (`FieldPolicyDrawerContent.tsx`):**
   * Cho phép DPO tùy biến chính sách từng trường độc lập mà không gây re-render toàn bảng.
   * Tự động phát hiện và cảnh báo nếu trường là Khóa nối (Join Partner), hướng dẫn đồng bộ action.
   * Hiển thị trích dẫn căn cứ pháp lý theo Điều 2 Khoản 3 & Khoản 4 Nghị định 13/2023/NĐ-CP và Luật BV DLCN 2025.
   * Cho phép DPO xác nhận trường `UNKNOWN` không phải dữ liệu cá nhân (`notPersonal: true`) để chuyển sang Non-PII.
   * Yêu cầu nhập lý do bắt buộc khi ghi đè khuyến nghị của AI hoặc cấp quyền ngoại lệ.
   * Thiết lập hạn chót ngoại lệ (`exceptionUntil`) khi DPO chọn giữ nguyên (KEEP) cột PII dưới sàn bảo mật.
4. **ERD & Lineage Diagram (`ErdLineageDiagram.tsx`):**
   * Bảng trực quan hóa cấu trúc dữ liệu của Snapshot đã bảo vệ.
   * Mỗi cột hiển thị rõ tag biến đổi: `MASK` (xanh dương), `HMAC` (tím), `KEEP` (xanh lá), `DROPPED` (xám).
   * Hỗ trợ Zoom, Pan, Fit View, Minimap, và Fullscreen.
5. **Analyst Experience (`AnalystDatasetExperienceMVP.tsx`):**
   * Xem trước bảng dữ liệu đã xử lý (`previewDataset`) với các phân trang/limit 20, 50, 100, 200 dòng.
   * Xuất file CSV an toàn (`downloadCsv`), tự động loại bỏ triệt để các cột bị `DROPPED`.
   * Xem ERD và truy vấn mẫu để viết code phân tích mà không cần chạm vào dữ liệu nhạy cảm.

## 6. Chính Sách Xử Lý Dữ Liệu (Policy Actions)

| Action | Mục đích sử dụng | Hành vi Transform |
|---|---|---|
| `MASK` | Che mờ dữ liệu định danh trực tiếp hoặc nhạy cảm không dùng làm khóa nối | Che một phần (`0912***789`, `n***@gmail.com`) hoặc thay bằng `[REDACTED]` |
| `HMAC` | Dùng cho các trường định danh tham gia khóa nối (JOIN keys / `$lookup`) | Băm mật mã một chiều HMAC-SHA-256 kèm salt bảo mật và `key_version` |
| `DROP` | Loại bỏ hoàn toàn trường dữ liệu quá nhạy cảm hoặc không cần thiết | Không tạo cột này trong bảng/snapshot đích |
| `KEEP` | Giữ nguyên dữ liệu phi cá nhân hoặc trường PII có ngoại lệ phê duyệt | Sao chép nguyên trạng giá trị sang snapshot đích |

## 7. Nguyên Tắc Phân Quyền & Bảo Mật

| Actor | Quyền được phép | Ràng buộc bảo mật |
|---|---|---|
| **DPO** | Quét dữ liệu, **được xem sample/preview data để đánh giá rủi ro**, duyệt policy qua Drawer, build snapshot, kiểm tra verifier, publish, revoke, xem audit log đầy đủ | Chịu trách nhiệm pháp lý cao nhất; mọi quyết định ghi đè hoặc cấp ngoại lệ phải ghi lý do vào Audit Log |
| **Analyst** | Xem danh sách dataset `PUBLISHED`, preview dữ liệu đã che, tải CSV an toàn, xem ERD diagram | **TUYỆT ĐỐI KHÔNG ĐƯỢC XEM RAW PII**, không được xem nguồn dữ liệu gốc, không xem staging, không can thiệp chính sách |

Backend kiểm tra quyền nghiêm ngặt tại middleware/dependencies bằng JWT và claim role (`require_role("dpo")`), ngăn chặn mọi hành vi bypass từ client.
