# PRD — PIIGuard Shield

**Mã đề:** DATA-06 · **Đội:** P-138 · **Chương trình:** VinUni AI20K Build Phase — Cohort 4
**Trạng thái:** PRD và báo cáo nghiệm thu P1; các số liệu/chức năng cần đối chiếu với code và CI hiện tại

> Giới hạn bảo mật hiện tại: backend cho phép ngoại lệ `KEEP` cho PII với lý do và hạn. `KEEP` sao chép giá trị gốc vào snapshot; Analyst được phép xem snapshot đã publish. Do đó Zero Raw PII là mục tiêu, chưa phải bảo đảm tuyệt đối. Hạn ngoại lệ được kiểm tra khi lưu quyết định; tài liệu này không xác nhận có job tự động thu hồi snapshot khi hạn kết thúc.

---

## 1. Bối cảnh & Mục tiêu

Hệ thống giúp tự động rà soát, phát hiện và phân loại dữ liệu cá nhân (PII) nằm rải rác trong các dataset của doanh nghiệp/hệ thống y tế.
Mục tiêu: Đề xuất chính sách che dữ liệu (masking/redaction/tokenization), sinh snapshot an toàn sang CSDL đích riêng biệt, tạo báo cáo tuân thủ nghị định bảo vệ dữ liệu (Luật 91/2025/QH15, Nghị định 356/2025/NĐ-CP & Nghị định 13/2023/NĐ-CP) và đảm bảo dữ liệu đầu ra vẫn dùng được cho các tác vụ phân tích đã kiểm định.

---

## 2. User Personas & Phân quyền

| Vai trò | Mô tả | Mục tiêu chính | Quyền hạn dữ liệu & Thao tác |
|---|---|---|---|
| **DPO** (Data Protection Officer) | Người chịu trách nhiệm rà soát tuân thủ & quản trị an toàn dữ liệu | Đánh giá rủi ro và phê duyệt cách xử lý | Quét dataset, review metadata/thống kê và protected preview, duyệt policy, verifier, publish/revoke. DPO UI không render raw source values; PII `KEEP` exception có thể được đưa vào snapshot cho Analyst. |
| **Analyst** (Data Analyst) | Chuyên viên phân tích dữ liệu | Khai thác dữ liệu an toàn phục vụ nghiệp vụ | **Chỉ đọc dữ liệu đã che:** Chỉ truy cập các dataset ở trạng thái `PUBLISHED`. **Tuyệt đối KHÔNG được xem raw PII**, không được xem staging/chính sách nội bộ, không có quyền duyệt hay can thiệp pipeline. |

---

## 3. User Stories

### DPO
- Là DPO, tôi muốn kết nối linh hoạt tới các cơ sở dữ liệu **PostgreSQL và MongoDB lưu trữ trên Cloud** (Cloud SQL, AWS RDS, Supabase, Neon, MongoDB Atlas) thông qua Connection URL.
- Là DPO, tôi muốn xem sơ đồ quan hệ trực quan (**Source Scope Picker Diagram**) với layout tự động (`dagre`) để chọn đúng phạm vi bảng/collection cần quét.
- Là DPO, tôi muốn hệ thống tự động quét và phân loại PII (L1/L2/L3) kết hợp Rules/Regex baseline và AI/LLM phân loại nâng cao qua thống kê phân phối (`column_stats.py`).
- Là DPO, tôi muốn thẩm định rủi ro mà không render raw source values trong workspace (xem kiểu dữ liệu, data shape, thống kê và mức rủi ro FR-10).
- Là DPO, tôi muốn có Inspector Drawer điều chỉnh chính sách chi tiết cho từng cột: xem căn cứ pháp lý, tự động đồng bộ hành động cho khóa nối (Join Keys), xác nhận trường Non-PII kèm lý do, hoặc thiết lập thời hạn ngoại lệ (`exceptionUntil`).
- Là DPO, tôi muốn hệ thống tự động cảnh báo khi bỏ bảng cha/trung gian và hỗ trợ thêm **bảng liên kết** (`link_scope`) để giữ khóa nối HMAC, giúp Analyst vẫn JOIN được mà không lộ thêm PII.
- Là DPO, tôi muốn kiểm tra kết quả Downstream Verifier (SQL JOIN / MongoDB `$lookup`) và điểm rủi ro tất định (Deterministic Risk Score 0–100) trước khi phát hành (Publish).
- Là DPO, tôi muốn theo dõi sổ cái kiểm toán bất biến (**Hash-Chain Merkle Root SHA-256**) với diễn giải hành động ngôn ngữ tự nhiên và nhóm theo ngày.
- Là DPO, tôi muốn có màn hình **Demo Che mờ** (`/dpo/masking`) với Live Sandbox để thử nghiệm trực quan các kỹ thuật MASK, REDACT, HMAC, DROP và ma trận quy định NĐ 13 (`/dpo/rules`).

