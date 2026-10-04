# PIIGuard Shield

> Hỗ trợ DPO rà soát dữ liệu cá nhân trong PostgreSQL và MongoDB, duyệt biện pháp bảo vệ và chia sẻ dataset vẫn dùng được cho tác vụ phân tích đã kiểm tra.

**Mã đề:** DATA-06 · **Đội:** P-138 · **Chương trình:** VinUni AI20K Build Phase — Cohort 4  
**Bản thiết kế:** 21/09/2026 · **MVP:** 14 ngày / 4 người

Đây là bộ tài liệu triển khai MVP. Trạng thái code thực tế phải được đối chiếu bằng test/evidence trong repo, không đánh dấu xong chỉ vì tài liệu đã mô tả.

## Vấn đề (Problem)

DPO và đội dữ liệu mất công rà từng trường trước khi cung cấp dữ liệu cho Analyst. Họ vừa có thể bỏ sót dữ liệu cá nhân, vừa có thể làm hỏng phép liên kết nếu che khóa không nhất quán. Cần một quy trình có căn cứ, người duyệt và kiểm tra tác động trước khi chia sẻ.

## Giải pháp (Solution)

**PostgreSQL hoặc MongoDB → chọn bảng/collection → quét → DPO duyệt → tạo snapshot đã xử lý → kiểm tra downstream → DPO phát hành → Analyst dùng.**

- Hai connector dùng chung bộ xử lý và chính sách; cả SQL và NoSQL là P0.
- Danh mục phân loại có nguồn pháp lý, tách khỏi độ phủ detector; không đóng cứng thành 4–5 trường PII.
- LLM hỗ trợ schema mơ hồ từ profile đã lọc; code kiểm tra, biến đổi và thực thi quyền; DPO quyết định.
- Chọn MASK/DROP/HMAC theo mục đích dùng PII: lookup/mapping/aggregate dùng HMAC một chiều; trường không cần downstream thì MASK/DROP; dữ liệu cần trả về user và ảnh/voice nằm ngoài P0.
- Snapshot đầu ra riêng, nguồn chỉ đọc; SQL join và MongoDB lookup phải đạt trước khi phát hành.
- UI không hiển thị raw PII value cho bất kỳ vai trò nào, kể cả DPO. DPO duyệt bằng field path, kiểu dữ liệu, pattern/profile đã lọc, căn cứ, action đề xuất và tác động downstream.
- Báo cáo web/JSON, cảnh báo có lý do, lịch sử review; không tuyên bố tuân thủ tuyệt đối.

