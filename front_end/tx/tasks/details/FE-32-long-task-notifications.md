# FE-32: Thông báo khi tác vụ dài hoàn tất (âm thanh, chấm đỏ, trạng thái chờ)

**Sprint**: Sprint 06
**Trạng thái**: Todo
**Phân hệ**: `src/features/piiReview` (quét, lưu & kiểm định), `src/shared/ui` (thông báo), layout DPO

## Vấn đề

- Quét 29 bảng / 240 cột với AI mất khoảng 40 giây (đo trên localhost ngày 18/10/2026: `POST /runs` mất 41 giây). Màn hình chỉ hiện "Đang quét và phân tích dữ liệu PII…", không có thời gian đã chạy hay thời gian ước tính, nên người dùng tưởng bị treo.
- Người dùng bấm quét lại, nên trong khoảng 40 giây có 3 lượt quét trùng (#23, #24, #25) trên cùng một phạm vi.
- Nếu người dùng chuyển sang tab hoặc việc khác thì không biết lúc nào quét xong. Thông báo hiện tại chỉ là một toast trong trang, dễ bị bỏ lỡ.

## Nguyên tắc: chỉ thông báo việc quan trọng, không spam

Chỉ thông báo khi **cả hai** điều kiện sau đều đúng:
1. Đó là một tác vụ dài mà người dùng đang chờ kết quả.
2. Tác vụ đã chạy **trên 10 giây**, **hoặc** người dùng đang không nhìn trang (tab bị ẩn).

Tác vụ ngắn hoặc do chính người dùng vừa bấm và thấy ngay kết quả thì chỉ dùng toast như hiện tại, không có âm thanh hay chấm đỏ.

| Sự kiện | Toast | Âm thanh | Chấm đỏ | Thông báo trình duyệt (tab ẩn) |
| --- | --- | --- | --- | --- |
| Quét xong | có | có, nếu > 10 giây hoặc tab ẩn | có, nếu người dùng chưa mở lượt quét đó | có |
| Quét lỗi | có | có (âm báo lỗi) | có | có |
| Lưu & kiểm định xong (đạt hoặc không đạt) | có | có, nếu > 10 giây hoặc tab ẩn | có, nếu không đạt | có |
| Đăng nhập, đổi tên, đổi quyết định, xem trước, tải ZIP/CSV, phát hành, thu hồi | có (như hiện tại) | **không** | **không** | **không** |

## Thực hiện

### 1. Trạng thái chờ cho tác vụ dài
- Hiện thời gian đã chạy, ví dụ: "Đã chạy 25 giây · quét 29 bảng thường mất 30–60 giây".
- Thêm câu "Bạn có thể làm việc khác, hệ thống sẽ báo khi xong."
- Khoá nút "Bắt đầu quét" và nút "Lưu" trong lúc tác vụ đang chạy, để không tạo lượt quét trùng.

### 2. Âm thanh
- Hai file ngắn trong `public/sounds/`: `done.mp3` và `error.mp3`. Mỗi file dưới 1 giây và dưới 20 KB, âm nhẹ, có giấy phép dùng tự do (ghi nguồn vào README).
- Phát bằng `HTMLAudioElement`. Mỗi sự kiện chỉ phát một lần. Nếu trình duyệt chặn phát âm thanh thì bỏ qua, không báo lỗi.
- Có nút bật/tắt âm thanh ở thanh trên cùng. Lựa chọn lưu trong `localStorage`, mặc định **bật**.

### 3. Chấm đỏ
- Chấm đỏ có số đếm trên mục menu "Lịch sử quét" khi có kết quả chưa xem: quét xong, quét lỗi, hoặc kiểm định không đạt.
- Khi tab bị ẩn, tiêu đề tab thành `(1) PIIGuard Shield`, có thể kèm chấm đỏ trên favicon.
- Chấm đỏ mất khi người dùng mở lượt quét đó. Mỗi kết quả chỉ đếm một lần.
- Bản đầu tiên giữ trạng thái "chưa xem" ở phía trình duyệt (context hoặc state), chưa cần backend.

### 4. Thông báo trình duyệt (tuỳ chọn)
- Chỉ xin quyền khi người dùng bắt đầu một tác vụ dài lần đầu. Không xin quyền ngay khi vào trang.
- Chỉ hiện khi tab bị ẩn. Bấm vào thông báo thì mở đúng lượt quét đó.

## Ngoài phạm vi (task backend riêng)

- Hiện tại `POST /runs` chạy đồng bộ: HTTP request chờ hết thời gian quét. Nếu người dùng tải lại trang giữa chừng thì giao diện mất kết quả chờ, dù backend vẫn quét xong.
- Hướng làm lâu dài: chạy quét nền với trạng thái `SCANNING`, frontend hỏi lại trạng thái theo chu kỳ (polling), và có thể có tiến độ theo số cột đã quét.
- Thông báo cho Analyst khi được cấp dataset mới cần polling hoặc push từ server, để làm sau.

## Nghiệm thu

- [ ] Quét trên 10 giây: có đồng hồ đếm thời gian, nút bị khoá, xong thì có toast, âm thanh và chấm đỏ trên "Lịch sử quét".
- [ ] Tác vụ ngắn (đổi tên, phát hành, xem trước…): không có âm thanh và không có chấm đỏ.
- [ ] Mở lượt quét vừa xong thì chấm đỏ mất. Tải lại trang không làm chấm đỏ đã xem hiện lại.
- [ ] Tắt âm thanh thì không phát, và lựa chọn vẫn giữ sau khi tải lại trang.
- [ ] Tab ẩn thì tiêu đề tab có `(1)`, và có thông báo trình duyệt nếu người dùng đã cho phép.
- [ ] Không tạo được 2 lượt quét trùng bằng cách bấm liên tục.
- [ ] Có unit test cho quy tắc "khi nào thông báo", test cho đếm chấm đỏ, và kiểm tra thật trên trình duyệt.