### Analyst
- Là Analyst, tôi muốn xem danh sách các dataset đã được DPO duyệt và phát hành (`PUBLISHED`).
- Là Analyst, tôi muốn xem preview dữ liệu theo từng bảng với tùy chọn phân trang (20, 50, 100, 200 dòng) mà hoàn toàn không lộ PII thô.
- Là Analyst, tôi muốn xem sơ đồ ERD của dataset đã xử lý để hiểu quan hệ giữa các bảng phục vụ viết truy vấn phân tích.
- Là Analyst, tôi muốn xuất dữ liệu an toàn ra file CSV (tự động loại bỏ cột `DROPPED` và giữ nguyên định dạng đã che).

---

## 4. Luồng Chính (Happy Path)

1. **Kết nối & Chọn phạm vi (Scope Selection):**
   - DPO chọn hoặc thêm mới nguồn **Cloud PostgreSQL / MongoDB** (hỗ trợ `postgresql://`, `mongodb+srv://`).
   - Hệ thống đọc introspection schema; DPO quan sát sơ đồ quan hệ trực quan trên `SourceScopePickerDiagram` và chọn các bảng/collection cần quét.
   - Snapshot chỉ chứa các bảng đã quét. Nếu bỏ bảng cha hoặc bảng trung gian (N–N), hệ thống cảnh báo `ScopeLinkWarnings` và cho thêm bảng đó dạng **bảng liên kết** (chỉ giữ khóa nối dạng HMAC, cột khác DROP) để Analyst vẫn JOIN được; liên kết bị cắt được ghi audit.
2. **Quét & Phân loại PII:**
   - Scanner quét metadata, thống kê phân phối và pattern; rule engine chạy mặc định, LLM hỗ trợ phân loại nâng cao khi `ENABLE_AI_SCAN=true`.
   - Cột văn bản tự do chạy cascade NER: Regex $\rightarrow$ FlashText Dict $\rightarrow$ GLiNER Zero-Shot (`urchade/gliner_multi_pii-v1`) đề xuất `REDACT`.
   - Hệ thống đề xuất hành động: `MASK` (che một phần/toàn phần), `REDACT` (thay thế thực thể PII trong câu), `HMAC` (băm một chiều cho khóa nối), `DROP` (loại bỏ trường rủi ro/không cần thiết), `KEEP` (giữ nguyên cho dữ liệu phi cá nhân hoặc ngoại lệ).
3. **DPO Đánh giá rủi ro & Phê duyệt (HITL Review):**
   - DPO truy cập Workspace với 4 Tab chức năng:
     - *Tab 0 — Tổng quan & phân loại PII:* Bảng danh sách cột, phân loại NĐ 13, sàn bảo mật tối thiểu, hành động đề xuất.
     - *Tab 1 — Rủi ro & đánh giá:* Điểm rủi ro hệ thống (FR-10 Deterministic Risk Score 0–100), tỷ lệ bảo vệ L2/L3, phân bổ hành động.
     - *Tab 2 — Nhật ký kiểm toán:* Kiểm chứng chuỗi băm Merkle Root SHA-256 gắn với Run.
     - *Tab 3 — Dữ liệu cho Analyst:* Báo cáo kết quả kiểm định Downstream Verifier và bảng Preview của snapshot đã che.
   - DPO mở Inspector Drawer để tinh chỉnh chính sách từng cột: ghi đè action (bắt buộc nhập lý do), đồng bộ khóa nối, chuyển `UNKNOWN` thành Non-PII, hoặc đặt hạn chót ngoại lệ.
