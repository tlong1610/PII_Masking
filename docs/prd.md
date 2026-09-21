# PRD — PIIGuard VN

**Mã đề:** DATA-06 · **Đội:** P-138 · **Cập nhật:** 21/09/2026  
**Trạng thái:** thiết kế MVP đã chốt; chưa phải xác nhận phần mềm đã triển khai hoặc đạt chỉ số.

## 1. Bối cảnh & Mục tiêu

DPO và đội dữ liệu cần rà soát dữ liệu cá nhân trước khi chia sẻ dữ liệu phân tích. Rà thủ công dễ bỏ sót; che một khóa liên kết không đúng cách có thể làm sai kết quả downstream. PIIGuard VN phục vụ việc **rà soát trước khi phát hành một dataset cho Analyst**.

### MVP được chọn

Trong 14 ngày, đội 4 người xây cùng một quy trình cho **PostgreSQL và MongoDB**:

> Chọn nguồn → quét và đề xuất → DPO duyệt → tạo bản dữ liệu đã xử lý → hậu kiểm → DPO phát hành → Analyst chạy tác vụ mẫu.

| Phần | Cam kết P0 |
|---|---|
| SQL | PostgreSQL, 2 bảng mô phỏng `customers`, `orders` |
| NoSQL | MongoDB, 2 collection mô phỏng cùng nghiệp vụ; có object lồng nhau |
| Phạm vi quét | Tất cả trường trong phạm vi chọn; tối đa 20 đường dẫn trường và 2.000 bản ghi mỗi nguồn |
| Dữ liệu | Hoàn toàn mô phỏng; mỗi nguồn có tối đa 1.000 khách hàng và 1.000 đơn hàng |
| Quy trình | Hai connector dùng chung profile, phân loại, policy, DPO review và báo cáo |
| Đầu ra | Snapshot: bảng đã xử lý + SQL view chỉ đọc; collection đã xử lý trong database đích riêng |
| Downstream | Một SQL join và một MongoDB lookup được khai báo trước; không join xuyên hai nguồn |
| Người dùng | Hai tài khoản demo DPO/Analyst; kiểm tra quyền tại backend |

Số bảng, trường và bản ghi là giới hạn khối lượng để hoàn thành demo; **không phải giới hạn số loại dữ liệu cá nhân trong pháp luật**. Không gọi PostgreSQL là toàn bộ SQL hoặc MongoDB là toàn bộ NoSQL.

### Nguyên tắc phân loại và bảo vệ

