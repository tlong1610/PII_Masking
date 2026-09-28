# 🍃 BÁO CÁO NGHIỆM THU MONGODB END-TO-END — PIIGUARD VN

> **Dự án:** PIIGuard VN (Mã đề: DATA-06 — Nhóm: P-138)  
> **Kỹ sư phụ trách:** Nguyễn Trung Kiên (Data Engineer)  
> **Thời điểm nghiệm thu:** 26/09/2026 (UTC+7)  
> **Trạng thái:** 🟢 **ALL DOWNSTREAM $LOOKUP VERIFICATION CHECKS PASSED (100% MATCH — 830/830)**  
> **Bằng chứng máy đọc (JSON Evidence):** [`eval/results/mongo_e2e_evidence.json`](mongo_e2e_evidence.json)  

---

## 1. 📋 Tổng Quan MongoDB Fixtures (`data/fixtures/mongo/`)

Bộ dữ liệu NoSQL được xây dựng chuẩn JSON lồng nhau (nested documents), mô phỏng hệ thống thương mại điện tử tích hợp thông tin nhận danh công dân Việt Nam (VN PII), phục vụ quét phát hiện và ẩn danh hóa:

| Collection | File Fixture | Số Documents | Cấu trúc phân cấp chính | Chỉ mục (Indexes) đã khởi tạo |
|---|---|:---:|---|---|
| `customers` | [`seed_customers.json`](../../data/fixtures/mongo/seed_customers.json) | **91** | `_id`, `company_name`, `contact.name`, `contact.email`, `contact.phone`, `identity.cccd`, `identity.passport`, `identity.tax_code`, `addresses[]` | `idx_customers_cccd`, `idx_customers_email` |
| `orders` | [`seed_orders.json`](../../data/fixtures/mongo/seed_orders.json) | **830** | `_id`, `order_id`, `customer_id`, `order_date`, `shipping_address`, `pii_ext.customer_cccd`, `pii_ext.tracking_code` | `idx_orders_customer_id`, `idx_orders_customer_cccd`, `idx_orders_tracking_code` |

---

## 2. 🔗 Cơ Chế Liên Kết Downstream & Bảo Toàn Khóa HMAC-SHA256

Trong kiến trúc dữ liệu phân tán, MongoDB liên kết downstream với các bảng PostgreSQL và nội bộ giữa 2 collection qua 2 đường khóa:

### 2.1. Phép nối qua Khóa Định Danh Hệ Thống (`customer_id`)
```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "customers",
      localField: "customer_id",
      foreignField: "_id",
      as: "customer_info"
    }
  },
  { $match: { customer_info: { $ne: [] } } }
])
```
* **Kỳ vọng:** 830/830 đơn hàng liên kết thành công với khách hàng.

### 2.2. Phép nối qua Khóa Nghiệp Vụ PII (`pii_ext.customer_cccd` ⨝ `identity.cccd`)
- Doanh nghiệp sử dụng số CCCD (Căn cước công dân 12 số) làm định danh xác thực chéo (KYC).
- **Thách thức:** Theo Nghị định 13/2023/NĐ-CP và Luật Dữ liệu 2026, CCCD không được lưu dưới dạng thô trong môi trường phân tích (Analytics/Holdout/Snapshot). Nhưng nếu băm (hash) không đúng quy cách, các lệnh `$lookup` phân tích lịch sử mua sắm sẽ bị rớt 100%.
- **Giải pháp:** Sử dụng giải thuật **HMAC-SHA256** với cùng Secret Key và Key Version (`v1`), bảo đảm tính ánh xạ đơn ánh và nhất quán giữa các collection:
```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "customers",
      localField: "pii_ext.customer_cccd",
      foreignField: "identity.cccd",
      as: "verified_customer"
    }
  },
  { $match: { verified_customer: { $ne: [] } } }
])
```

---

## 3. 📊 Kết Quả Đối Soát Thực Tế (Raw vs Protected Snapshot)

Kiểm tra đối soát tự động chạy trên môi trường thực tế (Container `p-138-mongodb-1`):

| Cơ Sở Dữ Liệu | Khóa Thực Hiện $lookup | Tổng Đơn Hàng | Matched Rows | Unmatched Rows | Tỷ Lệ Toàn Vẹn | Trạng Thái |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `mydatabase` (RAW) | `customer_id` | 830 | **830** | **0** | **100.0%** | 🟢 **PASS** |
| `mydatabase` (RAW) | `pii_ext.customer_cccd` | 830 | **830** | **0** | **100.0%** | 🟢 **PASS** |
| `mydatabase_protected` (HMAC) | `customer_id` | 830 | **830** | **0** | **100.0%** | 🟢 **PASS** |
| `mydatabase_protected` (HMAC) | `pii_ext.customer_cccd` | 830 | **830** | **0** | **100.0%** | 🟢 **PASS** |

> **Kết luận:** Tỷ lệ rớt dữ liệu sau khi ẩn danh hóa là **0.00%**. Tính toàn vẹn của phân tích downstream NoSQL đạt **100%**.

---

## 4. 🛡️ Tuân Thủ Nguyên Tắc "No-Raw-Value UI Safe"

Mọi log mẫu dữ liệu trước và sau khi xử lý đều tuân thủ nguyên tắc không làm lộ PII thô ra ngoài log file hay giao diện:

