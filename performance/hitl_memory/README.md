# 🧠 BỘ NHỚ TRUNG TÂM HUMAN-IN-THE-LOOP (HITL MEMORY) — PIIGUARD

> **Thư mục:** `performance/hitl_memory/`  
> **Kiến trúc:** Hệ thống phản hồi chuyên gia DPO (Data Protection Officer) tích hợp trực tiếp vào vòng lặp học máy (Human-In-The-Loop Active Learning).  
> **Phạm vi bảo vệ:** Chuẩn hóa toàn diện cả 2 nguồn dữ liệu doanh nghiệp:
> - **Luồng A (Tabular/Field Data):** Dữ liệu bảng CSDL quan hệ (PostgreSQL, MongoDB) và dữ liệu có cấu trúc.
> - **Luồng B (Free-Text Data):** Dữ liệu văn bản phi cấu trúc (hồ sơ, bài viết, chat log, báo cáo y tế/tài chính).

---

## 1. 📂 Cấu Trúc Thành Phần Bộ Nhớ HITL

```
performance/hitl_memory/
├── README.md                     # Tài liệu tổng quan kiến trúc bộ nhớ HITL
├── unified_feedback_log.json     # Nhật ký kiểm toán gộp 27 can thiệp DPO (Luồng A + B)
├── stream_a_feedback_log.json    # 17 can thiệp DPO cho dữ liệu dạng cột (Luồng A)
├── stream_b_feedback_log.json    # 10 can thiệp DPO cho văn bản tự do & GLiNER (Luồng B)
├── hitl_rag_corpus.json          # RAG Knowledge Base nạp từ khóa & chính sách hành động
└── dpo_few_shot_memory.json      # In-Context Few-Shot Examples cho LLM & GLiNER
```

---

## 2. ⚡ Cơ Chế Áp Dụng Bộ Nhớ HITL Vào Từng Tầng (Multi-Tier Architecture)

### 2.1. Đối Với Luồng A (Cascade Column Scanner — 4 Tiers)
1. **Tầng 1 (Static Rules & Regex):**
   - Nạp quy tắc phân định ngữ cảnh bảng `suppliers`/`partners` $\rightarrow$ Chốt chính xác Mã số thuế doanh nghiệp (`TAX_CODE_ORG` $\rightarrow$ `KEEP`) trong $< 0.05\text{ ms}$, tránh báo động giả `TAX_CODE`.
   - Nhận diện khóa quan hệ CCCD $\rightarrow$ Tự động gán hành động `HMAC` để bảo toàn khóa nối (Join Key Integrity).
2. **Tầng 2 (BM25 Lexical Engine):**
   - Nạp [`hitl_rag_corpus.json`](./hitl_rag_corpus.json) bổ sung từ khóa OCR KYC và tài liệu tùy thân (`extracted_raw_ocr`, `id_card_back_path`) với chính sách bắt buộc `DROP`.
3. **Tầng 3 (LLM Context Reasoning với GPT-4o-mini):**
   - Nạp 17 ví dụ mẫu từ [`dpo_few_shot_memory.json`](./dpo_few_shot_memory.json) vào System Prompt $\rightarrow$ Giải quyết dứt điểm các ca mập mờ: tài khoản ngân hàng (`BANK_ACCOUNT` $\rightarrow$ `MASK`), sinh trắc học (`BIOMETRIC_DATA` $\rightarrow$ `DROP`).

### 2.2. Đối Với Luồng B (Free-Text NER Redactor — 3 Tiers)
1. **Tầng 1 (Regex Scanner):**
   - Bổ sung pattern Regex số điện thoại quốc tế (+XX...) và mã định danh hộ chiếu.
2. **Tầng 2 (Dictionary FlashText / Aho-Corasick):**
   - Nạp danh mục từ điển mở rộng gồm 120+ tên người ngoại lệ, 63 tỉnh/thành phố và blacklist loại trừ tên tổ chức công ty.
3. **Tầng 3 (Zero-Shot AI với GLiNER):**
   - Thay thế model ViElectra cũ bằng **GLiNER Multi-PII** (`urchade/gliner_multi_pii-v1`).
   - Cấu hình tập nhãn động: `person`, `address`, `location`, `organization`, `phone number`, `email`, `id document`, `bank account`.
   - Tích hợp cơ chế gộp span liền kề (Span Merging) và ngưỡng động (Dynamic Thresholding) giúp triệt tiêu hiện tượng cắt xén họ tên và địa chỉ.

---

## 3. 📊 Kết Quả Đánh Giá Đối Chiếu (Before vs After HITL)

Toàn bộ kết quả thực nghiệm trước và sau khi nạp bộ nhớ HITL được lưu trữ độc lập tại:
* Trước HITL (Baseline): [`performance/A_test/`](../A_test/) và [`performance/B_test/`](../B_test/)
* Sau HITL (Post-Learning): [`performance/sau_HITL/`](../sau_HITL/)
* Báo cáo so sánh chi tiết: [`performance/sau_HITL/performance_report.md`](../sau_HITL/performance_report.md)

