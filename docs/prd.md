# PRD — PIIGuard VN

> Mã đề DATA-06 · Đội P-XXX · Cập nhật: dd/mm/yyyy
> PRD là context mà agent và cả đội đọc mỗi ngày. Khi đổi hướng (stack, luồng, chỉ số), sửa PRD trong cùng PR với code.

## 1. Bối cảnh & Mục tiêu

**Bối cảnh.** Doanh nghiệp vừa và nhỏ (SME) trong lĩnh vực thương mại điện tử, ví điện tử/fintech nhỏ hoặc dịch vụ công nghệ có kho dữ liệu khách hàng và nhân viên dạng bảng (CSV, Excel, tệp xuất từ cơ sở dữ liệu) nhưng không có bộ phận chuyên trách về bảo vệ dữ liệu. Việc rà soát dữ liệu cá nhân trước khi chia sẻ cho nhóm phân tích hoặc đối tác do Data team hoặc nhân sự kiêm nhiệm DPO làm thủ công.

Dữ liệu cá nhân (CCCD/CMND, số điện thoại, email, mã số thuế, ngày sinh…) nằm rải rác trong nhiều bảng và tệp xuất, và không chỉ ở các cột có tên rõ ràng mà còn lẫn trong cột ghi chú tự do, cột mất tên (col_7) hoặc tệp xuất cũ. Rà thủ công vừa chậm vừa dễ sót; sót PII nghĩa là chia sẻ dữ liệu chưa che, rủi ro vi phạm Luật Bảo vệ dữ liệu cá nhân (91/2025/QH15, hiệu lực 01/01/2026) và Nghị định 356/2025/NĐ-CP. Ngược lại, công cụ regex thô dễ dương tính giả (mã đơn hàng 12 chữ số giống CCCD), làm che nhầm và hỏng dữ liệu phân tích.

**Mục tiêu sản phẩm.** Chuyển việc rà soát PII từ thủ công, khó đo lường thành quy trình kiểm chứng được, theo nguyên tắc "code quyết định, LLM giải thích":

- Phát hiện, phân loại và che PII do code thực thi, đo được bằng precision/recall.
- LLM chỉ suy đoán cột mơ hồ, gắn cờ văn bản tự do và soạn báo cáo; không tự sửa dữ liệu.
- DPO phê duyệt mọi phân loại và chính sách (HITL); bản đã che luôn kèm bằng chứng quét lại.
- Token nhất quán để các bảng đã che vẫn join được.

**Chỉ số thành công (đo trong phạm vi MVP).** Đo trên bộ kiểm thử có nhãn (Gold set) gồm 4–5 bảng mock tự sinh (khách hàng, đơn hàng, ghi chú hỗ trợ, nhân viên, tệp mất tên cột), có cả các mẫu bẫy dương tính giả. Sinh hai bộ với seed và khuôn mẫu khác nhau (bộ dev để chỉnh luật, bộ test giữ kín để báo cáo), cộng bộ nhỏ 100–200 ô viết tay để kiểm tra độ tổng quát.

| Nhóm                   | Chỉ số                       | Mục tiêu                                                                                                                            | Cách đo                                                                                   |
| ---------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Kỹ thuật               | Recall PII định dạng cứng    | 100% trên bộ test tự sinh với CCCD, CMND, SĐT, email, MST, ngày sinh; kết quả trên bộ viết tay báo cáo riêng                        | Bộ test giữ kín                                                                           |
| Kỹ thuật               | Precision                    | ≥ 95%                                                                                                                               | Các cột có bẫy dương tính giả (mã đơn 12 chữ số, mã vận đơn, SKU, timestamp, số tiền lớn) |
| Kỹ thuật               | Name-agnostic detection      | ≥ 95% PII định dạng cứng                                                                                                            | Cột bị đổi tên (col_1…col_n) hoặc PII nằm trong cột ghi chú                               |
| Kỹ thuật               | Post-masking scan            | 0 PII định dạng cứng còn sót; masking đúng 100% theo bảng chính sách; token nhất quán; chạy lại cho kết quả giống nhau (idempotent) | Quét lại bản đã che                                                                       |
| Kỹ thuật               | Hallucination                | 0 số liệu trong báo cáo không khớp kết quả quét                                                                                     | Verifier chặn; LLM không tự tạo hay sửa dữ liệu                                           |
| Kỹ thuật               | Hiệu năng quét               | Bảng khoảng 10.000 dòng dưới 60 giây                                                                                                | Đo lại khi demo                                                                           |
| Kỹ thuật (nâng cao)    | Văn bản tự do (tên, địa chỉ) | Recall ≥ 80% (tham khảo, không cam kết 100%)                                                                                        | Luôn hiển thị kèm độ tin cậy; phát hiện dưới ngưỡng chuyển DPO duyệt                      |
| Kinh doanh (proxy MVP) | Time-to-Review               | DPO duyệt xong một bộ dữ liệu demo dưới 5 phút                                                                                      | Đo trong kịch bản demo end-to-end                                                         |
| Kinh doanh (proxy MVP) | Khả năng join sau khi che    | 100% bảng trong Gold set còn join được                                                                                              | Join thử các bảng đã che                                                                  |

