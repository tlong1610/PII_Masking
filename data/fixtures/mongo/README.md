# Hướng Dẫn Seed Dữ Liệu MongoDB — PIIGuard Shield

Tài liệu hướng dẫn chi tiết cách nạp (seed), cấu hình chỉ mục (index) và kiểm chứng bộ dữ liệu mô phỏng MongoDB cho hệ thống PIIGuard Shield.

---

## 1. Tổng quan Bộ Dữ liệu Fixture

Bộ dữ liệu MongoDB nằm trong thư mục `data/fixtures/mongo/`, gồm hai collection mô phỏng CSDL thương mại điện tử kết hợp dữ liệu cá nhân (VN PII Synthetic):

| Collection | File nguồn | Số lượng | Cấu trúc trường chính |
| :--- | :--- | :---: | :--- |
| **`customers`** | `seed_customers.json` | **91** documents | `_id` (customer_id), `company`, `address`, `contact.email`, `contact.phone`, `contact.mobile_phone`, `identity.cccd`, `identity.tax_code`, `notes` |
| **`orders`** | `seed_orders.json` | **830** documents | `_id` (order_id), `customer_id`, `order_date`, `shipment`, `lines`, `pii_ext.customer_cccd`, `pii_ext.ship_phone`, `pii_ext.order_notes`, `pii_ext.tracking_code` |

> [!NOTE]
> Cặp khóa liên kết (Equijoin key) bảo toàn giữa 2 collection là:
> - `customers.identity.cccd` $\longleftrightarrow$ `orders.pii_ext.customer_cccd`
> - `customers._id` $\longleftrightarrow$ `orders.customer_id`

---

## 2. Yêu cầu Tiên quyết (Prerequisites)

1. **MongoDB Service** đang chạy trên port `27017` (qua Docker Compose hoặc standalone):
   ```bash
   docker compose up -d mongodb
   ```
2. Môi trường Python đã kích hoạt virtualenv và cài đặt `pymongo`:
   ```bash
   # Kích hoạt venv (Windows PowerShell)
   .venv\Scripts\Activate.ps1

   # Hoặc bash
   source .venv/bin/activate
   ```

---

## 3. Các bước thực hiện Seed

### Cách 1: Chạy trực tiếp qua Python script (Khuyên dùng)

Chạy script idempotent [seed_mongo.py](seed_mongo.py):

```bash
python data/fixtures/mongo/seed_mongo.py
```

Nếu chạy với MongoDB trên host hoặc port tùy chỉnh:
```bash
# Thiết lập biến môi trường tùy chỉnh (nếu khác mặc định)
$env:MONGO_URI="mongodb://admin:admin@localhost:27017/?authSource=admin"
$env:MONGO_DB="mydatabase"

python data/fixtures/mongo/seed_mongo.py
```

### Cách 2: Chạy bên trong Docker Container

```bash
docker exec -it p-138-mongodb-1 mongosh -u admin -p admin --authenticationDatabase admin --eval "
  use mydatabase;
  db.customers.countDocuments();
  db.orders.countDocuments();
"
```

---

## 4. Tính năng tự động của Script Seed

Script `seed_mongo.py` được thiết kế chuẩn Enterprise Data Engineering:

1. **Tính Idempotent (Chạy lại an toàn)**:
   - Tự động xóa (drop) collection cũ trước khi nạp dữ liệu mới.
   - Đảm bảo chạy bao nhiêu lần cũng luôn trả về đúng **91 customers** và **830 orders**, không sinh document rác hay duplicate.
2. **Khởi tạo chỉ mục hiệu năng (Auto Indexing)**:
   Tự động đánh các index quan trọng phục vụ quét và join:
   - `customers`: `identity.cccd` (ASCENDING), `contact.email` (ASCENDING)
   - `orders`: `customer_id` (ASCENDING), `pii_ext.customer_cccd` (ASCENDING), `pii_ext.tracking_code` (ASCENDING)
3. **Healthcheck & Tự đối soát**:
   - Tự động ping MongoDB trước khi thao tác.
   - Đếm lại số document thực tế và so sánh với baseline chuẩn (91 / 830).

---

## 5. Kiểm tra và Đối soát sau khi Seed

Sau khi seed thành công, thực hiện các bước kiểm chứng độc lập sau:

### A. Kiểm tra số lượng và tính toàn vẹn của $lookup
Chạy script kiểm chứng số lượng liên kết:
```bash
python data/fixtures/mongo/compute/verify_mongo_lookup_counts.py
```
**Kết quả mong đợi:**
- `customer_id`: 830 matched, 0 unmatched (100.00%)
- `cccd`: 830 matched, 0 unmatched (100.00%)

### B. Kiểm tra truy vấn $lookup chi tiết (An toàn No-Raw-Value)
```bash
# 1. Lookup theo customer_id
python data/fixtures/mongo/compute/run_mongo_lookup.py

# 2. Lookup theo CCCD (Join Key Preservation)
python data/fixtures/mongo/compute/run_mongo_lookup_cccd.py
```

### C. Áp dụng quy trình băm HMAC-SHA256 sang Snapshot
```bash
python data/fixtures/mongo/compute/apply_mongo_hmac.py
```
Script sẽ băm `identity.cccd` và `pii_ext.customer_cccd` bằng cùng secret key sang cơ sở dữ liệu `mydatabase_protected` và đối soát tự động đạt 830/830 matched.

---

## 6. Quy tắc An toàn Bảo mật (Security & Compliance)

> [!IMPORTANT]
> - **Nguyên tắc No-raw-value**: Tuyệt đối không `print()` hoặc ghi log số CCCD, SĐT, Email thô của khách hàng ra màn hình/log file trong quá trình seed và kiểm thử.
> - Toàn bộ dữ liệu trong bộ fixture này là **dữ liệu tổng hợp (synthetic/fake 100%)**, tuân thủ Nghị định 13/2023/NĐ-CP và PRD dự án PIIGuard Shield.
