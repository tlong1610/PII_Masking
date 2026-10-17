# PIIGuard Shield - System Architecture

Tài liệu này mô tả kiến trúc FastAPI backend + React frontend. Một số luồng là mục tiêu thiết kế; hãy đối chiếu API và code trước khi xem là đã triển khai. Đặc biệt, ngoại lệ `KEEP` có thể đưa PII nguyên gốc vào snapshot mà Analyst xem được, nên Zero Raw PII hiện chưa tuyệt đối.

---

## 1. Ý Tưởng Chính & Định Hướng Nguồn Dữ Liệu

PIIGuard Shield kết nối tới các cơ sở dữ liệu **PostgreSQL** và **MongoDB lưu trữ trên Cloud** (hoặc on-premise), quét tự động để phát hiện các trường dữ liệu cá nhân (PII), cho phép DPO thẩm định rủi ro và phê duyệt chính sách trên siêu dữ liệu (không tiếp xúc PII thô), sau đó sinh ra một database/snapshot vật lý mới đã được che giấu an toàn cho Analyst sử dụng.

```text
Input  = Cloud PostgreSQL / MongoDB Atlas gốc của doanh nghiệp (Read-only)
Output = Protected Database / Snapshot đã MASK / REDACT / HMAC / DROP / KEEP
```

Ví dụ triển khai:
* **Cloud PostgreSQL**:
  * Nguồn: `postgresql://user:pass@aws-rds-host:5432/enterprise_db` (Schema: `public.customers`, `public.orders`)
  * Đích đã bảo vệ: `snapshot_out.piiguard_snapshot`
* **Cloud MongoDB Atlas**:
  * Nguồn: `mongodb+srv://user:pass@cluster0.mongodb.net/prod_db` (Collections: `customers`, `orders`)
  * Đích đã bảo vệ: `prod_db_protected`

---

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
* API kiểm tra kết nối thời gian thực: `POST /sources/test`.
* API nạp phạm vi dữ liệu (introspection): `GET /sources/{id}/scope` đọc danh sách bảng/collection, số dòng, kiểu dữ liệu, khóa chính (PK) và khóa ngoại (FK).
* **An toàn tuyệt đối:** Backend không bao giờ trả mật khẩu, connection URI chứa credential hoặc khóa bí mật HMAC ra phía Frontend.

---

## 3. Luồng Vận Hành Toàn Diện (End-to-End Workflow)

```mermaid
flowchart TD
    A[DPO chọn hoặc thêm Cloud Source] --> B[Test kết nối & Introspect Schema Scope]
    B --> C[DPO xem Source Scope Picker Diagram & chọn bảng]
    C --> D[Quét PII: Rules/Regex mặc định + AI/LLM phân loại nâng cao]
    D --> E[DPO Review Workspace với 4 Tabs]
    E -->|Thẩm định rủi ro| E1[Tab 1: FR-10 Risk Score & L2/L3 Insights]
    E -->|Điều chỉnh chính sách| E2[Inspector Drawer: MASK/REDACT/HMAC/DROP/KEEP + Căn cứ pháp lý]
    E --> F[Kích hoạt Build Protected Snapshot]
    F --> G["Downstream Verifier: Kiểm tra SQL JOIN / $lookup / Aggregate"]
    G -->|PASS| H["Tab 3: DPO xem Snapshot Preview & bấm Publish"]
    G -->|FAIL| I["Báo lỗi 422 / Cảnh báo lệch khóa nối -> Yêu cầu DPO điều chỉnh"]
    H --> J["Analyst Workspace: Preview bảng đã che, xem ERD, tải CSV an toàn"]
```

---

## 4. Kiến Trúc Thành Phần Hệ Thống

