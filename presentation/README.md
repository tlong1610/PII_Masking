# Pitch Deck & Demo Materials

![Thumbnail video demo](thumbnail.png)

## Files

| File | Nội dung |
| --- | --- |
| [`pitch_deck.pptx`](pitch_deck.pptx) | Deck 9 slide, sửa được trong PowerPoint/Google Slides; có speaker notes từng slide |
| [`pitch_deck.pdf`](pitch_deck.pdf) | Bản PDF cùng layout, dùng để nộp hoặc chiếu khi máy không có PowerPoint |
| [`thumbnail.png`](thumbnail.png) | Ảnh bìa 1920×1080 cho video demo và gallery dự án: màn DPO review trên monitor, Pango chỉ vào màn hình, badge số liệu nghiệm thu P1 |
| [`source/build_deck.js`](source/build_deck.js) | Nguồn duy nhất của layout; sinh cả PPTX, PDF và thumbnail |

Video demo và app live có link riêng ở [README gốc](../README.md), nên deck không có slide demo/QR.

## Cấu trúc deck

1. **Title** — logo, tagline, 4 cách bảo vệ, Team P-138
2. **Vấn đề** — khung pháp lý mới (Luật 91/2025/QH15, NĐ 356/2025/NĐ-CP, NĐ 330/2026/NĐ-CP), mức phạt tối đa theo Điều 8 Luật 91, ba nỗi đau của DPO
3. **Giải pháp** — cổng bảo mật giữa database gốc và Analyst; 4 cách bảo vệ MASK · REDACT · HMAC · DROP
4. **Sản phẩm** — 7 bước Kết nối → Phạm vi → Quét → DPO duyệt → Build → Kiểm chứng → Publish
5. **Kiến trúc** — đường dữ liệu, đường điều khiển và 3 lớp kiểm soát, viết cho người không chuyên dev
6. **AI / LLM** — phễu rules → BM25 → hybrid → LLM vùng xám; số liệu Luồng A/B sau HITL
7. **Kỹ thuật** — số test, CI/CD, nhật ký chuỗi hash SHA-256
8. **Bài học** — HMAC/`link_scope`, LLM chỉ thấy metadata, giới hạn `KEEP`
9. **Team & bước tiếp theo** — 4 thành viên, lộ trình, lời cảm ơn

Căn cứ pháp lý ở slide 2 lấy từ bản gốc trong [`docs/legal/`](../docs/legal/). Số liệu AI ở slide 6 lấy từ `performance/sau_HITL/`. Số test ở slide 7 là kết quả chạy lại ngày 18/10/2026 (backend 312 pass + 5 skip cần DB live, frontend 184 pass); khi số test thay đổi thì sửa `techStats` trong `build_deck.js` và build lại.

## Nhận diện

Màu theo theme của app ([`front_end/src/app/theme/theme.ts`](../front_end/src/app/theme/theme.ts)): primary `#1B51A4`, nền sáng xanh nhạt, card trắng viền `#E5E7EB`. Slide bìa và các panel nhấn mạnh dùng nền navy của màn đăng nhập ([`assets/svg/login-background.svg`](../assets/svg/login-background.svg)). Màu 4 hành động khớp chip trong giao diện DPO: MASK cam `#D97706`, REDACT xanh `#2563EB`, HMAC tím `#7C3AED`, DROP đỏ `#DC2626`. Mascot Pango và logo lấy từ [`assets/`](../assets/README.md) (WebP được chuyển sang PNG khi build). Font Arial để chiếu ổn định trên mọi máy.

## Build lại

Cần Node 18+ và Chrome hoặc Edge (đặt `CHROME_PATH` nếu không ở vị trí mặc định).

```bash
cd presentation/source
npm install
npm run build              # ghi đè ../pitch_deck.pptx, ../pitch_deck.pdf, ../thumbnail.png
node build_deck.js --qa    # thêm ảnh từng slide vào build/qa/ để soát lỗi tràn chữ
```

Sửa nội dung trong `build_deck.js` rồi build lại, không sửa tay PPTX/PDF để hai bản luôn khớp nhau. Thư mục `source/build/` là file trung gian, đã được gitignore. Không đưa raw PII, sample value hay secret lên slide.

## Video Demo Checklist

- [ ] Giới thiệu problem (< 30 giây)
- [ ] Demo live feature chính (2-3 phút)
- [ ] Hiển thị kết quả AI (1 phút)
- [ ] Tóm tắt impact (< 30 giây)
