# Release Demo — Video luồng chính

| File | Vai trò |
| --- | --- |
| [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) | Kịch bản và storyboard 15 cảnh (thao tác + thuyết minh) |
| [`scenes.mjs`](scenes.mjs) | Nguồn sự thật: thoại (`caption`/`speak`) và thao tác Playwright của từng cảnh |
| [`record.mjs`](record.mjs) | Sinh giọng đọc, quay trình duyệt bằng CDP screencast, ghép video + âm thanh + phụ đề bằng ffmpeg |
| [`render.sh`](render.sh) | Một lệnh: dựng stack QA sạch, quay, tắt stack |
| `output/` | Kết quả (không commit): `piiguard-demo.mp4`, `piiguard-demo.vi.srt`, `timeline.json` |

## Yêu cầu
- macOS có giọng `Linh` (tiếng Việt) cho lệnh `say`. Đổi giọng hoặc tốc độ bằng `DEMO_VOICE`, `DEMO_RATE`.
- `ffmpeg` / `ffprobe` (`brew install ffmpeg`), Google Chrome, Docker Postgres/Mongo đã seed.
- `release/qa` đã `npm install` (dùng chung Playwright).

## Render

```bash
bash release/demo/render.sh
# → release/demo/output/piiguard-demo.mp4  (1920×1080, H.264 30 fps, AAC 48 kHz, phụ đề tiếng Việt nhúng)
```

Mỗi lần render đều bắt đầu từ metadata trống (run #1), nên video luôn giống nhau. Quá trình mất khoảng 4–5 phút.
