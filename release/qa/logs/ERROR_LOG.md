# Error Log — Release QA

Nhật ký lỗi phát hiện khi chạy kiểm thử E2E luồng DPO + Analyst. Mỗi mục ghi hiện tượng, nguyên nhân gốc, mức độ, test bắt được và trạng thái.

**Bảo mật nhật ký:** Không ghi giá trị PII gốc, token hay mật khẩu DB vào file này. Khi có rò rỉ, chỉ ghi tên cột.

**Môi trường:**
- Nhánh `release/e2e-demo-video`, tách từ `develop` @ `7625ff6`.
- macOS, Chrome 155, Node 22, Python 3.11.
- PostgreSQL và MongoDB chạy Docker local với dữ liệu seed tổng hợp.

## Tổng hợp

| ID | Mức độ | Tóm tắt | Test | Task | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| BUG-01 | Cao | Rời trang ngay sau đăng nhập thì mất phiên | TC-SEC-02 | [QA-01](../tasks/QA-01-session-lost-on-navigation.md) | Đã sửa |
| BUG-02 | Nghiêm trọng | Không build được run mới khi đã có dataset phát hành; snapshot dataset cũ bị ghi đè | TC-LC-01 | [QA-02](../tasks/QA-02-build-blocked-shared-snapshot.md) | Đã sửa |
| BUG-03 | Trung bình | Nút "Tải CSV" của Analyst bị cắt chữ | TC-AN-04 | [QA-03](../tasks/QA-03-analyst-header-button-clipped.md) | Đã sửa |
| BUG-04 | Cao | CSV "bảng customers" chứa cột của cả 5 bảng, trùng tên cột | TC-AN-03 | [QA-04](../tasks/QA-04-csv-exports-all-tables.md) | Đã sửa |
| BUG-05 | Cao (bảo mật) | Báo cáo tuân thủ mở bằng URL chứa token phiên; mọi API nhận `?token=` | TC-DPO-09, TC-SEC-03 | [QA-05](../tasks/QA-05-report-token-in-url.md) | Đã sửa |
| BUG-06 | Trung bình | Thẻ "Cột PII phát hiện" hiện tổng số cột (53) thay vì số cột PII (21) | TC-DPO-04 | [QA-06](../tasks/QA-06-kpi-pii-count-shows-total.md) | Đã sửa |
| BUG-07 | Thấp | Hướng dẫn Analyst hứa "che một phần" nhưng MASK thay toàn bộ bằng `***` | TC-AN-05 | [QA-07](../tasks/QA-07-mask-hint-promises-partial.md) | Đã sửa |
| BUG-08 | Cao | Build lỗi "UndefinedTable" khi phạm vi quét thiếu `order_details` | TC-LC-01 | [QA-08](../tasks/QA-08-verifier-fails-on-partial-scope.md) | Đã sửa |
| BUG-09 | Cao | Analyst chỉ tải được 1 bảng và tối đa 200 dòng, không có cách lấy đủ dataset để phân tích | TC-AN-03, TC-AN-03b | [QA-09](../tasks/QA-09-full-dataset-export.md) | Đã sửa |
| ENV-01 | Cao (môi trường dev) | `OPENAI_MODEL=GPT-4o-mini` viết hoa nên AI không chạy | TC-DPO-03 | — | Cần chủ repo sửa `.env` |
| ENV-02 | Cao (môi trường dev) | `DATABASE_URL` trỏ vào chính DB nguồn | — | — | Cần chủ repo sửa `.env` |
| ENV-03 | Thấp | Vite dev :5173 lỗi resolve `@/app/App` (server cũ) | — | — | Khởi động lại là hết |
| OBS-01 | Cần pháp chế | Số điều khoản trên `/dpo/rules` còn theo cách đánh số cũ | — | — | Ghi nhận, chưa sửa |
| OBS-02 | Sản phẩm | MASK = `***` toàn bộ; tài liệu kiến trúc mô tả `0912***789` | — | — | Ghi nhận |
| OBS-03 | Thấp | Báo cáo tuân thủ ghi giờ UTC, app ghi giờ địa phương | — | — | Ghi nhận |
| OBS-04 | Thấp | NER gắn nhãn `[CCCD]` cho mã đơn hàng 12 số trong ghi chú tự do | — | — | Ghi nhận |
| OBS-05 | Thấp | `orders.ship_name` (seed Northwind = tên công ty) bị phân loại FULL_NAME và che toàn bộ | TC-AN-03 (báo động giả) | — | Ghi nhận |

---