```mermaid
flowchart TB
    subgraph Frontend["React Frontend (Vite + MUI + React Flow)"]
        SCOPE_UI["SourceScopePickerDiagram<br/>(Bố cục Dagre tự động)"]
        DPO_UI["DpoReviewExperienceMVP<br/>(4 Tabs + Inspector Drawer)"]
        MASKING_UI["MaskingDemoView<br/>(Live Sandbox & Matrix)"]
        RULES_UI["Nd13RulesView<br/>(L1->L2->L3 Matrix & Legal Links)"]
        AUDIT_UI["AuditLogView<br/>(Nhật ký dạng câu theo ngày)"]
        ERD_UI["ErdLineageDiagram<br/>(Visual Lineage & PK/FK)"]
        ANA_UI["AnalystDatasetExperienceMVP<br/>(Data Grid + CSV Export)"]
    end

    subgraph API["FastAPI Backend"]
        AUTH["Auth & Role Guards (/sessions)"]
        SOURCES_API["Sources API (/sources)"]
        RUNS_API["Runs API (/runs)"]
        DATASETS_API["Datasets API (/datasets)"]
        RISK_API["Risk Score API (/runs/{id}/risk-score)"]
        AUDIT_API["Audit API (/audit, /audit/verify)"]
    end

    subgraph CoreEngine["Processing & Intelligence Engine"]
        SCANNER["Scanner & Profiler (run_scanner.py)"]
        COL_STATS["Column Distribution Stats (column_stats.py)"]
        RULES["Rules / Regex / Taxonomy NĐ 356"]
        NER_CASCADE["Free-text NER: Regex + Dict + GLiNER Zero-Shot"]
        LLM["LangGraph / LLM Gateway (Metadata only, Zero Raw PII)"]
        HITL_MEM["HITL In-Context Memory (hitl_feedback.py)"]
        TRANSFORM["Snapshot Transform Pipeline (mask_engine.py, hmac_hasher.py)"]
        VERIFY["Downstream Verifier (SQL JOIN & Mongo $lookup)"]
        AUDIT["Hash-Chain Audit Logger (Merkle Root SHA-256)"]
    end

    subgraph DataSources["Cloud Data Sources (Read-only)"]
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

---

## 5. Chi Tiết Các Phân Hệ Frontend (FE Components)

1. **Source Scope Picker Diagram (`SourceScopePickerDiagram.tsx`):**
   * Sử dụng `@xyflow/react` kết hợp thuật toán tính toán tọa độ tự động `dagre`.
   * Hiển thị bảng/collection trực quan dưới dạng node, liệt kê danh sách cột, icon nhận diện PK/FK.
   * Vẽ đường liên kết (edges) thể hiện quan hệ dữ liệu sẵn có; hỗ trợ hover highlight các trường liên kết tương ứng.
   * Checkbox chọn phạm vi quét trực tiếp trên từng node.
   * Cảnh báo `ScopeLinkWarnings`: nhắc nhở và đề xuất thêm bảng liên kết (`link_scope`) khi bỏ bảng cha/bảng trung gian N–N.

2. **DPO Review Experience (`DpoReviewExperienceMVP.tsx`):**
   * **Bố cục 4 Tabs chuẩn hóa:**
     * **Tab 0 — Tổng quan & phân loại PII:** Bảng danh sách cột gom nhóm theo bảng (`CollapsibleTableGroup`), thanh công cụ tìm kiếm và lọc theo Action (`ReviewToolbar`), chip đề xuất chính sách (`PolicyChips`), và nút thẩm định mở Drawer.
     * **Tab 1 — Rủi ro & đánh giá (`RiskInsightsTab.tsx`):** Điểm rủi ro tất định (Deterministic Risk Score 0–100) theo chuẩn FR-10, tỷ lệ bảo vệ L2/L3, và biểu đồ phân bổ hành động che mờ.
     * **Tab 2 — Nhật ký kiểm toán (`AuditTrail.tsx`):** Sổ cái kiểm toán toàn vẹn mật mã với mã băm Merkle Root SHA-256, liên kết trực tiếp tới sự kiện của Run.
     * **Tab 3 — Dữ liệu cho Analyst (`SnapshotTab.tsx`):** Kết quả kiểm định của Downstream Verifier và bảng xem trước dữ liệu an toàn đã che mờ (`DatasetPreviewTable`).
   * **Nguyên tắc Zero Raw PII:** DPO không tiếp cận raw PII trên UI. Thẩm định dựa trên siêu dữ liệu, data shape, thống kê phân phối và gợi ý AI.

3. **Inspector Drawer (`FieldPolicyDrawerContent.tsx`):**
   * Tùy biến chính sách từng trường độc lập: chuyển đổi giữa MASK, REDACT, HMAC, DROP, KEEP.
   * Tự động phát hiện và cảnh báo nếu trường là Khóa nối (Join Partner), hướng dẫn đồng bộ action.
   * Trích dẫn căn cứ pháp lý theo Điều 3 (dữ liệu cơ bản) & Điều 4 (dữ liệu nhạy cảm) Nghị định 356/2025/NĐ-CP và Luật BV DLCN 2025.
   * Cho phép xác nhận trường `UNKNOWN` không phải dữ liệu cá nhân (`notPersonal: true`) để chuyển sang Non-PII.
   * Bắt buộc nhập lý do khi ghi đè khuyến nghị của AI hoặc cấp quyền ngoại lệ; thiết lập hạn chót ngoại lệ (`exceptionUntil`).

4. **Quản lý Lịch Sử Run & Hợp Nhất Dataset (`RunHistoryView.tsx`):**
   * Mô hình 1 Run = 1 Dataset: mỗi Run sinh đúng 1 dataset bảo vệ tương ứng.
   * Phân tab trạng thái: Chờ duyệt, Chờ phát hành, Đã phát hành, Lỗi.
   * **Phát hành (Publish):** Tự động cấp quyền truy cập cho toàn bộ Analyst.
   * **Thu hồi (Revoke):** Xóa bản dữ liệu snapshot vật lý, đưa run về trạng thái `READY_TO_BUILD` để DPO có thể tinh chỉnh chính sách và build lại.

5. **Môi Trường Demo Che Mờ & Live Sandbox (`MaskingDemoView.tsx`):**
   * Thử nghiệm tương tác Live Sandbox (`MaskingSandboxCard`): cho phép nhập chuỗi thử nghiệm và kiểm tra tức thời hiệu quả của các kỹ thuật MASK, REDACT, HMAC, DROP.
   * Bảng Ma trận Kỹ thuật che mờ (`MaskingMatrixTable`): so sánh chi tiết cơ chế, mục đích sử dụng và ví dụ minh họa.

6. **Ma Trận Quy Định Luật BV DLCN 2025 & NĐ 356 (`Nd13RulesView.tsx`):**
   * Sắp xếp ma trận bảo vệ chuẩn mực theo thứ tự cấp bậc: L1 (Định danh gián tiếp) → L2 (Dữ liệu cơ bản) → L3 (Dữ liệu nhạy cảm).
   * Tích hợp link dẫn nguồn chính thức tới văn bản quy phạm pháp luật trên Cổng thông tin Chính phủ.
   * Bảng màu ngữ nghĩa đồng bộ theo tiêu chuẩn Databricks Design DNA.

7. **Nhật Ký Kiểm Toán Trực Quan (`AuditLogView.tsx` & `AuditActivityTable.tsx`):**
   * Gom nhóm sự kiện kiểm toán theo ngày.
   * Diễn giải hành động dưới dạng câu ngôn ngữ tự nhiên dễ hiểu (Quét dữ liệu, Lưu quyết định, Build snapshot, Phát hành, Thu hồi).
   * Bộ lọc theo nhóm hành vi và Drawer chi tiết sự kiện (`AuditEventDrawer.tsx`) hiển thị mã băm toàn vẹn.

8. **Analyst Experience (`AnalystDatasetExperienceMVP.tsx`):**
   * Xem trước bảng dữ liệu đã xử lý (`DatasetPreviewTable`) với phân trang 20, 50, 100, 200 dòng.
   * Xuất file CSV an toàn (`downloadCsv`), tự động loại bỏ triệt để các cột bị `DROPPED`.
   * Xem ERD Lineage Diagram và truy vấn mẫu để viết code phân tích mà không cần chạm vào dữ liệu nhạy cảm.

---

## 6. Chính Sách Xử Lý Dữ Liệu (Policy Actions)

| Action | Mục đích sử dụng | Hành vi Transform |
|---|---|---|
| `MASK` | Che mờ dữ liệu định danh trực tiếp hoặc nhạy cảm không dùng làm khóa nối | Che một phần (`0912***789`, `n***@gmail.com`) hoặc thay bằng `[REDACTED]` |
| `REDACT` | Văn bản tự do (ghi chú, chat, OCR): giữ câu văn, thay từng thực thể PII | Dùng Cascade (Regex + FlashText + GLiNER) thay thực thể thành `[PHONE]`, `[CCCD]`, `[EMAIL]` |
| `HMAC` | Dùng cho các trường định danh tham gia khóa nối (JOIN keys / `$lookup`) | Băm mật mã một chiều HMAC-SHA-256 kèm salt bảo mật và `key_version` |
| `DROP` | Loại bỏ hoàn toàn trường dữ liệu quá nhạy cảm hoặc không cần thiết | Không tạo cột này trong bảng/snapshot đích |
| `KEEP` | Giữ nguyên dữ liệu phi cá nhân hoặc trường PII có ngoại lệ phê duyệt | Sao chép nguyên trạng giá trị sang snapshot đích |

---

## 7. Nguyên Tắc Phân Quyền & Bảo Mật Tuyệt Đối

| Actor | Quyền được phép | Ràng buộc bảo mật |
|---|---|---|
| **DPO** | Quét dữ liệu, xem metadata/thống kê và protected preview, duyệt policy, build, verifier, publish/revoke và audit | DPO UI không render raw source values. Ngoại lệ PII `KEEP` cần lý do/hạn nhưng có thể đưa raw value vào snapshot. |
| **Analyst** | Xem dataset `PUBLISHED`, preview, CSV và ERD theo API/UI hiện có | Chỉ đọc dataset đã publish; nếu PII được đặt `KEEP` theo ngoại lệ, raw value có thể xuất hiện. Không tuyên bố Zero Raw PII tuyệt đối. |

Backend kiểm tra quyền nghiêm ngặt tại middleware/dependencies bằng session token và claim role (`require_dpo`, `require_analyst_or_dpo`), ngăn chặn mọi hành vi bypass từ client.

### 7.1 Tại Sao DPO Không Tiếp Xúc Với PII Thô? (Triết Lý Thiết Kế & An Toàn Thông Tin)

Việc DPO không tiếp xúc dữ liệu PII thô là một quyết định kiến trúc cốt lõi nhằm giải quyết bài toán quản trị và an toàn thông tin:

1. **Phân định vai trò & Tối thiểu hóa dữ liệu (Data Minimization):**
   * DPO là vai trò **quản trị tuân thủ (Governance)**, không phải người trực tiếp khai thác dữ liệu (Data Processor).
   * Theo Luật 91/2025/QH15 và NĐ 356/2025/NĐ-CP, nguyên tắc *Need-to-know* chỉ cho phép tiếp cận dữ liệu khi có nhu cầu nghiệp vụ thực sự. DPO chỉ cần biết bản chất trường dữ liệu (thuộc danh mục L1/L2/L3 nào) chứ không có căn cứ pháp lý để xem số CCCD hay bệnh án thật của từng cá nhân.
2. **Triệt tiêu nguy cơ rò rỉ nội bộ (Insider Threat & Privilege Escalation):**
   * Nếu DPO được xem PII thô, tài khoản DPO sẽ trở thành mục tiêu tấn công số 1. Kẻ tấn công chiếm được token DPO có thể trích xuất toàn bộ CSDL khách hàng. Zero Raw PII đảm bảo token DPO nếu bị lộ cũng chỉ xem được siêu dữ liệu và thống kê định tính.
3. **Đầy đủ cơ sở thẩm định (Metadata Sufficiency):**
   * DPO đưa ra quyết định dựa trên **5 cơ sở an toàn**: (1) Tên bảng/cột, (2) Kiểu dữ liệu & data shape (`XXXXXXXXXXXX`, `CCC@CCCC.CC`), (3) Thống kê phân phối định tính từ `column_stats.py` (tỷ lệ null, cardinality), (4) Phân loại AI kèm căn cứ pháp lý Luật 91 / NĐ 356, và (5) Điểm rủi ro FR-10 (0–100).
4. **Bảo vệ trách nhiệm pháp lý cho chính DPO:**
   * DPO được bảo vệ bởi bằng chứng mật mã (Merkle Root SHA-256): mọi thao tác của DPO chỉ diễn ra trên siêu dữ liệu, loại trừ hoàn toàn rủi ro DPO bị quy trách nhiệm khi có sự cố lộ lọt từ thiết bị cá nhân.
5. **DPO xem gì trên hệ thống?**
   * DPO **KHÔNG XEM** PII thô từ nguồn.
   * DPO **CÓ THỂ XEM** bản xem trước của Snapshot đã được bảo vệ (sau khi đã MASK, REDACT, HMAC) tại Tab "Dữ liệu cho Analyst" để kiểm định chất lượng trước khi bấm Phát hành.
6. **Dữ liệu lưu trữ (Snapshot đích vs CSDL nguồn):**
   * **CSDL nguồn:** DPO không có tài khoản DB/SSH, tuân thủ Quyền tối thiểu (Least Privilege). Worker Engine đọc qua Service Account và xử lý In-Memory trong RAM, tuyệt đối không persist raw PII ra đĩa hay file log.
   * **CSDL đích:** Snapshot áp dụng action đã duyệt. PII đặt `KEEP` theo ngoại lệ được sao chép nguyên giá trị; người có quyền Analyst có thể đọc snapshot đó. Chưa có cơ chế tự thu hồi theo hạn ngoại lệ.
7. **Khoét sâu dữ liệu (Deep Content Inspection) song hành Zero Raw PII:**
   * AI (GLiNER Cascade) đọc sâu vào nội dung văn bản tự do trong RAM để bóc tách thực thể nhạy cảm (Tên, SĐT, CCCD).
   * Tuy nhiên, hệ thống **trừu tượng hóa an toàn**: chỉ báo cáo cho DPO loại thực thể (`PER`, `PHONE`) và tỷ lệ phát hiện (`profile_summary`). DPO kiểm chứng qua Live Sandbox (dữ liệu mẫu giả lập) hoặc Redacted Context Snippet mà không cần tiếp xúc văn bản thô của khách hàng.
8. **Chiến lược 5 hành động Masking (Tại sao không chỉ che `***`?):**
   * **`HMAC` (Hash 1 chiều có salt):** Bảo toàn quan hệ khóa nối (`join_matched`), tránh nổ tích Đề-các (Cartesian join) làm sập DB phân tích.
   * **`REDACT` (Entity-level):** Giữ nguyên ngữ cảnh ngữ pháp cho AI/NLP phân tích ngữ nghĩa và sentiment.
   * **`MASK` (Partial):** Che đoạn giữa (`0912***789`), giữ nguyên đặc trưng thống kê (nhà mạng, domain email, nhóm tuổi).
   * **`DROP`:** Xóa sạch trường thừa thãi rủi ro cao (ảnh CCCD, biometric) để tiết kiệm lưu trữ.
   * **`KEEP`:** Dành cho dữ liệu phi cá nhân; backend hiện cũng cho phép PII theo ngoại lệ có hạn, có nguy cơ lộ giá trị gốc tới Analyst.
   * Downstream Verifier (`sql_verifier.py`, `mongo_verifier.py`) tự động đánh FAIL và chặn phát hành nếu dữ liệu bị mất tính toàn vẹn phân tích.