Căn cứ danh mục: [Luật 91/2025/QH15](https://chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroupid=3) và [Nghị định 356/2025/NĐ-CP, Điều 3–4](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/356-nd.signed.pdf). Mapping, độ phủ và giới hạn: [PRD](docs/prd.md).

## Target User

| Vai trò             | Giá trị nhận được                                                        |
| ------------------- | ------------------------------------------------------------------------ |
| DPO / Data reviewer | Review có căn cứ, quyết định rõ và bằng chứng xử lý                      |
| Analyst             | Dataset được phép dùng, có kiểm tra tác vụ và thời điểm snapshot rõ ràng |

## Phạm vi MVP 14 ngày

| Có trong P0                                                                                              | Để sau MVP                                        |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| PostgreSQL (CSDL quan hệ doanh nghiệp đầy đủ nhiều bảng) + MongoDB (2 collections `customers`, `orders`) | Nhà cung cấp database khác, dữ liệu thật          |
| ≤2.000 bản ghi và ≤20 đường dẫn trường mỗi nguồn; scalar và object lồng giới hạn                         | Mảng, nội dung tự do, file/OCR, schema tùy ý      |
| Quét mọi trường trong phạm vi, DPO review, xử lý UNKNOWN bằng review hoặc DROP                           | Nhận diện tự động đầy đủ mọi loại dữ liệu cá nhân |
| 2 tài khoản demo có kiểm tra quyền tại backend                                                           | SSO, đa tổ chức, RBAC đầy đủ                      |
| Snapshot SQL/NoSQL, 2 tác vụ downstream định trước                                                       | Realtime, truy vấn tùy ý, join xuyên database     |
| MASK/DROP/HMAC; báo cáo và audit tối thiểu                                                               | Token vault, KMS, vận hành production             |

PostgreSQL fixture chính nằm tại `data/fixtures/seed.sql`. Đây là dữ liệu mô phỏng 100%, dựa trên schema Northwind và được bổ sung PII Việt Nam synthetic như CCCD, số điện thoại, email, mã số thuế, ticket hỗ trợ và OCR text từ hồ sơ KYC giả lập. Golden dataset phải có nhãn chuẩn theo field, ca âm dễ nhầm, expected policy và expected downstream result. Nếu file nhãn nội bộ cần `sample_value` để eval, các giá trị đó chỉ dùng trong fixture/eval và không được hiển thị trong UI, report, prompt hoặc log.

## Tech Stack

| Layer       | Lựa chọn                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Backend     | Python 3.11 + FastAPI + Pydantic                                                                                           |
| AI workflow | LangGraph luồng cố định; OpenAI `gpt-4.1-mini-2025-04-14`, structured output                                               |
| Frontend    | React + TypeScript + Vite                                                                                                  |
| Database    | PostgreSQL (CSDL quan hệ doanh nghiệp đầy đủ nhiều bảng) + MongoDB; psycopg + PyMongo; state trong schema PostgreSQL riêng |
| Protection  | MASK/DROP và Python HMAC-SHA-256; không vector store                                                                       |
| DevOps      | Docker Compose + GitHub Actions; máy demo riêng, database không công khai                                                  |

Quyết định kiến trúc và phương án đánh đổi: [ARCHITECTURE.md](ARCHITECTURE.md) và [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md).

## Quick Start

MVP cắm database bằng **connection string**, không ưu tiên upload file database. Có hai nhóm database:

```text
Input  = source database read-only
Output = protected snapshot database cho Analyst
```

PostgreSQL:

```env
SOURCE_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydatabase
SNAPSHOT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/snapshot_out
ENABLE_PG_SNAPSHOT=true
```

MongoDB:

```env
MONGO_URI=mongodb://admin:admin@localhost:27017/?authSource=admin
MONGO_DB=mydatabase
MONGO_SNAPSHOT_DB=mydatabase_protected
ENABLE_MONGO=true
```

Không commit `.env`, API key, password, HMAC secret hoặc connection string có credential.

```bash
git clone https://github.com/AI20K-Build-Phase-Cohort-4/P-138.git
cd P-138
python3.11 -m venv .venv
source .venv/bin/activate
cp .env.example .env
pip install -r requirements.txt
uvicorn src.main:app --reload
```

Fixture demo:

```text
PostgreSQL seed: data/fixtures/seed.sql
MongoDB seed   : data/fixtures/mongo/
```

Sau khi server chạy, mở `http://localhost:8000/docs`. Flow API chính:

```text
POST /sessions
GET /sources
GET /sources/{id}/scope
POST /runs
GET /runs/{id}
PUT /runs/{id}/decisions
POST /runs/{id}/build
POST /datasets/{id}/publish
GET /datasets/{id}/preview
```

`sql-demo` và `nosql-demo` hiện là hai source demo trả từ backend. Source động cho doanh nghiệp phải nhận connection string, test connection, đọc scope, cho DPO chọn bảng/collection, rồi mới scan PII trong phạm vi đã chọn.

## GitHub Actions self-hosted runner (máy Phúc)

Runner `team-138-rin1652` được đăng ký cho repo P-138 với nhãn `team-138`. Thư mục `actions-runner/` là runtime của GitHub Runner, chỉ tồn tại local và không được commit.

Khi mở Mac và muốn CI nhận job, chạy trong terminal:

```bash
cd /Users/phucnguyen/Desktop/AI/team_build_phase/P-138/actions-runner
./run.sh
```

Giữ terminal này mở và để Mac thức, có mạng. Kiểm tra runner:

```bash
./svc.sh status
```

Không chạy `svc.sh` bằng `sudo`; runner macOS được cài dưới user hiện tại. Nếu gập máy làm Mac sleep, runner sẽ offline; job dùng `runs-on: self-hosted` sẽ chờ hoặc có thể fail nếu đang chạy.

## Project Structure

> 📖 **Xem bản đồ cây thư mục và phân chia trách nhiệm chi tiết cho từng thành viên tại:** [**PROJECT_STRUCTURE.md**](PROJECT_STRUCTURE.md)

| Đường dẫn                                      | Nội dung                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) | Phân chia trách nhiệm & cây thư mục chi tiết cho FE, BE, AI Eng, Data Eng |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Kiến trúc hệ thống, security boundary và deploy model |
| [`data/fixtures/postgres/README.md`](data/fixtures/postgres/README.md) | Hướng dẫn seed, 14 bảng quan hệ và đối soát PostgreSQL fixture |
| [`data/fixtures/mongo/README.md`](data/fixtures/mongo/README.md) | Hướng dẫn seed, chỉ mục và đối soát MongoDB fixture (91 customers, 830 orders) |
| `docs/brief.md`, `docs/brief-one-page.pdf`     | Brief theo 6 mục Gate 1; PDF đúng một trang                               |
| `docs/prd.md`                                  | Phạm vi, stories, HITL, lỗi, dữ liệu, stack, ambiguity và nghiệm thu      |
| `docs/ui-flow.md`                              | 2 vai trò, 5 trang/2 modal và trạng thái bắt buộc                         |
| `src/`                                         | API, workflow, connectors, protection, verifier và metadata               |
| `frontend/`                                    | React dashboard                                                           |
| `eval/`, `tests/`                              | Fixture, nhãn, so sánh baseline và kiểm tra guardrail                     |
| `presentation/`                                | Demo script, số liệu thực tế và slide sau nghiệm thu                      |
| `.github/workflows/`                           | CI theo khung repo chương trình                                           |

