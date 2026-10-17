# PIIGuard Shield - Sơ đồ Luồng Phân loại & Redact PII

Sơ đồ thể hiện luồng xử lý nhận diện và làm mờ dữ liệu cá nhân (PII), bao gồm sự phân chia giữa luồng dữ liệu cấu trúc (Column-level - Luồng A) và phi cấu trúc (Entity-level - Luồng B) dựa trên việc phân tích tính chất phân phối dữ liệu (Variance) và kiểu dữ liệu.

```mermaid
flowchart TD
    Start(["Bắt đầu: Hệ thống quét một Cột (Column)"]) --> Profiling["Trích xuất Schema &\nPhân tích Thống kê (Database Profiling / N-Samples)"]
    
    Profiling --> Condition{"Phân tích Phân phối Dữ liệu:\n- Kiểu văn bản (Text/String)?\n- Tên cột notes/comment hoặc câu dài nhiều từ?"}
    
    %% ================= LUỒNG B =================
    Condition -- "ĐÚNG (Văn bản tự do / Phi cấu trúc)\n(Ghi chú KYC, Chat log, Feedback...)" --> FlowB_Start["Hệ thống kích hoạt:\nLuồng B Free-Text NER Cascade"]
    
    subgraph FlowB ["Luồng B: Entity-Level Redaction (Cascade Mask-and-Pass)"]
        direction TB
        FlowB_Start --> B_Regex["Tầng 1: Extended Regex\n(Email, SĐT VN, CCCD, Tài khoản ngân hàng)"]
        B_Regex --> B_FlashText["Tầng 2: Từ điển FlashText / DPO Memory\n(Tên người, Địa danh, Tên tổ chức)"]
        B_FlashText --> B_GLiNER["Tầng 3: GLiNER Zero-Shot Multi-PII\n(urchade/gliner_multi_pii-v1, chunking ≤ 300 từ)"]
        B_GLiNER --> B_Output["Thay thế thực thể bằng nhãn nhạy cảm\n(Vd: 'KH [FULL_NAME] SĐT [PHONE]...')"]
    end
    
    B_Output --> RedactAction["Gắn Action: REDACT\n(Recall 97.86%, Precision 97.16%)"]
    
    %% ================= LUỒNG A =================
    Condition -- "SAI (Data có cấu trúc / độ dài cố định)\n(CCCD, SĐT, Ngày sinh, Khóa nối, Code...)" --> A_Regex
    
    subgraph FlowA ["Luồng A: Column-Level Detection (Cascade 3 tầng)"]
        direction TB
        A_Regex["Tầng 1: Rules & Regex\n(Kiểm tra pattern, join keys, KYC documents)"]
        A_Regex -- "Chưa rõ" --> A_BM25["Tầng 2: BM25 Lexical Engine\n(Khớp ngữ cảnh schema với PII Corpus)"]
        A_BM25 -- "Chưa rõ" --> A_LLM["Tầng 3: LLM Context Reasoning\n(Prompt chỉ nhận Metadata & Thống kê column_stats.py)"]
        
        A_Regex -- "Khớp PII" --> A_Found((Nhận diện\nlà Cột PII))
        A_BM25 -- "Khớp PII" --> A_Found
        A_LLM -- "Khớp PII" --> A_Found
        
        A_LLM -- "Không phải PII" --> A_Safe((Non-PII /\nĐã rõ))
    end
    
    A_Found --> CheckJoin{"Có phải Khóa nối\n(PK/FK hoặc $lookup)?"}
    CheckJoin -- "ĐÚNG" --> HmacAction["Gắn Action: HMAC\n(Băm giữ toàn vẹn JOIN)"]
    CheckJoin -- "SAI" --> MaskOrDrop["Gắn Action: MASK / DROP\n(Che mờ hoặc loại bỏ cột)"]
    A_Safe --> KeepAction["Gắn Action: KEEP\n(Giữ nguyên cho Analyst)"]
    
    %% ================= KẾT LUẬN =================
    RedactAction --> FinalState(["Lưu Đề xuất vào App DB\nDPO duyệt qua 4 Tabs & Build Snapshot"])
    HmacAction --> FinalState
    MaskOrDrop --> FinalState
    KeepAction --> FinalState
```
