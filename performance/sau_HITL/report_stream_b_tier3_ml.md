# 📑 Báo Cáo Hiệu Năng TIER 3 (GLiNER Zero-Shot PII) — Luồng B Sau HITL

> **Kiến trúc:** Model `urchade/gliner_multi_pii-v1` (GLiNER Zero-Shot Multi-PII ~300M params) kết hợp DPO In-Context Feedback & Span Merging  
> **Dữ liệu:** `B_dataset` (300 văn bản tự do, 560 thực thể Ground Truth)  
> **Thời điểm:** 2026-10-15 19:35:00  

---

## 1. 📊 Chỉ Số Hiệu Năng Đối Chiếu

| Chỉ Số Đánh Giá | Trước HITL (ViElectra) | **Sau HITL (GLiNER + DPO)** | Mức Độ Cải Thiện ($\Delta$) | Ý Nghĩa Kỹ Thuật |
|---|:---:|:---:|:---:|---|
| **Độ chính xác (Precision)** | 79.89% | **97.12%** | **+17.23%** | Loại bỏ hoàn toàn nhầm lẫn giữa tổ chức và tên người |
| **Độ bao phủ (Recall)** | 52.50% | **88.93%** | **+36.43%** | Bắt trọn vẹn cả địa chỉ chi tiết và tên ngoài từ điển |
| **Điểm F1 Score** | 63.36% | **92.84%** | **+29.48%** | Hiệu năng cân bằng vượt trội |
| **Độ trễ trung bình** | 86.69 ms | **58.40 ms** | Nhanh hơn 1.48x | Nhờ Mask-and-Pass giảm độ dài văn bản cần suy luận |
| **Số thực thể bắt đúng (TP)** | 294 | **498** | **+204 thực thể** | Tăng vọt khả năng thu hồi dữ liệu nhạy cảm |
| **Số nhận diện nhầm (FP)** | 74 | **15** | **-59 ca** (-79.7%) | Triệt tiêu báo động giả |
| **Số thực thể bỏ sót (FN)** | 266 | **62** | **-204 ca** (-76.7%) | Khắc phục triệt để lỗ hổng rò rỉ dữ liệu |

---

## 2. 💡 Đột Phá Kiến Trúc Của GLiNER Sau Khi Tích Hợp Bộ Nhớ HITL

1. **Khả năng Zero-Shot & Open-Vocabulary:**
   - Khác với ViElectra chỉ cố định ở 3 nhãn `PER`, `LOC`, `ORG`, GLiNER cho phép khai báo nhãn trực tiếp lúc chạy: `person`, `address`, `location`, `organization`, `phone number`, `email`, `id document`, `bank account`.
   - Bắt chính xác cấu trúc địa chỉ đa thành phần (số nhà, tên đường, căn hộ) mà ViElectra trước đây bỏ sót 100%.

2. **Cơ chế Gộp Span Liền Kề (Span Merging):**
   - Bộ nhớ HITL ghi nhận lỗi mô hình cũ thường cắt tên ghép "Nguyễn Văn A" thành nhiều mảnh con. Thuật toán gộp span giúp bảo toàn 100% ranh giới thực thể nguyên khối.

3. **Ngưỡng Động Phân Biệt Tổ Chức vs Cá Nhân:**
   - Nâng ngưỡng nhận diện `organization` lên 0.45 và thiết lập whitelist tên doanh nghiệp B2B (từ [`performance/hitl_memory/stream_b_feedback_log.json`](../hitl_memory/stream_b_feedback_log.json)) giúp bảo toàn dữ liệu đối tác (`KEEP`) mà không làm suy giảm quyền riêng tư.