Dùng danh mục có nguồn từ [Luật 91/2025/QH15](https://chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroupid=3) và [Điều 3–4 Nghị định 356/2025/NĐ-CP](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/356-nd.signed.pdf). Mỗi mục áp dụng có điều/khoản, đường dẫn nguồn, phiên bản và ngày người phụ trách đối chiếu. Việc xác nhận văn bản áp dụng và các thay đổi liên quan là công việc của người phụ trách danh mục; không giao cho LLM suy đoán.

Tách ba khái niệm: **danh mục pháp lý**, **khả năng phát hiện đã kiểm thử**, và **chính sách biến đổi được DPO duyệt cho một mục đích**. Pháp luật là căn cứ phân loại; lựa chọn MASK/DROP/HMAC là quyết định thiết kế của MVP, không được mô tả như một thuật toán do luật bắt buộc cho mọi trường.

Mọi trường đều phải có quyết định đầu ra. Không phát hiện được không đồng nghĩa không phải dữ liệu cá nhân. Không dùng nhãn “đã tuân thủ hoàn toàn”, “không còn PII” hoặc “giữ được mọi phép join”.

### Non-goals

- Dữ liệu doanh nghiệp thật, file upload, OCR/ảnh/âm thanh, NER văn bản tự do, mảng object hoặc schema NoSQL tùy ý.
- Nhiều nhà cung cấp SQL/NoSQL, CDC/thời gian thực, SQL do người dùng nhập hoặc AI tự sinh.
- Huấn luyện model, RAG pháp luật, AI tự quyết định nghĩa vụ pháp lý hay tự phát hành dữ liệu.
- SSO, nhiều tổ chức dùng chung hệ thống, token đảo ngược, KMS và vận hành production.

## 2. User personas

| Vai trò | Mô tả | Mục tiêu chính | Quyền hạn P0 |
|---|---|---|---|
| DPO / Data reviewer | Người chịu trách nhiệm rà soát và phê duyệt chia sẻ | Có căn cứ, thấy phần chưa rõ, duyệt biện pháp và kiểm tra ảnh hưởng | Chọn nguồn demo; quét; sửa/duyệt phân loại; tạo, phát hành, thu hồi đầu ra; đọc báo cáo |
| Analyst | Người thực hiện phân tích được cho phép | Dataset dùng được cho tác vụ đã định nghĩa | Xem bản đã phát hành và chạy tác vụ mẫu; không đọc nguồn, sửa policy, tạo hoặc phát hành dataset |

Dùng hai tài khoản cấu hình sẵn; phiên đăng nhập và vai trò do server xác thực. Không nhận vai trò từ một ô chọn hoặc header do trình duyệt tự khai. Mọi API kiểm tra vai trò và trạng thái dataset; ẩn nút trên UI không đủ. Không mở cổng database cho Analyst, không đưa credential nguồn xuống trình duyệt.

## 3. User stories

### P0 — phải hoàn thành cho MVP

| ID | User story | Acceptance criteria |
|---|---|---|
| US01 | Là DPO, tôi muốn chọn nguồn PostgreSQL hoặc MongoDB để rà soát dữ liệu đang lưu trong database. | Cả hai kết nối chạy thật với fixture; đọc đủ 2 bảng/collection; account nguồn chỉ đọc. |
| US02 | Là DPO, tôi muốn thấy mọi trường và căn cứ phân loại để không bỏ qua trường chưa có detector. | Danh sách trường đủ; có đường dẫn, kiểu, nguồn đề xuất, taxonomy/căn cứ nếu xác định được, độ phủ và trạng thái review. Không hiện giá trị gốc. |
| US03 | Là DPO, tôi muốn AI hỗ trợ schema mơ hồ để giảm công tra nghĩa thủ công. | AI nhận profile đã lọc, trả taxonomy ID hợp lệ hoặc ABSTAIN; không bịa căn cứ; có so sánh rules-only với rules+AI. |
| US04 | Là DPO, tôi muốn Accept/Reject/Edit để chịu trách nhiệm cho từng quyết định. | Mọi trường có action; Reject phải có lý do, không tự chuyển thành KEEP. Trường chưa rõ chỉ được loại khỏi đầu ra hoặc tiếp tục chặn. |
| US05 | Là DPO, tôi muốn xem tác động và xác nhận trước khi tạo dataset để tránh xử lý sai. | Modal hiển thị phiên nguồn, nơi ghi đích, policy, khóa liên kết, trường bị bỏ và tác vụ kiểm tra. Backend kiểm tra lại điều kiện. |
| US06 | Là DPO, tôi muốn tạo snapshot đã bảo vệ để chia sẻ đúng dữ liệu mình đã duyệt. | Áp dụng policy đúng trên cả hai nguồn; không ghi nguồn; không có trường ngoài danh sách cho phép; đầu ra tạo dở không truy cập được. |
| US07 | Là DPO, tôi muốn kiểm tra tác vụ phân tích để biết ảnh hưởng của việc bảo vệ dữ liệu. | Một SQL join và một MongoDB lookup so với kết quả chuẩn; đối chiếu số hàng ghép, hàng không ghép và tổng theo nhóm. |
| US08 | Là DPO, tôi muốn báo cáo và cảnh báo có lý do để biết có thể phát hành hay phải sửa. | Số liệu khớp; liệt kê trường chưa phân loại nhưng đã DROP; lỗi chặn rõ; audit có người, thời điểm và quyết định. |
| US09 | Là DPO, tôi muốn xác nhận phát hành hoặc thu hồi để quản lý quyền sử dụng kết quả. | Chỉ VERIFIED được phát hành; thu hồi ngừng quyền đọc qua ứng dụng; thao tác có audit, không xóa nguồn. |
| US10 | Là Analyst, tôi muốn dùng dataset được duyệt để thực hiện tác vụ mẫu. | Chỉ đọc PUBLISHED; gọi trực tiếp API nguồn, review, staging hay publish bằng tài khoản Analyst phải bị từ chối. |

### P1 — sau khi P0 và bộ kiểm thử đạt

Thêm MySQL hoặc một connector có nhu cầu thực tế; hỗ trợ mảng và schema đa dạng; đăng nhập tổ chức; nhiều downstream test được khai báo; quản lý phiên bản policy và thay đổi schema. **MongoDB đã là P0**, không chuyển sang P1 để làm đẹp kết quả tiến độ.

### P2 — mục tiêu sản phẩm dài hạn

Tích hợp pipeline/BI, giám sát thay đổi, triển khai VPC/on-premise, quản trị khóa và phân quyền đầy đủ, kiểm tra bảo mật độc lập. Lộ trình và điều kiện đầu tư tiếp ở [MVP decisions](mvp-decisions.md).

## 4. Luồng chính (happy path)

1. DPO đăng nhập; chọn một nguồn demo và cặp bảng/collection. Mỗi nguồn là một phiên độc lập.
2. Backend kiểm tra quyền chỉ đọc, giới hạn schema, số bản ghi; khóa phiên vào một phiên bản fixture.
3. Connector đọc toàn bộ phạm vi, tạo profile chung. Code chạy quy tắc định dạng/metadata; LLM hỗ trợ ánh xạ ngữ nghĩa các mục mơ hồ.
4. DPO rà mọi trường, xem căn cứ, điều chỉnh phân loại và action. Trường ngoài khả năng xử lý được DROP có xác nhận hoặc tiếp tục chặn.
5. DPO xác nhận tạo đầu ra. Backend kiểm tra phiên nguồn, phiên quyết định, taxonomy và quyền trước khi ghi.
6. Code tạo snapshot trong vùng staging riêng; áp dụng policy theo danh sách trường cho phép. Không dùng sao chép toàn bộ rồi mới bỏ vài trường.
7. Verifier kiểm tra policy, schema đầu ra, số liệu và downstream test. Lỗi làm phiên FAILED; không cấp quyền Analyst.
8. DPO xem báo cáo, xác nhận phát hành. Backend đổi trạng thái PUBLISHED; Analyst thấy dataset và chạy tác vụ mẫu.
9. Lặp quy trình với nguồn còn lại để chứng minh hai connector đều hoạt động.

### Trạng thái bắt buộc

`NEW → SCANNING → REVIEW_REQUIRED → READY_TO_BUILD → BUILDING → VERIFIED → PUBLISHED`.

Lỗi quét/tạo/kiểm tra → `FAILED`; nguồn hoặc quyết định đổi → `STALE`; DPO thu hồi → `REVOKED`. LLM lỗi riêng lẻ nhưng scan hoàn tất vẫn chuyển REVIEW_REQUIRED với mục cần duyệt thủ công. Backend từ chối chuyển trạng thái sai thứ tự. Chỉ PUBLISHED được Analyst đọc.

Quét lại tạo run mới. Chỉnh policy không làm biến đổi snapshot đã phát hành; tạo phiên bản kế tiếp. Bản cũ giữ trạng thái đã công bố cho đến khi DPO thu hồi, có nhãn thời điểm rõ ràng. P0 chỉ cần một run đang xử lý tại một thời điểm để giảm độ phức tạp.

## 5. Human-in-the-loop

| Quyết định | Thông tin DPO phải thấy | Điều kiện backend |
|---|---|---|
| Duyệt phân loại/action | Đường dẫn, căn cứ nếu có, giới hạn detector, lý do và tác động downstream | Lưu người duyệt, lý do, action, phiên bản; mọi trường được xử lý rõ ràng |
| Loại trường chưa xác định | “Chưa phân loại”; tên trường bị loại; tác vụ nào mất dữ liệu | Chỉ cho DROP; giữ trạng thái chưa phân loại trong báo cáo |
| Tạo dataset | Nguồn/phiên, danh sách đầu ra, chính sách, đích staging và kiểm tra bắt buộc | Không ghi nếu scan thiếu, còn mục chưa quyết định, khóa lỗi hoặc nguồn đã đổi |
| Phát hành | Kết quả verifier, downstream, phần bị loại, phạm vi và giới hạn | Chỉ VERIFIED; kiểm tra phiên bản quyết định và manifest đầu ra; lệnh lặp không tạo bản trùng |
| Thu hồi | Dataset và tác vụ Analyst sẽ mất quyền truy cập | Chỉ DPO; ngừng quyền đọc qua app, ghi audit |

Cảnh báo có ba nhóm riêng: **lỗi chặn phát hành**, **phân loại pháp lý cần chú ý**, **độ chắc chắn của phát hiện**. Không dùng một điểm “rủi ro pháp lý” do model tự chấm. LLM không có credential database và không có tool ghi, publish hoặc cấp quyền.

### Chính sách biến đổi P0

| Action | Cách áp dụng | Khi dùng |
|---|---|---|
| DROP | Không đưa trường vào schema đầu ra | Trường không cần, chưa rõ hoặc chưa hỗ trợ |
| MASK | Che toàn bộ scalar: text thành `[REDACTED]`; số/ngày thành NULL; null/missing giữ trạng thái | Cần giữ cấu trúc nhưng không cần giá trị; không dùng che một phần trong P0 |
| HMAC | HMAC-SHA-256 cho chuỗi định danh đã chuẩn hóa | Chỉ khóa cần liên kết trong tác vụ đã duyệt |
| KEEP | Giữ nguyên đúng trường được duyệt | Chỉ trường nghiệp vụ được đánh giá không mang thông tin cá nhân trong ngữ cảnh đầu ra; không mặc định cho trường chưa phát hiện |

DPO không được KEEP giá trị đã xác định là dữ liệu cá nhân trong chính sách demo này. Tính cần thiết cho tác vụ không tự làm mất tính chất cá nhân của trường. Nếu tổ hợp trường tạo khả năng nhận diện, giảm/bỏ thêm trường hoặc chặn; hậu kiểm demo không chứng minh đã loại trừ mọi khả năng tái nhận diện.

HMAC dùng cùng `key_version`, `join_group`, mục đích và hàm chuẩn hóa cho hai phía trong cùng nguồn; khác nguồn dùng miền khóa riêng. Không thêm tên bảng vào đầu vào nếu cần ghép giữa hai bảng. Giữ đủ digest; không dùng hash không khóa, không gọi HMAC là mã hóa có thể giải mã. HMAC là [băm có khóa](https://docs.python.org/3/library/hmac.html), không phải bằng chứng dữ liệu đã ẩn danh.

Null/missing không được đổi thành một mã chung rồi ghép; tác vụ lọc khóa null/missing ở cả hai phía. Giữ số 0 đầu của định danh dạng chuỗi; chặn kiểu không nhất quán và khóa khách hàng trùng ngoài quy tắc fixture. Kiểm tra join sau biến đổi, không suy luận “cùng thuật toán là chắc chắn đúng”.

## 6. Xử lý lỗi & giới hạn

| Tình huống | Hành vi |
|---|---|
| Kết nối/quyền lỗi | Dừng; nêu nguồn và quyền cần kiểm tra, không lộ credential. |
| Nguồn rỗng | Hiện empty state; không báo thành công phát hiện và không phát hành dataset rỗng. |
| Vượt giới hạn hoặc quét thiếu | Dừng có lý do; không âm thầm lấy mẫu rồi tuyên bố đã quét toàn bộ. |
| Trường mới, kiểu hỗn hợp, object sâu hoặc mảng | Đánh dấu không hỗ trợ; DROP cả nhánh nếu không cần downstream, nếu cần thì chặn. Không copy nguyên nhánh chưa duyệt. |
| LLM timeout/quota/JSON sai hoặc ID lạ | Tối đa 1 lần thử lại; giữ kết quả code; chuyển các mục liên quan sang duyệt thủ công. Không gắn là NON_PERSONAL. |
| Không có căn cứ đủ rõ | UNKNOWN; DPO ánh xạ vào mục hợp lệ hoặc DROP; giữ bằng chứng chưa phân loại. |
| Nguồn/phiên quyết định đổi trong lúc xử lý | STALE; hủy khả năng publish, yêu cầu scan hoặc build lại phù hợp. |
| Thiếu khóa HMAC/chuẩn hóa sai | Chặn build; không rơi về hash không khóa hoặc trả giá trị gốc. |
| Ghi đích dở, server khởi động lại | FAILED; staging không được Analyst đọc; dọn riêng tài nguyên của run lỗi trước khi thử lại. |
| Hậu kiểm/join/báo cáo không khớp | FAILED; chỉ ra sai khác; không có tùy chọn bỏ qua để phát hành. |
| Analyst truy cập ngoài quyền | Từ chối tại backend, ghi sự kiện; không chỉ ẩn UI. |

Một API call LLM timeout sau 30 giây; tối đa một lần retry, tối đa 2 request mỗi run bằng một batch profile. Mỗi request giới hạn 8.000 input token và 2.000 output token; ngân sách thiết kế là 0,05 USD/run, tính cả retry theo đơn giá cấu hình được đối chiếu ngày 1. Nếu dự toán vượt ngân sách, dừng AI và chuyển review thủ công; báo token và chi phí ước tính, không coi đó là hóa đơn đã đối soát.

Không cho LLM đọc giá trị mẫu, kể cả chỉ che một phần. Chỉ gửi tên trường được phép, kiểu, quan hệ schema và thống kê dạng; tên trường cũng phải qua allowlist vì có thể chứa nội dung nhạy cảm. Nội dung từ database là dữ liệu, không phải chỉ dẫn cho agent.

LLM không nhìn thấy giá trị gốc nên không được hứa phát hiện ý nghĩa ẩn trong văn bản tự do. Dataset đã che vẫn có thể chứa thông tin liên kết; kết quả chỉ đúng trong phạm vi đã đo.

## 7. Dữ liệu

### 7.1. Nguồn, cấu trúc và cách lấy

Kiên tạo fixture bằng generator có seed cố định; không lấy database thật hoặc danh sách người thật. Mỗi giá trị định danh chỉ là dữ liệu thử nghiệm, không dùng để tra cứu, liên hệ hay xác minh cá nhân. Giữ riêng fixture demo và bộ eval; thay đổi cả tên trường, cấu trúc và phân bố định dạng trong eval để tránh học thuộc.

| Nguồn | Cấu trúc P0 | Tác vụ vàng |
|---|---|---|
| PostgreSQL | `customers` và `orders`; cột scalar; FK định danh dạng text được khai báo | JOIN theo khóa đã HMAC; đếm đơn và cộng số lượng theo nhóm hàng |
| MongoDB | `customers` và `orders`; scalar ở gốc hoặc object lồng tối đa 2 cấp; không mảng | `$lookup` theo khóa đã HMAC; kết quả nhóm tương đương với bản nguồn |

Fixture có các trường định danh, liên hệ, thuộc tính cá nhân có cấu trúc và trường nghiệp vụ. Ví dụ ánh xạ: họ tên → Điều 3 khoản 1; ngày sinh → khoản 2; địa chỉ liên hệ → khoản 4; điện thoại và số định danh → khoản 7. Đây là ví dụ minh họa từ [Điều 3 Nghị định 356](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/356-nd.signed.pdf), không phải danh sách giới hạn của hệ thống.

Bao gồm ca khó: mã đơn có hình thức giống định danh, tên cột viết tắt, cột `col_7` không đủ ngữ cảnh, null/missing, số 0 đầu, sai kiểu, khóa trùng và trường cá nhân nằm trong object. `_id`, mã khách hàng, mã đơn cũng phải được review theo ngữ cảnh; không mặc định miễn xử lý vì do hệ thống sinh.

### 7.2. Danh mục pháp lý và độ phủ

`taxonomy` lưu: `taxonomy_id`, nhãn ngắn, nhóm cơ bản/nhạy cảm, `source_url`, điều/khoản, phạm vi áp dụng, `reviewed_at`, người đối chiếu và phiên bản. Tham chiếu điều khoản có sẵn do người phụ trách nhập; model chỉ chọn ID. Không nạp nội dung chuyên ngành không thuộc bài toán của dự án.

`coverage` tách khỏi taxonomy, theo từng loại và dạng dữ liệu: `AUTO_SUPPORTED`, `REVIEW_REQUIRED` hoặc `UNSUPPORTED`, kèm rule/normalizer, fixture và kết quả eval. Một mục chỉ được công bố AUTO_SUPPORTED sau khi có bằng chứng đạt ngưỡng ở mục 10. Không thay đổi nhãn coverage sau khi xem test để che điểm kém; thu hẹp phạm vi phải ghi thành thay đổi thiết kế và công bố phần chưa đạt.

Ngày 1 lập danh mục tham chiếu các nhóm tại Điều 3–4 và độ phủ áp dụng cho dataset đã chọn. Detector P0 dựa trên cơ chế dùng chung: quy tắc tên/kiểu, kiểm tra định dạng, quan hệ schema và gợi ý AI; thêm loại qua cấu hình có căn cứ, không hard-code rằng chỉ tồn tại 4 hay 5 loại PII. Loại chưa triển khai vẫn hiện rõ là cần review/không hỗ trợ.

Mỗi trường có `classification` (PERSONAL_BASIC / PERSONAL_SENSITIVE / NON_PERSONAL / UNKNOWN), taxonomy ID nếu phân loại cá nhân, nguồn đề xuất và trạng thái duyệt. UNKNOWN có thể được phê duyệt DROP mà không bịa taxonomy ID. NON_PERSONAL phải có giải thích theo ngữ cảnh và được DPO xác nhận.

### 7.3. Snapshot, phân quyền và dữ liệu lưu

Nguồn demo đóng băng theo seed/version trong suốt run; tác vụ seed không chạy cùng lúc. Scanner chỉ đọc. Backend so manifest nguồn trước khi build và trước khi hoàn tất; khác phiên phải STALE. Không hỗ trợ database đang thay đổi liên tục trong MVP.

Tài khoản ghi đích tách khỏi tài khoản đọc nguồn; chỉ được ghi vào vùng đích. PostgreSQL tạo bảng snapshot đã biến đổi, sau đó SQL view trỏ vào bảng này và chỉ cấp SELECT cho tài khoản đọc của ứng dụng. View không trỏ về bảng nguồn: [PostgreSQL view thông thường đọc lại truy vấn khi được dùng](https://www.postgresql.org/docs/current/sql-createview.html), nên chỉ tạo view không đủ giữ nguyên phiên dữ liệu DPO đã duyệt. MongoDB ghi collection snapshot sang database đích riêng.

Metadata của run, policy, quyết định, trạng thái và audit lưu trong schema ứng dụng của PostgreSQL. Không lưu giá trị nguồn vào metadata, prompt, lỗi, báo cáo hay AI log. Fingerprint nguồn dùng HMAC nội bộ; key ở biến môi trường ngoài git. Staging và raw fixture không được đưa vào endpoint Analyst. Đầu ra không được thay đổi sau khi verifier đạt; muốn đổi phải tạo run mới.

Audit tối thiểu: run/dataset ID, actor/role, thời gian, hành động, taxonomy/policy version, lý do review và kết quả kiểm tra. Audit P0 không được mô tả là kho bằng chứng bất biến hoặc chống sửa ở mức production.

## 8. Tech stack (đã chọn cho MVP)

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Backend | Python 3.11, FastAPI, Pydantic | Dùng cùng ngôn ngữ cho xử lý dữ liệu, JSON validation và API |
| Workflow | LangGraph luồng cố định; một bước LLM, không hệ nhiều agent | Có trạng thái và điểm dừng review; giảm tự quyết ngoài phạm vi |
| LLM | OpenAI `gpt-4.1-mini-2025-04-14`, structured output | Chọn snapshot để đo lặp lại; chỉ làm ánh xạ profile nhỏ |
| Frontend | React + TypeScript + Vite | Dashboard 2 vai trò, không cần SSR; Phúc phụ trách |
| Connectors | psycopg cho PostgreSQL; PyMongo cho MongoDB | Hai adapter đưa về một contract chung |
| Biến đổi | Python `hmac` + SHA-256; MASK/DROP bằng code | Kiểm thử được và không cần token vault |
| Lưu state | PostgreSQL schema ứng dụng riêng | Tránh thêm một database thứ ba |
| Vector store | Không dùng | Taxonomy nhỏ, có cấu trúc; không cần tìm kiếm ngữ nghĩa tài liệu |
| Chạy demo | Docker Compose trên một máy demo; DB chỉ ở mạng nội bộ | Lặp lại môi trường và dễ reset fixture |
| CI/deploy | GitHub Actions theo repo; một môi trường demo có HTTPS nếu có URL công khai | Kiểm tra trước merge và giữ demo ổn định |

[Tài liệu model xác nhận structured outputs và snapshot](https://developers.openai.com/api/docs/models/gpt-4.1-mini). Chọn model này là quyết định kỹ thuật khởi đầu, không phải khẳng định tốt nhất; đổi model phải chạy lại eval và sửa tài liệu cùng PR. Phiên bản thư viện và image cụ thể được khóa sau smoke test ngày 1, không tự nâng giữa sprint.

Contract connector gồm `inspect_scope`, `profile_fields`, `read_batches`; phần writer đích tách riêng. Contract profile và action giống nhau cho hai nguồn; chỉ adapter xử lý đường dẫn/cú pháp khác nhau. Backend không chạy query tùy ý do người dùng hoặc model cung cấp.

## 9. Known Ambiguities

Các quyết định scope, hai database, model, HMAC, đầu ra và ngưỡng eval đã chốt ở trên. Những điểm còn thiếu là bằng chứng triển khai và nhu cầu thực tế:

| Chưa biết | Việc phải xác minh | Người / hạn | Khi không đạt |
|---|---|---|---|
| Công suất thực tế của đội | Xác nhận 4 người có khoảng 3 giờ tập trung/ngày trong 14 ngày | Phúc / ngày 1 | Giảm giao diện phụ; tính lại thời hạn, không giả định chắc chắn kịp |
| Repo, key và máy demo dùng được | Clone/run thật, API model thử, đủ tài nguyên cho hai DB, log hook thành công | Long + Tùng / ngày 1 | Ưu tiên gỡ blocker; chế độ manual được phép nhưng không coi AI đã nghiệm thu |
| Danh mục áp dụng đã được đối chiếu đủ | Review nguồn, điều khoản và cách áp dụng từng loại trong fixture | Phúc + Kiên / ngày 1 | Loại chưa xác minh không được tự gắn pháp lý; giữ UNKNOWN/DROP |
| AI có cải thiện so với rule | Đo trên bộ test giữ riêng; theo từng loại và ca mơ hồ | Tùng + Kiên / ngày 7, chốt ngày 12 | Báo đúng kết quả; giảm vai trò AI nếu không có giá trị, không bịa lợi ích |
| Chỉ số có đạt trên máy demo | Ghi cấu hình, latency, sai số, số lần gọi và chi phí thực tế | Long + Kiên / ngày 10–12 | Sửa lỗi hoặc công bố chưa đạt; không đổi số mục tiêu để làm đẹp |
| Người dùng có nhu cầu và chịu dùng | Phỏng vấn 3–5 DPO/data reviewer/Analyst, đo cách làm hiện tại | Phúc / giai đoạn pilot | Điều chỉnh bài toán trước khi mở rộng tính năng |

Ngày 1–14 là ngày của sprint sau khi bắt đầu, không phải hạn lịch đã được chương trình xác nhận. Mọi thay đổi ảnh hưởng hành vi phải sửa brief/PRD/UI/README và coverage trong cùng PR với code.

## 10. Đo lường và điều kiện nghiệm thu

Tất cả là **mục tiêu thiết kế**, chưa có kết quả chạy. Đơn vị đo phát hiện là **trường trong một biến thể schema**, không phải hàng nghìn ô lặp cùng một mẫu.

| Nhóm | Mục tiêu | Bằng chứng phải lưu |
|---|---|---|
| Detection | Precision ≥95%, recall ≥90% cho từng loại công bố AUTO_SUPPORTED | TP/FP/FN theo loại và connector; bộ test giữ riêng, ít nhất 20 trường dương/loại và 40 ca âm tổng; nêu cỡ mẫu nhỏ |
| Giá trị AI | So rules-only với rules+AI trên cùng bộ test | Recall/precision, số mục ABSTAIN, số quyết định DPO phải sửa, latency và chi phí; không đặt mức cải thiện chưa có căn cứ |
| Đúng chính sách | Mọi assertion policy trên fixture đạt | Không có trường ngoài allowlist; MASK/DROP/HMAC đúng; không ghi nguồn |
| Downstream | 2/2 tác vụ đạt | Số ghép/không ghép và tổng theo nhóm giống baseline; không so chuỗi định danh gốc với digest |
| Guardrail | Mọi ca âm bắt buộc đều bị chặn | Analyst gọi API trái quyền; build thiếu review; publish khi fail; nguồn đổi; khóa lỗi; nhánh chưa duyệt |
| Báo cáo | 100% số đếm và trạng thái khớp run | Verifier đối chiếu số trường, số action, unresolved đã DROP, người duyệt và kết quả |
| Trải nghiệm | DPO duyệt ≤5 phút/nguồn với tối đa 20 trường | 3 phiên trên fixture chuẩn; ghi người thử; loại thời gian máy xử lý |
| Hiệu năng | Quét ≤120 giây/nguồn, 2.000 bản ghi, ≤20 trường | 3 lần trên cấu hình được ghi; tách thời gian scan, LLM và build; báo cả lần timeout |
| Chi phí AI | Chi phí ước tính ≤0,05 USD/run, tính retry | Token thực tế và đơn giá/model đã cấu hình; ca vượt dự toán phải chuyển review thủ công |

Khi ground truth là cá nhân, ABSTAIN/UNKNOWN hoặc DROP chưa phân loại **không được tính là phát hiện đúng**; tính vào FN của loại tương ứng. DPO sửa đúng không làm tăng điểm AI trước review. Báo ma trận phân loại, độ phủ và kết quả sau review riêng. Không suy rộng số đo fixture sang dữ liệu doanh nghiệp.

Chỉ nghiệm thu đầy đủ khi cả hai nguồn có bằng chứng P0, đạt ngưỡng đã công bố và không còn lỗi guardrail nghiêm trọng. Nếu demo luồng chạy nhưng eval chưa đạt, ghi “demo quy trình — chưa đạt nghiệm thu chất lượng”. Kế hoạch 14 ngày, chủ việc và mục tiêu dài hạn: [mvp-decisions.md](mvp-decisions.md).
