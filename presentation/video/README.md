# Video demo (HyperFrames)

Video demo khoảng 3:20 của PIIGuard Shield, dựng bằng [HyperFrames](https://github.com/heygen-com/hyperframes). Mỗi composition là một file HTML có GSAP timeline. Video gồm 12 cảnh: 5 cảnh motion graphics, 7 cảnh quay màn hình app bằng Playwright (bắt đầu bằng cảnh kết nối một database PostgreSQL thật), lồng tiếng tiếng Việt bằng TTS và phụ đề tiếng Anh. Lời đọc trong `script.json` cố ý không dùng từ tiếng Anh (DPO → người duyệt, Analyst → chuyên viên phân tích, JOIN → nối bảng) để TTS đọc tự nhiên; phụ đề tiếng Anh vẫn giữ thuật ngữ gốc.

| File | Vai trò |
| --- | --- |
| `script.json` | Nguồn duy nhất cho lời đọc tiếng Việt và phụ đề tiếng Anh của từng cảnh |
| `narration/tts.py` | Sinh giọng đọc bằng edge-tts, ra `assets/audio/<cảnh>.mp3` và `timing.json` |
| `record/record.mjs` | Playwright quay các cảnh app theo 5 phiên ngắn (connect, scope, review, audit, analyst), ra `assets/clips/<phiên>.webm` và `marks.json` |
| `record/serve_backend.sh` | Backend riêng cho việc quay: cổng 8011, metadata DB mới nên run là #1 và nhật ký sạch; bật đăng nhập SQL chỉ-đọc cho Analyst |
| `build_timeline.mjs` | Sinh `index.html`, `compositions/captions.html` và `out/piiguard_demo.en.srt` từ thời lượng TTS |
| `compositions/s01…s11.html` | Hình ảnh của từng cảnh, viết tay |
| `assets/theme.css` | Font Be Vietnam Pro (lưu sẵn), màu theo theme app và pitch deck |

## Xem trước

```bash
cd presentation/video
npm install
npm run dev          # mở HyperFrames Studio trong trình duyệt
```

Clip `.webm` và audio `.mp3` không được commit vì có thể sinh lại. Máy chưa có thì làm các bước bên dưới.

## Sinh lại media

Các lệnh dưới đây chạy từ thư mục gốc repo, trừ khi ghi khác:

```bash
# 1. Giọng đọc (sửa lời trong script.json trước)
python presentation/video/narration/tts.py            # hoặc: ... tts.py s04 s06 để sinh lại vài cảnh

# 2. App để quay: Postgres đã seed (docker compose up -d db), sau đó mở hai terminal
bash presentation/video/record/serve_backend.sh                       # backend :8011, DB mới
cd front_end && VITE_API_URL=http://localhost:8011/api/v1 npx vite --port 5174

# 3. Quay (cần Chrome; lần đầu chạy: npx playwright install ffmpeg)
# DEMO_SOURCE_URL: connection string của database dùng cho cảnh kết nối. Chỉ đặt qua biến môi trường, không commit.
# Form hiển thị URL dạng mật khẩu (dấu chấm), nên mật khẩu không lộ trên video.
cd presentation/video && DEMO_SOURCE_URL='postgresql://…' node record/record.mjs   # hoặc: … record.mjs analyst

# 4. Dựng lại timeline
node build_timeline.mjs
```

Mỗi lần quay phải khởi động lại `serve_backend.sh`. Lý do: nguồn demo dùng chung một schema snapshot, nên khi còn dataset đã PUBLISHED từ lần trước, backend chặn build mới (409).

Sau khi quay lại, mốc thời gian sẽ dịch đi. `assets/clips/marks.json` chỉ là mốc gần đúng: khi có đoạn chờ dài (quét database ở xa), video có thể lệch vài giây so với mốc, nên cần trích khung hình để kiểm tra. Cần chỉnh `data-media-start` / `data-duration` của các thẻ `<video>` trong `compositions/s04…s10.html` theo các mốc mới. Docker (Postgres local giữ bản sao) phải đang chạy, nếu không bước build báo `ConnectionTimeout`. Cảnh Analyst mở tab "Kết nối SQL" nhưng không bấm "Tạo thông tin kết nối", nên không có mật khẩu nào lên hình. Thời điểm callout tính theo giây trong cảnh, giọng đọc bắt đầu ở giây 0.35.

## Render (Giai đoạn B)

Lệnh `snapshot` và `render` cần FFmpeg trên PATH. Có thể cài vào hệ thống (`winget install Gyan.FFmpeg`), hoặc dùng bản cục bộ trong `node_modules`:

```bash
export PATH="$PWD/node_modules/ffmpeg-static:$PWD/node_modules/ffprobe-static/bin/win32/x64:$PATH"
npm run check
npm run render       # ra out/piiguard_demo.mp4
```

Màn hình được quay ở 1536×864 rồi phóng lên khung 1920×1080. Kịch bản quay không dùng ngoại lệ `KEEP` cho trường PII và không mở form nhập connection string. Trong video chỉ có dữ liệu synthetic từ `data/fixtures/`.
