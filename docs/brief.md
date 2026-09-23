# PIIGuard VN — Brief

**Mã đề:** DATA-06 · **Đội:** P-138 · **Ngày:** 21/09/2026 · **MVP:** 14 ngày

## Bài toán

DPO và đội dữ liệu đang rà thủ công các trường dữ liệu cá nhân trước khi chia sẻ cho Analyst. Họ dễ bỏ sót trường mơ hồ; che nhầm khóa liên kết lại khiến báo cáo phân tích sai hoặc không chạy được.

## Người dùng mục tiêu

- **DPO:** cần duyệt phân loại và biện pháp có căn cứ; đo độ chính xác phát hiện và thời gian duyệt.
- **Analyst:** cần bộ dữ liệu được duyệt, vẫn chạy được tác vụ phân tích; đo kết quả trước và sau xử lý.

## Giải pháp

PIIGuard VN hỗ trợ rà soát và bảo vệ dữ liệu trước khi chia sẻ từ **PostgreSQL và MongoDB**.

- PostgreSQL demo dùng fixture đã commit tại `data/fixtures/seed.sql`: Northwind + PII Việt Nam synthetic, không chứa dữ liệu thật.
- Quét mọi trường trong phạm vi chọn; đối chiếu danh mục pháp lý, không giới hạn cứng 4–5 trường PII.
- Code và AI đề xuất; DPO duyệt từng trường. Mục chưa rõ phải được giải quyết hoặc loại khỏi đầu ra.
- Che toàn bộ giá trị, bỏ trường, hoặc băm có khóa HMAC cho khóa liên kết; không sửa nguồn.
- Tạo bản dữ liệu cố định, kiểm tra SQL join và MongoDB lookup, rồi DPO phát hành cho Analyst; lưu báo cáo và lịch sử duyệt.

## Vì sao cần AI

LLM hỗ trợ hiểu tên trường, đường dẫn và ngữ cảnh schema mơ hồ mà regex khó ánh xạ. Code đảm nhiệm kết nối, kiểm tra định dạng, biến đổi và chặn phát hành; AI không nhận giá trị gốc hay tự quyết định. Đo phần đóng góp của AI bằng đối chiếu với bộ quy tắc thuần.

## Không làm (Non-goals)

- Dữ liệu thật; quét mọi loại SQL/NoSQL; văn bản tự do, ảnh và tệp.
- Đồng bộ thời gian thực, truy vấn tùy ý, liên kết xuyên hai database.
- Tự kết luận tuân thủ pháp luật; nhận diện đầy đủ mọi loại dữ liệu cá nhân.
- SSO, đa khách hàng, kho token đảo ngược và vận hành production.

## Đo thành công bằng gì

Các số sau là **mục tiêu**, chưa phải kết quả:

- Precision ≥95%, recall ≥90% cho từng loại được công bố hỗ trợ, trên tập kiểm thử giữ riêng.
- **2/2 tác vụ downstream** giữ kết quả nghiệp vụ; mọi ca chặn phát hành bắt buộc đều đạt.
- DPO duyệt ≤5 phút/nguồn với tối đa 20 trường; không tính thời gian máy xử lý.

Căn cứ phân loại: [Luật 91/2025/QH15](https://chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroupid=3) và [Nghị định 356/2025/NĐ-CP, Điều 3–4](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/356-nd.signed.pdf). Độ phủ thực tế và giới hạn được ghi trong PRD; lựa chọn kỹ thuật không đồng nghĩa chứng nhận tuân thủ.
