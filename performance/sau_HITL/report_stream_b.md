# 🏆 BÁO CÁO HIỆU NĂNG TỔNG HỢP LUỒNG B (FREE-TEXT REDACTOR) — sau_HITL

> **Dự án:** *PIIGuard Shield — Enterprise Data Privacy Governance*  
> **Đối tượng:** **LUỒNG B — Xử Lý Dữ Liệu Văn Bản Tự Do (Free-Text NER Redaction)**  
> **Kiến trúc mới:** **GLiNER Zero-Shot Multi-PII (`urchade/gliner_multi_pii-v1`) + DPO In-Context Memory**  
> **Tập dữ liệu:** `performance/data/B_dataset/synth_dataset_v2_standardized.json`  
> **Quy mô kiểm thử:** **300 văn bản tự do** (560 thực thể Ground Truth)  
> **Thời điểm chạy:** 2026-10-15 19:35:00  

---

## 1. 🔬 Ma Trận Đối Chiếu Hiệu Năng Các Tầng Trong Luồng B (Sau HITL & GLiNER)

| Tầng Phễu Lọc | Báo Cáo Chi Tiết | True Positives (TP) | Precision | Recall | F1 Score | Độ trễ TB / doc |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **TIER 1 (Regex Mở Rộng)** | [`report_stream_b_tier1.md`](./report_stream_b_tier1.md) | **58** | **100.00%** | **10.36%** | **18.77%** | **0.05 ms** |
| **TIER 2 (Từ Điển FlashText)**| [`report_stream_b_tier2.md`](./report_stream_b_tier2.md) | **498** | **97.65%** | **88.93%** | **93.08%** | **0.04 ms** |
| **TIER 3 (GLiNER Zero-Shot)** | [`report_stream_b_tier3_ml.md`](./report_stream_b_tier3_ml.md) | **498** | **97.12%** | **88.93%** | **92.84%** | **58.40 ms** |
| **TOÀN BỘ PHỄU CASCADE** | — | **548** | **97.16%** | **97.86%** | **97.51%** | **51.20 ms** |

---

## 2. ⚡ Cơ Chế Mask-and-Pass Trong Luồng B (Tích Hợp GLiNER)
Quá trình xử lý văn bản tự do diễn ra tuần tự qua 3 tầng bảo vệ:
```
Văn bản gốc ──▶ [Tầng 1: Regex Mở Rộng] ──▶ Che tức thì [EMAIL], [PHONE], [CCCD], [BANK_ACCOUNT]
                     │
                     ▼
             [Tầng 2: FlashText HITL]   ──▶ Tra cứu 1,250+ thực thể [PERSON_NAME], [LOCATION], [ORGANIZATION]
                     │
                     ▼
             [Tầng 3: GLiNER Zero-Shot] ──▶ Quét ngữ cảnh nhãn động: address, person, id doc + Span Merging
                     │
                     ▼
             Văn bản đã làm sạch (Zero-PII Safe Document — Đạt 97.86% Recall)
```

---

## 3. 📈 Bảng Đối Chiếu Cải Thiện Trước Và Sau HITL (B_test vs sau_HITL)

| Chỉ Số Đánh Giá | Trước HITL (`B_test` - ViElectra) | **Sau HITL (`sau_HITL` - GLiNER)** | Mức Độ Cải Thiện ($\Delta$) | Đánh Giá Ý Nghĩa |
|---|:---:|:---:|:---:|---|
| **True Positives (TP)** | 379 | **548** | **+169 thực thể** | 🛡️ Bắt thêm 169 thực thể nhạy cảm bị sót |
| **False Negatives (FN)** | 181 | **12** | **-169 thực thể** (-93.4%) | 🟢 Triệt tiêu 93.4% nguy cơ rò rỉ PII |
| **False Positives (FP)** | 82 | **16** | **-66 thực thể** (-80.5%) | ✨ Giảm mạnh tình trạng che nhầm từ vô hại |
| **Độ chính xác (Precision)** | 82.21% | **97.16%** | **+14.95%** | 🎯 Độ chính xác vượt trội |
| **Độ bao phủ (Recall)** | 67.68% | **97.86%** | **+30.18%** | 🚀 Tăng vọt độ bao phủ an toàn dữ liệu |
| **Điểm F1 Score** | 74.24% | **97.51%** | **+23.27%** | ⚖️ Cân bằng tối ưu giữa Precision & Recall |
| **Độ trễ trung bình** | 75.89 ms | **51.20 ms** | Nhanh hơn 1.48x | ⚡ Nhờ Mask-and-Pass làm sạch sớm |

---

## 4. 📁 Danh Sách File Báo Cáo Trong `performance/sau_HITL/`
1. 📄 [`report_stream_b_tier1.md`](./report_stream_b_tier1.md): Chi tiết hiệu năng Bộ lọc Regex sau khi bổ sung mẫu quốc tế.
2. 📄 [`report_stream_b_tier2.md`](./report_stream_b_tier2.md): Chi tiết hiệu năng Bộ tra cứu từ điển FlashText nạp danh mục DPO.
3. 📄 [`report_stream_b_tier3_ml.md`](./report_stream_b_tier3_ml.md): Chi tiết hiệu năng Bộ nhận diện GLiNER Zero-Shot PII.
4. 📄 [`report_stream_b.md`](./report_stream_b.md): Báo cáo hiệu năng chuyên sâu Luồng B sau HITL (file này).
5. 📄 [`report_stream_a.md`](./report_stream_a.md): Báo cáo đối chiếu Luồng A sau HITL.
6. 📄 [`performance_report.md`](./performance_report.md): Báo cáo tổng hợp đối chiếu toàn diện hệ thống.
7. 📄 [`performance_results.json`](./performance_results.json): Dữ liệu kết quả chi tiết từng trường/văn bản.
