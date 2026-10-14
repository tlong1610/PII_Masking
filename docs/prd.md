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
- Là DPO, tôi muốn hệ thống tự động quét dataset để phát hiện và phân loại PII. (P0)
- Là DPO, tôi muốn nhận được đề xuất chính sách che (DROP/MASK/HMAC) phù hợp cho từng trường. (P0)
- Là DPO, tôi muốn tự tay duyệt (HITL) phân loại và chính sách che trước khi hệ thống áp dụng. (P0)
- Là DPO, tôi muốn hệ thống chạy các test downstream tự động để kiểm tra ảnh hưởng của việc che dữ liệu trước khi phát hành. (P1)
- Là DPO, tôi muốn xem log audit đầy đủ của các hành động duyệt/phát hành. (P1)

## 4. Luồng chính (happy path)
1. DPO đăng nhập, chọn dataset cần rà soát.
2. LangGraph Agent quét schema/metadata, phát hiện và phân loại PII.
3. Agent đề xuất chính sách masking/tokenization.
4. DPO rà soát trên màn hình, chỉnh sửa nếu cần và bấm xác nhận duyệt.
5. Hệ thống sinh ra bản sao (Snapshot) đã che dữ liệu ở vùng Staging và chạy Verifier (Downstream tests).
6. DPO xem báo cáo tuân thủ và kết quả Verifier, sau đó bấm "Phát hành" (Publish).
7. Analyst truy cập vào snapshot để làm việc an toàn.

## 5. Human-in-the-loop
Các hành động rủi ro bắt buộc có sự can thiệp của người dùng:
- **Duyệt phân loại & policy che dữ liệu:** DPO phải duyệt từng đề xuất của AI. Màn hình phải tuân thủ tuyệt đối nguyên tắc không lộ giá trị PII thật (No-raw-value UI).
- **Phát hành dữ liệu:** Hệ thống KHÔNG tự động phát hành. DPO phải kiểm tra báo cáo test (Pass/Fail) và tự tay bấm nút Publish, kèm theo lưu log audit đầy đủ.

## 6. Xử lý lỗi & giới hạn
- **LLM lỗi hoặc tốn kém:** Có giới hạn chi phí. Tự động fallback sử dụng regex/rule (tầng 1) khi tắt AI scan; Presidio chưa được tích hợp. Báo lỗi rõ ràng trên UI nếu API LLM sập.
- **Độ chính xác & Downstream:** Nếu Agent phân loại sai dẫn đến hỏng phép liên kết (SQL Join), Downstream test sẽ Fail và chặn luồng phát hành.
- **Giới hạn cứng:** Nghiêm cấm hiển thị raw data PII thật trên giao diện duyệt. Hệ thống chỉ xử lý dựa trên metadata, schema hoặc công cụ ẩn danh.

## 7. Dữ liệu
- **Đầu vào (Thực tế triển khai):** PostgreSQL và MongoDB.
- **Cơ chế che:** Sinh Snapshot Data đã được xử lý (MASK/DROP/HMAC) sang cơ sở dữ liệu hoặc schema đích an toàn.
- **Cam kết:** Chỉ dùng dữ liệu công khai, mock data đã ẩn danh để test/demo. Quét metadata là chính.

## 8. Tech stack (dự kiến)
- **Backend:** Python 3.11, FastAPI, Pydantic, SQLAlchemy, PyMongo.
- **AI/LLM:** LangGraph agent, LLM + Regex/rule + BM25/hybrid (Presidio mới ở mức tham khảo, chưa dùng trong code).
- **Frontend:** React + TypeScript + Vite.
- **Deploy/Lưu trữ:** Docker Compose, Github Actions.

## 9. Known Ambiguities & Scope Deviations
- **Data Source & Masking (Scope Deviation):** Đề bài gốc yêu cầu dùng Data Warehouse (Snowflake/BigQuery) và tính năng Dynamic Masking. Tuy nhiên, để tối ưu tốc độ triển khai MVP, đội quyết định sử dụng PostgreSQL/MongoDB và cơ chế sinh Snapshot tĩnh. Hướng đi này giúp dễ demo và test downstream hơn. Sẽ cân nhắc migrate sang Data Warehouse ở Phase 2.
- **Downstream Testing:** Tính năng tự động kiểm tra tác vụ phân tích (downstream) sau khi che dữ liệu được bổ sung so với đề gốc để tăng tính thực tiễn (tránh việc che xong data không join được nữa).
- **Mức độ nâng cao (Phase 1+):** Tính năng audit log, multi-agent đánh giá rủi ro, và chạy evaluation sẽ được hoàn thiện trong giai đoạn tiếp theo (P1).