## API Endpoints

Các endpoint chính cho MVP:

| Endpoint dự kiến              | Quyền          | Hành vi                                                |
| ----------------------------- | -------------- | ------------------------------------------------------ |
| `POST /sessions`              | Tài khoản demo | Xác thực; role do server quyết định                    |
| `GET /sources`                | DPO            | Liệt kê hai nguồn đã cấu hình, không trả credential    |
| `GET /sources/{id}/scope`     | DPO            | Đọc danh sách bảng/collection để chọn phạm vi quét     |
| `POST /runs`                  | DPO            | Tạo run và quét chỉ các bảng/collection đã chọn        |
| `GET /runs/{id}`              | DPO            | Tiến độ, field profile và trạng thái                   |
| `PUT /runs/{id}/decisions`    | DPO            | Review mọi trường; lưu phiên quyết định                |
| `POST /runs/{id}/build`       | DPO            | Xác nhận, kiểm tra trạng thái, tạo staging và verifier |
| `POST /datasets/{id}/publish` | DPO            | Chỉ VERIFIED; ghi audit và cho Analyst dùng            |
| `POST /datasets/{id}/revoke`  | DPO            | Thu hồi quyền dùng qua app                             |
| `GET /datasets`               | Analyst        | Chỉ PUBLISHED                                          |
| `GET /datasets/{id}/preview`  | Analyst        | Đọc dòng thật từ snapshot đã bảo vệ; `?table=&limit=` (tối đa 200) |

Không có endpoint cho Analyst đọc source hoặc nhập query tùy ý. Mọi endpoint kiểm tra quyền và trạng thái ở backend.

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

Làm việc theo `feature/<ten>` → PR có review → `develop` → `main` ổn định. Không push trực tiếp `main`. Thay đổi hành vi phải sửa tài liệu trong cùng PR.

## Team

Phân công triển khai được chọn cho kế hoạch; công suất thực tế cần xác minh ngày 1.

| Thành viên        | Trách nhiệm chính                                                              |
| ----------------- | ------------------------------------------------------------------------------ |
| Nguyễn Đình Phúc  | PO/Team Lead; frontend, scope, đối chiếu căn cứ, demo/pitch                    |
| Trần Xuân Tùng    | Rules/LLM, structured output, workflow phát hiện và đánh giá AI                |
| Nguyễn Trung Kiên | MongoDB connector, fixture/nhãn chuẩn, downstream và eval                      |
| Đoàn Tuấn Long    | Backend, PostgreSQL connector, writer/guardrail, phân quyền và môi trường demo |

Lịch thực hiện, giờ dự kiến và điểm cắt hiện theo Trello của team.

## License
MIT

## Đánh giá (Evaluation)

Chỉ số đánh giá (eval) chính thức của dự án được lấy từ báo cáo chi tiết tại file [eval/results/report_full.md](eval/results/report_full.md).
Xin vui lòng tham khảo file này để xem các kết quả đo lường, precision, recall trên tập dữ liệu chuẩn.

Để chạy lại quá trình đánh giá (eval), bạn có thể sử dụng lệnh sau:

```bash
PYTHONPATH=. python eval/run_eval_full.py
```

## 📚 Tài Liệu Dự Án

### Cho Team Members
- [FAQ - Câu Hỏi Thường Gặp](docs/FAQ_PHUC.md) - Trả lời các câu hỏi về CI, golden dataset, debugging
- [Task Checklist cho Tùng](docs/TUNG_TASKS.md) - Chi tiết các tasks cần hoàn thành
- [CI Runner Guide](docs/CI_RUNNER_GUIDE.md) - Hướng dẫn self-hosted CI runner trên Mac
- [Golden Dataset](docs/GOLDEN_DATASET.md) - Giải thích về tập dữ liệu chuẩn và cách eval

### Cho Development
- [Architecture Diagrams](docs/ux/) - UI/UX flows và system architecture
- [Brand Assets](docs/brand/) - Logo và brand guidelines
- [Evaluation Results](eval/results/report_full.md) - Kết quả đánh giá chính thức

### Quick Start Dev Environment

```bash
# 1. Start backend + databases
docker-compose up -d

# 2. Start frontend (terminal riêng)
cd front_end && npm run dev

# 3. Mở browser
open http://localhost:5173
# Login: dpo/dpo123 hoặc analyst/analyst123

# 4. Check logs
docker logs p-138-backend-1 -f
```
