# PIIGuard Shield - Sơ đồ Luồng Phân loại & Redact PII

Sơ đồ thể hiện luồng xử lý nhận diện và làm mờ dữ liệu cá nhân (PII), bao gồm sự phân chia giữa luồng dữ liệu cấu trúc (Column-level) và phi cấu trúc (Entity-level) dựa trên việc phân tích tính chất phân phối (Variance) của dữ liệu.

```mermaid
flowchart TD
    Start(["Bắt đầu: Hệ thống quét một Cột (Column)"]) --> Profiling["Trích xuất Schema &\nPhân tích Thống kê (Database Profiling / N-Samples)"]
    
    Profiling --> Condition{"Phân tích Phân phối Dữ liệu:\n- Phương sai (Variance) cao?\n- Phân tán từ rỗng đến đoạn văn?"}
    
    %% ================= LUỒNG B =================
    Condition -- "ĐÚNG (Variance lớn / Max length cao)\nData phi cấu trúc\n(Feedback, Chat log, Note...)" --> FlowB_Start["Hệ thống gắn nhãn:\nPOTENTIAL_FREE_TEXT"]
    FlowB_Start --> DPODecision{"DPO xem xét trên UI\nvà ra quyết định"}
    
    DPODecision -- "Chọn Che/Xóa nhanh\n(Tránh tốn tài nguyên)" --> NormalAction["Gắn Action:\nMASK / DROP cả cột"]
    
    DPODecision -- "Chọn Quét sâu (Deep Scan)\n(Giữ lại text, che từng PII)" 
    
    --> RowLevelJob[["Kích hoạt Background Job:\nDuyệt qua MỌI DÒNG trong cột"]]
    
    subgraph FlowB ["Luồng B: Entity-Level Redaction (Tối ưu cho Văn bản dài)"]
        direction TB
        RowLevelJob --> B_Regex["Tầng 1: Regex & Rules\n(Tìm SĐT, Email, Số thẻ trong khối text)"]
        B_Regex --> B_NER["Tầng 2: ML / NER Model (Local)\n(Dùng Spacy/Presidio tìm Tên người, Địa danh)"]
        B_NER --> B_Output["Che các thực thể tìm được\n(Vd: 'KH [PERSON] phàn nàn...')"]
    end
    
    B_Output --> RedactAction["Gắn Action:\nREDACT_ENTITIES"]
    
    %% ================= LUỒNG A =================
    Condition -- "SAI (Variance thấp, bám sát Mean)\nData có cấu trúc / độ dài cố định\n(CCCD, SĐT, Ngày sinh, Code...)" --> A_Regex
    
    subgraph FlowA ["Luồng A: Column-Level Detection (Cascade 3 tầng hiện tại)"]
        direction TB
        A_Regex["Tầng 1: Regex & Rules\n(Kiểm tra trên tập mẫu ngẫu nhiên)"]
        A_Regex -- "Chưa rõ" --> A_BM25["Tầng 2: Metadata / BM25\n(Khớp tên cột, schema với từ điển PII)"]
        A_BM25 -- "Chưa rõ" --> A_LLM["Tầng 3: LLM\n(Suy luận ngữ nghĩa từ tập mẫu)"]
        
        A_Regex -- "Bắt được PII" --> A_Found((Nhận diện\nlà Cột PII))
        A_BM25 -- "Bắt được PII" --> A_Found
        A_LLM -- "Bắt được PII" --> A_Found
        
        A_LLM -- "Không có PII" --> A_Safe((Không phải\nCột PII))
    end
    
    A_Found --> MaskAction["Gắn Action:\nMASK / DROP cả cột"]
    A_Safe --> KeepAction["Gắn Action:\nKEEP (Giữ nguyên)"]
    
    %% ================= KẾT LUẬN =================
    NormalAction --> FinalState(["Tổng hợp Đề xuất lưu vào App DB\nChờ DPO duyệt & Build Snapshot"])
    RedactAction --> FinalState
    MaskAction --> FinalState
    KeepAction --> FinalState
```
