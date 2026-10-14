# PRD — PIIGuard Shield

## 1. Bối cảnh & Mục tiêu
Hệ thống giúp tự động rà soát, phát hiện và phân loại dữ liệu cá nhân (PII) nằm rải rác trong các dataset của doanh nghiệp/hệ thống y tế.
Mục tiêu: Đề xuất chính sách che dữ liệu (masking/tokenization), sinh view/snapshot an toàn, tạo báo cáo tuân thủ nghị định bảo vệ dữ liệu (Luật BV DLCN 2025, Nghị định 356/2025/NĐ-CP & Nghị định 13/2023/NĐ-CP) và đảm bảo dữ liệu đầu ra vẫn dùng được cho các tác vụ phân tích.

## 2. User Personas & Phân quyền

| Vai trò | Mô tả | Mục tiêu chính | Quyền hạn dữ liệu & Thao tác |
|---|---|---|---|
| **DPO** (Data Protection Officer) | Người chịu trách nhiệm rà soát tuân thủ & quản trị dữ liệu | Đánh giá chính xác mức độ rủi ro, phê duyệt chính sách che, kiểm tra toàn vẹn, bảo vệ an toàn pháp lý | **Toàn quyền quản trị:** Quét dataset, **được quyền xem data (sample/raw data & preview)** để đánh giá rủi ro, duyệt/sửa/từ chối policy, kiểm tra downstream verifier, phát hành (Publish) & thu hồi (Revoke) snapshot, xem audit log đầy đủ. |
| **Analyst** (Data Analyst) | Chuyên viên phân tích dữ liệu | Khai thác dữ liệu an toàn phục vụ nghiệp vụ | **Chỉ đọc dữ liệu đã che:** Chỉ truy cập các dataset ở trạng thái `PUBLISHED`. **Tuyệt đối KHÔNG được xem raw PII**, không được xem staging/chính sách nội bộ, không có quyền duyệt hay can thiệp pipeline. |

## 3. User Stories

### DPO
- Là DPO, tôi muốn kết nối linh hoạt tới các cơ sở dữ liệu **PostgreSQL và MongoDB lưu trữ trên Cloud** (Cloud SQL, AWS RDS, Supabase, Neon, MongoDB Atlas) thông qua Connection URL.
- Là DPO, tôi muốn xem sơ đồ quan hệ trực quan (**Source Scope Picker Diagram**) với layout tự động để chọn đúng phạm vi bảng/collection cần quét.
- Là DPO, tôi muốn hệ thống tự động quét và phân loại PII (L1/L2/L3) dựa trên Rules/Regex và AI/LLM.
- **Là DPO, tôi muốn xem dữ liệu (sample data / split view) để đánh giá rủi ro chính xác**, thẩm định các trường nhạy cảm hoặc trường mơ hồ (`UNKNOWN`) trước khi chốt chính sách.
- Là DPO, tôi muốn có Drawer điều chỉnh chính sách chi tiết cho từng cột: xem căn cứ pháp lý, tự động đồng bộ hành động cho khóa nối (Join Keys), xác nhận trường Non-PII kèm lý do, hoặc thiết lập thời hạn ngoại lệ (`exceptionUntil`) nếu tạm giữ nguyên PII.
- Là DPO, tôi muốn xem sơ đồ **ERD Lineage Diagram** thể hiện rõ kiểu biến đổi (MASK, HMAC, DROP, KEEP) và quan hệ khóa chính/khóa ngoại của snapshot được sinh ra.
- Là DPO, tôi muốn kiểm tra kết quả downstream verifier và điểm rủi ro tất định (Deterministic Risk Score 0–100) trước khi bấm "Phát hành" (Publish).
- Là DPO, tôi muốn theo dõi sổ cái kiểm toán bất biến (**Hash-Chain Merkle Root SHA-256**) để chứng minh tính toàn vẹn khi kiểm toán.

### Analyst
- Là Analyst, tôi muốn xem danh sách các dataset đã được DPO duyệt và phát hành (`PUBLISHED`).
- Là Analyst, tôi muốn xem preview dữ liệu theo từng bảng với tùy chọn giới hạn dòng (20, 50, 100, 200 dòng) mà hoàn toàn không lộ PII thô.
- Là Analyst, tôi muốn xem sơ đồ ERD của dataset đã xử lý để hiểu quan hệ giữa các bảng phục vụ viết truy vấn phân tích.
- Là Analyst, tôi muốn xuất dữ liệu an toàn ra file CSV (tự động loại bỏ cột `DROPPED` và giữ nguyên định dạng đã che).

## 4. Luồng Chính (Happy Path)

1. **Kết nối & Chọn phạm vi (Scope Selection):**
   - DPO chọn hoặc thêm mới nguồn **Cloud PostgreSQL / MongoDB** (hỗ trợ `postgresql://`, `mongodb+srv://`).
   - Hệ thống đọc introspection schema; DPO quan sát sơ đồ quan hệ trực quan trên `SourceScopePickerDiagram` và chọn các bảng/collection cần quét.
   - Snapshot chỉ chứa các bảng đã quét. Nếu bỏ bảng cha hoặc bảng trung gian (N–N), hệ thống cảnh báo và cho thêm bảng đó dạng **bảng liên kết** (chỉ giữ khóa nối dạng HMAC, cột khác DROP) để Analyst vẫn JOIN được; liên kết bị cắt được ghi audit.
