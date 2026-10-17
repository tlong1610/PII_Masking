# Run 03 — Kết quả cuối

- **Ngày chạy:** 2026-10-18 · Nhánh `release/e2e-demo-video`
- **Kết quả:** **21/21 đạt** (49 giây)
- **Không có:** lỗi console nào, API 5xx nào, giá trị PII gốc nào trên màn hình, trong báo cáo hay trong file CSV

```
  ✓  1 TC-DPO-01 DPO signs in and lands on the scan workspace
  ✓  2 TC-DPO-02/03 DPO picks a scope and scans it
  ✓  3 TC-DPO-04 KPI "PII columns" counts PII columns, not every column
  ✓  4 TC-DPO-05 review screen never shows raw PII
  ✓  5 TC-DPO-06 overriding a recommendation requires a reason
  ✓  6 TC-DPO-07 sensitive (L3) data cannot be kept raw
  ✓  7 TC-DPO-08 saving builds a protected snapshot that passes verification
  ✓  8 TC-DPO-09 compliance report opens without putting the session token in the URL
  ✓  9 TC-DPO-10 DPO publishes and the audit log records it
  ✓ 10 TC-AN-01 Analyst sees the published dataset
  ✓ 11 TC-AN-02 every table preview is protected and sensitive columns are dropped
  ✓ 12 TC-AN-03 CSV download holds exactly the selected table, protected
  ✓ 13 TC-AN-04 dataset header actions stay inside the card
  ✓ 14 TC-AN-05 column guide explains every transform truthfully
  ✓ 15 TC-AN-06 relationship diagram renders the snapshot tables
  ✓ 16 TC-AN-07 Analyst cannot open DPO screens or DPO APIs
  ✓ 17 TC-SEC-01 wrong password is rejected with a clear message
  ✓ 18 TC-SEC-02 session survives opening a deep link right after sign-in
  ✓ 19 TC-SEC-03 API ignores tokens passed in the query string
  ✓ 20 TC-LC-01 a new run on the same source builds while the previous one is published
  ✓ 21 TC-LC-02 revoking a dataset removes it from the Analyst workspace
  21 passed (49.3s)
```

## Kiểm thử hồi quy đi kèm
| Bộ | Kết quả |
| --- | --- |
| Backend `pytest` (gồm live Postgres/Mongo Docker) | 318 passed (thêm 1 test cho QA-08) |
| `ruff check src tests` | sạch |
| Frontend `vitest run` | 186 passed (thêm 2 test cho QA-01) |
| `tsc -b`, `eslint src` | sạch |

## So sánh trước và sau
| | Baseline `develop` | Sau sửa |
| --- | --- | --- |
| Đạt | 4 | **21** |
| Fail | 8 | 0 |
| Không chạy | 9 | 0 |
