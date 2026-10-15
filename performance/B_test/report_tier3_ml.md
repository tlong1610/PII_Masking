# 📑 Báo Cáo Hiệu Năng TIER 3 (AI / Transformer Contextual NER) — B_test

> **Kiến trúc:** Mô hình ngôn ngữ sâu (Transformer Token-Classification) nhận diện theo ngữ cảnh  
> **Dữ liệu:** `B_dataset` (300 văn bản tự do)  
> **Thời điểm:** 2026-10-15 11:34:30  

---

## 1. 📊 Chỉ Số Hiệu Năng
* **Độ chính xác (Precision):** **79.89%**
* **Độ bao phủ (Recall):** **52.50%**
* **Điểm F1 Score:** **63.36%**
* **Độ trễ trung bình:** **86.69 ms / văn bản**
* **Số thực thể bắt đúng (TP):** **294**

---

## 2. 💡 Nhận Xét Kiến Trúc Tầng 3
* Tầng AI hiểu được ngữ cảnh câu văn (ví dụ: một từ đứng sau *"gặp anh"*, *"liên hệ với"*, *"Mr."* là tên người dù từ đó chưa có trong từ điển).
* Đóng vai trò là chốt chặn cuối cùng bắt các ca khó và từ mới (Out-of-Vocabulary).
