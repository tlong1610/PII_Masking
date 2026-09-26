# Hướng Dẫn Seed Dữ Liệu PostgreSQL — PIIGuard VN

Tài liệu hướng dẫn chi tiết cách nạp (seed), cấu hình schema, nạp dữ liệu quan hệ doanh nghiệp mô phỏng và kiểm chứng đối soát CSDL PostgreSQL cho hệ thống PIIGuard VN.

---

## 1. Tổng quan Bộ Dữ liệu Fixture PostgreSQL

Bộ dữ liệu PostgreSQL nằm trong thư mục `data/fixtures/postgres/` (và `data/fixtures/seed.sql`), gồm **14 bảng quan hệ** chuẩn doanh nghiệp kết hợp dữ liệu cá nhân Việt Nam (VN PII Synthetic):

### Danh mục 14 bảng dữ liệu:
| Bảng | Phân nhóm | Số bản ghi | Các trường dữ liệu cá nhân (PII Synthetic) |
| :--- | :--- | :---: | :--- |
| **`customers`** | Core / PII | **91** | `cccd` (12 số), `email`, `phone`, `mobile_phone`, `contact_name`, `tax_code`, `address` |
| **`orders`** | Core Relational | **830** | Khóa ngoại `customer_id`, `employee_id`, thông tin giao hàng `ship_address`, `ship_city` |
| **`order_details`** | Transaction | **2,155** | Chi tiết đơn giá, số lượng, chiết khấu liên kết với `orders` và `products` |
| **`employees`** | Internal PII | **9** | Họ tên, ngày sinh, địa chỉ, số điện thoại nội bộ nhân viên |
| **`support_tickets`** | Extension PII | **200** | Mã vé hỗ trợ, `customer_id`, số điện thoại người liên hệ, nội dung trao đổi |
| **`kyc_documents`** | Extension PII | **91** | Số CCCD, ngày cấp, nơi cấp, thông tin bóc tách OCR từ giấy tờ định danh giả lập |
| **`products`** | Danh mục | **77** | Danh mục sản phẩm, đơn giá niêm yết |
| **`categories`** | Danh mục | **8** | Nhóm danh mục hàng hóa |
| **`suppliers`** | Đối tác | **29** | Nhà cung cấp, thông tin liên hệ |
| **`shippers`** | Vận chuyển | **3** | Đơn vị vận chuyển, số điện thoại tổng đài |
| **`customer_demographics`** | Metadata | **0** | Nhóm nhân khẩu học mở rộng |
| **`customer_customer_demo`** | Mapping | **0** | Bảng liên kết khách hàng - nhân khẩu học |
| **`region`** | Địa lý | **4** | Vùng địa lý |
| **`territories`** | Địa lý | **53** | Địa bàn hoạt động |

> [!NOTE]
> Khóa liên kết cốt lõi để kiểm tra tính toàn vẹn phân tích (Downstream Equijoin):
> - `orders.customer_id` $\longleftrightarrow$ `customers.customer_id`
> - `order_details.order_id` $\longleftrightarrow$ `orders.order_id`

---

## 2. Yêu cầu Tiên quyết (Prerequisites)

1. **PostgreSQL Container** đang hoạt động (qua Docker Compose):
   ```bash
   docker compose up -d db
   ```
   *Container name:* `p-138-db-1` | *Port:* `5432` | *Database:* `mydatabase` | *User:* `postgres`
2. Đảm bảo file fixture SQL tồn tại tại `data/fixtures/seed.sql` hoặc `data/fixtures/postgres/seed.sql`.

---

## 3. Các bước thực hiện Seed

### Cách 1: Sử dụng Docker cp & psql (Khuyên dùng)

Cách này đảm bảo tốc độ nạp nhanh và bắt lỗi tức thì với cờ `ON_ERROR_STOP=1`:

```bash
# 1. Copy file seed.sql vào trong container
docker cp data/fixtures/seed.sql p-138-db-1:/tmp/seed.sql

# 2. Thực thi nạp CSDL vào database mydatabase
docker exec -i p-138-db-1 psql -U postgres -d mydatabase -v ON_ERROR_STOP=1 -f /tmp/seed.sql
```

### Cách 2: Truyền trực tiếp qua Pipe (Không cần copy file)

```bash
# Trên Linux/macOS hoặc Git Bash
docker exec -i p-138-db-1 psql -U postgres -d mydatabase < data/fixtures/seed.sql

# Trên Windows PowerShell
Get-Content data/fixtures/seed.sql | docker exec -i p-138-db-1 psql -U postgres -d mydatabase
```

### Cách 3: Nạp trực tiếp từ máy trạm (nếu đã cài đặt PostgreSQL client)

```bash
psql -h localhost -p 5432 -U postgres -d mydatabase -v ON_ERROR_STOP=1 -f data/fixtures/seed.sql
```

---

## 4. Tính năng kỹ thuật của Fixture SQL

1. **Tính Idempotent (Chạy lại an toàn)**:
   - File `seed.sql` bắt đầu bằng các lệnh `DROP TABLE IF EXISTS ... CASCADE`.
   - Cho phép nạp lại bất kỳ lúc nào để đưa database về trạng thái nguyên bản sạch 100%.
2. **Bảo đảm toàn vẹn ràng buộc (Integrity Constraints)**:
   - Thiết lập đầy đủ Primary Key (`PK`), Foreign Key (`FK`) và chỉ mục.
   - Đảm bảo các phép `JOIN` và `GROUP BY` downstream phản ánh chính xác nghiệp vụ thực tế.
3. **Phân vùng Schema độc lập**:
   - Dữ liệu gốc nằm trong schema `public`.
   - Dữ liệu sau khi bảo vệ (HMAC / Masking) sẽ được lưu vào schema snapshot `protected`.

---

## 5. Kiểm tra và Đối soát sau khi Seed

Sau khi nạp dữ liệu xong, thực hiện chạy script đối soát downstream tự động:

```bash
# 1. Chạy bộ đối soát SQL toàn diện
python data/fixtures/postgres/compute/verify_postgres_e2e.py

# 2. Rà soát và đối chiếu Golden Dataset (33 Dev / 17 Holdout)
python data/fixtures/postgres/compute/audit_postgres_golden_labels.py
```

### Tiêu chuẩn Nghiệm thu Baseline (Expected Downstream):
- **Số đơn hàng khớp JOIN (`customers` $\bowtie$ `orders`)**: Đúng **830 / 830** dòng (100.00%).
- **Chi tiết đơn hàng khớp (`orders` $\bowtie$ `order_details`)**: Đúng **2,155 / 2,155** dòng.
- **Tổng doanh thu phân tích (Total Revenue)**: Đúng **$1,265,793.01**.
- **Số khách hàng phát sinh đơn hàng**: Đúng **89** khách hàng.
- **Chênh lệch trước và sau khi băm HMAC-SHA256**: Đúng bằng **0**.

---

## 6. Chạy Kiểm thử Tự động (Pytest)

Chạy bộ kiểm thử tự động xác nhận cơ chế bảo toàn liên kết:
```bash
.venv\Scripts\python -m pytest tests/test_transform_and_verifier.py
```
*Kết quả kỳ vọng:* 3/3 test cases passed (kiểm tra HMACHasher consistency, MaskEngine và SQLVerifier downstream).

---

## 7. Quy tắc An toàn Bảo mật (No-raw-value Safe)

> [!IMPORTANT]
> - Toàn bộ dữ liệu trong `seed.sql` là **dữ liệu tổng hợp (synthetic/fake 100%)**, không chứa thông tin cá nhân của người thật.
> - Tuân thủ nguyên tắc **No-raw-value UI Safe**: Các công cụ giám sát, log, báo cáo tuyệt đối không hiển thị giá trị số CCCD, số điện thoại thật của bản ghi.
