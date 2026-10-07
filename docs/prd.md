# PRD — PIIGuard Shield

## 1. Bối cảnh & Mục tiêu
Hệ thống giúp tự động rà soát, phát hiện và phân loại dữ liệu cá nhân (PII) nằm rải rác trong các dataset của doanh nghiệp/hệ thống y tế.
Mục tiêu: Đề xuất chính sách che dữ liệu (masking/tokenization), sinh view dữ liệu an toàn, tạo báo cáo tuân thủ nghị định bảo vệ dữ liệu và cảnh báo các dataset rủi ro cao.

## 2. User personas
| Vai trò | Mô tả | Mục tiêu chính | Quyền hạn |
|---|---|---|---|
| DPO | Người rà soát tuân thủ | Đảm bảo không lộ PII thật, quản trị nghiêm ngặt, audit đầy đủ | Quét dataset, duyệt phân loại & policy, phát hành view masked, xem báo cáo tuân thủ |
| Analyst | Chuyên viên phân tích | Dùng dữ liệu để phân tích | Chỉ xem được các view dữ liệu đã được che an toàn (masked view) |

## 3. User stories
- Là DPO, tôi muốn hệ thống (Agent) tự động quét dataset để phát hiện và phân loại PII (CMND, SĐT...). (P0)
- Là DPO, tôi muốn nhận được đề xuất chính sách che (masking/tokenization) phù hợp cho từng trường dữ liệu. (P0)
- Là DPO, tôi muốn tự tay duyệt (HITL) phân loại và chính sách che trước khi hệ thống áp dụng, để đảm bảo tính chính xác. (P0)
- Là DPO, tôi muốn hệ thống sinh ra View dữ liệu đã che và Báo cáo tuân thủ sau khi tôi duyệt. (P0)
- Là DPO, tôi muốn xem log audit đầy đủ của các hành động duyệt/phát hành. (P1 - Nâng cao)

## 4. Luồng chính (happy path)
1. DPO đăng nhập, chọn dataset cần rà soát.
2. LangGraph Agent quét schema/metadata, phát hiện và phân loại PII.
3. Agent đề xuất chính sách masking/tokenization phù hợp.
4. DPO rà soát trên màn hình, chỉnh sửa nếu cần và bấm xác nhận duyệt.
5. Hệ thống áp dụng chính sách, sinh ra view đã che dữ liệu (masked view) và tạo báo cáo tuân thủ.
6. Analyst truy cập vào masked view để làm việc an toàn.

## 5. Human-in-the-loop
Các hành động rủi ro bắt buộc có sự can thiệp của người dùng:
- **Duyệt phân loại & policy che dữ liệu:** DPO phải tự tay duyệt từng đề xuất của AI. *Trải nghiệm:* Màn hình hiển thị danh sách các thay đổi. Tuân thủ tuyệt đối nguyên tắc không lộ giá trị PII thật ra ngoài (chỉ dùng metadata hoặc mock).
- **Áp dụng chính sách (Sinh masked view):** Hệ thống KHÔNG tự động áp dụng masking. DPO phải bấm "Áp dụng & Sinh View" kèm theo hệ thống lưu log audit đầy đủ về hành động này.

## 6. Xử lý lỗi & giới hạn
- **LLM lỗi hoặc tốn kém:** Có giới hạn chi phí khi quét bảng lớn. Tự động kết hợp/fallback sử dụng regex/NER (Presidio) để phát hiện PII. Báo lỗi rõ ràng trên UI nếu API LLM sập.
- **Độ chính xác:** Nếu Agent phát hiện pattern lạ nhưng không chắc chắn, phải đánh dấu cảnh báo rủi ro cao để DPO xem xét thủ công kỹ hơn.
- **Giới hạn cứng:** Nghiêm cấm hiển thị raw data PII thật trên giao diện duyệt (UI). Hệ thống chỉ xử lý dựa trên metadata, schema hoặc công cụ ẩn danh để tránh vi phạm chéo.

## 7. Dữ liệu
- **Đầu vào:** Dataset từ các nguồn (Snowflake/BigQuery hoặc Postgres/Mongo).
- **Cam kết:** Chỉ dùng dữ liệu công khai, mock data đã ẩn danh để test/demo. Quét metadata là chính để đảm bảo hiệu năng.

## 8. Tech stack (dự kiến)
- **Backend:** FastAPI.
- **AI/LLM:** LangGraph agent, LLM + Regex/NER (Presidio), Vector DB (lưu pattern).
- **Frontend:** React.
- **Deploy/Lưu trữ:** Docker + Cloud Run, Hashing/Tokenization vault.

## 9. Known Ambiguities
- **Mức độ nâng cao (Multi-agent & Eval):** Đề bài có nhắc đến tính năng nâng cao: multi-agent đánh giá rủi ro, tự học pattern tiếng Việt và eval đo precision/recall. Hiện chưa chốt sẽ làm ngay trong Phase 1 (MVP) hay đẩy sang Phase 2. Sẽ chốt sau khi hoàn thành luồng cơ bản.
