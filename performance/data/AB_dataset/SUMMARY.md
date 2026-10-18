# 📊 Báo Cáo Chuẩn Hóa Dữ Liệu AB_dataset (12 PII Taxonomy)

> **Tập dữ liệu:** *The Learning Agency Lab — PII Data Detection & Removal (Kaggle)*  
> **Thư mục lưu trữ:** [`performance/data/AB_dataset`](./)  
> **Tệp văn bản chuẩn hóa (Luồng B):** [`ab_dataset_standardized.json`](./ab_dataset_standardized.json)  
> **Tệp bảng cột chuẩn hóa (Luồng A):** [`ab_dataset_columns.json`](./ab_dataset_columns.json) (106 mẫu cột)  
> **Căn cứ pháp lý:** Nghị định 356/2025/NĐ-CP & Luật 91/2025/QH15

---

## 1. 🎯 Bảng Quy Đổi Taxonomy (7 Thực Thể Gốc → 12 Nhóm PII Chuẩn)

| Thực thể gốc Kaggle | Taxonomy chuẩn (12 PII) | Kiểu dữ liệu | Hành động | Mức độ nhạy cảm | Căn cứ pháp lý | Lý do bảo vệ |
|---|---|:---:|:---:|:---:|---|---|
| `NAME_STUDENT` | `FULL_NAME` | `string` | **MASK** | L2 (Cơ bản) | Khoản 1 Điều 3 NĐ 356 | Họ tên học sinh / sinh viên |
| `USERNAME` | `FULL_NAME` | `string` | **MASK** | L2 (Cơ bản) | Khoản 1 Điều 3 NĐ 356 | Tên gọi khác / nick đăng nhập |
| `EMAIL` | `EMAIL` | `string` | **MASK** | L2 (Cơ bản) | K11 Đ3 NĐ 356; K1 Đ2 Luật 91 | Địa chỉ email học tập / cá nhân |
| `PHONE_NUM` | `PHONE_VN` | `string` | **MASK** | L2 (Cơ bản) | Khoản 7 Điều 3 NĐ 356 | Số điện thoại cá nhân |
| `STREET_ADDRESS` | `STREET_ADDRESS` | `string` | **MASK** | L2 (Cơ bản) | Khoản 4 Điều 3 NĐ 356 | Địa chỉ nơi cư trú |
| `ID_NUM` | `CCCD` | `string` | **HMAC / MASK** | L3 (Nhạy cảm) | Khoản 7 Điều 3 NĐ 356 | Mã số định danh học sinh / CCCD |
| `URL_PERSONAL` | `FREE_TEXT_PII` | `string` | **MASK** | L2 (Cơ bản) | K11 Đ3 NĐ 356 | URL trang cá nhân (LinkedIn/GitHub) |

---

## 2. 📈 Phân Bố Số Lượng Thực Thể Sau Chuẩn Hóa

Tổng số thực thể PII: **1606** trên **945 văn bản có PII**:

| Nhóm PII chuẩn | Số lượng thực thể | Tỷ lệ (%) | Hành động dự kiến |
|---|:---:|:---:|:---:|
| `FULL_NAME` | **1371** | 85.37% | **MASK** |
| `FREE_TEXT_PII` | **110** | 6.85% | **MASK** |
| `CCCD` | **78** | 4.86% | **HMAC / MASK** |
| `EMAIL` | **39** | 2.43% | **MASK** |
| `PHONE_VN` | **6** | 0.37% | **MASK** |
| `STREET_ADDRESS` | **2** | 0.12% | **MASK** |

---

## 3. 🚀 Khả Năng Tích Hợp Vào Pipeline PIIGuard Shield
1. **Luồng B (Free-text NER Redactor):**
   * Tệp [`ab_dataset_standardized.json`](./ab_dataset_standardized.json) cung cấp tọa độ ký tự chính xác `start_char`, `end_char` cho từng thực thể, cho phép kiểm thử độ chính xác Masking của PhoBERT và Regex ở cấp độ ký tự.
2. **Luồng A (Cascade Column-level Scanner):**
   * Tệp [`ab_dataset_columns.json`](./ab_dataset_columns.json) gom các thực thể thành 106 profile cột dữ liệu bảng quan hệ chuẩn (`students.student_name`, `students.student_id_number`, `students.email`...), có thể đưa trực tiếp vào `run_pipeline.py`.
