# PIIGuard Shield Frontend

Frontend ứng dụng PIIGuard Shield xây dựng trên React 18, TypeScript, Vite, Material UI và React Flow.

## Quick Start

```bash
cd front_end
npm install
npm run dev
```

Truy cập: `http://localhost:5173/login`.

Tài khoản demo:
- **DPO**: `dpo` / `dpo123`
- **Analyst**: `analyst` / `analyst123`

## Luồng Xác Thực (Auth Flow)

`POST /sessions` trả về session token (`token`, `role`, `username`). Frontend lưu vào `sessionStorage` và gửi kèm header `Authorization: Bearer <token>` trong mọi request API.

## Các Màn Hình Chính (Main Routes)

### Phân hệ DPO (`/dpo`):
- `/dpo` & `/dpo/runs/:id`: Workspace thẩm định PII 4 tabs (Tổng quan PII, Rủi ro FR-10, Nhật ký kiểm toán, Dữ liệu cho Analyst), sơ đồ chọn phạm vi `SourceScopePickerDiagram` kèm cảnh báo khóa nối `ScopeLinkWarnings`, Inspector Drawer tinh chỉnh chính sách từng cột.
- `/dpo/runs`: Lịch sử run và quản lý hợp nhất dataset (1 Run = 1 Dataset; Phát hành tự động cấp quyền cho mọi Analyst; Thu hồi xóa snapshot vật lý và đưa run về `READY_TO_BUILD`).
- `/dpo/masking`: Môi trường thử nghiệm tương tác **Live Masking Sandbox** và Bảng ma trận kỹ thuật che mờ (FE-15, FE-19).
- `/dpo/rules`: Ma trận quy định bảo vệ dữ liệu theo Luật 91/2025/QH15 và NĐ 356/2025/NĐ-CP theo thứ tự chuẩn L1 (Gián tiếp) $\rightarrow$ L2 (Cơ bản) $\rightarrow$ L3 (Nhạy cảm) kèm link nguồn pháp luật chính phủ (FE-16, FE-18, FE-20, FE-22).
- `/dpo/audit`: Nhật ký kiểm toán diễn giải bằng câu tự nhiên, nhóm theo ngày, lọc theo hành vi, kiểm tra chuỗi băm Merkle Root SHA-256.

### Phân hệ Analyst (`/analyst`):
- `/analyst`: Danh sách dataset đã phát hành (`PUBLISHED`), xem trước bảng dữ liệu đã xử lý an toàn (phân trang 20/50/100/200 dòng), xem sơ đồ ERD cấu trúc bảng, và tải file CSV an toàn.

## Kiểm Thử & Kiểm Tra Code

```bash
npm run typecheck   # tsc -b
npm run lint        # eslint .
npm run test        # vitest run (160 tests)
npm run build       # build production
```
