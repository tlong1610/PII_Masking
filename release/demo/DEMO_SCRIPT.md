# Kịch bản video demo — Luồng chính PIIGuard Shield

**Mục tiêu:** Trong khoảng 3–4 phút, cho thấy trọn vòng đời: DPO quét → duyệt → build và kiểm định → phát hành → Analyst khai thác dữ liệu đã bảo vệ.
**Hình ảnh:** Chỉ quay phần web app (viewport trình duyệt). Không quay thanh địa chỉ, tab, desktop hay terminal. 1920×1080, 30 fps.
**Âm thanh:**
- Thuyết minh tiếng Việt bằng giọng đọc máy macOS (Linh), mỗi cảnh một đoạn.
- Lọc tần thấp (high-pass 70 Hz), nén nhẹ, chuẩn hóa âm lượng EBU R128 −16 LUFS.
- Phụ đề tiếng Việt nhúng sẵn (bật/tắt được), kèm file `.srt` riêng.
**Dữ liệu:** Dữ liệu tổng hợp (seed Northwind + PII giả lập tiếng Việt) trên stack QA cô lập. Không có dữ liệu thật hay secret nào lên hình.
**Nguồn sự thật:** Thoại và thao tác của từng cảnh nằm trong [`scenes.mjs`](scenes.mjs); file này là bản đọc cho người.

## Phân cảnh

