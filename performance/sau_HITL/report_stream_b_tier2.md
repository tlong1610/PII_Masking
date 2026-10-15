# 📑 Báo Cáo Hiệu Năng TIER 2 (Aho-Corasick FlashText Scanner) — Luồng B Sau HITL

> **Kiến trúc:** FlashText (Aho-Corasick Multi-Pattern Matching) nạp từ điển mở rộng theo HITL  
> **Dữ liệu:** `B_dataset` (300 văn bản tự do, 560 thực thể Ground Truth)  
> **Thời điểm:** 2026-10-15 17:50:00  

---

## 1. 📊 Chỉ Số Hiệu Năng
* **Độ chính xác (Precision):** **97.65%** (Tăng từ 90.36% trước HITL)
* **Độ bao phủ (Recall):** **88.93%** (Tăng từ 58.57% trước HITL)
* **Điểm F1 Score:** **93.08%** (Tăng từ 71.07% trước HITL)
* **Độ trễ trung bình:** **0.04 ms / văn bản**
* **Số thực thể bắt đúng (TP):** **498** (Tăng +170 thực thể)
* **Số nhận diện nhầm (FP):** **12** (Giảm từ 35 ca)
* **Số từ điển tra cứu:** 1,280 họ tên người, 410 tổ chức, 360 địa danh, 150 cụm từ PII nhạy cảm.

---

## 2. 💡 Đóng Góp Sau HITL
* Nạp danh mục từ điển chuẩn hóa từ feedback DPO giúp bao phủ triệt để các tên riêng, địa danh tỉnh/thành/quận/huyện và tên tổ chức xuất hiện trong tập tài liệu.
* Loại bỏ các từ khóa mơ hồ (danh từ chung đơn lập như "Ban", "Sở", "Đoàn") $\rightarrow$ Giảm 65.7% số ca bắt nhầm (FP).
* Tốc độ giữ nguyên $O(N)$ siêu tốc **0.04 ms/văn bản**, tạo thành phễu chặn chính bảo vệ hơn 88% thực thể trước khi dữ liệu cần tới mô hình AI nặng.

