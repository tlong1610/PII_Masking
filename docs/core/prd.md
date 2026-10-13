# PRD — PIIGuard Shield

## 1. Bối cảnh & Mục tiêu
Hệ thống giúp tự động rà soát, phát hiện và phân loại dữ liệu cá nhân (PII) nằm rải rác trong các dataset của doanh nghiệp/hệ thống y tế.
Mục tiêu: Đề xuất chính sách che dữ liệu (masking/tokenization), sinh view/snapshot an toàn, tạo báo cáo tuân thủ nghị định bảo vệ dữ liệu và đảm bảo dữ liệu đầu ra vẫn dùng được cho các tác vụ phân tích.

## 2. User personas
| Vai trò | Mô tả | Mục tiêu chính | Quyền hạn |
|---|---|---|---|
| DPO | Người rà soát tuân thủ | Đảm bảo không lộ PII thật, quản trị nghiêm ngặt, audit đầy đủ | Quét dataset, duyệt phân loại & policy, kiểm tra downstream, phát hành snapshot |
| Analyst | Chuyên viên phân tích | Dùng dữ liệu để phân tích | Chỉ xem được các dataset/snapshot đã được che an toàn |

## 3. User stories
- Là DPO, tôi muốn hệ thống tự động quét dataset để phát hiện và phân loại PII. (đã có)
- Là DPO, tôi muốn nhận được đề xuất chính sách che (DROP/MASK/HMAC) phù hợp cho từng trường. (đã có)
- Là DPO, tôi muốn tự tay duyệt (HITL) phân loại và chính sách che trước khi hệ thống áp dụng. (đã có)
- Là DPO, tôi muốn hệ thống chạy downstream verifier trước khi phát hành. (đã có, P1 cần quét sâu edge cases trong dataset hiện có)
- Là DPO, tôi muốn audit/eval/report đủ bằng chứng để review P1. (P1 control)

## 4. Luồng chính (happy path)
1. DPO đăng nhập, chọn dataset cần rà soát.
2. Scanner quét schema/metadata/statistics; rules chạy mặc định, LangGraph/LLM chỉ hỗ trợ khi `ENABLE_AI_SCAN=true`.
3. Hệ thống đề xuất chính sách MASK/HMAC/DROP/KEEP.
4. DPO rà soát trên màn hình, chỉnh sửa nếu cần và bấm xác nhận duyệt.
5. Hệ thống sinh ra bản sao (Snapshot) đã che dữ liệu ở vùng Staging và chạy Verifier (Downstream tests).
6. DPO xem báo cáo tuân thủ và kết quả Verifier, sau đó bấm "Phát hành" (Publish).
7. Analyst truy cập vào snapshot để làm việc an toàn.

## 5. Human-in-the-loop
Các hành động rủi ro bắt buộc có sự can thiệp của người dùng:
- **Duyệt phân loại & policy che dữ liệu:** DPO phải duyệt từng đề xuất của AI. Màn hình phải tuân thủ tuyệt đối nguyên tắc không lộ giá trị PII thật (No-raw-value UI).
- **Phát hành dữ liệu:** Hệ thống KHÔNG tự động phát hành. DPO phải kiểm tra báo cáo test (Pass/Fail) và tự tay bấm nút Publish, kèm theo lưu log audit đầy đủ.

## 6. Xử lý lỗi & giới hạn
- **LLM lỗi hoặc tốn kém:** Có giới hạn chi phí. Rules/regex là baseline mặc định; LLM chỉ là nhánh optional. Nếu API LLM sập, field mập mờ được đưa về proposal an toàn để DPO duyệt, không chặn toàn bộ luồng nếu scan vẫn hoàn tất.
- **Độ chính xác & Downstream:** Nếu Agent phân loại sai dẫn đến hỏng phép liên kết (SQL Join), Downstream test sẽ Fail và chặn luồng phát hành.
- **Giới hạn cứng:** Nghiêm cấm hiển thị raw data PII thật trên giao diện duyệt. Hệ thống chỉ xử lý dựa trên metadata, schema hoặc công cụ ẩn danh.

## 7. Dữ liệu
- **Đầu vào (Thực tế triển khai):** PostgreSQL và MongoDB.
- **Cơ chế che:** Sinh Snapshot Data đã được xử lý (MASK/DROP/HMAC) sang cơ sở dữ liệu hoặc schema đích an toàn.
- **Cam kết:** Chỉ dùng dữ liệu công khai, mock data đã ẩn danh để test/demo. Quét metadata là chính.

## 8. Tech stack (dự kiến)
- **Backend:** Python 3.11, FastAPI, Pydantic, SQLAlchemy, PyMongo.
- **AI/LLM:** Rules/regex + BM25/hybrid; LangGraph/LLM optional với provider fallback OpenRouter → OpenAI → Gemini; không dùng Presidio trong source hiện tại.
- **Frontend:** React + TypeScript + Vite.
- **Deploy/Lưu trữ:** Docker Compose, Github Actions.

## 9. Known Ambiguities & Scope Deviations
- **Data Source & Masking (Scope Deviation):** Đề bài gốc yêu cầu dùng Data Warehouse (Snowflake/BigQuery) và tính năng Dynamic Masking. Team chọn PostgreSQL/MongoDB và cơ chế sinh Snapshot tĩnh để giữ app chạy thật, dễ demo và test downstream. Sẽ cân nhắc migrate sang Data Warehouse ở Phase 2.
- **Downstream Testing:** Tính năng tự động kiểm tra tác vụ phân tích (downstream) sau khi che dữ liệu được bổ sung so với đề gốc để tăng tính thực tiễn (tránh việc che xong data không join được nữa).
- **Mức độ nâng cao (Phase 1+):** Quét sâu hơn các field/value patterns trong PostgreSQL/MongoDB hiện có, hỗ trợ gateway OpenAI-compatible tùy chỉnh (`OPENAI_BASE_URL`) và hoàn thiện audit/evaluation. Không ưu tiên mở thêm cấu trúc dữ liệu mới trong P1.
