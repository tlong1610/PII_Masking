# PIIGuard VN — Brief

**Mã đề:** DATA-06 **Đội:** P-XXX **Ngày:** dd/mm/yyyy

## Bài toán

Ở các SME thương mại điện tử, ví điện tử/fintech nhỏ hay dịch vụ công nghệ, Data team (hoặc nhân sự kiêm DPO) phải rà soát thủ công các bảng và tệp xuất trước khi chia sẻ cho nhóm phân tích hoặc đối tác. PII nằm rải rác, lẫn trong cột ghi chú tự do và cột mất tên (col_7) nên rà thủ công vừa chậm vừa dễ sót, rủi ro vi phạm Luật Bảo vệ dữ liệu cá nhân (91/2025/QH15) và Nghị định 356/2025/NĐ-CP; còn công cụ regex thô thì dương tính giả (mã đơn 12 chữ số giống CCCD) làm che nhầm và hỏng dữ liệu phân tích.

## Người dùng mục tiêu

Vai trò 1: DPO / Data team của SME — cần rà soát PII nhanh, không sót và có bằng chứng tuân thủ trước khi chia sẻ dữ liệu; đo bằng recall/precision trên bộ kiểm thử mock tự sinh (có nhãn sẵn) và thời gian duyệt một bộ dữ liệu.
Vai trò 2: Analyst — cần bản dữ liệu đã che nhưng vẫn join được giữa các bảng; đo bằng tỷ lệ bảng còn join được sau khi che.

## Giải pháp

Một AI Agent tự quét dataset dạng bảng, phát hiện và phân loại PII, đề xuất chính sách masking/tokenization để DPO phê duyệt, sinh bản dữ liệu đã che, cảnh báo tệp rủi ro cao và xuất báo cáo tuân thủ kèm bằng chứng quét lại, theo nguyên tắc "code quyết định, LLM giải thích".

- Bộ phát hiện xác định (regex + luật kiểm tra CCCD, đầu số điện thoại, email, mã số thuế) quét theo cả tên cột lẫn nội dung, chấm điểm tin cậy và tự loại các mẫu dương tính giả.
- Chính sách masking cứng (loại PII × vai trò → giữ/che/băm/tokenize) do code thực thi; token nhất quán để các bảng vẫn join được.
- LLM chỉ đoán loại của cột mơ hồ, gắn cờ PII trong văn bản tự do kèm độ tin cậy và soạn báo cáo; LLM không sửa dữ liệu và chỉ nhận tên cột, mẫu giá trị đã che.
- DPO duyệt mọi phân loại và chính sách (HITL); mọi bước có nhật ký kiểm toán, không chứa giá trị PII thật.
- Bản đã che được quét lại để chứng minh 0 PII định dạng cứng còn sót; verifier đối chiếu mọi con số trong báo cáo.

## Vì sao cần AI

Bắt buộc có LLM ở ba chỗ luật cứng không xử lý được: cột mơ hồ hoặc mất tên, PII lẫn trong văn bản tự do, và soạn báo cáo tuân thủ dễ đọc cho DPO. Phần còn lại là phần mềm thường: phát hiện theo định dạng, masking/hash/tokenize, quét lại, verifier và nhật ký. Tách như vậy để mọi quyết định che dữ liệu kiểm chứng được, chi phí LLM thấp và LLM không đọc toàn bộ dữ liệu.

## Không làm (Non-goals)

- Không để LLM tự quyết định hay sửa dữ liệu; mọi thao tác che do code thực thi.
- Không thay DPO, không đưa kết luận pháp lý; đầu ra là đề xuất và báo cáo để DPO phê duyệt.
- Không dùng dữ liệu cá nhân thật; dữ liệu demo hoàn toàn mock, tự sinh.
- Chỉ xử lý tệp dạng bảng (CSV, XLSX), không xử lý ảnh, PDF, âm thanh.
- Không quét thời gian thực và không triển khai cho người dùng thật; đọc trực tiếp CSDL (chỉ đọc) chỉ làm nếu còn thời gian.

## Đo thành công bằng gì

Đo trong phạm vi MVP, trên bộ kiểm thử mock do đội tự sinh bằng code (biết trước vị trí PII nên có nhãn chuẩn, gồm bộ test giữ kín).

- **Kỹ thuật (phát hiện):** recall 100% cho PII định dạng cứng; precision ≥ 95% trên các cột có bẫy dương tính giả (mã đơn 12 chữ số, mã vận đơn, SKU, timestamp).
- **Kỹ thuật (đầu ra):** 0 PII định dạng cứng còn sót sau khi quét lại bản đã che; 0 số liệu trong báo cáo không khớp kết quả quét.
- **Kinh doanh (proxy trong MVP):** DPO duyệt xong một bộ dữ liệu demo dưới 5 phút; quét bảng khoảng 10.000 dòng dưới 60 giây; 100% bảng vẫn join được sau khi che.

Các chỉ số cần vận hành thật (số vụ sót PII thực tế, giờ công tiết kiệm ở doanh nghiệp, mức độ hài lòng) là kỳ vọng sau MVP, chưa đo ở giai đoạn này.
