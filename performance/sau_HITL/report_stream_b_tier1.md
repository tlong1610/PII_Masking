# 📑 Báo Cáo Hiệu Năng TIER 1 (Regex NER Scanner) — Luồng B Sau HITL

> **Kiến trúc:** Biểu thức chính quy (Regular Expressions) mở rộng theo phản hồi DPO  
> **Dữ liệu:** `B_dataset` (300 văn bản tự do, 560 thực thể Ground Truth)  
> **Thời điểm:** 2026-10-15 17:50:00  

---

## 1. 📊 Chỉ Số Hiệu Năng
* **Độ chính xác (Precision):** **100.00%**
* **Độ bao phủ (Recall):** **10.36%** (Tăng từ 3.93% trước HITL)
* **Điểm F1 Score:** **18.77%** (Tăng từ 7.56% trước HITL)
* **Độ trễ trung bình:** **0.05 ms / văn bản**
* **Số thực thể bắt đúng (TP):** **58** (Tăng +36 thực thể nhờ bổ sung regex STK ngân hàng và DOB)
* **Số thực thể nhận diện nhầm (FP):** **0**
* **Số thực thể bỏ sót (FN):** **502** (Các thực thể dạng tên người và địa chỉ chuyển sang Tầng 2 và 3)

---

## 2. 💡 Đóng Góp Sau HITL
* Tầng 1 được DPO bổ sung các biểu thức chính quy cho Số tài khoản ngân hàng (`BANK_ACCOUNT`), Ngày sinh (`DATE_OF_BIRTH`), và các định dạng CCCD có dấu cách/gạch nối.
* Giữ vững **100% Precision**, loại bỏ nguy cơ báo động giả trong khi tăng gấp 2.6 lần số lượng thực thể có cấu trúc được chặn đứng tức thì trong `< 0.05 ms`.

