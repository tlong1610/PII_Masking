# PIIGuard VN

> Hỗ trợ DPO rà soát dữ liệu cá nhân trong PostgreSQL và MongoDB, duyệt biện pháp bảo vệ và chia sẻ dataset vẫn dùng được cho tác vụ phân tích đã kiểm tra.

**Mã đề:** DATA-06 · **Đội:** P-138 · **Chương trình:** VinUni AI20K Build Phase — Cohort 4  
**Bản thiết kế:** 21/09/2026 · **MVP:** 14 ngày / 4 người

Đây là bộ tài liệu triển khai đã chốt phạm vi. Chỉ số, API và hạ tầng dưới đây là yêu cầu cần thực hiện; chưa phải kết quả nghiệm thu code.`
`
## Vấn đề (Problem)

DPO và đội dữ liệu mất công rà từng trường trước khi cung cấp dữ liệu cho Analyst. Họ vừa có thể bỏ sót dữ liệu cá nhân, vừa có thể làm hỏng phép liên kết nếu che khóa không nhất quán. Cần một quy trình có căn cứ, người duyệt và kiểm tra tác động trước khi chia sẻ.`
`
## Giải pháp (Solution)

**PostgreSQL hoặc MongoDB → quét → DPO duyệt → tạo snapshot đã xử lý → kiểm tra downstream → DPO phát hành → Analyst dùng.**

- Hai connector dùng chung bộ xử lý và chính sách; cả SQL và NoSQL là P0.
- Danh mục phân loại có nguồn pháp lý, tách khỏi độ phủ detector; không đóng cứng thành 4–5 trường PII.
- LLM hỗ trợ schema mơ hồ từ profile đã lọc; code kiểm tra, biến đổi và thực thi quyền; DPO quyết định.
- Chọn MASK/DROP/HMAC theo mục đích dùng PII: lookup/mapping/aggregate dùng HMAC một chiều; trường không cần downstream thì MASK/DROP; dữ liệu cần trả về user và ảnh/voice nằm ngoài P0.
- Snapshot đầu ra riêng, nguồn chỉ đọc; SQL join và MongoDB lookup phải đạt trước khi phát hành.
- UI không hiển thị raw PII value cho bất kỳ vai trò nào, kể cả DPO. DPO duyệt bằng field path, kiểu dữ liệu, pattern/profile đã lọc, căn cứ, action đề xuất và tác động downstream.
- Báo cáo web/JSON, cảnh báo có lý do, lịch sử review; không tuyên bố tuân thủ tuyệt đối.

