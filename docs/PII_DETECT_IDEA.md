# Tổng hợp Ý Tưởng Kiến Trúc Nhận Diện PII (PII Detect Architecture)
*Dành cho Dữ liệu có cấu trúc (SQL) theo tiêu chuẩn bảo mật & Luật Việt Nam.*

## 1. Tổng Quan Kiến Trúc (Mô hình Funnel)
Sử dụng mô hình phễu lọc 2 lớp (Two-Layer Funnel) chuyển từ việc quét từng dòng (Row-level) sang quét theo cấu trúc cột (Column-level) nhằm tối ưu chi phí, giảm độ trễ (latency), và bảo vệ dữ liệu tuyệt đối (Zero Data Leakage).

- **Lớp 1 (Lọc cứng):** Rule-based + Regex (Nhanh, rẻ, chính xác tuyệt đối với PII định dạng chuẩn).
- **Lớp 2 (Phân tích ngữ cảnh):** LLM + BM25 kết hợp Taxonomy/Ontology (Giải quyết vùng xám, dữ liệu phi cấu trúc trong cột).
- **Lớp 3 (Duyệt thủ công):** Human-in-the-loop (HITL) cho các trường hợp "vùng xám" dưới ngưỡng tin cậy.

---

## 2. Chi Tiết Các Lớp Quét

### Lớp 1: Rule-based & Regex (The Hard Filter)
- **Mục tiêu:** Nhận diện ngay lập tức các PII rập khuôn (CCCD, SĐT Việt Nam, Email, Mã số thuế, Số thẻ/TK ngân hàng).
- **Cơ chế:** 
  - Chạy quét Regex trực tiếp trên dữ liệu của các cột.
  - Cột/Phần dữ liệu khớp Rule sẽ được gán nhãn ngay lập tức (Ví dụ: `100% PII - Loại: CCCD`).
  - Dữ liệu nào KHÔNG khớp hoặc có tính chất tự do (free-text) sẽ được đẩy qua Lớp 2.

### Lớp 2: LLM & BM25 Hybrid Score (The Contextual Analyzer)
Với các cột chứa nội dung mơ hồ (như `note`, `description`, `address`), thực hiện xử lý qua các bước:

#### 2.1. Chuẩn bị dữ liệu (Column Profiling & Data Shape)
Thay vì đẩy từng dòng, hệ thống quét theo **Metadata của cột**:
- **Trích xuất Context:** Lấy Tên Bảng (Table Name) + Tên Cột (Column Name).
- **Data Shape (Bảo vệ dữ liệu):** Chọn ngẫu nhiên 5-10 giá trị mẫu (sample values) trong cột. Sử dụng NER hoặc bộ Regex của Lớp 1 để thay thế thông tin nhạy cảm thành định dạng khối (Shape) trước khi gửi.
  - *Ví dụ:* `"Khách hàng Nguyễn Văn A, SĐT 0912345678 vay 50 triệu"` $\rightarrow$ `"Khách hàng [NAME], SĐT [PHONE] vay 50 triệu"`.
  - *Ý nghĩa:* Biến đổi này giữ lại được cấu trúc câu và ngữ cảnh (vay nợ) để phân tích, nhưng không làm lộ dữ liệu thật cho LLM.

#### 2.2. Taxonomy Mapping (Làm giàu & Đối chiếu Luật)
- Khởi tạo một `Taxonomy/Ontology Dictionary` (Từ điển phân loại) dịch từ ngôn ngữ hàn lâm của Luật 91/2025 & NĐ 356 sang các từ khóa thực tiễn.
  - *Ví dụ Luật:* "dữ liệu về sức khỏe" $\rightarrow$ *Taxonomy mở rộng:* `["bệnh", "thuốc", "điều trị", "ung thư", "HIV", "khám"...]`.
- **BM25 Scoring:** Tính điểm tương đồng (BM25) giữa các sample data của cột và bộ Taxonomy để đánh giá mật độ từ khóa nhạy cảm.

#### 2.3. LLM Evaluation
- Đưa toàn bộ Context (Tên cột, Tên bảng, Data Shape) và kết quả BM25 (RAG nhẹ) vào LLM.
- **Prompt LLM:** *"Dựa vào tên cột là 'medical_note' và các giá trị mẫu 'Bệnh nhân [NAME] chẩn đoán ung thư', kết hợp với các từ khóa pháp lý (BM25), cột này có chứa PII (Dữ liệu sức khỏe) theo Luật 91 không?"*

#### 2.4. Hybrid Score & Threshold (Cơ chế ra quyết định)
- **Công thức:** `Score = (W1 * BM25_Score) + (W2 * LLM_Confidence_Score)` (với W1, W2 là trọng số có thể tuning).
- Đặt **Threshold (Ngưỡng)** theo nguyên tắc quản trị rủi ro: *Cost của việc bỏ sót (False Negatives) cao hơn Cost của việc cảnh báo nhầm (False Positives)*.
  - **Khớp cao (Score > 0.8):** Tự động đánh dấu là PII và phân loại (Recommend Action: MASK/DROP).
  - **Vùng xám (0.4 < Score <= 0.8):** Gắn cờ (Flagged) chuyển cho HITL xử lý.
  - **An toàn (Score <= 0.4):** Non-PII (Bỏ qua).

### Lớp 3: Human-In-The-Loop (HITL) - Xử lý Vùng Xám
- User với vai trò **DPO (Data Protection Officer)** sẽ xem xét và duyệt các cột/bảng bị rơi vào vùng xám.
- **Feedback Loop:** Quyết định của DPO (Đồng ý/Từ chối) sẽ được lưu lại (log) để:
  1. Cập nhật lại ngưỡng Threshold của Hybrid Score.
  2. Bổ sung từ khóa mới vào Taxonomy cho các lần quét sau, giúp hệ thống thông minh dần lên.

---

## 3. Giá Trị Kỹ Thuật Mang Lại
1. **Bảo vệ quyền riêng tư tuyệt đối (Zero Data Leakage):** Kỹ thuật "Data Shape" (giữ ngữ cảnh, che thực thể) giúp dùng LLM đám mây mà không vi phạm quy định bảo mật.
2. **Hiệu năng & Chi phí tối ưu (Low Latency & Cost-effective):** Dịch chuyển từ quét theo dòng (Row-level) sang quét theo cụm cấu trúc (Column Profiling) giảm tải hàng nghìn lần chi phí tính toán API.
3. **Độ chính xác pháp lý (Legal Accuracy):** Giải quyết được độ vênh giữa từ vựng pháp lý (Luật) và dữ liệu thực tế bằng lớp Ontology/Taxonomy trung gian.
4. **Chuẩn Enterprise (Enterprise-grade Risk Management):** Kết hợp chặt chẽ giữa chấm điểm Hybrid, Threshold lệch an toàn (chuộng False Positive hơn False Negative) và luồng duyệt tay HITL.

