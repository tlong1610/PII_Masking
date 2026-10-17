# 🏆 BỘ DỮ LIỆU ĐÁNH GIÁ CHUẨN HÓA PIIGUARD (UNIFIED BENCHMARK SUITE)

> **Căn cứ pháp lý:** Nghị định 356/2025/NĐ-CP & Luật 91/2025/QH15  
> **Tài liệu tham chiếu:** [`message.txt`](../../message.txt) & [`taxonomy.py`](../../src/detection/taxonomy.py)
> **Tệp dữ liệu tổng hợp:** `unified_benchmark_suite.json` (**625 mẫu kiểm thử trong báo cáo lịch sử; tệp hiện không có trong checkout này**)

---

## 1. 📌 Tổng Quan 3 Nguồn Dữ Liệu Benchmark

| Bộ dữ liệu | Vai trò kiến trúc | Tệp gốc | Tệp chuẩn hóa (Free-Text/Doc) | Tệp kiểm thử Luồng A (ColumnProfile) | Số lượng test cases |
|---|---|---|---|---|:---:|
| **A_dataset** | **Luồng A (Dữ liệu có cấu trúc / Bảng CSDL)** | Mô phỏng Doanh nghiệp VN | — | [`synthetic_enterprise_columns.json`](./A_dataset/synthetic_enterprise_columns.json) | **339** |
| **B_dataset** | **Luồng B (Văn bản tự do / NER Redaction)** | `synth_dataset_v2.json` (1.500 docs) | [`synth_dataset_v2_standardized.json`](./B_dataset/synth_dataset_v2_standardized.json) | [`b_dataset_columns.json`](./B_dataset/b_dataset_columns.json) | **180** |
| **AB_dataset**| **Luồng A & B (Tài liệu học thuật Kaggle)** | `train.json` (6.807 docs) | [`ab_dataset_standardized.json`](./AB_dataset/ab_dataset_standardized.json) | [`ab_dataset_columns.json`](./AB_dataset/ab_dataset_columns.json) | **106** |
| **TỔNG HỢP** | **Toàn diện cả 2 Luồng** | — | — | `unified_benchmark_suite.json` (không có trong checkout này) | **625** |

---

## 2. ⚖️ Tuân Thủ Nghiêm Ngặt 12 Nhóm PII Theo `message.txt`

Toàn bộ nhãn, kiểu dữ liệu và hành động đề xuất đều được ánh xạ về danh mục chuẩn 12 PII của Nghị định 356/2025/NĐ-CP:

| STT | Nhóm PII chuẩn (`taxonomy_id`) | Kiểu dữ liệu | Hành động (`expected_action`) | Mức độ nhạy cảm | Căn cứ pháp lý | Số mẫu trong Suite |
|:---:|---|:---:|:---:|:---:|---|:---:|
| 1 | `CCCD` | `string` | **HMAC / MASK** | L3 | Khoản 7 Điều 3 NĐ 356 | **68** |
| 2 | `FULL_NAME` | `string` | **MASK** | L2 | Khoản 1 Điều 3 NĐ 356 | **75** |
| 3 | `DATE_OF_BIRTH` | `date / integer` | **MASK** | L2 | Khoản 2 Điều 3 NĐ 356 | **33** |
| 4 | `STREET_ADDRESS` | `string` | **MASK** | L2 | Khoản 4 Điều 3 NĐ 356 | **41** |
| 5 | `PHONE_VN` | `string` | **MASK** | L2 | Khoản 7 Điều 3 NĐ 356 | **49** |
| 6 | `EMAIL` | `string` | **MASK** | L2 | K11 Đ3 NĐ 356; K1 Đ2 Luật 91 | **62** |
| 7 | `BANK_ACCOUNT` | `string` | **MASK** | L3 | Điểm k K1 Đ4 NĐ 356 | **33** |
| 8 | `OCR_IDENTITY_DOC` | `text / string` | **DROP** | L3 | Điểm i K1 Đ4 & Điều 3-4 NĐ 356 | **14** |
| 9 | `BIOMETRIC_DATA` | `string` | **DROP** | L3 | Điểm đ K1 Đ4 NĐ 356 | **8** |
| 10 | `TAX_CODE_PERSONAL` | `string` | **MASK** | L2 | Khoản 7 Điều 3 NĐ 356 | **15** |
| 11 | `TAX_CODE_ORG` | `string` | **KEEP** | L0 | Khoản 1 Điều 2 Luật 91 | **31** |
| 12 | `FREE_TEXT_PII` | `text / string` | **MASK** | L2 - L3 | NĐ 356 & NĐ 13 | **55** |

