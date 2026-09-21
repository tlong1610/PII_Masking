# PIIGuard VN — Brief

**Mã đề:** DATA-06 · **Đội:** P-138 · **Ngày:** 21/09/2026

## Bài toán

Dữ liệu trong hệ thống y tế hoặc doanh nghiệp công nghệ chứa PII như CMND/CCCD, số điện thoại và hồ sơ y tế nằm rải rác trong database, gây khó khăn cho DPO và đội dữ liệu khi rà soát bảo vệ dữ liệu cá nhân. Việc che dữ liệu cần xem xét ảnh hưởng đến các tác vụ phân tích phía sau, đặc biệt khi thông tin như CCCD được dùng làm khóa liên kết giữa các bảng.

## Người dùng mục tiêu

- **DPO:** cần xem kết quả phân loại PII, duyệt chính sách bảo vệ và theo dõi báo cáo, cảnh báo rủi ro; đánh giá qua độ chính xác phát hiện và thời gian duyệt một dataset.
- **Analyst:** cần sử dụng view đã che dữ liệu theo quyền truy cập, đáp ứng các tác vụ downstream được phép; đánh giá qua kết quả kiểm thử join và truy vấn trước/sau xử lý.

## Giải pháp

AI Agent quét dataset trong database, phát hiện và phân loại PII, đề xuất chính sách masking/tokenization để DPO duyệt, sinh view đã che dữ liệu, tạo báo cáo tuân thủ và cảnh báo dataset rủi ro cao.

- Kết hợp regex/NER và LLM để phát hiện, phân loại PII dựa trên cấu trúc và ngữ cảnh dữ liệu.
- Đề xuất chính sách theo loại dữ liệu, căn cứ bảo vệ dữ liệu áp dụng và nhu cầu downstream; DPO duyệt cả phân loại lẫn chính sách trước khi thực thi.
- Code áp dụng chính sách đã duyệt để sinh view; kiểm tra ảnh hưởng của masking/hashing/tokenization đến các phép join và truy vấn liên quan.
- Giao diện web có hai vai trò DPO/Analyst; kiểm soát truy cập, không làm lộ PII thật ra ngoài và không ghi giá trị PII thật vào audit log.
- Hậu kiểm view, đối chiếu số liệu báo cáo với kết quả xử lý, cảnh báo dataset rủi ro cao và lưu nhật ký kiểm toán.

## Vì sao cần AI

LLM hỗ trợ nhận diện ngữ cảnh của cột mơ hồ và nội dung tự do, đề xuất phân loại/chính sách và giải thích kết quả cho DPO. Regex và các bộ kiểm tra xử lý mẫu định dạng; code thực thi và kiểm chứng chính sách đã duyệt. Dữ liệu đưa vào LLM phải được kiểm soát để đáp ứng yêu cầu không làm lộ PII thật ra ngoài.

## Không làm (Non-goals)

- Không thay DPO hoặc tự đưa ra kết luận pháp lý.
- Không để LLM tự áp dụng chính sách hay sửa dữ liệu nguồn.
- Không dùng dữ liệu cá nhân thật trong demo; dùng dữ liệu mô phỏng lưu trong database.
- Không xử lý ảnh, PDF, âm thanh hoặc quét thời gian thực trong MVP.

## Đo thành công bằng gì

Đánh giá trên bộ dữ liệu mô phỏng có nhãn trong database, gồm PII và các mẫu dễ nhầm, với tập kiểm thử tách riêng. Các con số dưới đây là mục tiêu thử nghiệm, chưa phải kết quả đã đạt.

- **Phát hiện:** precision ≥ 95%; báo cáo recall theo từng loại PII, kèm số trường hợp bỏ sót và nhận nhầm.
- **Đầu ra:** các ca kiểm thử join/truy vấn được phép phải giữ kết quả đúng sau xử lý; số liệu báo cáo khớp kết quả quét và audit log ghi đủ bước phê duyệt, áp dụng chính sách. Kiểm tra PII còn sót bằng đối chiếu nhãn chuẩn, không chỉ dựa vào việc chạy lại cùng bộ quét.
- **Hiệu năng và sử dụng:** mục tiêu quét bảng 10.000 dòng dưới 60 giây và DPO duyệt một dataset demo dưới 5 phút; ghi rõ cấu hình, số cột, số phát hiện cần duyệt và chi phí xử lý khi đo.

Các chỉ số về giờ công tiết kiệm, sự cố thực tế và mức độ hài lòng cần được đánh giá khi có người dùng thử nghiệm.
