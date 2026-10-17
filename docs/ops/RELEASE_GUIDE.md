# 🚀 Hướng Dẫn Phát Hành & Vận Hành Release (Release Guide)

**Dự án:** PIIGuard Shield — Công cụ rà soát và bảo vệ dữ liệu cá nhân theo Nghị định 13 & Luật 91  
**Mã đề:** DATA-06 · **Đội:** P-138 · **Chương trình:** VinUni AI20K Build Phase — Cohort 4  
**Quy trình hiện tại:** Release tự động sau khi PR `develop` → `main` được merge và quality gate đạt.

---

## 🌐 1. Hệ Thống Trực Tuyến & Thông Tin Truy Cập

| Thành phần | Đường dẫn trực tuyến (URL) | Trạng thái | Ghi chú kỹ thuật |
|---|---|:---:|---|
| **Frontend Web App** | [frontend-alpha-fawn-53.vercel.app](https://frontend-alpha-fawn-53.vercel.app) | 🟢 Live | React 18 SPA triển khai trên Vercel |
| **Backend API Production** | [piiguard-vn-api.onrender.com](https://piiguard-vn-api.onrender.com) | 🟢 200 OK | FastAPI Docker trên Render Cloud |
| **Interactive API Docs** | [piiguard-vn-api.onrender.com/docs](https://piiguard-vn-api.onrender.com/docs) | 🟢 Live | Swagger UI đầy đủ endpoints |
| **Health Check Probe** | [piiguard-vn-api.onrender.com/health](https://piiguard-vn-api.onrender.com/health) | 🟢 200 OK | Trả về `{"status":"ok","env":"production"}` |
| **Docker Hub Image** | `docker.io/len1652/piiguard-api:latest` | 🟢 Ready | Build chuẩn `linux/amd64` độc lập |
| **Video Demo (End-to-End)** | [Google Drive Demo Folder](https://drive.google.com/drive/folders/1OOIj4LYKQ4vIFTbjH8rg0DRRxJ7hNGoN?usp=sharing) | 🟢 Ready | Video ≤ 5 phút theo chuẩn 4 cảnh |
| **Pitch Deck Báo Cáo** | [`pitch_deck.pdf`](../../presentation/pitch_deck.pdf) · [`.pptx`](../../presentation/pitch_deck.pptx) | 🟢 Ready | 10 slide + thumbnail video; build lại theo [`presentation/README.md`](../../presentation/README.md) |

### 🔑 Tài Khoản Trải Nghiệm Demo
- **DPO (Data Protection Officer):** `dpo` / `dpo123` (hoặc `dpo@piiguard.vn`)  
  *Quyền hạn:* Quét nguồn dữ liệu Cloud, rà soát PII, áp dụng chính sách MASK/HMAC/REDACT/DROP, kiểm tra Merkle Root và phát hành dataset.
- **Data Analyst:** `analyst` / `analyst123` (hoặc `analyst@piiguard.vn`)  
  *Quyền hạn:* Chỉ truy cập và thực hiện SQL JOIN / Mongo lookup trên các snapshot đã được ẩn danh an toàn.

---

## ⚙️ 2. Quy Trình Vận Hành & Triển Khai (Deployment Runbook)

### 2.1 Backend API (Render Cloud)
Do repository thuộc GitHub Organization của BTC (không có quyền cài app từ xa), Backend được đóng gói qua Docker Hub độc lập:

1. **Khi có cập nhật mã nguồn Backend:**
   ```bash
   # 1. Build image với kiến trúc linux/amd64
   docker build --platform linux/amd64 -f Dockerfile.render -t len1652/piiguard-api:latest .

   # 2. Đẩy image lên Docker Hub
   docker push len1652/piiguard-api:latest
   ```
2. **Kích hoạt Deploy trên Render:**
   - Vào [dashboard.render.com](https://dashboard.render.com) ➔ chọn service `piiguard-vn-api`.
   - Bấm **`Manual Deploy`** (góc trên bên phải) ➔ chọn **`Deploy latest commit`**.
   - Render sẽ kéo image mới về và khởi động lại container trong ~30 giây.

3. **Cấu hình biến môi trường trên Render:**
   - `APP_ENV` = `production`
   - `SEED_DEMO_USERS` = `true` *(khởi tạo sẵn 2 tài khoản demo `dpo/dpo123` và `analyst/analyst123` cho BGK)*
   - `DATABASE_URL` = `sqlite:///./data/render_app.db`
   - `CORS_ORIGINS` = `https://frontend-alpha-fawn-53.vercel.app,http://localhost:5173,http://localhost:3000`
   - `ENABLE_AI_SCAN` = `false` *(bật Rules local nhẹ nhàng, phản hồi < 500ms trên free tier)*
   - `HMAC_SECRET` = giá trị bí mật riêng, tạo và lưu trong Render Environment; không ghi giá trị thật vào repo hoặc tài liệu.

---

### 2.2 Frontend Web App (Vercel)
Frontend đã được cấu hình tự động trỏ API về Render:
- File [`front_end/src/shared/api/client.ts`](../../front_end/src/shared/api/client.ts) tự động nhận diện `import.meta.env.PROD` để trỏ vào `https://piiguard-vn-api.onrender.com/api/v1` (ngăn chặn hoàn toàn việc gọi nhầm `localhost` trên môi trường Vercel).
- Vercel build theo nhánh đã kết nối với project. Kiểm tra nhánh Production Branch trong Vercel trước khi coi một lần merge là đã cập nhật URL production.

---

## 🏷️ 3. Quy Trình Đóng Gói Nhánh & Gắn Tag Release

Tuân thủ nghiêm ngặt quy chế Git Flow của dự án:
1. Mọi commit tính năng phải merge từ `feature/*` vào `develop`.
2. Kiểm tra CI của commit hiện tại: Ruff, Pytest và các bước frontend nếu runner có `npm`; Vercel build frontend riêng.
3. Khi chuẩn bị phát hành, Team Lead mở PR `develop` ➔ `main`.
4. Sau khi merge, `.github/workflows/release-main.yml` chạy trên self-hosted runner: kiểm tra chất lượng, tạo SemVer tag/changelog và GitHub Release. Render chỉ được gọi tự động khi có `RENDER_DEPLOY_HOOK_URL`; nếu không, kiểm tra cấu hình Render hoặc triển khai theo mục 2.1. Xác nhận deployment của Vercel và endpoint backend trước khi thông báo release hoàn tất.

---

## 🛡️ 4. Nguyên Tắc An Ninh & Zero Raw PII

1. **Tuyệt đối không đưa secrets lên Git:** Không commit file `.env`, mật khẩu database thật, hay API token.
2. **Không rò rỉ PII trong Log:** Log và prompt LLM không được chứa raw PII. DPO UI không render source values. Lưu ý: ngoại lệ PII `KEEP` hiện có thể để giá trị gốc trong published snapshot mà Analyst xem được; xử lý trước khi tuyên bố Zero Raw PII tuyệt đối.
3. **Tính toàn vẹn kiểm toán (Merkle Root):** Mọi thao tác phê duyệt của DPO đều được băm SHA-256 chuỗi Merkle tại endpoint `/audit/verify`.