## BUG-01 — Mất phiên khi điều hướng lúc đang kiểm tra phiên
- **Hiện tượng:** Đăng nhập DPO rồi mở ngay `/dpo/runs/17` (hoặc F5) thì bị đẩy về `/login`. Network cho thấy không có request `/me` nào ở trang mới: phiên đã bị xóa từ trước.
- **Nguyên nhân gốc:**
  - `fetchCurrentUser` (`authApi.ts`) `catch {}` mọi lỗi rồi trả `null`.
  - Khi trang cũ điều hướng đi, request `/me` đang chạy bị hủy, dẫn tới `null`, rồi `AuthProvider.logout()`, rồi `clearStoredSession()` ngay lúc trang tắt.
  - Lỗi mạng tạm thời cũng gây đăng xuất theo cùng đường.
- **Tái hiện:** Đăng nhập rồi gọi `page.goto('/dpo/runs')` ngay, không chờ. Kết quả là đang ở trang `/login`.

## BUG-02 — Build bị chặn bởi dataset đã phát hành / snapshot bị ghi đè
- **Hiện tượng:**
  - Bấm Lưu ở run #17 thì `POST /runs/17/build` trả **409**.
  - Banner hiện chuỗi tiếng Anh thô: "Build blocked: Target snapshot is currently occupied by active PUBLISHED dataset id=8…".
  - Dataset #8 thuộc run #15, không phải run đang thao tác.
- **Bằng chứng dữ liệu (metadata dev):** Dataset #2 (run 7) và #8 (run 15) **cùng** `output_location = postgres://piiguard_snapshot/…`. Run 15 build sau đã ghi đè snapshot mà dataset #2 (vẫn PUBLISHED) đang phục vụ Analyst.
- **Nguyên nhân gốc:**
  - `SourceConnection.pg_snapshot_schema()` và `mongo_snapshot_db()` chỉ thêm `_run{id}` cho nguồn người dùng. Nguồn demo dùng tên cố định.
  - Kiểm tra xung đột dùng `db.scalar()`, nên chỉ xét dataset PUBLISHED đầu tiên.
- **Ảnh hưởng demo:** Sau lần phát hành đầu, không thể demo lại luồng chính nếu chưa thu hồi.

## BUG-03 — Nút "Tải CSV" bị cắt
- **Hiện tượng:** Ở viewport 1440px, nút gãy 3 dòng và tràn mép card (ảnh `reports/run-01.md`).
- **Nguyên nhân gốc:** Chuỗi `output_location` dài không có khoảng trắng. Flex item thiếu `minWidth: 0` nên không co được.

## BUG-04 — CSV xuất sai bảng
- **Hiện tượng:** File tải về có header 52 cột của mọi bảng, `order_id` và `customer_id` lặp lại.
- **Nguyên nhân gốc:** `buildProtectedCsv` không lọc `columns` theo `selected_table`, trong khi lưới hiển thị có lọc.

## BUG-09 — Không tải được toàn bộ dataset
- **Nguồn:** Phản hồi của chủ sản phẩm sau run 03 ("CSV tải về phải đầy đủ bảng để Analyst phân tích").
- **Hiện tượng:** Nút "Tải CSV" chỉ xuất bảng đang xem. Trình duyệt tự ghép CSV từ API preview nên mỗi lần tối đa 200 dòng (`customers` có nhiều hơn thì bị thiếu mà không báo).
- **Nguyên nhân gốc:** Không có API xuất dữ liệu. Frontend dùng tạm API xem trước (giới hạn `limit ≤ 200`) để ghép CSV.

## BUG-05 — Token phiên trong URL
- **Hiện tượng:** Popup báo cáo có URL `/api/v1/runs/1/report?format=html&token=<redacted>`.
- **Nguyên nhân gốc:**
  - `handleOpenReport` ghép token vào query.
  - Backend `get_current_token` nhận `token` từ query cho **mọi** route.
- **Rủi ro:** Token lộ qua lịch sử trình duyệt, access log, link chia sẻ và ảnh chụp màn hình. Token có quyền DPO.

## BUG-06 — KPI số cột PII sai
- **Hiện tượng:** "Cột PII phát hiện 53 cột", trong khi L3 2 + L2 17 + L1 2 = 21. Lịch sử quét và báo cáo đều ghi 21.
- **Nguyên nhân gốc:** `RunKpiCards` hiển thị `stats.total`.

## BUG-07 — Hướng dẫn MASK sai
- **Hiện tượng:** Tooltip ghi "Đã che một phần", trong khi lưới hiện `***` cho toàn bộ giá trị.
- **Nguyên nhân gốc:** Câu chữ trong `getTransformAnalystHint` không khớp `mask_value` của backend.

