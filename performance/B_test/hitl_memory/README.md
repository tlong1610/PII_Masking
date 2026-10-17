# 🧠 BỘ NHỚ NHỎ HUMAN-IN-THE-LOOP (HITL) — LUỒNG B (FREE-TEXT NER)

> **Thư mục:** `performance/B_test/hitl_memory/`  
> **Chức năng:** Lưu trữ các can thiệp, phản hồi và tinh chỉnh của Chuyên viên Bảo vệ Dữ liệu (DPO) đối với các lỗi nhận diện thực thể trong văn bản tự do (Free-Text NER Redactor), kết hợp nâng cấp sang mô hình **GLiNER Zero-Shot PII**.

---

## 1. 📂 Thành Phần Bộ Nhớ HITL Luồng B

1. 📄 [`hitl_feedback_log.json`](./hitl_feedback_log.json):
   - Nhật ký kiểm toán (Audit Trail) ghi lại 10 phản hồi can thiệp của DPO giải quyết 5 nhóm lỗi trọng điểm:
     - `FN_ADDRESS`: Bỏ sót địa chỉ do mô hình ViElectra cũ chỉ có nhãn `LOC`.
     - `FN_PERSON_OOV`: Bỏ sót tên ngoài từ điển FlashText.
     - `FP_ORG_AS_PERSON`: Gán nhầm tên tổ chức/công ty thành tên người.
     - `FN_PHONE_INTL`: Bỏ sót số điện thoại quốc tế.
     - `FN_COMPOUND_NAME`: Cắt rời các cụm tên ghép phức hợp.

2. 📄 [`hitl_rag_corpus.json`](./hitl_rag_corpus.json):
   - Corpus từ khóa và định nghĩa thực thể chuyên biệt cho văn bản tự do.
   - Thiết lập cấu hình nhãn GLiNER (`gliner_labels`) và ngưỡng tự tin tối ưu (`threshold`) cho từng nhóm PII:
     - `FULL_NAME`: `person` (ngưỡng 0.28)
     - `STREET_ADDRESS`: `address`, `location` (ngưỡng 0.30)
     - `TAX_CODE_ORG`: `organization` (ngưỡng 0.45, KEEP)
     - `PHONE`: `phone number` (ngưỡng 0.35)
     - `EMAIL`: `email` (ngưỡng 0.35)
     - `CCCD`: `id document` (ngưỡng 0.30, HMAC)

3. 📄 [`dpo_few_shot_memory.json`](./dpo_few_shot_memory.json):
   - Tập ví dụ mẫu thực tế (Few-Shot Context) kèm chú giải chuyên môn của DPO (`dpo_notes`).
   - Cung cấp các ca biên điển hình: tên người ngoại quốc có ký tự đặc biệt, địa chỉ quốc tế và Việt Nam đa cấp, tên bệnh viện và công ty B2B.

---

## 2. 🚀 Nâng Cấp Tầng 3: Chuyển Sang GLiNER Zero-Shot PII
- **Trước HITL:** Sử dụng `NlpHUST/ner-vietnamese-electra-base` — chỉ nhận diện được 3 nhãn cứng `PER`, `LOC`, `ORG`, gặp lỗi tách token sub-word và bỏ sót hầu hết các cấu trúc địa chỉ chi tiết.
- **Sau HITL:** Chuyển sang kiến trúc **GLiNER Multi-PII** (`urchade/gliner_multi_pii-v1`), khai báo nhãn tùy biến (Open-Vocabulary), bao quát trọn vẹn cả `address`, `phone number`, `id document`, `bank account`.
- **Hậu xử lý:** Tích hợp thuật toán gộp span liền kề (Span Merging) giúp khắc phục triệt để lỗi cắt xén thực thể.

---

## 3. 🎯 Kết Quả Đánh Giá Đối Chiếu
Kết quả chi tiết được tổng hợp và đối chiếu tại:
- [`performance/sau_HITL/report_stream_b.md`](../../sau_HITL/report_stream_b.md)
- [`performance/sau_HITL/performance_report.md`](../../sau_HITL/performance_report.md)

