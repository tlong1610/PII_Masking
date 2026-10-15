# 📑 B_dataset Chuẩn Hóa Theo 12 Nhóm PII (Nghị định 356 & Luật 91)

> **Tập dữ liệu:** *Synthetic PII Dataset v2 (Free-Text NER)*  
> **Thư mục lưu trữ:** [`performance/data/B_dataset`](./)  
> **File dữ liệu Text gốc:** [`synth_dataset_v2.json`](./synth_dataset_v2.json) (1.500 văn bản)  
> **File Text chuẩn hóa (Luồng B):** [`synth_dataset_v2_standardized.json`](./synth_dataset_v2_standardized.json)  
> **File Dạng Cột chuẩn hóa (Luồng A):** [`b_dataset_columns.json`](./b_dataset_columns.json) (180 mẫu cột)

---

## 1. 🎯 Bảng Quy Đổi Taxonomy (16 Thực Thể Gốc → 12 Nhóm PII Chuẩn)

| Thực thể gốc | Taxonomy chuẩn (12 PII) | Kiểu dữ liệu | Hành động | Mức độ nhạy cảm | Căn cứ pháp lý | Lý do xử lý |
|---|---|:---:|:---:|:---:|---|---|
| `PERSON` | `FULL_NAME` | `string` | **MASK** | L2 (Cơ bản) | Khoản 1 Điều 3 NĐ 356 | Họ tên cá nhân |
| `PHONE_NUMBER` | `PHONE_VN` | `string` | **MASK** | L2 (Cơ bản) | Khoản 7 Điều 3 NĐ 356 | Số điện thoại |
| `EMAIL_ADDRESS` | `EMAIL` | `string` | **MASK** | L2 (Cơ bản) | K11 Đ3 NĐ 356; K1 Đ2 Luật 91 | Thư điện tử cá nhân |
| `STREET_ADDRESS` | `STREET_ADDRESS` | `string` | **MASK** | L2 (Cơ bản) | Khoản 4 Điều 3 NĐ 356 | Địa chỉ nơi ở |
| `ZIP_CODE` | `STREET_ADDRESS` | `string` | **MASK** | L1 (Cơ bản) | Khoản 4 Điều 3 NĐ 356 | Mã bưu chính cư trú |
| `CREDIT_CARD` | `BANK_ACCOUNT` | `string` | **MASK** | L3 (Nhạy cảm) | Điểm k K1 Điều 4 NĐ 356 | Thẻ tín dụng/ngân hàng |
| `IBAN_CODE` | `BANK_ACCOUNT` | `string` | **MASK** | L3 (Nhạy cảm) | Điểm k K1 Điều 4 NĐ 356 | Tài khoản ngân hàng quốc tế |
| `US_SSN` | `CCCD` | `string` | **HMAC** | L3 (Nhạy cảm) | Khoản 7 Điều 3 NĐ 356 | Số định danh tương đương CCCD |
| `US_DRIVER_LICENSE` | `CCCD` | `string` | **MASK** | L3 (Nhạy cảm) | Khoản 7 Điều 3 NĐ 356 | Số bằng lái / định danh |
| `AGE` | `DATE_OF_BIRTH` | `integer` | **MASK** | L1 (Cơ bản) | Khoản 2 Điều 3 NĐ 356 | Độ tuổi / liên quan ngày sinh |
| `IP_ADDRESS` | `FREE_TEXT_PII` | `string` | **MASK** | L2 (Cơ bản) | NĐ 356 & NĐ 13 | Địa chỉ IP người dùng |
| `NRP` | `FREE_TEXT_PII` | `string` | **MASK** | L3 (Nhạy cảm) | Điểm đ K1 Đ4 NĐ 356 | Dân tộc, tôn giáo, quan điểm |
| `DOMAIN_NAME` | `FREE_TEXT_PII` | `string` | **MASK** | L1 (Cơ bản) | K11 Điều 3 NĐ 356 | URL / tên miền cá nhân |
| `ORGANIZATION` | `TAX_CODE_ORG` | `string` | **KEEP** | L0 (Phi cá nhân) | Khoản 1 Điều 2 Luật 91 | Tên cơ quan, tổ chức |
| `GPE` | `CITY` | `string` | **KEEP** | L1 (Phi cá nhân) | Khoản 1 Điều 2 Luật 91 | Tên quốc gia, thành phố |
| `DATE_TIME` | `TRANSACTION_DATE` | `date` | **KEEP** | L0 (Phi cá nhân) | Khoản 1 Điều 2 Luật 91 | Mốc thời gian sự kiện |
| `TITLE` | `NOT_PERSONAL_DATA` | `string` | **KEEP** | L0 (Phi cá nhân) | Khoản 1 Điều 2 Luật 91 | Chức danh, danh xưng |

---

## 2. 📊 Thống Kê Số Lượng Thực Thể Sau Chuẩn Hóa

Tổng số văn bản: **1.500 văn bản**
Tổng số thực thể chuẩn hóa: **2863 thực thể**

| Phân loại Taxonomy chuẩn | Số lượng thực thể | Tỷ lệ (%) | Hành động dự kiến |
|---|:---:|:---:|:---:|
| `FULL_NAME` | **857** | 29.93% | **MASK** |
| `STREET_ADDRESS` | **635** | 22.18% | **MASK** |
| `CITY` | **411** | 14.36% | **KEEP** |
| `TAX_CODE_ORG` | **250** | 8.73% | **KEEP** |
| `BANK_ACCOUNT` | **157** | 5.48% | **MASK** |
| `TRANSACTION_DATE` | **119** | 4.16% | **KEEP** |
| `FREE_TEXT_PII` | **106** | 3.70% | **MASK** |
| `NOT_PERSONAL_DATA` | **92** | 3.21% | **KEEP** |
| `PHONE_VN` | **92** | 3.21% | **MASK** |
| `DATE_OF_BIRTH` | **74** | 2.58% | **MASK** |
| `EMAIL` | **49** | 1.71% | **MASK** |
| `CCCD` | **21** | 0.73% | **HMAC** |

---
## 3. 🚀 Khả Năng Tương Thích Với Pipeline Của Ta
* **Luồng B (Free-Text NER):** Tệp [`synth_dataset_v2_standardized.json`](./synth_dataset_v2_standardized.json) cung cấp toàn bộ nhãn span với tọa độ `start`, `end`, `taxonomy_id`, `legal_basis` để đánh giá Token/Span-level Recall & Precision.
* **Luồng A (Cascade Column):** Tệp [`b_dataset_columns.json`](./b_dataset_columns.json) đóng gói các giá trị thực thể thành các cột dữ liệu theo chuẩn `ColumnProfile` (bảng, cột, kiểu dữ liệu, samples) để kiểm thử trực tiếp trên `run_pipeline.py`.