## BUG-08 — Verifier demo truy vấn bảng nằm ngoài phạm vi quét
- **Hiện tượng:** Run #2 chỉ gồm `customers`, `orders`. Bấm Lưu thì trạng thái chuyển "Lỗi"; kiểm định ghi `postgres_snapshot_pipeline` Không đạt, chi tiết "Pipeline error: UndefinedTable".
- **Phát hiện:** Run 02 (TC-LC-01), sau khi QA-02 gỡ được lỗi 409 vốn che mất lỗi này.
- **Nguyên nhân gốc:** `run_postgres_verifiers` luôn chạy hai kiểm tra baseline trên `orders` ⨝ `customers` ⨝ `order_details`, bất kể bảng nào được build.

## ENV-01 — Tên model LLM sai chữ hoa
- **Hiện tượng:**
  - Các cột `quantity`, `discount`, `subject`, `status` bị đánh "Chưa xác định", độ tin cậy AI 0%.
  - Lý do hiện trên UI: "LLM unavailable (OpenAIModelNotFoundError); cần DPO xem xét."
  - Đề xuất mặc định là MASK cho cả số lượng và giảm giá.
- **Nguyên nhân gốc:** `.env` local có `OPENAI_MODEL=GPT-4o-mini`. Model ID của OpenAI phân biệt hoa thường, đúng là `gpt-4o-mini` (như `.env.example`).
- **Xử lý:**
  - Stack QA đặt `OPENAI_MODEL=gpt-4o-mini` qua biến môi trường, không sửa `.env`.
  - **Việc của chủ repo:** sửa dòng này trong `.env` rồi khởi động lại backend :8000.

## ENV-02 — Metadata app nằm chung DB nguồn
- **Hiện tượng:** Nguồn "SQL demo" liệt kê **29 bảng**, gồm cả bảng nội bộ của app như `runs`, `datasets`, `audit_events`, `vault_tokens`, `field_decisions`, `checkpoints*`. Các run cũ trên dev (8, 9, 10, 13) đã quét và **phát hành** cả những bảng này cho Analyst.
- **Nguyên nhân gốc:** `.env` local đặt `DATABASE_URL` trỏ cùng `localhost:5432/mydatabase` với `SOURCE_DATABASE_URL`.
- **Xử lý:**
  - Stack QA dùng SQLite riêng (`data/qa_app.db`).
  - **Đề xuất:** Đưa `DATABASE_URL` về DB riêng, ví dụ `sqlite:///./data/app.db` như mặc định hoặc một database Postgres khác. Sau đó thu hồi các dataset cũ đã phát hành bảng nội bộ.

## ENV-03 — Vite dev :5173 hỏng
- **Hiện tượng:** Trang trắng với overlay "Failed to resolve import "@/app/App" from "src/main.tsx"". File vẫn tồn tại; server mới ở :5174 chạy bình thường.
- **Xử lý:** Khởi động lại `npm run dev`.

## OBS-01 — Số điều khoản trên trang Quy định pháp luật
- `/dpo/rules` ghi "Luật 91/2025/QH15 … Điều 9 (Quyền chủ thể), Điều 31 (Dữ liệu nhạy cảm)" và "Nghị định 356 … Điều 17, Điều 24".
- Các số này có dấu hiệu còn theo cách đánh số của văn bản cũ.
- Cần người phụ trách pháp lý đối chiếu văn bản gốc trước khi sửa. QA không tự sửa nội dung pháp lý.

## OBS-02 — MASK che toàn bộ
- Backend MASK trả `***`. `ARCHITECTURE.md` và `DEMO_FLOW.md` mô tả MASK là "che đoạn giữa (`0912***789`)".
- Backend đã có action `PARTIAL` (`partial_mask`).
- Chọn hành vi nào là quyết định sản phẩm. QA chỉ sửa câu chữ hướng dẫn (BUG-07).

## OBS-03 — Múi giờ báo cáo
Báo cáo tuân thủ ghi "2026-10-17 21:06:27 UTC", trong khi nhật ký app ghi 04:06 (giờ Việt Nam). Cả hai đều đúng nhưng dễ gây nhầm khi đối chiếu.

## OBS-04 — NER nhận nhầm mã đơn hàng
Ghi chú tự do "Don hang cu #<12 chữ số> da giao" bị che thành `#[CCCD]`. An toàn (che thừa), nhưng làm giảm giá trị phân tích của mã đơn hàng.

## OBS-05 — `ship_name` chứa tên công ty
- Trong seed Northwind, `orders.ship_name` là tên công ty nhận hàng, trùng với `customers.company_name`. Bộ quét phân loại cột này là FULL_NAME và che `***`, tức che thừa nhưng an toàn.
- Bộ dò rò rỉ ban đầu coi việc `company_name` xuất hiện trong CSV là "lộ `orders.ship_name`". Đây là báo động giả.
- Đã bỏ cột này khỏi mẫu dò (`scripts/sample_raw_pii.py`).
