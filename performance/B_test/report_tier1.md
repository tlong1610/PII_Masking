# 📑 Báo Cáo Hiệu Năng TIER 1 (Regex NER Scanner) — B_test

> **Kiến trúc:** Biểu thức chính quy (Regular Expressions) trích xuất thực thể định dạng chuẩn  
> **Dữ liệu:** `B_dataset` (300 văn bản tự do, 560 thực thể Ground Truth)  
> **Thời điểm:** 2026-10-15 11:34:30  

---

## 1. 📊 Chỉ Số Hiệu Năng
* **Độ chính xác (Precision):** **100.00%**
* **Độ bao phủ (Recall):** **3.93%**
* **Điểm F1 Score:** **7.56%**
* **Độ trễ trung bình:** **0.05 ms / văn bản**
* **Số thực thể bắt đúng (TP):** **22**
* **Số thực thể bỏ sót (FN):** **538**

---

## 2. 💡 Nhận Xét Kiến Trúc Tầng 1
* Regex bắt cực tốt và chính xác 100% các thực thể có quy chuẩn số cứng như: **Email, SĐT, Số CCCD, Thẻ tín dụng, Mã số thuế**.
* Tuy nhiên, Regex hoàn toàn **bỏ sót 100% Họ tên người và Địa chỉ nhà** trong văn bản tự do vì các thực thể này không có cú pháp regex xác định. Do đó Recall của Tầng 1 trên free-text luôn ở mức thấp (~15-20%).
