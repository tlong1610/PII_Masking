# FE-13: DPO Catalog Explorer — Option 1 & Dataset Revocation

**Sprint**: Sprint 04  
**Trạng thái**: Closed (Đã đóng: Chuyển giao dev khác phụ trách)  
**Phân hệ**: `src/features/piiReview/components/DpoReviewExperienceMVP.tsx`, `src/features/piiReview/hooks/usePiiReview.ts`

---

## 1. Mô Tả Nhiệm Vụ (Task Description)

Tái cấu trúc cột Catalog Explorer bên trái của DPO Workspace theo **Phương Án 1 (Chuẩn Data Governance)**:
1. Phân tách danh sách thành 2 phân hệ rõ ràng: **Data Sources (Nguồn dữ liệu gốc)** để quét mới và **Published Snapshots (Lịch sử Dataset đã phát hành)** để quản trị vòng đời.
2. Đấu nối nút bấm **[THU HỒI / REVOKE]** với API thật (`useRevokeDataset()` / `api.revokeDataset()`) để DPO có thể ngắt quyền truy cập của Analyst ngay lập tức khi phát hiện rủi ro hoặc khi hết hạn ngoại lệ.

---

## 2. Yêu Cầu Kỹ Thuật (Technical Requirements)

1. **Giao diện Catalog Explorer (Cột bên trái DPO)**:
   - Header có 2 tab hoặc 2 accordion phân định:
     - 📂 **Data Sources**:
       - Nút `+ Thêm cơ sở dữ liệu` (`AddSourceDialog`).
       - Danh sách source PostgreSQL & MongoDB đã cấu hình.
       - Khi click: Mở màn hình quét mới (Source Scope Picker Diagram).
     - 📦 **Published Snapshots**:
       - Danh sách các dataset đã phát hành thành công.
       - Badge trạng thái trực quan: `PUBLISHED` (Chip xanh lá) hoặc `REVOKED` (Chip màu đỏ/xám).
       - Khi click: Mở màn hình Snapshot Details.
2. **Màn hình Chi Tiết Snapshot Đã Phát Hành**:
   - Vị trí lưu trữ dữ liệu an toàn (`output_location`).
   - Thời gian phát hành (`published_at`) & DPO phê duyệt (`published_by`).
   - Thống kê: Số bảng, tổng số dòng, tỷ lệ bảo vệ L2/L3 (100%), Merkle Root SHA-256.
   - Danh sách chính sách che mờ đã áp dụng (`MASK`, `HMAC`, `DROP`, `KEEP`).
   - Kết quả downstream verifier: `VERIFIED`.
3. **Hành động Thu Hồi (Revoke Action)**:
   - Nút bấm nổi bật: **[THU HỒI DATASET / REVOKE]** (Màu đỏ cảnh báo `color="error"`).
   - Dialog xác nhận thu hồi: Yêu cầu DPO xác nhận lý do thu hồi (Hết hạn ngoại lệ `exceptionUntil`, Nghi ngờ rò rỉ dữ liệu, Yêu cầu từ cơ quan quản lý...).
   - Đấu nối mutation `useRevokeDataset.mutate(datasetId)`:
     - Gửi `POST /api/v1/datasets/{id}/revoke`.
     - Chuyển trạng thái snapshot sang `REVOKED`.
     - Analyst Workspace lập tức không thể xem hoặc tải CSV của dataset này nữa.
     - Ghi nhận block `REVOKE` vào Sổ cái Hash-Chain.
