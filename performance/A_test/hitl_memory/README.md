# 🧠 BỘ NHỚ NHỎ HUMAN-IN-THE-LOOP (HITL) — LUỒNG A

> **Thư mục:** `performance/A_test/hitl_memory/`  
> **Chức năng:** Lưu trữ các can thiệp, phản hồi và tinh chỉnh của Chuyên viên Bảo vệ Dữ liệu (DPO) đối với các ca biên (edge cases) và các ca phân loại sai trong lần chạy ban đầu của Luồng A.

---

## 1. 📂 Thành Phần Bộ Nhớ HITL
1. 📄 `hitl_rag_corpus.json`:
   - Bổ sung các cụm từ khóa chuyên môn doanh nghiệp vào tập RAG Corpus phục vụ Tầng 2 (BM25) và Tầng 3.1 (Vector Search).
   - Thêm các từ khóa tài khoản thanh toán (`source_account`, `destination_account`, `so_tai_khoan`), mã số thuế công ty (`company_tax_id`, `business_tax_number`), dữ liệu KYC thô (`extracted_raw_ocr`, `id_card_back_path`), và dữ liệu sinh trắc học (`fingerprint_template`).
   - Chuẩn hóa chính sách hành động tương ứng (`DROP` cho KYC/Biometric, `KEEP` cho MST doanh nghiệp, `MASK` cho tài khoản ngân hàng).

2. 📄 `dpo_few_shot_memory.json`:
   - Danh sách các ví dụ quyết định mẫu có cấu trúc (`column_name`, `data_shape`, `dpo_decision`, `action`, `notes`).
   - Được nạp trực tiếp vào ngữ cảnh System Prompt của Tầng 3.2 (LLM GPT-4o-mini) giúp LLM học ngữ cảnh nghiệp vụ ngay lập tức mà không cần huấn luyện lại mô hình (In-Context Learning).

3. 📄 `hitl_feedback_log.json`:
   - Nhật ký kiểm toán (Audit Trail) ghi lại 17 can thiệp của DPO để giải quyết toàn bộ các cụm lỗi chính của Luồng A.

---

## 2. 🎯 Mục Tiêu Đánh Giá Sau HITL
Kết quả sau khi kích hoạt bộ nhớ này được lưu độc lập tại thư mục `performance/sau_HITL/` để so sánh trực quan hiệu quả học máy (Machine Learning Loop) của hệ thống.
