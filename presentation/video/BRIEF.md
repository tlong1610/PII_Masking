---
workflow: general-video
flow: automation
storyboard: yes
message: "PIIGuard Shield giúp DPO bảo vệ dữ liệu cá nhân và chứng minh dataset vẫn dùng được"
destination: video demo nộp chương trình VinUni AI20K
aspect: "16:9"
language: vi (lồng tiếng), en (phụ đề burn-in)
audience: ban giám khảo, người không chuyên dev
length: "3:00-3:30"
---

## Intent

Storyboard 11 cảnh và lời đọc đã được duyệt trong plan `C:\Users\admin\.claude\plans\l-n-k-ho-ch-quay-quiet-hickey.md`.

## Assets

- Quay màn hình app bằng Playwright, chạy trên stack local (không dùng production).
- Giọng TTS tiếng Việt `vi-VN-HoaiMyNeural` (edge-tts). Không có phụ đề tiếng Việt.
- Logo, mascot Pango và nền navy lấy từ `assets/` của repo. Màu theo `front_end/src/app/theme`.

## Notes

- Giai đoạn A: chỉ dựng HTML để xem trước. Render MP4 khi người dùng yêu cầu.
- Chưa có nhạc nền. Thêm sau nếu người dùng muốn.