2. **Quét & Phân loại PII:**
   - Scanner quét metadata, thống kê và pattern; rule engine chạy mặc định, LLM hỗ trợ phân loại nâng cao khi được kích hoạt.
   - Hệ thống đề xuất hành động: `MASK` (che một phần/toàn phần), `HMAC` (băm một chiều cho khóa nối), `DROP` (loại bỏ trường rủi ro/không cần thiết), `KEEP` (giữ nguyên cho dữ liệu phi cá nhân hoặc ngoại lệ).
3. **DPO Đánh giá rủi ro & Phê duyệt (HITL Review):**
   - DPO truy cập Workspace với 5 Tab chức năng:
     - *Overview & PII Schema:* Bảng danh sách cột, phân loại NĐ 13, sàn bảo mật tối thiểu, hành động đề xuất.
     - *Sample Data:* **DPO xem dữ liệu mẫu thực tế** để đánh giá rủi ro, đối chiếu giữa dữ liệu trước và sau khi áp dụng che mờ.
     - *Permissions & Grants:* Xem và kiểm soát quyền truy cập RBAC.
     - *Audit History & Hash-Chain:* Kiểm chứng chuỗi băm Merkle Root.
     - *Risk & Insights:* Theo dõi điểm rủi ro hệ thống (FR-10) và tỷ lệ bảo vệ L2/L3.
   - DPO mở Inspector Drawer để tinh chỉnh chính sách từng cột: ghi đè action (bắt buộc nhập lý do), đồng bộ khóa nối, chuyển `UNKNOWN` thành Non-PII, hoặc đặt hạn chót ngoại lệ.
4. **Xây dựng Protected Snapshot & Downstream Verification:**
   - Hệ thống thực thi transform pipeline sinh bản sao dữ liệu an toàn ở vùng Staging.
   - Downstream Verifier chạy các bài test kiểm tra tính toàn vẹn (SQL JOIN, `$lookup`, aggregate) nhằm đảm bảo việc che mờ không làm gãy logic phân tích.
5. **Phát hành (Publish):**
   - DPO xem báo cáo Verifier Pass/Fail. Chỉ khi Pass, DPO mới kích hoạt nút "Phát hành" (Publish).
6. **Analyst Khai thác:**
   - Analyst đăng nhập, xem dataset đã publish qua Data Grid, ERD Diagram, hoặc tải file CSV đã được bảo vệ an toàn.

## 5. Nguyên Tắc Quản Trị & Bảo Mật Dữ Liệu

- **Nguyên tắc bất di bất dịch đối với DPO:**
  - DPO là người chịu trách nhiệm pháp lý cao nhất về bảo vệ dữ liệu. **DPO CÓ QUYỀN XEM DATA (Sample data / Preview / Split view)** trong quá trình review để đánh giá đúng mức độ rủi ro, xác thực các trường dữ liệu mơ hồ (`UNKNOWN`) và quyết định phương án che mờ tối ưu.
- **Nguyên tắc bất di bất dịch đối với Analyst:**
  - **Zero Raw-PII cho Analyst:** Analyst tuyệt đối không bao giờ được tiếp cận giá trị PII gốc. Toàn bộ dữ liệu hiển thị cho Analyst bắt buộc phải qua xử lý (MASK, HMAC, DROP).
- **Human-in-the-Loop (HITL):**
  - AI chỉ đóng vai trò khuyến nghị. Không có bất kỳ thay đổi nào được tự động áp dụng hoặc phát hành nếu chưa có xác nhận và chữ ký phê duyệt của DPO.
- **Đồng bộ khóa nối (Join Key Integrity):**
  - Hai đầu của một quan hệ khóa nối (PK/FK hoặc `$lookup`) bắt buộc phải áp dụng cùng hành động (`HMAC` hoặc `KEEP`). Không được phép áp dụng `MASK` hoặc `DROP` làm phá vỡ khả năng join của Analyst.

## 6. Xử lý Lỗi & Giới Hạn

- **LLM lỗi hoặc hết quota:** Rules/regex là nền tảng cốt lõi luôn chạy độc lập. Nếu LLM gặp sự cố, các trường mơ hồ sẽ được gán nhãn `REVIEW_REQUIRED` để DPO tự tay thẩm định dữ liệu và ra quyết định qua Drawer.
- **Lệch khóa nối / Hỏng Downstream:** Nếu chính sách của DPO làm sai lệch kết quả join hoặc aggregate vượt ngưỡng sai số cho phép, Verifier sẽ đánh dấu FAIL và chặn không cho phát hành.
- **Bảo mật kết nối:** Tuyệt đối không trả mật khẩu, URI thô chứa credential hoặc khóa HMAC bí mật ra ngoài giao diện frontend.

## 7. Cơ Sở Dữ Liệu & Hạ Tầng

- **Data Source Đầu Vào:**
  - **PostgreSQL trên Cloud** (AWS RDS, GCP Cloud SQL, Supabase, Neon...) qua URL `postgresql://` hoặc `postgres://`.
  - **MongoDB trên Cloud** (MongoDB Atlas, Self-hosted Cloud Replica Set) qua URI `mongodb://` hoặc `mongodb+srv://`.
- **Cơ chế che:** Sinh Snapshot Data vật lý đã được xử lý (MASK/DROP/HMAC) sang database hoặc schema đích an toàn.
- **Frontend Architecture:**
  - React 18+, TypeScript strict, Vite, MUI.
  - Sơ đồ tương tác: `@xyflow/react` (React Flow) kết hợp thuật toán bố cục `dagre`.
  - State Management: TanStack Query cho server state, React Hook Form + Zod cho form validation.