4. **Xây dựng Protected Snapshot & Downstream Verification:**
   - Hệ thống thực thi transform pipeline sinh bản sao dữ liệu an toàn sang CSDL đích riêng biệt (`piiguard_snapshot_db` / `prod_db_protected`).
   - Downstream Verifier chạy các bài test kiểm tra tính toàn vẹn (SQL JOIN, `$lookup`, aggregate) nhằm đảm bảo việc che mờ không làm gãy logic phân tích.
5. **Phát hành (Publish) & Thu hồi (Revoke):**
   - DPO xem báo cáo Verifier Pass/Fail. Chỉ khi Pass, DPO mới kích hoạt nút "Phát hành" (Publish). Khi phát hành, hệ thống tự động cấp quyền cho mọi Analyst.
   - Nếu cần điều chỉnh, DPO chọn "Thu hồi" (Revoke): backend thu hồi snapshot và cập nhật trạng thái run để có thể xử lý lại. Catalog Explorer FE-13 chưa được xác nhận là UI hiện hành.
6. **Analyst Khai thác:**
   - Analyst đăng nhập, xem dataset đã publish qua Data Grid, ERD Diagram, hoặc tải file CSV đã được bảo vệ an toàn.

---

## 5. Nguyên Tắc Quản Trị & Bảo Mật Dữ Liệu

- **Giới hạn Zero Raw PII:**
  - DPO UI không render raw source values. Analyst chỉ đọc snapshot đã publish, nhưng PII được duyệt `KEEP` theo ngoại lệ có thể nằm nguyên giá trị trong snapshot. Không mô tả đây là Zero Raw PII tuyệt đối.
  - Prompt gửi tới LLM chỉ chứa tên bảng, tên cột, kiểu dữ liệu và tỷ lệ phân phối định tính từ `column_stats.py`; tuyệt đối không gửi `sample_value`.
- **Human-in-the-Loop (HITL):**
  - AI chỉ đóng vai trò khuyến nghị. Không có bất kỳ thay đổi nào được tự động áp dụng hoặc phát hành nếu chưa có xác nhận và phê duyệt của DPO.
  - Một số pipeline dùng bộ nhớ HITL; cách lưu/áp dụng phụ thuộc cấu hình và cần xem AI Architecture trước khi bật.
- **Đồng bộ khóa nối (Join Key Integrity):**
  - Hai đầu của một quan hệ khóa nối (PK/FK hoặc `$lookup`) bắt buộc phải áp dụng cùng hành động (`HMAC` hoặc `KEEP`). Không được phép áp dụng `MASK` hoặc `DROP` làm phá vỡ khả năng join của Analyst.

---

## 6. Xử lý Lỗi & Giới Hạn

- **LLM lỗi hoặc hết quota:** Rules/regex là nền tảng cốt lõi luôn chạy độc lập. Nếu LLM gặp sự cố, các trường mơ hồ sẽ được gán nhãn `REVIEW_REQUIRED` / `UNKNOWN` với proposal an toàn (`MASK`) để DPO tự tay thẩm định và ra quyết định qua Drawer.
- **Lệch khóa nối / Hỏng Downstream:** Nếu chính sách của DPO làm sai lệch kết quả join hoặc aggregate vượt ngưỡng sai số cho phép, Verifier sẽ đánh dấu FAIL và chặn không cho phát hành.
- **Bảo mật kết nối:** Tuyệt đối không trả mật khẩu, URI thô chứa credential hoặc khóa HMAC bí mật ra ngoài giao diện frontend.

---

## 7. Cơ Sở Dữ Liệu & Hạ Tầng

- **Data Source Đầu Vào:**
  - **PostgreSQL trên Cloud** (AWS RDS, GCP Cloud SQL, Supabase, Neon...) qua URL `postgresql://` hoặc `postgres://`.
  - **MongoDB trên Cloud** (MongoDB Atlas, Self-hosted Cloud Replica Set) qua URI `mongodb://` hoặc `mongodb+srv://`.
- **Cơ chế che:** Sinh Snapshot Data vật lý đã được xử lý (MASK/REDACT/DROP/HMAC) sang database hoặc schema đích an toàn riêng biệt.
- **Frontend Architecture:**
  - React 18+, TypeScript strict, Vite, MUI.
  - Sơ đồ tương tác: `@xyflow/react` (React Flow) kết hợp thuật toán bố cục `dagre`.
  - State Management: TanStack Query cho server state, React Hook Form + Zod cho form validation.