| Thuộc tính | Dữ liệu gốc (Raw State) | Dữ liệu sau xử lý (Protected State) | Kỹ thuật bảo vệ |
|---|---|---|---|
| `customer_id` | `ALFKI` | `ALFKI` | Giữ nguyên (System ID) |
| `identity.cccd` | `12 digits [RAW HIDDEN]` | `44c8451c848582b7...` | **HMAC-SHA256 (v1)** |
| `contact.email` | `...@example.vn [RAW HIDDEN]` | `a***2@example.vn` | **Partial Masking** |
| `contact.phone` | `032*** [RAW HIDDEN]` | `032***0543` | **Phone Masking** |

---

## 5. 🤖 Tương Thích Kiến Trúc AI Scanner (`mongo_connector.py`)

Do cơ chế tokenizer của AI Scanner (`src/detection/`) mặc định tách từ khóa theo dấu gạch dưới (`_`), connector MongoDB của Data Engineer tự động chuyển đổi cấu trúc NoSQL đa cấp thông qua phương thức `to_scanner_contract()`:
- `identity.cccd` ➔ `identity_cccd` (giúp AI nhận diện trọng số CCCD chính xác mà không cần sửa code AI).
- `contact.email` ➔ `contact_email`
- `contact.phone` ➔ `contact_phone`
- Giữ nguyên `field_path = "identity.cccd"` cho việc ánh xạ ngược khi thực hiện transform.

---

## 6. 🚀 Hướng Dẫn Các Command Chạy & Demo Toàn Bộ Luồng

Dưới đây là các lệnh hoàn chỉnh để chạy demo và đối soát toàn bộ công việc MongoDB:

### Bước 1: Nạp Fixtures (Idempotent Seed)
```bash
python data/fixtures/mongo/seed_mongo.py
```
*Kết quả:* Khởi tạo 91 customers, 830 orders và các ASCENDING indexes.

### Bước 2: Chạy Tạo Bản Snapshot Ẩn Danh (HMAC & Masking)
```bash
python data/fixtures/mongo/compute/apply_mongo_hmac.py
```
*Kết quả:* Tạo database `mydatabase_protected` với CCCD được băm HMAC-SHA256, email và số điện thoại được che mờ.

### Bước 3: Chạy Demo Phép Nối $lookup Giữa 2 Collection
```bash
# Demo $lookup qua customer_id:
python data/fixtures/mongo/compute/run_mongo_lookup.py

# Demo $lookup qua CCCD (Khóa nhạy cảm):
python data/fixtures/mongo/compute/run_mongo_lookup_cccd.py
```

### Bước 4: Chạy Đối Soát Số Liệu Chính Thức & Xuất Evidence
```bash
python data/fixtures/mongo/compute/verify_mongo_lookup_counts.py
```
*Kết quả:* Xác nhận `830 matched, 0 unmatched` và tự động cập nhật file bằng chứng `eval/results/mongo_e2e_evidence.json`.

### Bước 5: Chạy Unit/Integration Tests
```bash
pytest tests/test_connectors/test_mongo_connector.py tests/test_verifier/test_mongo_verifier.py
```
*Kết quả:* 5/5 tests vượt qua trong 0.23s.

---

## 7. Luồng API thật: `POST /runs` → `PUT /decisions` → `POST /build`

Chạy qua API: `MongoConnector` đọc thật `customers`/`orders` và nested path, rule scanner đề xuất, DPO chấp nhận đề xuất (UNKNOWN → DROP). Snapshot `MONGO_SNAPSHOT_DB` được xóa sạch rồi dựng lại, chỉ chứa các trường đã có quyết định. Sau đó `$lookup` được đo trực tiếp trên cả source lẫn snapshot, không hardcode 830.

```bash
python data/fixtures/mongo/seed_mongo.py
python data/fixtures/mongo/compute/run_mongo_api_e2e.py
pytest tests/test_api/test_runs_mongo_live.py        # tự skip nếu không có Mongo
```

Kết quả (xem [mongo_api_e2e_evidence.json](mongo_api_e2e_evidence.json), chỉ chứa metadata và số đếm):

| Hạng mục | Kết quả |
|---|---|
| Collection được quét | `customers`, `orders` |
| Số trường có quyết định | 35 (HMAC 5, MASK 5, DROP 20, KEEP 5) |
| `lookup_matched` / `lookup_unmatched` `orders.customer_id -> customers._id` | source 830/0, snapshot 830/0, PASSED |
| `lookup_matched` / `lookup_unmatched` `orders.pii_ext.customer_cccd -> customers.identity.cccd` | source 830/0, snapshot 830/0, PASSED |
| `doc_count` customers / orders | 91 / 830 trên cả source và snapshot |
| Trạng thái run / dataset | VERIFIED / VERIFIED |

Các bảo đảm đã có test:
- Run đã quét Mongo thật không bao giờ VERIFIED qua stub. Nếu lúc build tắt `ENABLE_MONGO`, check `mongo_snapshot_pipeline` sẽ FAILED.
- Trường không có trong profile (xuất hiện sau khi quét, hoặc lồng sâu hơn độ sâu scan) không vào snapshot. Collection cũ trong snapshot DB bị xóa.
- Response `/build` và `verifier_results` chỉ chứa số đếm, không có CCCD, email hay số điện thoại raw.
