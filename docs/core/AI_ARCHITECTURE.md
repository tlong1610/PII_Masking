# PIIGuard Shield - AI Architecture

Tài liệu này ghi lại trạng thái AI detection theo source hiện tại, để team không trình bày lệch với code.

## 1. AI trong PIIGuard Shield (Giai đoạn P1 hoàn thành)

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
| 1 | `OPENAI_API_KEY` | `OPENAI_MODEL`, mặc định `gpt-4o-mini` (bật `logprobs` để tính `confidence_score`) |
| 2 | `OPENROUTER_API_KEY` | `MODEL_NAME`, mặc định `gpt-4o-mini` (OpenRouter thường cần id dạng `openai/gpt-4o-mini`) |
| 3 | `GOOGLE_API_KEY` | hard-code `gemini-2.0-flash` |

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

Mỗi tầng ghi `confidence_score` (rule = 1.0, BM25 chuẩn hoá, hybrid fusion, LLM từ logprobs hoặc tự khai). Điểm này được lưu vào `field_profiles.confidence_score` và hiển thị "Độ tin cậy" trên màn hình duyệt.

### Thống kê phân bố cho tầng LLM

Khi lấy profile, connector đếm trong DB (Postgres: `COUNT(*)`, `COUNT(col)`, `COUNT(DISTINCT col::text)` trên tối đa
10.000 dòng đầu; Mongo: trên các document đã đọc để dò schema, chỉ giữ `hash()` của giá trị). Chỉ ba con số đi ra
khỏi DB; `src/detection/column_stats.py` đổi chúng thành mức gần đúng trước khi đưa vào prompt cùng tên bảng:
không gửi số dòng chính xác, không bao giờ dùng min/max/giá trị phổ biến (đó là giá trị thật).

| Số giá trị khác NULL | Gửi gì |
|---|---|
| Dưới 5 | Không gửi |
| 5-49 | Chỉ khi lặp nhiều (tỷ lệ khác nhau < 0.5); còn lại "chưa kết luận được" |
| Từ 50 | Mức tỷ lệ khác nhau (rất thấp / thấp / trung bình / rất cao) và mức ô trống |

Thống kê chỉ là gợi ý: prompt nhắc rằng họ/tên riêng lẻ cũng lặp nhiều nhưng vẫn là `FULL_NAME`. Nhãn `JOB_TITLE`
(chức danh, vị trí, phòng ban) là định danh gián tiếp L1, đề xuất `KEEP`.

### HITL: học từ quyết định DPO

Khi `ENABLE_AI_SCAN=true`, mỗi lần DPO lưu quyết định (`PUT /runs/{id}/decisions`) khác đề xuất của scanner (đổi action hoặc xác nhận "không phải PII"), backend ghi một ví dụ `{table_name, column_name, dpo_decision, action}` vào `HITL_MEMORY_PATH` (mặc định `data/hitl/dpo_few_shot_memory.json`, không commit). Quyết định mới hơn cho cùng bảng + cột thay thế bản cũ. Tầng LLM ghép file seed `src/detection/dpo_few_shot_memory.json` với file runtime và chọn 3 ví dụ có tên cột gần nhất làm few-shot. Không lưu sample hay data shape.

Tự cập nhật RAG corpus/ChromaDB (`update_rag_corpus`) chưa nối vào API: hàm này ghi đè file corpus đã commit và embed lại toàn bộ ChromaDB đồng bộ, còn BM25 chỉ đọc corpus lúc khởi động.

### Văn bản tự do: NER (Luồng B)

Cột văn bản tự do (kiểu text và tên giống `notes`/`comment`/`ghi_chu`, hoặc mẫu là câu dài nhiều từ) mà scanner chưa gắn được loại PII cụ thể sẽ chạy thêm NER trên sample trong bộ nhớ (`src/detection/ner_orchestrator.py`): Regex -> Từ điển FlashText (`src/detection/dict_ner.py`) -> GLiNER zero-shot `urchade/gliner_multi_pii-v1` (khi `ENABLE_NER=true`, cần `gliner`; văn bản dài được quét theo đoạn ≤ 300 từ vì GLiNER tự cắt bỏ phần vượt giới hạn). Có thực thể PII thì đề xuất `REDACT`, `taxonomy_id=FREE_TEXT_PII`; metadata chỉ ghi loại thực thể và số mẫu, không ghi giá trị. Cột L3 (sức khoẻ, tài chính) và cột đã xác định loại cụ thể (ADDRESS, FULL_NAME...) giữ đề xuất cũ.

Khi build snapshot, `REDACT` giữ câu và thay từng thực thể bằng nhãn (`Gọi 0912345678` -> `Gọi [PHONE]`); giá trị không phải chuỗi bị thay cả ô bằng `[REDACTED]`. Verifier Postgres tìm SĐT/CCCD/email còn sót ở bất kỳ vị trí nào trong cột `REDACT`.

