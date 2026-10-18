# Pitch Deck & Demo Materials

![Thumbnail video Demo Day](thumbnail.png)

## Files

| File | Nội dung |
| --- | --- |
| [`pitch_deck.pptx`](pitch_deck.pptx) | Deck Demo Day 10 slide, sửa được trong PowerPoint/Google Slides; có speaker notes từng slide |
| [`pitch_deck.pdf`](pitch_deck.pdf) | Bản PDF cùng layout, dùng để nộp hoặc chiếu khi máy không có PowerPoint |
| [`thumbnail.png`](thumbnail.png) | Ảnh bìa 1920×1080 cho video demo và gallery dự án: màn DPO review trên monitor, Pango chỉ vào màn hình, badge số liệu nghiệm thu P1 |
| [`source/build_deck.js`](source/build_deck.js) | Nguồn duy nhất của layout; sinh cả PPTX, PDF và thumbnail |

Video demo chưa nằm trong repo; link ở [README gốc](../README.md) và QR trên slide 8.

## Cấu trúc deck (theo `docs/guide/chapter-09.md` §9.6)

1. **Title** — logo, tagline “Protect data. Preserve utility.”, DATA-06 · P-138
2. **Problem** — bỏ sót PII, che sai làm hỏng JOIN, thiếu căn cứ; DPO và Analyst
3. **Solution** — cổng bảo mật giữa raw database và Analyst; Brand Core / Promise / Positioning
4. **Product flow** — 7 bước Connect → Scope → Scan → DPO Review → Build → Verify → Publish
5. **Architecture** — React (Vercel) → FastAPI (Render) → engine → snapshot riêng
6. **AI / LLM** — phễu rules → BM25 → hybrid → LLM vùng xám; số liệu Luồng A/B
7. **Technical highlights** — tests, CI/CD, audit hash-chain
8. **Demo** — QR video + live app, tài khoản demo
9. **Challenges & learnings** — HMAC/`link_scope`, LLM chỉ thấy metadata, giới hạn `KEEP`
10. **Team & next steps** — 4 thành viên, roadmap, Q&A

Số liệu test/benchmark là số của báo cáo nghiệm thu P1 và được ghi chú như vậy trên slide.

## Nhận diện (Brand DNA)

Theo [`assets/svg/piiguard-brand-dna.svg`](../assets/svg/piiguard-brand-dna.svg): nền `#F8FAFC`, gradient `#0F172A → #0F766E → #16A34A`, card trắng bo 22px, màu ngữ nghĩa Verified `#16A34A` / Warning `#D97706` / Blocked `#DC2626`. Mascot Pango và logo lấy từ [`assets/`](../assets/README.md) (WebP được chuyển sang PNG khi build). Font Arial để chiếu ổn định trên mọi máy.

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
