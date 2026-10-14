# PIIGuard Shield - P1 Control Status

MVP/Gate 2 đã hoàn thành. File này chỉ giữ trạng thái ngắn để team biết P1 đang kiểm soát việc gì.

## Đã Có

| Mảng | Trạng thái |
|---|---|
| Backend | FastAPI endpoints cho source, run, decision, build, report, dataset |
| Data | PostgreSQL + MongoDB fixture, golden labels, downstream verifier |
| AI detection | Rules/regex baseline, BM25/hybrid/LLM optional, zero raw PII prompt |
| Frontend | DPO flow và Analyst preview chạy được |
| Evidence | Gate 2 demo/eval/report lưu tại `docs/archive/gate_2/README.md` |

## P1 Đang Control

| Ưu tiên | Việc cần giữ/chỉnh |
|---|---|
| P1-1 | Quét sâu các field/value patterns trong PostgreSQL/MongoDB hiện có |
| P1-2 | Risk/report/UI chip đồng bộ với `risk_scorer` |
| P1-3 | AI fallback rõ: rules-only chạy ổn, LLM chỉ hỗ trợ field mơ hồ |
| P1-4 | Audit/log không lộ raw PII, credential, API key |
| P1-5 | CI xanh: `ruff check .` và `pytest` |

## Không Làm Trong P1 Nếu Chưa Có Thời Gian

- Realtime CDC.
- KMS/SSO production.
- Mở rộng sang ảnh/voice hoặc cấu trúc dữ liệu mới (chỉ tập trung PostgreSQL + MongoDB).
