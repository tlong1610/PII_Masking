# 📑 Báo Cáo Hiệu Năng TIER 2 (Aho-Corasick Dictionary Scanner) — B_test

> **Kiến trúc:** FlashText (Aho-Corasick Multi-Pattern Matching) tra cứu danh từ riêng  
> **Dữ liệu:** `B_dataset` (300 văn bản tự do)  
> **Thời điểm:** 2026-10-15 11:34:30  

---

## 1. 📊 Chỉ Số Hiệu Năng
* **Độ chính xác (Precision):** **90.36%**
* **Độ bao phủ (Recall):** **58.57%**
* **Điểm F1 Score:** **71.07%**
* **Độ trễ trung bình:** **0.04 ms / văn bản**
* **Số thực thể bắt đúng (TP):** **328**
* **Số từ điển tra cứu:** 778 họ tên, 216 tổ chức, 255 địa danh.

---

## 2. 💡 Nhận Xét Kiến Trúc Tầng 2
* Tầng 2 bù đắp lỗ hổng lớn nhất của Tầng 1: Nhận diện tức thì hàng loạt Họ tên người và Tên cơ quan xuất hiện trong văn bản.
* Tốc độ tìm kiếm $O(N)$ theo độ dài văn bản, không bị ảnh hưởng bởi kích thước từ điển.
