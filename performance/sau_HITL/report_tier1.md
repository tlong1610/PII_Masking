# 📊 Báo Cáo Đánh Giá Hiệu Năng Sau HITL — TIER 1 — Bộ Lọc Tĩnh (Rule-Based & Regex)

> **Mã tầng (Tier ID):** `TIER_1`  
> **Thời điểm đánh giá:** `2026-10-15 19:52:28`  
> **Số lượng ca giải quyết tại tầng này:** **160** cases  

*Tầng lọc tĩnh kết hợp Regex và bộ quy tắc DPO phân biệt MST DN và tài liệu KYC.*

---

## 1. 🎯 Bảng Chỉ Số Hiệu Năng (Evaluation Metrics)

| Chỉ Số (Metric) | Giá Trị Thực Tế | Đánh Giá | Chi Tiết Số Liệu |
|---|:---:|:---:|---|
| **Action Accuracy** | **100.00%** | 🟢 TỐT | 160/160 ca khớp hoàn toàn hành động bảo vệ |
| **Precision (PII)** | **100.00%** | 🟢 TỐT | TP=100, FP=0 |
| **Recall (PII)** | **100.00%** | 🟢 TỐT | TP=100, FN=0 |
| **F1 Score** | **100.00%** | ⚖️ Cân Bằng | Trung hòa giữa Precision và Recall |
| **F2 Score** | **100.00%** | 🛡️ An Toàn | Ưu tiên Recall gấp 2 lần |
| **Latency trung bình** | **5.80 ms** | ⚡ Tốc Độ | Thời gian xử lý trung bình mỗi trường |
| **Risk ($R_{\text{CW}}$)** | **0.00%** | 🟢 AN TOÀN | Rủi ro bỏ sót PII có trọng số theo độ tự tin |

---

## 2. ❌ Danh Sách Các Ca Đoán Sai

🟢 **HOÀN TOÀN KHÔNG CÓ CA ĐOÁN SAI NÀO TẠI TẦNG NÀY (100% Khớp Kỳ Vọng DPO).**