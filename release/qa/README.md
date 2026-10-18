# Release QA — Kiểm thử luồng end-to-end (DPO + Analyst)

Bộ kiểm thử tự động bằng Playwright chạy trên trình duyệt Chrome thật. Bộ test đi hết luồng chính của sản phẩm:

1. DPO quét dữ liệu.
2. DPO duyệt, build snapshot, kiểm định rồi phát hành.
3. Analyst khai thác dữ liệu đã bảo vệ.
4. Kiểm tra rào chắn bảo mật và vòng đời dataset.

Mọi lỗi tìm được đều được ghi log, lên task sửa, rồi chạy lại cho tới khi đạt hết.

## Cấu trúc

```text
release/qa/
├── README.md                 # file này
├── playwright.config.ts      # tự dựng stack QA cô lập (backend :8010 + Vite :5174)
├── scenarios/                # kịch bản test dạng tài liệu (người đọc được)
│   ├── 01-dpo-main-flow.md
│   ├── 02-analyst-flow.md
│   └── 03-guardrails-lifecycle.md
├── specs/                    # spec Playwright tương ứng 1-1 với scenarios/
│   ├── helpers.ts            # đăng nhập, bắt lỗi console/5xx, dò rò rỉ PII gốc
│   ├── 01-dpo-main-flow.spec.ts
│   ├── 02-analyst-flow.spec.ts
│   └── 03-guardrails-lifecycle.spec.ts
├── scripts/
│   ├── start-stack.sh        # dựng stack QA thủ công (dùng khi quay demo)
│   ├── stop-stack.sh
│   └── sample_raw_pii.py     # lấy mẫu PII gốc từ DB nguồn để so khớp rò rỉ (không bao giờ in ra)
├── logs/ERROR_LOG.md         # nhật ký lỗi: hiện tượng, nguyên nhân gốc, mức độ, trạng thái
├── tasks/                    # task sửa lỗi QA-xx (mỗi lỗi một file)
└── reports/                  # báo cáo từng vòng chạy (run-01 baseline, run-02 sau sửa, …)
```

## Môi trường QA cô lập

`playwright.config.ts` tự khởi động và tự tắt hai server. Bộ test không đụng vào server `:8000`/`:5173` đang chạy để dev.

| Thành phần | Cấu hình QA | Lý do |
| --- | --- | --- |
| Backend | `uvicorn` cổng **8010** | Không đụng server dev |
| Metadata | `DATABASE_URL=sqlite:///./data/qa_app.db`, xóa trước mỗi lần chạy | Mỗi vòng test bắt đầu sạch: run #1, chưa có dataset |
| Snapshot | `SNAPSHOT_SCHEMA=piiguard_qa_snapshot`, `MONGO_SNAPSHOT_DB=mydatabase_qa_protected` | Số run của QA không bao giờ ghi đè snapshot thật của dev |
| AI | `OPENAI_MODEL=gpt-4o-mini` (đổi bằng `QA_OPENAI_MODEL`) | Xem ENV-01 trong log lỗi |
| Frontend | Vite cổng **5174**, `VITE_API_URL=/api/v1` qua proxy | Tránh CORS, không đụng server dev |
| Nguồn dữ liệu | PostgreSQL/Mongo Docker local theo `.env` của repo (seed tổng hợp) | Không dùng dữ liệu thật |

## Chạy

```bash
# Tiền điều kiện: docker compose up -d db mongodb (đã seed), .venv và front_end/node_modules đã cài
cd release/qa
npm install            # lần đầu
npm test               # toàn bộ 22 test case, ~3–5 phút
npm run test:dpo       # chỉ luồng DPO
npm run report         # mở báo cáo HTML của lần chạy gần nhất
```

Mỗi test fail khi gặp một trong ba điều sau, kể cả khi điều kiện hiển thị vẫn đúng:

- Có lỗi console trên trình duyệt.
- API trả lỗi 5xx.
- Màn hình hoặc file tải về chứa giá trị PII gốc.

Cách dò PII gốc:

- Bộ test lấy mẫu giá trị thật từ DB nguồn.
- Báo cáo chỉ ghi **tên cột** bị lộ, không bao giờ in giá trị.

## Quy trình xử lý lỗi

1. Chạy test, rồi ghi kết quả vào `reports/run-NN.md`.
2. Ghi mỗi lỗi vào `logs/ERROR_LOG.md` gồm hiện tượng, nguyên nhân gốc, mức độ và test bắt được nó.
3. Lên task `tasks/QA-xx-*.md` gồm giải pháp và nghiệm thu.
4. Sửa lỗi kèm unit test (pytest/vitest) nếu áp dụng được.
5. Chạy lại toàn bộ cho tới khi đạt hết, rồi cập nhật trạng thái trong log và task.
