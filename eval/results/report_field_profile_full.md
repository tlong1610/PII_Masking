# 📊 Evaluation Report — FieldProfile Scanner (FULL Mode)

> **Dự án:** PIIGuard VN (Mã đề: DATA-06 — Nhóm: P-138)  
> **Chế độ kiểm thử:** `full`  
> **Tiêu chuẩn tham chiếu:** Đặc tả v0.2 §16.2 & §16.3 — Luật 91/2025/QH15 & NĐ 356/2025/NĐ-CP  

---

## 1. 🎯 Các Chỉ Số Hiệu Năng Cốt Lõi (Core Metrics)

| Chỉ Số Đánh Giá | Kết Quả Thực Tế | Chỉ Tiêu Đặc Tả v0.2 | Trạng Thái |
|---|:---:|:---:|:---:|
| **Recall@L3 (Nhạy cảm cao)** | **100.00%** (17/17) | ≥ 95.00% | 🟢 PASS |
| **Precision (Mức cột)** | **100.00%** | ≥ 90.00% | 🟢 PASS |
| **Recall (Mức cột)** | **100.00%** | ≥ 95.00% | 🟢 PASS |
| **F1 Score** | **100.00%** | — | 🟢 OPTIMAL |
| **F2 Score** | **100.00%** | — | 🟢 OPTIMAL |
| **Độ chính xác Action (Overall Accuracy)** | **100.00%** (74/74) | — | 🟢 100% MATCH |
| **Độ trễ trung bình/trường** | **5.20 ms** | ≤ 10 phút / dataset | ⚡ SIÊU TỐC |
| **Tổng thời gian quét toàn bộ** | **0.387 s** | — | ⚡ |

---

## 2. 🛡️ Phân Tích Độ Chính Xác Theo Cấp Độ Nhạy Cảm (Sensitivity Levels §2.2)

| Mức | Ý Nghĩa Pháp Lý | Thực Thể Tiêu Biểu | Số Lượng Cột | Nhận Diện Đúng | Độ Chính Xác |
|:---:|---|---|:---:|:---:|:---:|
| **L3** | Cao — Nhạy cảm / Giấy tờ tùy thân | `CCCD, OCR_IDENTITY_DOC, FREE_TEXT_PII` | 17 | 17 | **100.00%** |
| **L2** | Trung bình — Định danh cơ bản | `EMAIL, PHONE_VN, TAX_CODE_PERSONAL, STREET_ADDRESS` | 26 | 26 | **100.00%** |
| **L1** | Thấp — Định danh gián tiếp (QI) | `DATE_OF_BIRTH, CITY` | 4 | 4 | **100.00%** |
| **L0** | Không PII — Dữ liệu vận hành / Hard Negatives | `SYSTEM_ID, TRACKING_NUMBER, TAX_CODE_ORG, AMOUNT` | 27 | 27 | **100.00%** |

---

## 3. ⚖️ Phân Phối Tập Dữ Liệu & Khả Năng Xử Lý Ca Biên (Edge Cases)

| Phân Khúc Đánh Giá | Số Lượng Cases | Nhận Diện Đúng | Tỷ Lệ Chuẩn Xác |
|---|:---:|:---:|:---:|
| Tập `dev` | 50 | 50 | **100.00%** |
| Tập `holdout` | 24 | 24 | **100.00%** |
| **Ca biên / Nhiễu (Edge Cases)** | 26 | 26 | **100.00%** |

---

## 4. 🔬 Đóng Góp Của Từng Tầng (Tier Breakdown)

| Tầng (Tier) | Số Lượng Cột | Độ Trễ TB | Precision | Recall | Action Accuracy |
|---|:---:|:---:|:---:|:---:|:---:|
| `ERROR` | 2 | 66.11 ms | 0.00% | 0.00% | **100.00%** |
| `TIER_1` | 65 | 3.21 ms | 100.00% | 100.00% | **100.00%** |
| `TIER_2` | 6 | 4.50 ms | 100.00% | 100.00% | **100.00%** |
| `TIER_3_HYBRID` | 1 | 17.00 ms | 0.00% | 0.00% | **100.00%** |

---

## 5. ❌ Danh Sách Ca Lệch Hành Động (Action Mismatch)

🟢 **HOÀN TOÀN KHÔNG CÓ CA LỆCH NÀO (0 MISMATCHES — 100% KHỚP KỲ VỌNG).**

---

## 6. 📝 Hạn Chế Cần Lưu Ý Theo Đặc Tả (§16.4)

> [!NOTE]
> Kết quả trên dữ liệu tổng hợp (Synthetic VN PII) được dùng để đánh giá năng lực suy luận phân loại của mô hình và bảo đảm tính bất biến của các liên kết khóa nối downstream (JOIN / $lookup / Aggregate). Trong môi trường vận hành thực tế ngoài doanh nghiệp, độ phủ và phương sai phân phối dữ liệu có thể khác biệt so với tập kiểm thử chuẩn.