Căn cứ danh mục: [Luật 91/2025/QH15](https://chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroupid=3) và [Nghị định 356/2025/NĐ-CP, Điều 3–4](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/356-nd.signed.pdf). Mapping, độ phủ và giới hạn: [PRD](docs/prd.md).`
`
## Target User

| Vai trò             | Giá trị nhận được                                                        |
| ------------------- | ------------------------------------------------------------------------ |
| DPO / Data reviewer | Review có căn cứ, quyết định rõ và bằng chứng xử lý                      |
| Analyst             | Dataset được phép dùng, có kiểm tra tác vụ và thời điểm snapshot rõ ràng |`
`
## Phạm vi MVP 14 ngày

| Có trong P0                                                                                              | Để sau MVP                                        |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| PostgreSQL (CSDL quan hệ doanh nghiệp đầy đủ nhiều bảng) + MongoDB (2 collections `customers`, `orders`) | Nhà cung cấp database khác, dữ liệu thật          |
| ≤2.000 bản ghi và ≤20 đường dẫn trường mỗi nguồn; scalar và object lồng giới hạn                         | Mảng, nội dung tự do, file/OCR, schema tùy ý      |
| Quét mọi trường trong phạm vi, DPO review, xử lý UNKNOWN bằng review hoặc DROP                           | Nhận diện tự động đầy đủ mọi loại dữ liệu cá nhân |
| 2 tài khoản demo có kiểm tra quyền tại backend                                                           | SSO, đa tổ chức, RBAC đầy đủ                      |
| Snapshot SQL/NoSQL, 2 tác vụ downstream định trước                                                       | Realtime, truy vấn tùy ý, join xuyên database     |
| MASK/DROP/HMAC; báo cáo và audit tối thiểu                                                               | Token vault, KMS, vận hành production             |

PostgreSQL fixture chính nằm tại `data/fixtures/seed.sql`. Đây là dữ liệu mô phỏng 100%, dựa trên schema Northwind và được bổ sung PII Việt Nam synthetic như CCCD, số điện thoại, email, mã số thuế, ticket hỗ trợ và OCR text từ hồ sơ KYC giả lập. Golden dataset phải có nhãn chuẩn theo field, ca âm dễ nhầm, expected policy và expected downstream result. Nếu file nhãn nội bộ cần `sample_value` để eval, các giá trị đó chỉ dùng trong fixture/eval và không được hiển thị trong UI, report, prompt hoặc log. Mục tiêu eval: precision ≥95%, recall ≥90% theo loại công bố hỗ trợ; 2/2 tác vụ downstream đạt; mọi ca chặn bắt buộc được kiểm chứng. Đây là mục tiêu trên fixture, chưa có số đo. Chi tiết: [PRD mục 10](docs/prd.md).`
`
## Tech Stack

| Layer       | Lựa chọn                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Backend     | Python 3.11 + FastAPI + Pydantic                                                                                           |
| AI workflow | LangGraph luồng cố định; OpenAI `gpt-4.1-mini-2025-04-14`, structured output                                               |
| Frontend    | React + TypeScript + Vite                                                                                                  |
| Database    | PostgreSQL (CSDL quan hệ doanh nghiệp đầy đủ nhiều bảng) + MongoDB; psycopg + PyMongo; state trong schema PostgreSQL riêng |
| Protection  | MASK/DROP và Python HMAC-SHA-256; không vector store                                                                       |
| DevOps      | Docker Compose + GitHub Actions; máy demo riêng, database không công khai                                                  |

Model có [structured outputs và snapshot](https://developers.openai.com/api/docs/models/gpt-4.1-mini). Khóa phiên bản dependency/image sau khi chạy smoke test ngày 1. Quyết định và phương án đánh đổi: [MVP decisions](docs/mvp-decisions.md).`
`
## Quick Start

**Chưa xác minh trong repository thực tế.** Các lệnh kế thừa từ khung dự án là điểm xuất phát để Long kiểm tra ngày 1; không coi bộ tài liệu này là một ứng dụng đã chạy được.

```bash
git clone https://github.com/AI20K-Build-Phase-Cohort-4/P-138.git
cd P-138
python3.11 -m venv .venv
source .venv/bin/activate
cp .env.example .env
pip install -r requirements.txt

# Nạp database fixture (CSDL doanh nghiệp mô phỏng đầy đủ + VN PII):
# docker cp data/fixtures/seed.sql p-138-db-1:/tmp/
# docker exec -i p-138-db-1 psql -U postgres -d mydatabase -v ON_ERROR_STOP=1 -f /tmp/seed.sql

uvicorn src.main:app --reload
```

Chỉ dùng lệnh tương ứng sau khi xác nhận `.env.example`, `requirements.txt` và module `src.main:app` tồn tại. Mở `http://localhost:8000/docs` sau khi server chạy. Không commit `.env`, khóa HMAC/API hoặc chuỗi kết nối.

Fixture `data/fixtures/seed.sql` được commit để làm bằng chứng bối cảnh database cho Gate 1. File này không chứa dữ liệu thật; các số CCCD, số điện thoại, email, OCR text và đường dẫn ảnh KYC đều là synthetic/fake để phục vụ demo scan, review, MASK/DROP/HMAC và downstream join.

Quick Start chỉ hoàn tất khi đội bổ sung và chạy thật các bước:

1. Khởi động PostgreSQL/MongoDB theo cấu hình Compose đã kiểm tra; seed fixture CSDL quan hệ đầy đủ cho Postgres và fixture tương ứng cho Mongo.
2. Tạo account nguồn chỉ đọc, writer chỉ có quyền vùng đích và hai tài khoản ứng dụng.
3. Cấu hình model, secret và giới hạn run; khởi động backend/frontend bằng lệnh đúng của repo.
4. Chạy cả hai luồng, ca API trái quyền, verifier và downstream; lưu bằng chứng.
5. Kiểm tra AI logging hook của chương trình; log không chứa dữ liệu/secret.

Các biến cấu hình dự kiến: `OPENAI_API_KEY`, `LLM_MODEL`, credential đọc nguồn/ghi đích tách biệt, `HMAC_SECRET`, `HMAC_KEY_VERSION` và secret phiên đăng nhập. Tên biến phải đồng bộ `.env.example` khi code được triển khai.`
`
## Project Structure

> 📖 **Xem bản đồ cây thư mục và phân chia trách nhiệm chi tiết cho từng thành viên tại:** [**PROJECT_STRUCTURE.md**](PROJECT_STRUCTURE.md)

| Đường dẫn                                      | Nội dung                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) | Phân chia trách nhiệm & cây thư mục chi tiết cho FE, BE, AI Eng, Data Eng |
| `data/fixtures/seed.sql`                       | PostgreSQL fixture synthetic: Northwind + VN PII giả lập cho scan/mask/HMAC |
| `docs/brief.md`, `docs/brief-one-page.pdf`     | Brief theo 6 mục Gate 1; PDF đúng một trang                               |
| `docs/prd.md`                                  | Phạm vi, stories, HITL, lỗi, dữ liệu, stack, ambiguity và nghiệm thu      |
| `docs/ui-flow.md`                              | 2 vai trò, 5 trang/2 modal và trạng thái bắt buộc                         |
| `docs/mvp-decisions.md`                        | Vì sao chọn MVP, lịch 14 ngày, phân công, mục tiêu lâu dài và Q&A         |
| `src/`                                         | API, workflow, connectors, protection, verifier và metadata               |
| `frontend/`                                    | React dashboard                                                           |
| `eval/`, `tests/`                              | Fixture, nhãn, so sánh baseline và kiểm tra guardrail                     |
| `presentation/`                                | Demo script, số liệu thực tế và slide sau nghiệm thu                      |
| `.github/workflows/`                           | CI theo khung repo chương trình                                           |`
`
## API Endpoints

