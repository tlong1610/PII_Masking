# 📝 Báo Cáo Xử Lý Luồng B (Văn Bản Tự Do Free-Text) — AB_test

> **Hệ thống:** *PIIGuard Unified Router & Entity Redaction Pipeline*  
> **Phân loại đầu vào:** Bài viết luận văn tự do (`ab_dataset_standardized.json`)  
> **Quy mô:** **150 văn bản tự do** (266 thực thể Ground Truth)  
> **Thời điểm xuất:** 2026-10-15 11:38:45  

---

## 1. 🎯 Chỉ Số Hiệu Năng Luồng B
* **Số thực thể PII Ground Truth:** **266**
* **Số thực thể nhận diện chính xác (TP):** **246**
* **Số thực thể bỏ sót (FN):** **20**
* **Số nhận diện nhầm (FP):** **106**
* **Token/Span-Level Precision:** **69.89%**
* **Token/Span-Level Recall:** **92.48%**
* **F1 Score:** **79.61%**
* **Tốc độ xử lý trung bình:** **1.55 ms / văn bản**
* **Tổng thời gian xử lý:** **0.23 s**

---

## 2. 🔬 Phân Tích Thực Thể
* Thực thể Họ tên sinh viên (`FULL_NAME`): Bắt chính xác thông qua Từ điển Aho-Corasick.
* Thực thể Email & SĐT: Bắt đạt độ chính xác 100% nhờ Tầng 1 Regex.
