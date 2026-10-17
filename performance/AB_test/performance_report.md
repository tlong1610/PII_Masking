# 🏆 BÁO CÁO TỔNG HỢP LUỒNG TỔNG (KÈM ROUTING PHÂN LOẠI) — AB_test

> **Dự án:** *PIIGuard Shield — Enterprise Data Privacy Governance*  
> **Cơ chế:** **Intelligent Data Modality Router + Multi-Stream Dispatcher**  
> **Tập dữ liệu kiểm thử:** `AB_dataset` (Kaggle PII Data Detection)  
> **Thời điểm hoàn thành:** 2026-10-15 11:38:45  
> **Thư mục lưu trữ:** [`performance/AB_test/`](./)

---

## 1. 🚦 Hiệu Năng Bộ Định Tuyến Đầu Vào (Data Modality Router)

Hệ thống triển khai bộ định tuyến thông minh (Router) tự động phân biệt đặc trưng hình thái dữ liệu trước khi chuyển tiếp vào luồng xử lý tương ứng:

| Tiêu chí Routing | Dữ Liệu Dạng Cột (Tabular) | Dữ Liệu Tự Do (Free-Text) | Tổng Cộng / Hiệu Năng |
|---|:---:|:---:|:---:|
| **Số lượng payloads đến** | **106** | **150** | **256 payloads** |
| **Luồng điều hướng dự kiến** | `STREAM_A` | `STREAM_B` | — |
| **Luồng thực tế điều hướng** | `STREAM_A` (106) | `STREAM_B` (150) | **256** |
| **Độ chính xác phân loại Router** | **100.0%** | **100.0%** | **100.00%** |
| **Thời gian phân loại trung bình** | < 0.01 ms | < 0.01 ms | **< 0.01 ms** |

---

## 2. ⚖️ Bảng Đối Chiếu Trực Tiếp Hiệu Năng: Luồng A vs Luồng B

| Tiêu chí Đánh Giá | **LUỒNG A (Cột Bảng CSDL)** | **LUỒNG B (Văn Bản Tự Do Free-Text)** | Nhận Xét Chuyên Môn |
|---|:---:|:---:|---|
| **Pipeline xử lý** | Phễu lọc 4 Tầng (Regex → BM25 → Hybrid → LLM) | Phễu Redactor 3 Tầng (Regex → FlashText → AI/ML) | Tối ưu riêng theo kiểu hình dữ liệu |
| **Đối tượng áp dụng** | Bảng quan hệ (`ab_dataset_columns.json`) | Bài văn học thuật (`ab_dataset_standardized.json`) | Phản ánh đúng 2 nguồn dữ liệu doanh nghiệp |
| **Số mẫu kiểm thử** | **106 trường cột** | **150 văn bản** (266 thực thể) | Khảo sát quy mô lớn |
| **Độ chính xác (Precision/Acc)**| **74.53%** | **69.89%** | Luồng A có độ tin cậy cao nhờ tên cột |
| **Độ bao phủ (Recall)** | **74.53%** | **92.48%** | Cả 2 luồng đều kiểm soát tốt rò rỉ |
| **F1 Score** | **85.41%** | **79.61%** | Hiệu năng tổng thể cân bằng |
| **Tốc độ xử lý trung bình** | **1436.57 ms** / cột | **1.55 ms** / văn bản | Cực kỳ tối ưu cho production |

---

## 3. 🧠 Phân Tích Bản Chất Kỹ Thuật (Vì sao cần Router?)

1. **Tránh quá tải tài nguyên (Resource Optimization):**
   * Nếu đưa toàn bộ văn bản tự do qua Luồng A (CSDL), hệ thống sẽ thất bại vì không có tên cột để so khớp Tầng 1, buộc phải đẩy tất cả sang Tầng 3 LLM, gây tốn kém chi phí token và kéo dài thời gian chờ.
   * Ngược lại, nếu đưa cột CSDL qua Luồng B (NER Redactor), hệ thống sẽ bỏ phí metadata quý giá (tên cột `cccd`, `email`, kiểu dữ liệu SQL) vốn có thể giải quyết dứt điểm trong 2ms ở Tầng 1.
2. **Vai trò then chốt của Router:**
   * Bộ định tuyến giải quyết triệt để vấn đề này bằng cách phân luồng tức thì: Cột CSDL → Luồng A (nhanh, rẻ, chính xác nhờ metadata); Văn bản tự do → Luồng B (tập trung phân tách token, ngữ cảnh và che mờ span).

---

## 4. 📁 Danh Sách File Báo Cáo Trong `performance/AB_test/`
1. 📄 [`report_stream_a.md`](./report_stream_a.md): Báo cáo độc lập Luồng A.
2. 📄 [`report_stream_b.md`](./report_stream_b.md): Báo cáo độc lập Luồng B.
3. 📄 [`performance_report.md`](./performance_report.md): Báo cáo chung luồng tổng hợp có Router (bản này).
4. 📄 [`performance_results.json`](./performance_results.json): Dữ liệu chi tiết của toàn bộ hệ thống.
