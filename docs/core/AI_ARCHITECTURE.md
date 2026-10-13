# PIIGuard Shield - AI Architecture

Tài liệu này ghi lại trạng thái AI detection theo source hiện tại, để team không trình bày lệch với code.

## 1. AI đang làm gì trong P1

AI trong PIIGuard không tự quyết định phát hành dữ liệu. Hệ thống tạo đề xuất phân loại/action cho từng field, DPO duyệt lại, rồi backend mới build snapshot đã bảo vệ.

Luồng thật khi tạo run:

```text
Database source -> connector profile -> scanner proposal -> DPO decision -> protected snapshot -> verifier -> publish
```

Với PostgreSQL và MongoDB live source, entrypoint scan nằm ở `src/services/run_scanner.py`:

- `scan_postgres_source(...)`
- `scan_mongo_source(...)`

Hai hàm này nhận schema/collection đã chọn, tạo field profile, rồi quét từng column/path. Metadata được lưu vào App DB; raw source value không được trả ra API/UI/report.

## 2. Hai chế độ scan

### Rules-only, mặc định

Khi `ENABLE_AI_SCAN=false`, hệ thống không gọi LLM. Các field được xử lý bằng:

- rules/regex trong `src/detection/rule_engine.py`;
- field profile rules trong `src/detection/field_profile_scanner.py`;
- rule đặc biệt cho join key, KYC document, tracking code, order id, amount, event date.

Chế độ này đủ để demo ổn định các case chính: CCCD, phone, email, full name, free text có PII, tracking code không bị nhận nhầm CCCD, join key dùng HMAC.

### AI-assisted, bật có chủ đích

Khi `ENABLE_AI_SCAN=true`, các field chưa chắc chắn có thể đi qua LangGraph/LLM. LLM chỉ nhận metadata/statistics đã lọc:

```text
- Engine database
- Table/collection
- Field path
- Data type
- Null count / distinct count
- Statistics JSON: length, shape, distribution
```

LLM không nhận raw `sample_value`. Nếu LLM lỗi, hết key, timeout hoặc trả JSON sai, backend fallback về proposal an toàn để DPO xem xét.

## 3. Provider và model

Provider fallback nằm trong `src/services/llm.py`:

| Thứ tự | Env cần có | Model dùng |
|---|---|---|
| 1 | `OPENROUTER_API_KEY` | `MODEL_NAME`, mặc định `gpt-oss-120b` |
| 2 | `OPENAI_API_KEY` | `OPENAI_MODEL`, mặc định `gpt-4o-mini` |
| 3 | `GOOGLE_API_KEY` | hard-code `gemini-3.5-flash-lite` |

Nếu không có key nào, `get_llm()` raise lỗi. Với scan live, lỗi LLM được bắt để field mập mờ không làm sập toàn bộ run.

Lưu ý hiện tại: `OPENAI_BASE_URL` chưa được khai báo trong `src/config.py` và chưa được truyền vào `ChatOpenAI`. Nếu team muốn dùng OpenAI-compatible gateway riêng như VNAIPro, cần bổ sung code trước rồi mới ghi vào docs/setup như cấu hình được hỗ trợ.

## 4. LangGraph và các tầng detection

Code có hai graph:

| Graph | File | Dùng cho |
|---|---|---|
| `agent` | `src/agents/graph.py` + `src/agents/nodes/scanner_nodes.py` | Luồng `ColumnProfile`: rules -> BM25 -> hybrid vector -> LLM -> proposal |
| `field_profile_agent` | `src/agents/graph.py` + `src/agents/nodes/field_profile_nodes.py` | Luồng `FieldProfile`: rules -> LLM optional -> proposal |

Luồng `ColumnProfile` dùng thêm:

- `BM25Engine` với corpus `src/detection/pii_rag_corpus.json`;
- `PIIKnowledgeBase` với ChromaDB local;
- HuggingFace embedding `sentence-transformers/all-MiniLM-L6-v2`, load lazy khi thật sự cần.

ChromaDB ở đây là knowledge base phân loại PII. Không dùng để lưu source database hoặc raw PII.

## 5. Zero Raw PII

Nguyên tắc bảo mật trong code và docs:

- API response không trả credential, connection string, HMAC secret hoặc raw source value.
- UI DPO và Analyst không hiển thị raw PII.
- LLM prompt không chứa raw `sample_value`.
- Report/evidence/log không được chứa raw PII, API key hoặc password.
- `sample_value` trong `eval/golden_labels.json` chỉ dùng nội bộ cho eval và fixture synthetic.

Với luồng `ColumnProfile`, sample nội bộ được đổi thành data shape trước khi đi tiếp:

```text
0901234567 -> XXXXXXXXXX
nguyen@example.vn -> CCCCCC@CCCCCCC.CC
```

Với luồng enterprise `FieldProfile`, prompt LLM chỉ dùng metadata/statistics, không dùng sample.

## 6. Action policy

| Action | Ý nghĩa |
|---|---|
| `MASK` | Che giá trị khi không cần join trực tiếp |
| `HMAC` | Băm một chiều có key để giữ join/lookup/mapping ổn định |
| `DROP` | Không đưa field vào snapshot phân tích |
| `KEEP` | Chỉ dùng cho non-personal hoặc trường đã có lý do nghiệp vụ rõ |

Backend có guardrail: nếu classification là PII/UNKNOWN mà proposal lại `KEEP`, `run_scanner.enforce_proposal_consistency(...)` hạ về `MASK` để DPO xem xét.

## 7. Giới hạn hiện tại

- LLM không phải nguồn sự thật cuối cùng; DPO vẫn duyệt.
- `OPENAI_BASE_URL` chưa hỗ trợ trong code.
- P1 không mở rộng sang cấu trúc dữ liệu mới; trọng tâm là quét sâu field/value patterns trong PostgreSQL/MongoDB hiện có.
- Nếu `ENABLE_AI_SCAN=false`, field không khớp rules có thể rơi vào `UNKNOWN`/fallback và cần DPO quyết định.
- Golden dataset có `sample_value` synthetic để eval, nhưng tuyệt đối không dùng làm prompt/report/UI.