**Kết quả đánh giá Luồng B sau HITL & GLiNER ([`performance/sau_HITL/report_stream_b.md`](../../performance/sau_HITL/report_stream_b.md)):**
- Nhờ cơ chế Mask-and-Pass (Tầng 1 Regex $\rightarrow$ Tầng 2 FlashText $\rightarrow$ Tầng 3 GLiNER Multi-PII), hiệu năng của Luồng B đã có bước nhảy vọt:
  - **Recall:** Tăng từ 67.68% lên **97.86%** (+30.18%, triệt tiêu 93.4% rủi ro bỏ sót PII).
  - **Precision:** Đạt **97.16%** (giảm 80.5% báo động giả).
  - **F1 Score:** Đạt **97.51%** (cân bằng hoàn hảo giữa bảo vệ và bảo toàn ngữ nghĩa).
  - **Độ trễ trung bình:** 51.20 ms / tài liệu (nhờ lọc sớm bằng Regex và FlashText trước khi gọi model ML).

**Kết quả đánh giá Luồng A sau HITL ([`performance/sau_HITL/report_stream_a.md`](../../performance/sau_HITL/report_stream_a.md)):**
- Nhờ bộ nhớ quy tắc DPO và few-shot in-context learning:
  - **Action Accuracy:** Đạt **100.00%** trên toàn bộ 339 trường cột doanh nghiệp (khắc phục hoàn toàn 50/50 ca biên ban đầu).
  - **Chỉ số rủi ro ($R_{\text{CW}}$):** Giảm về **0.00%**.

## 5. Zero Raw PII

Nguyên tắc bảo mật trong code và docs:

- API response không trả credential, connection string, HMAC secret hoặc raw source value.
- UI DPO không render raw source value. Analyst chỉ xem snapshot đã publish; ngoại lệ PII `KEEP` (có lý do + hạn) vẫn sao chép giá trị gốc vào snapshot, nên đây là giới hạn đã biết.
- LLM prompt không chứa raw `sample_value`.
- Report/evidence/log không được chứa raw PII, API key hoặc password.
- `sample_value` trong `eval/golden_labels.json` chỉ dùng nội bộ cho eval và fixture synthetic.
- **Deep Content Inspection song hành Zero Raw PII:** Engine AI (GLiNER Cascade) phân tích sâu nội dung văn bản trong RAM (`column.samples`), nhưng kết quả trả về cho DPO được trừu tượng hóa an toàn: chỉ gồm loại thực thể (`PER`, `PHONE`), tỷ lệ xuất hiện và đề xuất `REDACT`. DPO kiểm chứng qua Live Sandbox (mẫu giả lập) mà không tiếp xúc văn bản thật.

Với luồng `ColumnProfile`, sample nội bộ được đổi thành data shape trước khi đi tiếp:

```text
0901234567 -> XXXXXXXXXX
nguyen@example.vn -> CCCCCC@CCCCCCC.CC
```

Với luồng enterprise `FieldProfile`, prompt LLM chỉ dùng metadata/statistics, không dùng sample.

## 6. Action policy (Bảo toàn giá trị phân tích vs Bảo mật)

Không áp dụng che thô `***` đồng loạt vì sẽ phá hủy toàn bộ hệ thống phân tích hạ tầng:

| Action | Ý nghĩa | Lý do kỹ thuật (Data Utility) |
|---|---|---|
| `HMAC` | Băm 1 chiều có salt bí mật | Giữ khóa JOIN/mapping nhất quán, **tránh nổ tích Đề-các (Cartesian join)** làm sập DB |
| `REDACT` | Thay thực thể bằng nhãn (`[PHONE]`) | Giữ cấu trúc câu cho AI/LLM phân tích ngữ nghĩa, topic, sentiment |
| `MASK` | Che đoạn giữa (`0912***789`) | Giữ đặc trưng thống kê (nhà mạng, domain email, nhóm tuổi) |
| `DROP` | Loại bỏ hẳn trường khỏi schema | Xóa sạch trường thừa thãi rủi ro cao (ảnh CCCD, biometric) để tiết kiệm lưu trữ |
| `KEEP` | Giữ nguyên giá trị | Áp dụng cho trường phi cá nhân (doanh thu, ngày tạo) để số liệu báo cáo chuẩn xác |

Backend có guardrail: nếu classification là PII/UNKNOWN mà proposal lại `KEEP`, `run_scanner.enforce_proposal_consistency(...)` hạ về `MASK` để DPO xem xét. Downstream Verifier (`sql_verifier.py`) tự động kiểm tra `join_matched` và chặn phát hành nếu vi phạm tính toàn vẹn.

## 7. Giới hạn hiện tại

- LLM không phải nguồn sự thật cuối cùng; DPO vẫn duyệt trên siêu dữ liệu.
- `OPENAI_BASE_URL` chưa hỗ trợ trong code.
- Giai đoạn P1 đã hoàn thành trọn vẹn việc quét sâu field/value patterns trong PostgreSQL/MongoDB hiện có, xây dựng thành công bộ nhớ HITL Few-shot Memory và cascade NER văn bản tự do.
- Nếu `ENABLE_AI_SCAN=false`, field không khớp rules có thể rơi vào `UNKNOWN`/fallback và cần DPO quyết định.
- Golden dataset có `sample_value` synthetic để eval, nhưng tuyệt đối không dùng làm prompt/report/UI (tuân thủ Zero Raw PII).