| # | Cảnh | Thao tác trên màn hình | Thuyết minh |
| --- | --- | --- | --- |
| S01 | Giới thiệu | Màn đăng nhập có mascot Pango; con trỏ lướt qua hai điểm "Phân quyền nghiêm ngặt" và "Không hiển thị dữ liệu cá nhân gốc" | Xin chào. Đây là PIIGuard Shield, nền tảng giúp doanh nghiệp phát hiện và che dữ liệu cá nhân trước khi chia sẻ cho đội phân tích, theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP. |
| S02 | DPO đăng nhập | Gõ `dpo` / `dpo123`, bấm Đăng nhập | Người phụ trách bảo vệ dữ liệu, gọi tắt là DPO, đăng nhập vào không gian làm việc của mình. |
| S03 | Chọn phạm vi | Bỏ chọn tất cả, tick 5 bảng `customers`, `orders`, `order_details`, `support_tickets`, `kyc_documents`; con trỏ chỉ vào sơ đồ quan hệ | Đầu tiên, DPO chọn phạm vi cần quét. Sơ đồ bên phải cho thấy quan hệ giữa các bảng. Ở đây ta chọn năm bảng: khách hàng, đơn hàng, chi tiết đơn hàng, phiếu hỗ trợ và hồ sơ định danh. |
| S04 | Quét PII | Bấm Bắt đầu quét, thấy thanh tiến trình rồi chuyển sang màn kết quả | Bấm Bắt đầu quét. Hệ thống kết hợp luật nhận diện tiếng Việt, mô hình nhận dạng thực thể và AI để phân loại từng cột. DPO không bao giờ nhìn thấy giá trị gốc. |
| S05 | Tổng quan | Lướt qua 3 thẻ KPI, cuộn tới bảng `customers`, chỉ vào hành động của `cccd` (Băm HMAC) và `personal_notes` (Che thực thể) | Kết quả hiện ngay: điểm rủi ro, số cột dữ liệu cá nhân theo ba mức L1, L2, L3, và tỷ lệ cột đã được bảo vệ. Mỗi cột có đề xuất: che dữ liệu, băm HMAC để giữ khóa nối, che thực thể trong văn bản tự do, hoặc loại bỏ. |
| S06 | Điều chỉnh có lý do | Mở Inspector `ship_city`, chọn Che dữ liệu, bấm Lưu và bị báo thiếu lý do; gõ lý do rồi lưu | DPO có thể điều chỉnh từng cột. Ví dụ, thành phố giao hàng được nâng lên mức che dữ liệu. Khi khác với đề xuất, hệ thống bắt buộc ghi lý do để phục vụ kiểm toán. |
| S07 | Chặn L3 | Mở `ocr_text`, mở danh sách hành động: "Giữ nguyên" bị khóa với ghi chú "Cấm với L3" | Với dữ liệu nhạy cảm như nội dung giấy tờ tùy thân, hệ thống không cho phép giữ nguyên: lựa chọn Giữ nguyên bị khóa ngay trong danh sách, kèm ghi chú cấm với L3. |
| S08 | Rủi ro | Tab Rủi ro & đánh giá: mức bảo vệ theo cấp độ và phân bổ hành động | Tab Rủi ro tổng hợp mức bảo vệ theo từng cấp độ và cách phân bổ các hành động bảo vệ. |
| S09 | Build và kiểm định | Bấm Lưu, trạng thái chuyển "Chờ phát hành"; tab Dữ liệu cho Analyst: `sql_join_hmac`, `sql_aggregate_revenue`, `zero_raw_pii_egress` đều Đạt; xem trước dữ liệu | Duyệt xong, DPO bấm Lưu. Hệ thống ghi bản sao đã bảo vệ sang vùng dữ liệu riêng rồi tự kiểm định: phép nối bằng khóa băm HMAC vẫn khớp toàn bộ, tổng doanh thu không đổi, và không còn dữ liệu cá nhân gốc nào lọt ra. |
| S10 | Báo cáo tuân thủ | Bấm Báo cáo tuân thủ; báo cáo mở ở tab mới (video quay tiếp tab đó), cuộn xem rồi đóng | Báo cáo tuân thủ được tạo tự động, sẵn sàng cho thanh tra hoặc đánh giá tác động. |
| S11 | Phát hành và kiểm toán | Phát hành → xác nhận; mở Nhật ký hoạt động, thấy banner "Nhật ký nguyên vẹn" | Kiểm định đạt, DPO phát hành dữ liệu cho đội phân tích. Mọi thao tác đều được ghi vào nhật ký chuỗi băm: không ai sửa hay xóa được một dòng mà không bị phát hiện. |
| S12 | Chuyển vai | Đăng xuất (xác nhận trong hộp thoại), gõ `analyst` / `analyst123` | Bây giờ, chuyển sang vai trò chuyên viên phân tích. Analyst đăng nhập bằng tài khoản riêng và chỉ có quyền đọc những dữ liệu đã được phát hành. |
| S13 | Dữ liệu đã bảo vệ | Lưới dữ liệu `customers`: cột HMAC, cột `personal_notes` có nhãn `[PHONE]`, `[CCCD]`, `[EMAIL]`; chuyển sang `kyc_documents` (không còn cột OCR) | Analyst chỉ thấy dữ liệu đã phát hành, và dữ liệu vẫn dùng được: cột băm HMAC vẫn ghép bảng và đếm khách hàng được, ghi chú tự do vẫn đọc được nhưng số điện thoại, email và căn cước đã được thay bằng nhãn. |
| S14 | Hướng dẫn và tải CSV | Tab Các cột & cách dùng → Quan hệ giữa các bảng → quay lại, tải CSV `customers` | Hướng dẫn cột giải thích cách dùng từng trường, sơ đồ quan hệ giúp viết truy vấn nối bảng, và Analyst có thể tải tệp CSV đã bảo vệ. |
| S15 | Kết | Đăng xuất (xác nhận) về màn đăng nhập | PIIGuard Shield: phát hiện đúng, che đủ, dữ liệu vẫn hữu ích, và mọi bước đều có bằng chứng kiểm toán. Cảm ơn quý vị đã theo dõi. |

Thời lượng thực tế của từng cảnh được ghi ở `output/timeline.json` sau mỗi lần render. Mỗi cảnh kéo dài ít nhất bằng đoạn thuyết minh cộng 0,7 giây.

## Quy tắc khi quay lại hoặc chỉnh sửa
- Chỉ chạy trên stack QA (dữ liệu tổng hợp). Không quay trên môi trường có dữ liệu khách hàng thật.
- Nếu đổi thoại, sửa `caption` (phụ đề) và `speak` (văn bản đưa vào giọng đọc) trong `scenes.mjs`. `speak` viết tách chữ viết tắt (D P O, H MAC, P I I) để giọng đọc phát âm đúng.
- Trước khi quay lại, chạy `release/qa` cho xanh. Video chỉ quay luồng đã được test.
