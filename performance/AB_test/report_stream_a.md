# 📊 Báo Cáo Xử Lý Luồng A (Dữ Liệu CSDL Theo Cột) — AB_test

> **Hệ thống:** *PIIGuard Unified Router & Cascade Pipeline*  
> **Phân loại đầu vào:** Cột dữ liệu bảng quan hệ (`ab_dataset_columns.json`)  
> **Quy mô:** **106 trường cột**  
> **Thời điểm xuất:** 2026-10-15 11:38:45  

---

## 1. 🎯 Chỉ Số Hiệu Năng Luồng A
* **Độ chính xác Hành động (Accuracy):** **74.53%** (79/106)
* **Precision:** **100.00%**
* **Recall:** **74.53%**
* **F1 Score:** **85.41%**
* **Chỉ số Rủi ro ($R_{CW}$):** **0.2491** (24.91%)
* **Độ trễ trung bình:** **1436.57 ms / cột**
* **Tổng thời gian xử lý:** **153.96 s**

---

## 2. ⚡ Phân Bố Theo Từng Tầng
* **TIER 1 (Static Rules & Regex):** Xử lý thành công **43** trường với độ chính xác cao nhờ nhận diện tên cột (`student_name`, `email`).
* **TIER 2 (BM25 Lexical):** **0** trường.
* **TIER 3 LLM (Contextual):** **63** trường.