### Các trường Phi cá nhân (Negative Cases để kiểm tra False Positives):
| STT | Nhóm Phi PII | Kiểu dữ liệu | Hành động | Mục đích kiểm thử | Số mẫu |
|:---:|---|:---:|:---:|---|:---:|
| 13 | `CITY` | `string` | **KEEP** | Địa danh cấp vùng/tỉnh thành (định danh gián tiếp) | **33** |
| 14 | `FINANCIAL_AMOUNT` | `numeric / float` | **KEEP** | Số tiền đứng riêng, không gắn định danh | **18** |
| 15 | `TRANSACTION_DATE` | `date / timestamp` | **KEEP** | Ngày sự kiện, ngày giao dịch (không phải ngày sinh) | **35** |
| 16 | `TRACKING_NUMBER` | `string` | **KEEP** | Mã vận đơn, mã đơn hàng kỹ thuật | **18** |
| 17 | `ORGANIZATION_NAME` / `NOT_PERSONAL_DATA` | `string` | **KEEP** | Tên doanh nghiệp đối tác, chức danh chung | **31** |
| 18 | `EMPTY_COLUMN` | `null` | **KEEP** | Cột rỗng, không chứa dữ liệu | **6** |

---

## 3. 🎯 Phân Bố Hành Động Đề Xuất (Expected Actions)

| Hành động (`expected_action`) | Số lượng test cases | Tỷ lệ (%) | Ý nghĩa kỹ thuật |
|---|:---:|:---:|---|
| **`MASK`** | **370** | 59.20% | Làm mờ một phần hoặc toàn bộ dữ liệu cá nhân (Regex / Hash / Partial) |
| **`HMAC`** | **61** | 9.76% | Băm bảo toàn khóa nối (Join-key preservation) với salt bí mật |
| **`DROP`** | **28** | 4.48% | Loại bỏ triệt để khỏi view phân tích (Dữ liệu sinh trắc / Ảnh CCCD nhạy cảm) |
| **`KEEP`** | **166** | 26.56% | Giữ nguyên cho phân tích nghiệp vụ (Thông tin phi cá nhân / công khai) |

---

## 4. 🚀 Hướng Dẫn Chạy Kiểm Thử Trên Pipeline

### Cách 1: Chạy toàn bộ Benchmark Suite (625 cases)
```bash
python -m performance.run_pipeline --data-file performance/data/unified_benchmark_suite.json
```

### Cách 2: Chạy kiểm thử riêng từng nguồn dữ liệu
* **A_dataset (Doanh nghiệp có cấu trúc):**
  ```bash
  python -m performance.run_pipeline --data-file performance/data/A_dataset/synthetic_enterprise_columns.json
  ```
* **B_dataset (Văn bản tự do dạng cột):**
  ```bash
  python -m performance.run_pipeline --data-file performance/data/B_dataset/b_dataset_columns.json
  ```
* **AB_dataset (Học thuật Kaggle dạng cột):**
  ```bash
  python -m performance.run_pipeline --data-file performance/data/AB_dataset/ab_dataset_columns.json
  ```

### Cách 3: Kiểm thử Luồng B (Free-Text NER & Token-level Redaction)
* Chạy trực tiếp `NERPipelines.redact_document()` trên:
  * [`performance/data/B_dataset/synth_dataset_v2_standardized.json`](./B_dataset/synth_dataset_v2_standardized.json)
  * [`performance/data/AB_dataset/ab_dataset_standardized.json`](./AB_dataset/ab_dataset_standardized.json)