Các chỉ số cần vận hành thật (số vụ sót PII thực tế, giờ công tiết kiệm ở doanh nghiệp, mức độ hài lòng) là kỳ vọng sau MVP, chưa đo ở giai đoạn này.

## 2. User personas

| Vai trò         | Mô tả                                                                                                            | Mục tiêu chính                                                                     | Quyền hạn                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DPO / Data team | Người của SME chịu trách nhiệm rà soát dữ liệu cá nhân trước khi chia sẻ (Data team hoặc nhân sự kiêm nhiệm DPO) | Rà soát PII nhanh, không sót, có bằng chứng tuân thủ để lưu hồ sơ                  | Tải tệp lên; duyệt Accept/Reject/Edit từng thẻ PII; chỉnh bảng chính sách ở tab Chính sách nội bộ; xác nhận xuất bản đã che; tải báo cáo tuân thủ và nhật ký kiểm toán |
| Analyst         | Người phân tích dữ liệu trong SME hoặc đối tác nhận dữ liệu                                                      | Có bản dữ liệu đã che nhưng vẫn join được giữa các bảng để phân tích không bị hỏng | Chỉ xem và tải bản đã che đã được DPO duyệt; không thấy dữ liệu gốc, không duyệt thẻ, không sửa chính sách                                                             |

## 3. User stories

Ưu tiên: P0 (bắt buộc cho MVP) / P1 / P2.

**P0**

- Là DPO, tôi muốn tải lên nhiều tệp CSV/XLSX cùng lúc, để hệ thống tự quét PII mà tôi không phải kiểm tra từng cột hay từng bảng.
- Là DPO, tôi muốn thấy các ô PII được bôi đỏ/vàng trên bảng xem trước kèm loại PII và độ tin cậy (kể cả cột không đặt tên rõ như col_7 hay note), và bấm số thứ tự tệp để tới nhanh tệp đang có cảnh báo, để duyệt nhanh mà không bỏ sót.
- Là DPO, tôi muốn hệ thống giải thích vì sao một ô được coi là PII (khớp luật nào), đề xuất cách che theo bảng chính sách và chỉ ra các mẫu chỉ giống PII (như mã đơn 12 chữ số), để tôi không phải tự phân loại từng trường hợp.
- Là DPO, tôi muốn bấm "Chấp nhận", "Từ chối" hoặc "Sửa" cho từng thẻ PII, rồi xuất bản đã che kèm báo cáo tuân thủ và nhật ký kiểm toán, để lưu hồ sơ khi cần chứng minh tuân thủ.
- Là Analyst, tôi muốn chỉ thấy bản dữ liệu đã che nhưng vẫn join được giữa các bảng, để phân tích không bị hỏng và tôi không chạm vào dữ liệu cá nhân thật.

**P1**

- Là DPO, tôi muốn chỉnh bảng chính sách masking ở tab Chính sách nội bộ, để phù hợp với quy định nội bộ của doanh nghiệp.
- Là DPO, tôi muốn thấy mức rủi ro của từng tệp (cao/trung bình/thấp) trên số thứ tự tệp, để xử lý tệp nguy hiểm nhất trước.

**P2**

