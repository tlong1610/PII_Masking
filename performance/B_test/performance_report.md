# 🏆 BÁO CÁO HIỆU NĂNG TỔNG HỢP LUỒNG B (FREE-TEXT REDACTOR) — B_test

> **Dự án:** *PIIGuard Shield — Enterprise Data Privacy Governance*  
> **Đối tượng:** **LUỒNG B — Xử Lý Dữ Liệu Văn Bản Tự Do (Free-Text NER Redaction)**  
> **Tập dữ liệu:** `performance/data/B_dataset/synth_dataset_v2_standardized.json`  
> **Quy mô kiểm thử:** **300 văn bản tự do** (560 thực thể Ground Truth)  
> **Thời điểm chạy:** 2026-10-15 11:34:30  

---

## 1. 🔬 Ma Trận Đối Chiếu Hiệu Năng Các Tầng Trong Luồng B

| Tầng Phễu Lọc | Báo Cáo Chi Tiết | True Positives (TP) | Precision | Recall | F1 Score | Độ trễ TB / doc |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **TIER 1 (Regex)** | [`report_tier1.md`](./report_tier1.md) | **22** | **100.00%** | 3.93% | 7.56% | **0.05 ms** |
| **TIER 2 (Từ Điển FlashText)**| [`report_tier2.md`](./report_tier2.md) | **328** | **90.36%** | 58.57% | 71.07% | **0.04 ms** |
| **TIER 3 (AI / Transformer)** | [`report_tier3_ml.md`](./report_tier3_ml.md) | **294** | **79.89%** | 52.50% | 63.36% | **86.69 ms** |
| **TOÀN BỘ PHỄU CASCADE** | — | **379** | **82.21%** | **67.68%** | **74.24%** | **75.89 ms** |

---

## 2. ⚡ Cơ Chế Mask-and-Pass Trong Luồng B
Quá trình xử lý văn bản tự do diễn ra tuần tự:
```
Văn bản gốc ──▶ [Tầng 1: Regex] ──▶ Che [EMAIL], [PHONE], [CCCD]
                     │
                     ▼
             [Tầng 2: FlashText] ──▶ Che [PERSON_NAME], [LOCATION], [ORGANIZATION]
                     │
                     ▼
             [Tầng 3: AI/ML]     ──▶ Quét ngữ cảnh còn lại bắt các tên lạ/ngoại lệ
                     │
                     ▼
             Văn bản đã làm sạch (Zero-PII Safe Document)
```

---

## 3. 📁 Danh Sách File Báo Cáo Trong `performance/B_test/`
1. 📄 [`report_tier1.md`](./report_tier1.md): Chi tiết hiệu năng Bộ lọc Regex.
2. 📄 [`report_tier2.md`](./report_tier2.md): Chi tiết hiệu năng Bộ tra cứu từ điển FlashText.
3. 📄 [`report_tier3_ml.md`](./report_tier3_ml.md): Chi tiết hiệu năng Bộ nhận diện AI Transformer.
4. 📄 [`performance_report.md`](./performance_report.md): Báo cáo tổng hợp đối chiếu toàn bộ Luồng B.
5. 📄 [`performance_results.json`](./performance_results.json): Dữ liệu kết quả chi tiết từng văn bản.
