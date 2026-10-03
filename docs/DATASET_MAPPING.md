# 🗺️ Tài Liệu Ánh Xạ Dữ Liệu Thực Tế Thay Thế Đặc Tả v0.2 (DATASET MAPPING)

> **Dự án:** PIIGuard VN (Mã đề: DATA-06 — Nhóm: P-138)  
> **Phiên bản:** v1.0.0 (Build Phase)  
> **Căn cứ:** Quyết định thay thế tập dữ liệu tổng hợp BigQuery/Y tế bằng bộ dữ liệu thực nghiệm cam kết P0 (PostgreSQL + MongoDB) theo [ARCHITECTURE.md](file:///c:/Users/kienn/ProjectBuildPhase/P-138/ARCHITECTURE.md).

---

## 1. 📌 Bối Cảnh & Cơ Sở Quyết Định

Trong bản đặc tả kỹ thuật v0.2 (§1.1, §3.1), ban tổ chức đề xuất kịch bản dữ liệu mẫu y tế trên nền tảng Google BigQuery. Tuy nhiên, căn cứ theo:
1. **Kiến trúc cốt lõi P0 của hệ thống ([ARCHITECTURE.md](file:///c:/Users/kienn/ProjectBuildPhase/P-138/ARCHITECTURE.md)):** PIIGuard VN cam kết cung cấp giải pháp bảo vệ dữ liệu doanh nghiệp toàn diện cho 2 hệ quản trị cơ sở dữ liệu phổ biến nhất tại Việt Nam là **PostgreSQL (RDBMS)** và **MongoDB (Document Store / NoSQL)**.
2. **Luật Bảo vệ Dữ liệu Cá nhân (Luật 91/2025/QH15) & Nghị định 356/2025/NĐ-CP:** Dữ liệu thương mại điện tử, tài chính và logistics chứa đầy đủ các phân nhóm dữ liệu cá nhân cơ bản và nhạy cảm (CCCD, SĐT, Email, Địa chỉ, Mã số thuế, Hồ sơ KYC, Lịch sử giao dịch).
3. **Mục tiêu thực nghiệm Downstream Verifier:** Đảm bảo 100% tính toàn vẹn của các truy vấn phân tích nghiệp vụ thực tế (SQL `JOIN` và MongoDB `$lookup` đạt 830/830 rows matched).

Do đó, toàn bộ 74 trường dữ liệu trong hệ thống PostgreSQL (14 bảng) và MongoDB (2 collections) được chuẩn hóa và ánh xạ đầy đủ theo 4 cấp độ nhạy cảm của v0.2.

---

## 2. 🗂️ Bảng Phân Cấp Độ Nhạy Cảm (§4.2 Đặc Tả v0.2)

Hệ thống phân loại toàn bộ 74 trường vào 4 phân cấp (`L0` - `L3`):

| Phân Cấp | Định Nghĩa Theo Luật & v0.2 | Ví Dụ Trong Dataset P-138 | Hành Động Chuẩn (Action) |
|:---:|---|---|:---:|
| **L0** | Dữ liệu phi cá nhân, dữ liệu công khai, mã đơn hàng, số tiền, ngày tháng, thông tin tổ chức. | `orders.order_id`, `orders.freight`, `products.unit_price`, `suppliers.tax_code` (MST DN). | **`KEEP`** |
| **L1** | Dữ liệu định danh gián tiếp, nhân khẩu học chung (Quốc gia, Thành phố, Chức danh). | `customers.city`, `customers.country`, `employees.contact_title`, `customers.postal_code`. | **`KEEP`** |
| **L2** | Dữ liệu cá nhân cơ bản (SĐT, Email, Địa chỉ cụ thể, Ngày sinh, Họ tên, MST cá nhân). | `customers.phone`, `customers.email`, `customers.address`, `employees.birth_date`, `customers.c1`. | **`MASK`** |
| **L3** | Dữ liệu cá nhân đặc biệt nhạy cảm, số CCCD/Hộ chiếu, hồ sơ sinh trắc/KYC, ảnh CCCD, văn bản OCR. | `customers.cccd`, `orders.customer_cccd`, `customers.c2`, `kyc_documents.ocr_text`, `kyc_documents.file_path`. | **`HMAC`** (Khóa nối) / **`DROP`** (Tài liệu KYC) |

---

## 3. 🎯 Xử Lý Các Ca Biên & Cột Mơ Hồ (Edge Cases & Obfuscated Columns)

Theo yêu cầu kiểm thử độ chịu lỗi và ca biên tại **Phụ lục H (v0.2)**:
- **Cột `c1` (`customers.c1` & MongoDB `identity.c1`):** Tên cột bị giấu (obfuscated), chứa dữ liệu số điện thoại Việt Nam (`L2`) ➔ Bộ quét tự động nhận diện qua regex/content sampling và áp dụng **`MASK`**.
- **Cột `c2` (`customers.c2` & MongoDB `identity.c2`):** Tên cột bị giấu (obfuscated), chứa số định danh cá nhân CCCD 12 chữ số (`L3`) ➔ Bộ quét tự động nhận diện và áp dụng **`HMAC`** (vì là thuộc tính khóa danh tính).
- **Mã số thuế tổ chức vs cá nhân:** 
  - `suppliers.tax_code` thuộc bảng nhà cung cấp/pháp nhân ➔ Phân loại `TAX_CODE_ORG` (`L0`) ➔ **`KEEP`**.
  - `customers.tax_code` thuộc thông tin cá nhân ➔ Phân loại `TAX_CODE` (`L2`) ➔ **`MASK`**.
- **Tài liệu KYC (`kyc_documents`):**
  - `ocr_text` (Trích xuất văn bản CCCD đầy đủ) ➔ `L3` ➔ **`DROP`** (Loại khỏi snapshot phân tích để triệt tiêu rủi ro rò rỉ).
  - `file_path` (Đường dẫn tệp hình ảnh lưu trữ nội bộ) ➔ `L3` ➔ **`DROP`**.

---

## 4. 📈 Kết Quả Đo Lường & Đánh Giá Thực Nghiệm (§16.2 & §16.3)

Chạy thực tế thông qua bộ công cụ đánh giá `eval/run_eval_field_profile.py`:

```
=== CHỈ SỐ ĐÁNH GIÁ CHẤT LƯỢNG MÔ HÌNH PHỄU ĐA TẦNG ===
• Tổng số trường kiểm thử:        74 trường (PostgreSQL 14 bảng + MongoDB 2 collections)
• Recall@L3 (Dữ liệu cực nhạy):   100.00% (17/17 trường hợp L3)  [Chỉ tiêu v0.2: ≥ 95.00%]  ➔ PASS
• Precision (Mức độ chính xác):  100.00% (46/46 trường PII)       [Chỉ tiêu v0.2: ≥ 90.00%]  ➔ PASS
• Recall (Khả năng bao phủ):     100.00% (46/46 trường PII)       [Chỉ tiêu v0.2: ≥ 95.00%]  ➔ PASS
• F1 Score:                      100.00%
• Action Accuracy:               100.00% (74/74 trường khớp hoàn hảo)
• Độ trễ trung bình / cột:       4.06 ms / trường
• Toàn vẹn Downstream JOIN:      830 / 830 dòng (100.00%)
```

---

## 5. 📂 Danh Mục Tệp Tạo & Xuất Bản

1. **[`eval/golden_labels.json`](file:///c:/Users/kienn/ProjectBuildPhase/P-138/eval/golden_labels.json):** 74 nhãn vàng kèm đầy đủ trường `sensitivity_level` (`L0` - `L3`).
2. **[`eval/ground_truth.csv`](file:///c:/Users/kienn/ProjectBuildPhase/P-138/eval/ground_truth.csv):** Tệp Ground Truth chuẩn CSV theo đúng đặc tả v0.2.
3. **[`eval/results/report_ablation_study.md`](file:///c:/Users/kienn/ProjectBuildPhase/P-138/eval/results/report_ablation_study.md):** Báo cáo đối chiếu hiệu năng giữa Tầng 1 (Rules) và Full Multi-Tier (Rules + BM25 + Hybrid + LLM).
4. **[`eval/results/ablation_metrics.json`](file:///c:/Users/kienn/ProjectBuildPhase/P-138/eval/results/ablation_metrics.json):** Chỉ số JSON có cấu trúc phục vụ nộp bài và tích hợp tự động vào dashboard.
