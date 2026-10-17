# FE-27: Sửa Port Proxy Dev Của Vite (8001 → 8000)

**Sprint**: Sprint 05  
**Trạng thái**: Done  
**Phân hệ**: `vite.config.ts`, `README_FE.md`

## Vấn Đề
- `vite.config.ts` proxy `/api` sang `http://localhost:8001`, trong khi backend chạy `make run` ở port `8000` (`Makefile`) và Docker Compose expose `8002:8000`.
- Port 8001 là cấu hình cũ: docs và `shared/api/client.ts` đã chuyển sang 8000. Ai đặt `VITE_API_URL=/api/v1` để đi qua proxy sẽ gặp lỗi kết nối.

## Giải Pháp
- Proxy mặc định `http://localhost:8000`.
- Cho phép ghi đè bằng `VITE_PROXY_TARGET` (ví dụ `http://localhost:8002` khi chạy backend bằng Docker Compose), đọc qua `loadEnv`.
- Ghi cách dùng vào `README_FE.md`.

## Nghiệm Thu
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` sạch.
- `VITE_API_URL=/api/v1 npm run dev` → request `/api/v1/health`… đi tới backend port 8000.