- Là DPO, tôi muốn hệ thống gắn cờ tên và địa chỉ trong văn bản tự do kèm độ tin cậy, để không bỏ sót PII không có định dạng cứng.
- Là DPO, tôi muốn đọc trực tiếp từ cơ sở dữ liệu ở chế độ chỉ đọc, để không phải xuất tệp thủ công.

## 4. Luồng chính (happy path)

1. DPO mở app tại Dashboard, xem bảng chính sách masking ở tab Chính sách nội bộ (có chính sách mặc định, chỉnh nếu cần).
2. Ở tab Quét nhiều tệp, DPO kéo thả nhiều tệp CSV/XLSX; mỗi tệp được đánh số #1, #2, …
3. DPO bấm Bắt đầu quét; màn hình Đang quét hiển thị tiến độ theo từng bước và từng tệp: lập hồ sơ cột → quét theo luật → chấm điểm tin cậy và loại dương tính giả → LLM xử lý cột mơ hồ → đối chiếu chính sách.
4. Màn hình Review hiện dạng chia đôi: bên trái là bảng xem trước tô màu (đỏ: tin cậy cao, vàng: cần xem), bên phải là các thẻ PII kèm loại, độ tin cậy, luật khớp và hành động che đề xuất. DPO bấm số thứ tự tệp để chuyển tệp.
5. DPO Chấp nhận, Từ chối hoặc Sửa từng thẻ; các thẻ dưới ngưỡng tin cậy bắt buộc phải duyệt.
6. Khi hết thẻ chưa duyệt, DPO bấm Xuất; màn hình Xác nhận tóm tắt việc sắp làm, DPO xác nhận.
7. Code masking theo chính sách (che một phần giữ định dạng, băm hoặc tokenize nhất quán), không sửa dữ liệu gốc, rồi quét lại bản đã che.
8. Nếu quét lại có 0 PII định dạng cứng còn sót, LLM soạn báo cáo tuân thủ từ kết quả quét và verifier đối chiếu mọi con số.
9. DPO tải bản dữ liệu đã che (CSV/XLSX), báo cáo tuân thủ (PDF) và nhật ký kiểm toán; kết thúc phiên (không lưu nguyên văn dữ liệu tải lên).
10. Analyst mở Kho dữ liệu đã che, xem trước và tải bản đã che để phân tích.

## 5. Human-in-the-loop

Hành động rủi ro trong sản phẩm là những hành động làm thay đổi thứ được chia sẻ ra ngoài hoặc thay đổi quy tắc che dữ liệu.

| Hành động rủi ro                                  | User xác nhận ở đâu         | Thấy gì trước khi bấm                                                                                          | Guardrail trong code (không chỉ trong prompt)                                                                                                        |
| ------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duyệt phân loại PII (Accept/Reject/Edit từng thẻ) | Màn Review                  | Ô được tô màu, loại PII, độ tin cậy, luật khớp, hành động che đề xuất; mẫu chỉ giống PII được đề xuất loại trừ | Thẻ dưới ngưỡng tin cậy bắt buộc DPO duyệt; đầu ra LLM chỉ được chọn trong danh mục loại PII đóng, không khớp thì trả "không xác định" và chuyển DPO |
| Sửa bảng chính sách masking                       | Tab Chính sách nội bộ       | Chính sách trước và sau khi sửa                                                                                | Mọi lần sửa ghi vào nhật ký kiểm toán (ai, khi nào)                                                                                                  |
| Áp dụng chính sách và xuất bản đã che             | Màn Xác nhận trước khi xuất | Số thẻ đã chấp nhận, từ chối, sửa; hành động che theo từng loại PII; số thẻ chưa duyệt (phải bằng 0)           | Chỉ mở khi hết thẻ bắt buộc chưa duyệt; masking do code thực thi, không sửa dữ liệu gốc; quét lại và chặn xuất nếu còn PII sót                       |
| Xuất báo cáo tuân thủ                             | Màn Export & Report         | Các số liệu chính của báo cáo (số PII, số ô che, kết quả quét lại)                                             | Verifier đối chiếu mọi con số với kết quả quét; lệch thì chặn xuất                                                                                   |
| Chia sẻ bản đã che cho Analyst                    | Màn Export & Report         | Danh sách bản đã che sẽ hiện trong Kho dữ liệu đã che                                                          | Analyst chỉ truy cập được bản đã che sau khi DPO duyệt; không có đường truy cập tới dữ liệu gốc                                                      |