Contract thiết kế; **chưa xác nhận route đã tồn tại**. Tên path có thể điều chỉnh cùng PR với frontend.

| Endpoint dự kiến              | Quyền          | Hành vi                                                |
| ----------------------------- | -------------- | ------------------------------------------------------ |
| `POST /sessions`              | Tài khoản demo | Xác thực; role do server quyết định                    |
| `GET /sources`                | DPO            | Liệt kê hai nguồn đã cấu hình, không trả credential    |
| `POST /runs`                  | DPO            | Kiểm tra phạm vi, tạo run và quét                      |
| `GET /runs/{id}`              | DPO            | Tiến độ, field profile và trạng thái                   |
| `PUT /runs/{id}/decisions`    | DPO            | Review mọi trường; lưu phiên quyết định                |
| `POST /runs/{id}/build`       | DPO            | Xác nhận, kiểm tra trạng thái, tạo staging và verifier |
| `POST /datasets/{id}/publish` | DPO            | Chỉ VERIFIED; ghi audit và cho Analyst dùng            |
| `POST /datasets/{id}/revoke`  | DPO            | Thu hồi quyền dùng qua app                             |
| `GET /runs/{id}/report`       | DPO            | Báo cáo không chứa giá trị nguồn                       |
| `GET /datasets`               | Analyst        | Chỉ PUBLISHED                                          |
| `GET /datasets/{id}/preview`  | Analyst        | Chỉ preview đầu ra được phép                           |
| `POST /datasets/{id}/task`    | Analyst        | Chạy tác vụ cố định trên PUBLISHED                     |

Không có endpoint cho Analyst đọc source hoặc nhập query tùy ý. Mọi endpoint kiểm tra quyền và trạng thái ở backend.`
`
## Deliverables Checklist

Mẫu Gate 1 có **4 deliverable**: brief, PRD, UI Flow và **repo + AI Log setup**. README là một phần của repo setup, không thay thế phần chạy thật.

- [x] Brief đủ 6 mục; kèm PDF một trang.
- [x] PRD đủ 9 mục mẫu và tiêu chí nghiệm thu.
- [x] UI Flow đủ hai vai trò, xác nhận, loading, lỗi và empty state.
- [x] README và bản quyết định MVP đồng bộ phạm vi.
- [ ] Remote trỏ đúng repo P-138 của Cohort 4; dependencies cài được.
- [ ] `.env` có secret ngoài git; server và Swagger chạy thật.
- [ ] Hai database/fixture và hai tài khoản hoạt động.
- [ ] Nhánh `develop`, PR tài liệu được người khác review/merge; CI đạt.
- [ ] Hook AI log đã hoạt động và log đến grading server.
- [ ] Bằng chứng eval, guardrail và downstream của cả hai nguồn.
- [ ] Demo, video, slide và URL nếu chương trình yêu cầu.

Không đánh dấu các mục chưa có bằng chứng. Không sao chép hạn lịch hoặc tên org Cohort 3 trong mẫu sang Cohort 4. Theo mẫu được cung cấp, G2 yêu cầu ít nhất 10 PR có ý nghĩa đã merge; kế hoạch chia việc phải đáp ứng, không tạo PR rỗng chỉ để đủ số.

Làm việc theo `feature/<ten>` → PR có review → `develop` → `main` ổn định. Không push trực tiếp `main`. Thay đổi hành vi phải sửa tài liệu trong cùng PR.`
`
## Team

Phân công triển khai được chọn cho kế hoạch; công suất thực tế cần xác minh ngày 1.

| Thành viên        | Trách nhiệm chính                                                              |
| ----------------- | ------------------------------------------------------------------------------ |
| Nguyễn Đình Phúc  | PO/Team Lead; frontend, scope, đối chiếu căn cứ, demo/pitch                    |
| Trần Xuân Tùng    | Rules/LLM, structured output, workflow phát hiện và đánh giá AI                |
| Nguyễn Trung Kiên | MongoDB connector, fixture/nhãn chuẩn, downstream và eval                      |
| Đoàn Tuấn Long    | Backend, PostgreSQL connector, writer/guardrail, phân quyền và môi trường demo |

Lịch thực hiện, giờ dự kiến và điểm cắt: [mvp-decisions.md](docs/mvp-decisions.md).`
`
## License
MIT

## Đánh giá (Evaluation)

Chỉ số đánh giá (eval) chính thức của dự án được lấy từ báo cáo chi tiết tại file [eval/results/report_full.md](eval/results/report_full.md).
Xin vui lòng tham khảo file này để xem các kết quả đo lường, precision, recall trên tập dữ liệu chuẩn.

Để chạy lại quá trình đánh giá (eval), bạn có thể sử dụng lệnh sau:

`ash
PYTHONPATH=. python eval/run_eval_full.py
`