**Các lớp chặn khác (đều nằm trong code):**

- Phát hiện và masking do code thực thi; LLM chỉ đề xuất và giải thích, không tự sửa dữ liệu.
- Chỉ gửi cho LLM tên cột và mẫu giá trị đã che, không gửi toàn bộ dữ liệu (có tùy chọn LLM chạy nội bộ).
- Không chắc chắn thì gắn cờ và chuyển DPO, không tự đoán.
- Nhật ký kiểm toán chỉ ghi vị trí và loại PII, không ghi giá trị thật.
- Giới hạn agent: tối đa 5 vòng suy luận (ReAct) hoặc 7 tool calls, timeout dưới 90 giây mỗi tệp; chạm ngưỡng thì dừng và chuyển DPO.

## 6. Xử lý lỗi & giới hạn

| Tình huống                                                             | Hệ thống làm gì                                                                                                                                      | User thấy gì                                                                                        |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Tệp sai định dạng, hỏng hoặc quá lớn                                   | Từ chối riêng tệp đó, các tệp khác vẫn quét bình thường                                                                                              | Thông báo nêu tên tệp, lý do và cách xử lý (đổi định dạng, tách tệp)                                |
| Tệp mất tên cột                                                        | Xử lý như bình thường với tên col_1…col_n, phát hiện theo nội dung                                                                                   | Bảng xem trước hiển thị col_n cùng loại PII được phát hiện                                          |
| LLM trả sai định dạng hoặc ngoài danh mục loại PII                     | Kiểm tra schema; không hợp lệ thì gắn "không xác định" và chuyển DPO                                                                                 | Thẻ "không xác định" đề nghị DPO tự phân loại                                                       |
| Hết quota hoặc LLM không phản hồi                                      | Phần chạy bằng code (phát hiện, masking, quét lại) vẫn hoạt động; phần cần LLM (cột mơ hồ, văn bản tự do, diễn giải báo cáo) được đánh dấu chưa chạy | Cảnh báo nêu rõ phần nào chưa được phân tích; báo cáo chỉ gồm số liệu quét, không có phần diễn giải |
| Agent chạm giới hạn 5 vòng suy luận, 7 tool calls hoặc timeout 90 giây | Dừng, giữ kết quả đã có, chuyển quyền xử lý cho DPO                                                                                                  | Màn hình dừng an toàn nêu lý do và tệp/cột chưa xử lý xong                                          |
| Verifier phát hiện số liệu trong báo cáo lệch kết quả quét             | Chặn xuất báo cáo                                                                                                                                    | Thông báo lỗi kèm số liệu bị lệch                                                                   |
| Quét lại bản đã che vẫn còn PII sót                                    | Chặn xuất bản đã che                                                                                                                                 | Danh sách ô còn sót; DPO quay lại màn Review                                                        |
| Analyst mở tệp chưa được DPO duyệt                                     | Không hiển thị                                                                                                                                       | Kho dữ liệu chỉ liệt kê bản đã che đã duyệt                                                         |

**Hệ thống KHÔNG làm được (nói thẳng với user):**

- Không cam kết phát hiện hết tên và địa chỉ trong văn bản tự do (mức nâng cao, recall mục tiêu chỉ ≥ 80%); các phát hiện luôn kèm độ tin cậy và dưới ngưỡng phải do DPO duyệt.
- Không đưa ra kết luận pháp lý; báo cáo tuân thủ là tài liệu hỗ trợ để DPO phê duyệt.
- Không xử lý ảnh, PDF, âm thanh; chỉ tệp dạng bảng CSV/XLSX.
- Không sửa dữ liệu gốc; mọi bản đã che là bản mới.

## 7. Dữ liệu

- **Nguồn:** hoàn toàn mock, đội tự sinh bằng code; không dùng dữ liệu cá nhân thật.
- **Định dạng:** CSV, XLSX.
- **Bộ kiểm thử (Gold set):** 4–5 bảng (khách hàng, đơn hàng, ghi chú hỗ trợ, nhân viên, tệp mất tên cột) có nhãn sẵn vì đội biết trước ô nào là PII, ô nào là bẫy dương tính giả (mã đơn 12 chữ số, mã vận đơn, SKU, timestamp, số tiền lớn).
- **Hai bộ sinh với seed và khuôn mẫu khác nhau:** bộ dev để chỉnh luật, bộ test giữ kín để báo cáo; thêm bộ nhỏ 100–200 ô viết tay để kiểm tra độ tổng quát (báo cáo riêng).
- **Lưu trữ:** không lưu nguyên văn dữ liệu tải lên sau khi kết thúc phiên.

## 8. Tech stack (dự kiến)

| Thành phần                       | Lựa chọn                                              |
| -------------------------------- | ----------------------------------------------------- |
| Ngôn ngữ / backend               | [điền theo repo P-XXX]                                |
| Frontend (Split-view, PII Cards) | [điền]                                                |
| LLM provider                     | [điền]; có tùy chọn LLM chạy nội bộ                   |
| Vector store                     | Không dùng (kiến trúc không có bước truy xuất)        |
| Xuất tệp                         | CSV/XLSX đã che, PDF báo cáo tuân thủ [điền thư viện] |
| Nơi deploy                       | [điền]                                                |

## 9. Known Ambiguities

| Điều chưa chốt                                                                                                                                    | Dự định chốt khi nào                           | Ghi chú                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Tech stack, LLM provider và nơi deploy                                                                                                            | Trước khi bắt đầu code Module 1–2              | Cập nhật mục 8 trong cùng PR khi chốt                                                                    |
| Cách xử lý văn bản tự do: để gắn cờ tên/địa chỉ, LLM cần đọc nội dung ô ghi chú, nên tên/địa chỉ có thể tới LLM dù PII định dạng cứng đã được che | Trước khi làm tính năng nâng cao văn bản tự do | Hướng giảm rủi ro: dữ liệu demo là mock, LLM nội bộ tùy chọn, chỉ gửi mẫu nhỏ đã che phần định dạng cứng |
| Bảng xem trước hiển thị giá trị gốc hay che một phần cho DPO                                                                                      | Trước khi chốt wireframe màn Review            | Yêu cầu "không lộ giá trị PII thật ra ngoài" nghiêng về che một phần                                     |
| Ngưỡng độ tin cậy để bắt buộc chuyển DPO duyệt                                                                                                    | Sau lần chạy đầu trên bộ dev                   | Chỉnh trên bộ dev, không chỉnh trên bộ test                                                              |
| Công thức chấm mức rủi ro của tệp (P1)                                                                                                            | Sau khi có kết quả quét đầu tiên               | Dựa trên số ô PII, loại PII, độ tin cậy                                                                  |
| Danh mục loại PII đóng và phân loại dữ liệu cơ bản/nhạy cảm                                                                                       | Trước khi khóa bảng chính sách mặc định        | Đối chiếu văn bản Nghị định 356/2025/NĐ-CP, không suy đoán                                               |
| Tokenization nhất quán: quản lý khóa/salt, và chạy lại giữa các lần xuất khác nhau có giữ cùng token không                                        | Trước khi làm Module 4                         | Ảnh hưởng khả năng join khi CCCD được dùng làm ID                                                        |
| Analyst nhận bản đã che qua kho trong app hay DPO tự chia sẻ; bản đã che lưu bao lâu                                                              | Trước khi chốt màn Kho dữ liệu đã che          | Bản gốc không được lưu sau phiên                                                                         |
| Chi phí LLM cho mỗi bộ dữ liệu                                                                                                                    | Khi demo bản đầu                               | Đề gốc có ràng buộc giới hạn chi phí nhưng chưa có ngưỡng                                                |
| Ngưỡng hiệu năng và Time-to-Review                                                                                                                | Đo lại khi demo                                | Đang ghi là mục tiêu, chưa đo                                                                            |
| Đọc trực tiếp CSDL ở chế độ chỉ đọc                                                                                                               | Chỉ làm nếu còn thời gian sau MVP              | Mức nâng cao                                                                                             |
