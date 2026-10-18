// Builds the Demo Day pitch deck and the video thumbnail from ONE layout source, so the
// editable PPTX and the PDF/PNG renders stay identical.
//
//   cd presentation/source && npm install && npm run build      # or: node build_deck.js --qa
//
// Outputs: ../pitch_deck.pptx, ../pitch_deck.pdf, ../thumbnail.png (1920x1080).
// Intermediate HTML, PNG assets and QA renders go to ./build/ (gitignored).
// Layout unit is the pixel of a 1280x720 canvas (96 px = 1 inch = LAYOUT_WIDE in PowerPoint).
// Colors follow assets/svg/piiguard-brand-dna.svg. Never put raw PII or secrets on a slide.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');
const QRCode = require('qrcode');

const JSZip = require(require.resolve('jszip', { paths: [require.resolve('pptxgenjs')] }));

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(__dirname, '..');
const BUILD = path.join(__dirname, 'build');
const QA = process.argv.includes('--qa');

// ---------------------------------------------------------------- Brand DNA tokens
const C = {
  navy: '0F172A', // Primary
  trust: '0F766E', // Trust
  verified: '16A34A', // Verified
  warning: 'D97706',
  blocked: 'DC2626',
  bg: 'F8FAFC',
  white: 'FFFFFF',
  body: '334155',
  muted: '64748B',
  border: 'D9E2EC',
  flow: 'CBD5E1',
  onDark: 'CCFBF1',
  softFill: 'ECFDF5', softLine: '99F6E4',
  dpoFill: 'F0FDF4', dpoLine: '86EFAC',
  analystFill: 'EFF6FF', analystLine: '93C5FD',
  warnFill: 'FFF7ED', warnLine: 'FDBA74',
  dangerFill: 'FEF2F2', dangerLine: 'FCA5A5',
  pillFill: 'E0F2FE', pillLine: '7DD3FC', pillText: '0369A1',
};
const GRADIENT = [['0%', C.navy], ['62%', C.trust], ['100%', C.verified]];
const FONT = 'Arial';
const THEME = {
  name: 'PIIGuard Shield DNA',
  colors: {
    dk1: C.navy, lt1: C.white, dk2: C.body, lt2: C.bg,
    accent1: C.trust, accent2: C.verified, accent3: '2563EB', accent4: C.warning, accent5: C.blocked, accent6: '7C3AED',
    hlink: C.trust, folHlink: C.muted,
  },
};
const LINKS = {
  video: 'https://drive.google.com/drive/folders/1OOIj4LYKQ4vIFTbjH8rg0DRRxJ7hNGoN?usp=sharing',
  app: 'https://frontend-alpha-fawn-53.vercel.app',
  docs: 'https://piiguard-vn-api.onrender.com/docs',
  repo: 'https://github.com/AI20K-Build-Phase-Cohort-4/P-138',
};

// ---------------------------------------------------------------- layout primitives
const rect = (x, y, w, h, o = {}) => ({ t: 'rect', x, y, w, h, ...o });
const text = (x, y, w, h, content, o = {}) => ({ t: 'text', x, y, w, h, content, ...o });
const img = (x, y, w, h, src, o = {}) => ({ t: 'img', x, y, w, h, src, ...o });
const arrow = (x1, y1, x2, y2, o = {}) => ({ t: 'arrow', x1, y1, x2, y2, ...o });

const gradients = new Map();
function grad(x, y, w, h, r, o = {}) {
  const key = `grad-${w}x${h}-r${r}.png`;
  gradients.set(key, { w, h, r });
  return img(x, y, w, h, `gen/${key}`, { alt: '', ...o });
}
const card = (x, y, w, h, o = {}) =>
  rect(x, y, w, h, { fill: C.white, line: C.border, lineW: 1.5, r: 22, shadow: true, ...o });
const pill = (x, y, w, h, label, o = {}) => [
  rect(x, y, w, h, { fill: o.fill ?? C.pillFill, line: o.line ?? C.pillLine, lineW: 1, r: h / 2, transp: o.transp }),
  text(x, y, w, h, label, { size: o.size ?? 13, bold: o.bold ?? true, color: o.color ?? C.navy, align: 'center', valign: 'middle' }),
];
const badge = (x, y, d, label, fill, line, color) => [
  rect(x, y, d, d, { fill, line, lineW: 1.5, r: 'full' }),
  text(x, y, d, d, label, { size: 18, bold: true, color, align: 'center', valign: 'middle' }),
];
const mascot = (pose, x, y, d) =>
  img(x, y, d, d, `img/pango-${pose}.png`, { alt: `Mascot Pango (${pose})` });

// ---------------------------------------------------------------- slide layouts (masters)
const MASTERS = {
  CONTENT: {
    objects: [
      img(56, 675, 20, 20, 'img/logo.png'),
      text(84, 672, 640, 26, 'PIIGuard Shield · DATA-06 · Team P-138', { size: 11, color: C.muted, valign: 'middle' }),
    ],
    title: { x: 56, y: 84, w: 1168, h: 56, size: 32, color: C.navy },
    number: { x: 1124, y: 672, w: 100, h: 26, size: 11, color: C.muted },
  },
  COVER: {
    objects: [grad(32, 32, 1216, 656, 32)],
    title: { x: 88, y: 206, w: 700, h: 84, size: 60, color: C.white },
  },
  HERO: {
    objects: [grad(32, 32, 1216, 656, 32)],
    title: { x: 88, y: 72, w: 860, h: 56, size: 34, color: C.white },
  },
};

const kicker = (label) => [
  grad(56, 44, Math.round(label.length * 8.4 + 34), 28, 14),
  text(56, 44, Math.round(label.length * 8.4 + 34), 28, label, { size: 11, bold: true, color: C.white, align: 'center', valign: 'middle', spacing: 1 }),
];

// ---------------------------------------------------------------- slides
const slides = [];

// 1 — Title
slides.push({
  master: 'COVER', section: 'Mở đầu', title: 'PIIGuard Shield',
  els: [
    rect(88, 96, 72, 72, { fill: C.white, r: 18 }),
    img(96, 104, 56, 56, 'img/logo.png', { alt: 'Logo PIIGuard Shield' }),
    text(180, 98, 600, 68, [
      [{ text: 'VinUni AI20K Build Phase · Cohort 4', b: true }],
      [{ text: 'Mã đề DATA-06 · Team P-138', color: C.onDark }],
    ], { size: 15, color: C.white, valign: 'middle', para: 4 }),
    text(88, 304, 700, 48, 'Protect data. Preserve utility.', { size: 30, color: C.white }),
    text(88, 370, 620, 96,
      'Hỗ trợ DPO rà soát dữ liệu cá nhân trong PostgreSQL và MongoDB, duyệt biện pháp bảo vệ và chia sẻ dataset vẫn dùng được cho phân tích.',
      { size: 18, color: C.onDark }),
    ...pill(88, 560, 200, 40, 'Demo Day · 10/2026', { fill: C.white, line: C.white, transp: 82, color: C.white, size: 14 }),
    ...pill(300, 560, 250, 40, 'Luật 91/2025 · NĐ 356/2025', { fill: C.white, line: C.white, transp: 82, color: C.white, size: 14 }),
    rect(815, 160, 390, 390, { fill: C.white, r: 'full', transp: 86 }),
    mascot('default', 790, 145, 440),
  ],
  notes: 'PIIGuard Shield — cổng bảo mật giữa database gốc và Analyst. Tagline: Protect data. Preserve utility. Team P-138, mã đề DATA-06.',
});

// 2 — Problem
const pains = [
  ['1', 'Bỏ sót dữ liệu cá nhân', 'PII nằm rải rác trong hàng trăm cột, cả văn bản tự do và document MongoDB lồng nhau.', C.dangerFill, C.dangerLine, C.blocked],
  ['2', 'Che sai làm hỏng JOIN', 'Khóa nối bị che không nhất quán, Analyst mất liên kết giữa các bảng.', C.warnFill, C.warnLine, C.warning],
  ['3', 'Thiếu căn cứ và bằng chứng', 'Khó chứng minh ai duyệt, theo điều luật nào, đã kiểm tra tác động chưa.', C.pillFill, C.pillLine, C.pillText],
];
slides.push({
  master: 'CONTENT', section: 'Vấn đề & giải pháp', kicker: '02 · VẤN ĐỀ',
  title: 'DPO rà từng trường bằng tay trước khi chia sẻ',
  els: [
    ...pains.flatMap(([n, t, b, fill, line, color], i) => {
      const y = 172 + i * 156;
      return [
        card(56, y, 700, 140, { r: 18 }),
        ...badge(84, y + 30, 46, n, fill, line, color),
        text(152, y + 24, 580, 30, t, { size: 20, bold: true, color: C.navy }),
        text(152, y + 60, 580, 60, b, { size: 15 }),
      ];
    }),
    mascot('detected', 862, 150, 300),
    rect(792, 466, 212, 174, { fill: C.dpoFill, line: C.dpoLine, lineW: 1.5, r: 18 }),
    text(812, 484, 176, 24, 'DPO / Reviewer', { size: 15, bold: true, color: C.navy }),
    text(812, 516, 176, 110, 'Cần căn cứ, quyết định rõ và bằng chứng xử lý.', { size: 14 }),
    rect(1012, 466, 212, 174, { fill: C.analystFill, line: C.analystLine, lineW: 1.5, r: 18 }),
    text(1032, 484, 176, 24, 'Analyst / AI team', { size: 15, bold: true, color: C.navy }),
    text(1032, 516, 176, 110, 'Cần dataset được phép dùng, vẫn JOIN và tổng hợp được.', { size: 14 }),
  ],
  notes: 'Ba nỗi đau: bỏ sót PII, che khóa không nhất quán làm hỏng JOIN, và thiếu căn cứ/người duyệt/kiểm tra tác động trước khi chia sẻ. Hai người dùng: DPO và Analyst.',
});

// 3 — Solution
const dna = [
  ['Brand Core', 'Cổng bảo mật giữa raw database và workload Analyst / AI.', 'Raw data in. Verified protected dataset out.'],
  ['Brand Promise', 'Bảo vệ dữ liệu cá nhân mà không phá JOIN, lookup và giá trị phân tích.', 'DPO governs. Backend enforces. Verifier proves.'],
  ['Positioning', 'Hạ tầng dữ liệu an toàn cho đội analytics và AI doanh nghiệp.', 'Not a masking toy. A governed publishing flow.'],
];
slides.push({
  master: 'CONTENT', section: 'Vấn đề & giải pháp', kicker: '03 · GIẢI PHÁP',
  title: 'Cổng bảo mật giữa raw database và Analyst',
  els: [
    card(56, 192, 300, 180),
    text(82, 214, 250, 18, 'INPUT', { size: 11, bold: true, color: C.muted, spacing: 1 }),
    text(82, 238, 250, 32, 'Raw database', { size: 22, bold: true, color: C.navy }),
    text(82, 280, 250, 76, [['PostgreSQL · MongoDB'], ['Chỉ đọc, không ghi ngược']], { size: 15, para: 4 }),
    arrow(366, 282, 436, 282),
    grad(446, 172, 388, 220, 24),
    mascot('protected', 458, 192, 180),
    text(646, 200, 172, 164, [
      [{ text: 'PIIGuard Shield', b: true, size: 21 }],
      [{ text: 'Quét → DPO duyệt', color: C.onDark }],
      [{ text: 'Verify → Publish', color: C.onDark }],
    ], { size: 14, color: C.white, valign: 'middle', para: 8 }),
    arrow(844, 282, 914, 282),
    card(924, 192, 300, 180),
    text(950, 214, 250, 18, 'OUTPUT', { size: 11, bold: true, color: C.muted, spacing: 1 }),
    text(950, 238, 250, 32, 'Verified dataset', { size: 22, bold: true, color: C.navy }),
    text(950, 280, 250, 76, [['MASK · HMAC · DROP'], ['Analyst chỉ thấy PUBLISHED']], { size: 15, para: 4 }),
    ...dna.flatMap(([t, b, s], i) => {
      const x = 56 + i * 396;
      return [
        card(x, 420, 376, 212),
        text(x + 26, 444, 324, 28, t, { size: 19, bold: true, color: C.navy }),
        text(x + 26, 482, 324, 76, b, { size: 16 }),
        text(x + 26, 572, 324, 40, s, { size: 13, bold: true, italic: true, color: C.trust }),
      ];
    }),
  ],
  notes: 'PIIGuard là cổng bảo mật: nguồn chỉ đọc, output là snapshot riêng đã MASK/HMAC/DROP, chỉ publish sau khi verifier pass. HMAC giữ JOIN/lookup. Không phải công cụ che dữ liệu đơn thuần mà là một quy trình phát hành có quản trị.',
});

// 4 — Product flow
const steps = [
  ['Connect DB', 'read-only'], ['Chọn scope', 'bảng · collection'], ['Quét PII', 'rules + AI'],
  ['DPO Review', '4 tab, có căn cứ'], ['Build', 'snapshot riêng'], ['Verify', 'JOIN · $lookup'], ['Publish', 'Analyst xem'],
];
const moments = [
  ['scanning', 'Quét & đề xuất', 'Rules làm nền, AI hỗ trợ field mơ hồ. Mỗi field có phân loại, căn cứ pháp lý và action đề xuất.'],
  ['awaiting', 'DPO duyệt trên 4 tab', 'Tổng quan · Rủi ro · Nhật ký kiểm toán · Dữ liệu cho Analyst. Ghi đè AI phải kèm lý do.'],
  ['protected', 'Verifier PASS mới Publish', 'Snapshot được kiểm tra JOIN / $lookup. Analyst chỉ thấy dataset PUBLISHED, không đọc source.'],
];
slides.push({
  master: 'CONTENT', section: 'Sản phẩm', kicker: '04 · SẢN PHẨM',
  title: '7 bước từ kết nối đến phát hành, có người duyệt',
  els: [
    ...steps.flatMap(([t, s], i) => {
      const x = 57 + i * 170;
      const hi = i === 3 || i === 5;
      const out = [
        rect(x, 172, 146, 100, { fill: hi ? C.dpoFill : C.white, line: hi ? C.dpoLine : C.flow, lineW: 1.5, r: 14 }),
        text(x + 14, 184, 118, 16, `0${i + 1}`, { size: 11, bold: true, color: C.trust }),
        text(x + 14, 204, 124, 24, t, { size: 15, bold: true, color: C.navy }),
        text(x + 14, 232, 124, 30, s, { size: 12, color: C.muted }),
      ];
      if (i < steps.length - 1) out.push(arrow(x + 150, 222, x + 166, 222));
      return out;
    }),
    ...moments.flatMap(([pose, t, b], i) => {
      const x = 56 + i * 396;
      return [
        card(x, 300, 376, 344),
        mascot(pose, x + 108, 310, 160),
        text(x + 26, 478, 324, 28, t, { size: 18, bold: true, color: C.navy }),
        text(x + 26, 514, 324, 110, b, { size: 15 }),
      ];
    }),
  ],
  notes: 'Luồng 7 bước: kết nối nguồn chỉ đọc, chọn scope, quét, DPO duyệt trên 4 tab, build snapshot riêng, verifier chạy JOIN/$lookup, publish cho Analyst. Bước DPO Review và Verify là hai cổng kiểm soát.',
});

// 5 — Architecture
const archCols = [
  [56, 230, 'React SPA', 'Vercel', ['DPO workspace', 'Analyst workspace', 'Scope picker · ERD', 'Masking sandbox']],
  [336, 250, 'FastAPI', 'Render · Docker', ['Auth & role guard', 'Sources · Runs', 'Datasets · Publish', 'Audit hash-chain']],
  [636, 290, 'Processing engine', 'Python 3.11', ['Scanner + LangGraph', 'Transform MASK · HMAC · DROP', 'Downstream verifier', 'HITL few-shot memory']],
];
const techPills = ['Python 3.11 · FastAPI · Pydantic', 'React · TypeScript · Vite · MUI', 'PostgreSQL · MongoDB', 'Docker · GitHub Actions'];
slides.push({
  master: 'CONTENT', section: 'Sản phẩm', kicker: '05 · KIẾN TRÚC',
  title: 'Nguồn chỉ đọc, snapshot riêng, verifier gác cổng',
  els: [
    ...archCols.flatMap(([x, w, t, s, items]) => [
      card(x, 172, w, 388, { r: 18 }),
      text(x + 20, 190, w - 40, 26, t, { size: 18, bold: true, color: C.navy }),
      text(x + 20, 218, w - 40, 20, s, { size: 13, color: C.muted }),
      ...items.flatMap((it, j) => [
        rect(x + 16, 254 + j * 74, w - 32, 60, { fill: C.bg, line: 'E2E8F0', lineW: 1, r: 10 }),
        text(x + 30, 254 + j * 74, w - 60, 60, it, { size: 13, bold: true, color: C.body, valign: 'middle' }),
      ]),
    ]),
    text(290, 336, 42, 18, 'REST', { size: 10, bold: true, color: C.muted, align: 'center' }),
    arrow(292, 366, 330, 366),
    arrow(592, 366, 630, 366),
    rect(976, 172, 248, 180, { fill: C.white, line: C.border, lineW: 1.5, r: 18, shadow: true }),
    text(996, 190, 208, 26, 'Source DB', { size: 18, bold: true, color: C.navy }),
    text(996, 220, 208, 44, 'PostgreSQL · MongoDB', { size: 14 }),
    ...pill(996, 296, 120, 32, 'READ-ONLY', { fill: C.warnFill, line: C.warnLine, color: C.warning, size: 11 }),
    rect(976, 380, 248, 180, { fill: C.softFill, line: C.softLine, lineW: 1.5, r: 18 }),
    text(996, 398, 208, 26, 'Protected DB', { size: 18, bold: true, color: C.navy }),
    text(996, 428, 208, 50, 'Schema / DB riêng, build lại mỗi lần', { size: 14 }),
    ...pill(996, 504, 208, 32, 'VERIFIED → PUBLISHED', { fill: C.verified, line: C.verified, color: C.white, size: 11 }),
    text(930, 240, 42, 18, 'đọc', { size: 10, bold: true, color: C.muted, align: 'center' }),
    arrow(970, 266, 932, 266),
    text(930, 444, 42, 18, 'ghi', { size: 10, bold: true, color: C.muted, align: 'center' }),
    arrow(932, 470, 970, 470),
    ...techPills.flatMap((t, i) => pill(56 + i * 295, 588, 283, 40, t, { size: 13 })),
  ],
  notes: 'Frontend React trên Vercel gọi FastAPI trên Render. Engine quét bằng rules và LangGraph, transform MASK/HMAC/DROP, rồi verifier chạy JOIN/$lookup trên snapshot. Nguồn luôn chỉ đọc; snapshot là schema/DB riêng, build lại mỗi lần. Audit ghi theo chuỗi hash.',
});

// 6 — AI approach
const funnel = [
  ['Tier 1 · Regex / rules + taxonomy Luật 91', C.navy, 640],
  ['Tier 2 · BM25 tri thức phân loại', '0F4C5C', 580],
  ['Tier 3 · Hybrid vector (ChromaDB)', C.trust, 520],
  ['LLM · chỉ vùng xám · metadata / stats', C.warning, 460],
  ['Proposal → DPO duyệt (HITL)', C.verified, 400],
];
const stats = [
  ['100%', C.trust, 'Action accuracy', 'Luồng A · 339 cột, sau HITL'],
  ['97.86%', C.verified, 'Recall', 'Luồng B · GLiNER, văn bản tự do'],
  ['97.51%', C.verified, 'F1', 'Luồng B · Precision 97.16%'],
];
slides.push({
  master: 'CONTENT', section: 'AI & kỹ thuật', kicker: '06 · AI / LLM',
  title: 'AI đề xuất, DPO quyết định',
  els: [
    text(56, 142, 1000, 26, 'LLM chỉ nhận metadata và thống kê đã lọc — không bao giờ nhận raw sample value.', { size: 16, color: C.muted }),
    ...funnel.flatMap(([t, fill, w], i) => {
      const x = 56 + (640 - w) / 2;
      const y = 188 + i * 62;
      return [
        rect(x, y, w, 52, { fill, r: 12 }),
        text(x, y, w, 52, t, { size: 15, bold: true, color: C.white, align: 'center', valign: 'middle' }),
      ];
    }),
    rect(56, 512, 640, 124, { fill: C.softFill, line: C.softLine, lineW: 1.5, r: 18 }),
    text(80, 528, 592, 26, 'HITL few-shot memory', { size: 17, bold: true, color: C.navy }),
    text(80, 560, 592, 64, 'Quyết định ghi đè của DPO thành ví dụ cho lần quét sau. Tắt AI hoặc LLM lỗi: rules vẫn chạy độc lập.', { size: 14 }),
    ...stats.flatMap(([n, color, t, s], i) => {
      const y = 188 + i * 150;
      return [
        card(740, y, 484, 136),
        text(764, y, 220, 136, n, { size: 44, bold: true, color, valign: 'middle' }),
        text(990, y + 34, 214, 26, t, { size: 15, bold: true, color: C.navy }),
        text(990, y + 64, 214, 44, s, { size: 13, color: C.muted }),
      ];
    }),
    text(740, 640, 484, 20, 'Số liệu báo cáo nghiệm thu P1 · performance/sau_HITL/', { size: 11, color: C.muted }),
  ],
  notes: 'Phễu phát hiện nhiều tầng trong LangGraph: rules/regex, BM25, hybrid vector, chỉ gửi LLM phần vùng xám và chỉ với metadata/thống kê. AI chỉ đề xuất; DPO quyết định. Kết quả theo báo cáo nghiệm thu P1: Luồng A 100% action accuracy trên 339 cột sau HITL; Luồng B GLiNER recall 97.86%, precision 97.16%, F1 97.51%.',
});

// 7 — Technical highlights
const techStats = [
  ['317', 'Backend tests', 'pytest, pass 100%', 44],
  ['160', 'Frontend tests', 'vitest, 35 file test', 44],
  ['0', 'Lỗi Ruff', 'lint + typecheck sạch', 44],
  ['SHA-256', 'Audit hash-chain', '/audit/verify · Merkle root', 34],
];
const pipeline = [
  ['GitHub Actions', 'ruff + pytest · self-hosted runner', false],
  ['Docker Hub', 'len1652/piiguard-api', false],
  ['Render', 'FastAPI API, chạy 24/7', true],
  ['Vercel', 'React SPA', true],
];
slides.push({
  master: 'CONTENT', section: 'AI & kỹ thuật', kicker: '07 · KỸ THUẬT',
  title: 'Kiểm thử, CI/CD và bằng chứng kiểm toán',
  els: [
    ...techStats.flatMap(([n, t, s, size], i) => {
      const x = 56 + i * 295;
      return [
        card(x, 172, 283, 168),
        text(x + 24, 188, 236, 64, n, { size, bold: true, color: C.trust, valign: 'middle' }),
        text(x + 24, 262, 236, 24, t, { size: 16, bold: true, color: C.navy }),
        text(x + 24, 292, 236, 24, s, { size: 13, color: C.muted }),
      ];
    }),
    text(56, 368, 600, 26, 'Từ commit đến production', { size: 18, bold: true, color: C.navy }),
    ...pipeline.flatMap(([t, s, live], i) => {
      const x = 56 + i * 302;
      const out = [
        rect(x, 404, 262, 104, { fill: live ? C.softFill : C.white, line: live ? C.softLine : C.flow, lineW: 1.5, r: 16 }),
        text(x + 20, 422, live ? 160 : 222, 26, t, { size: 17, bold: true, color: C.navy }),
        text(x + 20, 454, 222, 40, s, { size: 13, color: C.muted }),
      ];
      if (live) out.push(...pill(x + 188, 420, 56, 24, 'LIVE', { fill: C.verified, line: C.verified, color: C.white, size: 10 }));
      if (i < pipeline.length - 1) out.push(arrow(x + 268, 456, x + 296, 456));
      return out;
    }),
    rect(56, 532, 1168, 76, { fill: C.pillFill, line: C.pillLine, lineW: 1, r: 18 }),
    text(80, 532, 1120, 76,
      'Không commit .env hay secret · URL nguồn do DPO đăng ký được mã hoá Fernet, không bao giờ trả lại · Analyst không có endpoint đọc source.',
      { size: 14, color: C.navy, valign: 'middle' }),
    text(56, 622, 1168, 20, 'Số liệu tests theo báo cáo nghiệm thu P1 — xem CI mới nhất để xác nhận hiện trạng.', { size: 11, color: C.muted }),
  ],
  notes: 'Theo báo cáo nghiệm thu P1: 317 backend tests, 160 frontend tests, Ruff sạch. CI chạy trên GitHub Actions self-hosted runner; image trên Docker Hub; API chạy trên Render, frontend trên Vercel. Audit hash-chain kiểm tra được qua /audit/verify.',
});

// 8 — Demo video
const qrCards = [
  [56, 'gen/qr-video.png', 'Video demo 3–5 phút', 'Google Drive · quét mã để mở', LINKS.video],
  [406, 'gen/qr-app.png', 'Live app', 'frontend-alpha-fawn-53.vercel.app', LINKS.app],
];
slides.push({
  master: 'CONTENT', section: 'Demo', kicker: '08 · DEMO',
  title: 'Xem demo end-to-end',
  els: [
    ...qrCards.flatMap(([x, src, t, s, url]) => [
      card(x, 172, 330, 412),
      img(x + 30, 196, 270, 270, src, { alt: `QR code: ${url}` }),
      text(x + 24, 486, 282, 30, t, { size: 19, bold: true, color: C.navy, align: 'center' }),
      text(x + 24, 522, 282, 40, [[{ text: s, link: url }]], { size: 13, color: C.trust, align: 'center' }),
    ]),
    card(766, 172, 458, 196),
    text(790, 192, 410, 26, 'Tài khoản demo', { size: 18, bold: true, color: C.navy }),
    ...pill(790, 236, 110, 34, 'DPO', { fill: C.dpoFill, line: C.dpoLine, size: 13 }),
    text(916, 236, 290, 34, 'dpo / dpo123', { size: 16, bold: true, color: C.body, valign: 'middle', font: 'Courier New' }),
    ...pill(790, 290, 110, 34, 'Analyst', { fill: C.analystFill, line: C.analystLine, size: 13 }),
    text(916, 290, 290, 34, 'analyst / analyst123', { size: 16, bold: true, color: C.body, valign: 'middle', font: 'Courier New' }),
    rect(766, 388, 458, 196, { fill: C.softFill, line: C.softLine, lineW: 1.5, r: 22 }),
    text(790, 408, 260, 24, 'Luồng trong video', { size: 16, bold: true, color: C.navy }),
    text(790, 438, 280, 96, 'PostgreSQL / MongoDB → DPO Review → Masking → Audit → Analyst', { size: 15, color: C.body }),
    text(790, 540, 300, 30, [[{ text: 'API docs: /docs', link: LINKS.docs }]], { size: 13, color: C.trust, valign: 'middle' }),
    mascot('loading', 1084, 444, 130),
  ],
  notes: 'Video demo 3–5 phút trên Google Drive, đi trọn luồng PostgreSQL/MongoDB → DPO Review → Masking → Audit → Analyst. App live trên Vercel; đăng nhập bằng tài khoản demo dpo/dpo123 và analyst/analyst123. Mở video backup nếu demo live gặp sự cố.',
});

// 9 — Challenges & learnings
const challenges = [
  ['THÁCH THỨC', 'Che dữ liệu mà vẫn JOIN được', 'CÁCH XỬ LÝ', 'HMAC-SHA-256 cho khóa nối, đồng bộ hai đầu quan hệ; link_scope giữ bảng liên kết chỉ có khóa.', C.softFill, C.softLine, C.trust],
  ['THÁCH THỨC', 'Dùng LLM mà không lộ PII', 'CÁCH XỬ LÝ', 'LLM chỉ nhận metadata và thống kê định tính; rules chạy độc lập khi tắt AI hoặc LLM lỗi.', C.warnFill, C.warnLine, C.warning],
  ['GIỚI HẠN CÒN MỞ', 'Ngoại lệ KEEP cho PII', 'VIỆC TIẾP THEO', 'KEEP vẫn chép giá trị gốc sang snapshot và chưa tự thu hồi theo hạn. Cần chặn trước khi khẳng định Zero Raw PII tuyệt đối.', C.dangerFill, C.dangerLine, C.blocked],
];
slides.push({
  master: 'CONTENT', section: 'Kết', kicker: '09 · BÀI HỌC',
  title: 'Thách thức và bài học',
  els: [
    ...challenges.flatMap(([k1, t, k2, b, fill, line, color], i) => {
      const x = 56 + i * 396;
      return [
        rect(x, 172, 376, 344, { fill, line, lineW: 1.5, r: 22 }),
        text(x + 26, 194, 324, 18, k1, { size: 11, bold: true, color, spacing: 1 }),
        text(x + 26, 218, 324, 64, t, { size: 21, bold: true, color: C.navy }),
        text(x + 26, 300, 324, 18, k2, { size: 11, bold: true, color, spacing: 1 }),
        text(x + 26, 324, 324, 176, b, { size: 17 }),
      ];
    }),
    card(56, 540, 1168, 100, { r: 18 }),
    mascot('error', 70, 544, 92),
    text(180, 540, 1020, 100, 'Bài học: che dữ liệu chưa đủ — phải chứng minh dataset vẫn dùng được.', { size: 18, bold: true, color: C.navy, valign: 'middle' }),
  ],
  notes: 'Hai thách thức đã giải: giữ JOIN bằng HMAC và link_scope; dùng LLM nhưng chỉ cho xem metadata. Giới hạn nói thẳng: ngoại lệ KEEP cho PII vẫn đưa giá trị gốc vào snapshot và chưa tự thu hồi theo hạn — đây là việc ưu tiên tiếp theo.',
});

// 10 — Team & next steps
const team = [
  ['Nguyễn Đình Phúc', 'PO / Team Lead · frontend, scope, căn cứ pháp lý, pitch'],
  ['Trần Xuân Tùng', 'Rules / LLM, workflow phát hiện, đánh giá AI'],
  ['Nguyễn Trung Kiên', 'MongoDB connector, fixture / nhãn chuẩn, eval'],
  ['Đoàn Tuấn Long', 'Backend, PostgreSQL connector, guardrail, phân quyền'],
];
const roadmap = [
  'Chặn ngoại lệ KEEP cho PII, tự thu hồi theo hạn',
  'Realtime CDC: Debezium / Kafka',
  'KMS / Vault cho khóa HMAC, SSO SAML / OIDC',
  'Thêm nguồn: ClickHouse, Snowflake, Databricks',
];
slides.push({
  master: 'HERO', section: 'Kết', title: 'Team P-138 và bước tiếp theo',
  els: [
    ...team.flatMap(([n, r], i) => {
      const y = 152 + i * 98;
      return [
        rect(88, y, 500, 86, { fill: C.white, r: 16, transp: 88 }),
        text(108, y + 14, 460, 24, n, { size: 17, bold: true, color: C.white }),
        text(108, y + 46, 470, 24, r, { size: 13, color: C.onDark }),
      ];
    }),
    text(620, 152, 340, 26, 'Bước tiếp theo', { size: 18, bold: true, color: C.white }),
    ...roadmap.flatMap((t, i) => {
      const y = 190 + i * 84;
      return [
        rect(620, y, 350, 72, { fill: C.white, r: 16, transp: 88 }),
        text(636, y, 40, 72, `0${i + 1}`, { size: 14, bold: true, color: C.onDark, valign: 'middle' }),
        text(676, y, 280, 72, t, { size: 14, color: C.white, valign: 'middle' }),
      ];
    }),
    rect(1010, 170, 210, 210, { fill: C.white, r: 'full', transp: 86 }),
    mascot('protected', 1000, 160, 230),
    text(990, 404, 250, 56, 'Cảm ơn!', { size: 40, bold: true, color: C.white, align: 'center' }),
    text(990, 462, 250, 36, 'Q&A', { size: 24, color: C.onDark, align: 'center' }),
    text(88, 600, 1100, 40, [[
      { text: 'github.com/AI20K-Build-Phase-Cohort-4/P-138', link: LINKS.repo },
      { text: '   ·   ' },
      { text: 'frontend-alpha-fawn-53.vercel.app', link: LINKS.app },
    ]], { size: 13, color: C.onDark, valign: 'middle' }),
  ],
  notes: 'Bốn thành viên và vai trò. Bước tiếp theo: ưu tiên chặn ngoại lệ KEEP cho PII; sau đó CDC realtime, quản lý khóa HMAC bằng KMS/Vault và SSO, mở rộng nguồn dữ liệu. Cảm ơn và mời hỏi đáp.',
});

// ---------------------------------------------------------------- thumbnail (16:9, HTML only)
// Marketing cover for the video / project gallery: the DPO review workspace on a tilted monitor,
// Pango pointing at it, neon metric badges and a feature strip. The screen is a faithful mock of
// the real UI (field paths, classes and actions only, never values).
const THUMB_BADGES = [
  ['100%', 'Accuracy', '339 cột · sau HITL', 'target', 'b1'],
  ['97.86%', 'Recall PII', 'văn bản tự do', 'scan', 'b2'],
  ['SHA-256', 'Audit chain', 'nhật ký bất biến', 'chain', 'b3'],
];
const THUMB_FEATURES = [
  ['user', 'Human-in-the-Loop', 'AI đề xuất · DPO quyết định'],
  ['shield', 'Che PII đa kỹ thuật', 'MASK · HMAC · REDACT · DROP'],
  ['check', 'Verifier → Publish', 'Kiểm chứng trước khi chia sẻ'],
];
const THUMB_ROWS = [
  ['customer_id', 'varchar', 'Khóa nối', 'join', 'Rule', 'HMAC', 'hmac'],
  ['contact_name', 'varchar', 'L2 · Cơ bản', 'l2', 'Regex', 'MASK', 'mask'],
  ['mobile_phone', 'varchar', 'L2 · Cơ bản', 'l2', 'Regex', 'MASK', 'mask'],
  ['email', 'varchar', 'L2 · Cơ bản', 'l2', 'Regex', 'MASK', 'mask'],
  ['cccd', 'varchar', 'L2 · Cơ bản', 'l2', 'Regex', 'HMAC', 'hmac', true],
  ['date_of_birth', 'date', 'L2 · Cơ bản', 'l2', 'Rule', 'MASK', 'mask'],
  ['personal_notes', 'text', 'L2 · Cơ bản', 'l2', 'GLiNER', 'REDACT', 'redact'],
  ['tax_code', 'varchar', 'L2 · Cơ bản', 'l2', 'Regex', 'MASK', 'mask'],
  ['address', 'varchar', 'L2 · Cơ bản', 'l2', 'Rule', 'MASK', 'mask'],
  ['region', 'varchar', 'Non-PII', 'non', 'Rule', 'KEEP', 'keep'],
  ['country', 'varchar', 'Non-PII', 'non', 'Rule', 'KEEP', 'keep'],
];
const ICON = {
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
  chain: '<path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1"/><path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1"/>',
  user: '<circle cx="10" cy="8" r="4"/><path d="M3 20a7 7 0 0 1 12-5"/><path d="m15 18 2 2 4-4"/>',
  shield: '<path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
};
const icon = (name, size) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;

function thumbnailHtml() {
  const badges = THUMB_BADGES.map(([n, t, s, ic, cls]) =>
    `<div class="badge ${cls}"><div class="bi">${icon(ic, 34)}</div><div><div class="bn">${esc(n)}</div><div class="bt">${esc(t)}</div><div class="bs">${esc(s)}</div></div></div>`).join('');
  const features = THUMB_FEATURES.map(([ic, t, s]) =>
    `<div class="feat"><div class="fi">${icon(ic, 30)}</div><div><div class="ft">${esc(t)}</div><div class="fs">${esc(s)}</div></div></div>`).join('');
  const rows = THUMB_ROWS.map(([f, type, cls, ccls, src, act, acls, sel]) =>
    `<div class="tr${sel ? ' sel' : ''}"><div><b>${esc(f)}</b>${sel ? '<i>Nối với orders.customer_cccd</i>' : ''}</div><div class="mut">${type}</div>`
    + `<div><span class="cls ${ccls}">${esc(cls)}</span></div><div><span class="src">${src}</span></div><div><span class="act ${acls}">${act}</span></div></div>`).join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>PIIGuard Shield — Thumbnail</title><style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 1280px; height: 720px; overflow: hidden; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; background: #050B1A; }
.stage { position: relative; width: 1280px; height: 720px; overflow: hidden; color: #fff;
  background:
    radial-gradient(700px 460px at 62% 42%, rgba(37,99,235,.42), transparent 70%),
    radial-gradient(520px 360px at 100% 0%, rgba(15,118,110,.45), transparent 70%),
    radial-gradient(560px 380px at 0% 100%, rgba(22,163,74,.28), transparent 70%),
    linear-gradient(160deg, #071433 0%, #050B1A 60%, #04101C 100%); }
.grid { position: absolute; inset: 0;
  background-image: linear-gradient(rgba(96,165,250,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,.07) 1px, transparent 1px);
  background-size: 44px 44px; -webkit-mask-image: radial-gradient(900px 520px at 60% 50%, #000, transparent 80%); }
.streak { position: absolute; height: 2px; border-radius: 2px; background: linear-gradient(90deg, transparent, rgba(56,189,248,.9), transparent); filter: blur(.4px); }
.brand { position: absolute; left: 34px; top: 26px; display: flex; align-items: center; gap: 12px; z-index: 6; }
.brand .tile { width: 46px; height: 46px; border-radius: 12px; background: #fff; display: grid; place-items: center; box-shadow: 0 0 24px rgba(56,189,248,.35); }
.brand .tile img { width: 36px; height: 36px; }
.brand b { display: block; font-size: 22px; font-weight: 800; letter-spacing: -.01em; }
.brand span { display: block; font-size: 12px; font-weight: 700; color: #7DD3FC; letter-spacing: .12em; text-transform: uppercase; margin-top: 2px; }

/* monitor */
.monitor { position: absolute; left: 352px; top: 58px; width: 860px; height: 520px; z-index: 2;
  transform: perspective(1900px) rotateY(-13deg) rotateX(3deg); transform-origin: 30% 50%; }
.bezel { position: absolute; inset: 0; border-radius: 22px; padding: 12px; background: linear-gradient(145deg, #334155, #0B1220 35%, #020617 70%, #334155); border: 1.5px solid rgba(148,163,184,.55);
  box-shadow: 0 40px 90px rgba(0,0,0,.65), 0 0 60px rgba(37,99,235,.45); }
.screen { position: relative; width: 100%; height: 100%; border-radius: 10px; overflow: hidden; background: #F8F9FA; color: #111827; display: flex; font-size: 10.5px; }
.glare { position: absolute; inset: 12px; border-radius: 10px; pointer-events: none; background: linear-gradient(115deg, rgba(255,255,255,.22), transparent 38%); }
.side { width: 150px; background: #fff; border-right: 1px solid #E5E7EB; padding: 12px 10px; display: flex; flex-direction: column; gap: 6px; }
.logo { display: flex; gap: 7px; align-items: center; margin-bottom: 6px; }
.logo img { width: 24px; height: 24px; }
.logo b { display: block; font-size: 11px; }
.logo span { display: block; font-size: 7.5px; color: #6B7280; }
.newa { border: 1px solid #D1D5DB; border-radius: 6px; padding: 5px 8px; font-weight: 600; font-size: 9.5px; }
.sec { margin-top: 6px; font-size: 7.5px; font-weight: 700; letter-spacing: .06em; color: #6B7280; }
.nav { padding: 6px 8px; border-radius: 6px; font-size: 10px; color: #374151; }
.nav.on { background: #EBF3FB; color: #1B51A4; font-weight: 700; }
.who { margin-top: auto; display: flex; gap: 6px; align-items: center; font-size: 9.5px; }
.who i { width: 20px; height: 20px; border-radius: 50%; background: #1B51A4; color: #fff; font-style: normal; display: grid; place-items: center; font-weight: 700; font-size: 9px; }
.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.top { display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: #fff; border-bottom: 1px solid #E5E7EB; }
.crumb { font-weight: 700; font-size: 11.5px; }
.crumb span { color: #6B7280; font-weight: 500; }
.st { margin-left: auto; font-size: 8.5px; font-weight: 700; color: #1B51A4; background: #EBF3FB; border: 1px solid #BFDBFE; border-radius: 4px; padding: 2px 7px; }
.pub { font-size: 9px; font-weight: 700; color: #fff; background: #1B51A4; border-radius: 5px; padding: 4px 10px; }
.tabs { display: flex; gap: 14px; padding: 0 12px; background: #fff; border-bottom: 1px solid #E5E7EB; font-size: 9.5px; color: #4B5563; }
.tabs div { padding: 7px 0; }
.tabs .on { color: #1B51A4; font-weight: 700; border-bottom: 2px solid #1B51A4; }
.body { flex: 1; display: flex; min-height: 0; }
.tbl { flex: 1; padding: 8px 10px; display: flex; flex-direction: column; gap: 0; min-width: 0; }
.grp { font-weight: 700; font-size: 10px; padding: 5px 6px; background: #F3F4F6; border-radius: 4px; margin-bottom: 2px; }
.th, .tr { display: grid; grid-template-columns: 1.5fr .8fr 1fr .7fr .7fr; align-items: center; padding: 5px 6px; border-bottom: 1px solid #F3F4F6; }
.th { font-size: 7.5px; font-weight: 700; letter-spacing: .05em; color: #6B7280; text-transform: uppercase; }
.tr b { font-family: Consolas, 'Courier New', monospace; font-size: 10px; display: block; }
.tr i { display: block; font-style: normal; font-size: 7.5px; color: #2563EB; }
.tr.sel { outline: 1.5px solid #DC2626; border-radius: 4px; background: #fff; }
.mut { color: #6B7280; font-size: 9px; }
.cls, .src, .act { display: inline-block; font-size: 8px; font-weight: 700; border-radius: 3px; padding: 2px 5px; }
.cls.l2 { color: #92400E; background: #FFFBEB; border: 1px solid #FCD34D; }
.cls.join { color: #1D4ED8; background: #EFF6FF; border: 1px solid #BFDBFE; }
.cls.non { color: #4B5563; background: #F3F4F6; border: 1px solid #E5E7EB; }
.src { color: #4B5563; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: 600; }
.act { width: 50px; text-align: center; }
.hmac { color: #6D28D9; background: #F5F3FF; border: 1px solid #DDD6FE; }
.mask { color: #0F766E; background: #ECFDF5; border: 1px solid #99F6E4; }
.redact { color: #B45309; background: #FFF7ED; border: 1px solid #FDBA74; }
.keep { color: #4B5563; background: #F3F4F6; border: 1px solid #D1D5DB; }
.ver { margin-top: auto; display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 5px; background: #ECFDF5; border: 1px solid #A7F3D0; color: #064E3B; font-weight: 700; font-size: 9.5px; }
.ver span { margin-left: auto; color: #fff; background: #16A34A; border-radius: 10px; padding: 1px 8px; font-size: 8px; }
.drawer { width: 230px; background: #fff; border-left: 1px solid #E5E7EB; padding: 11px; display: flex; flex-direction: column; gap: 8px; }
.dh { font-weight: 800; font-size: 11.5px; display: flex; align-items: center; gap: 6px; color: #111827; }
.dh svg { color: #1B51A4; }
.box { border: 1px solid #E5E7EB; border-radius: 6px; padding: 8px; background: #F9FAFB; }
.box small { display: block; font-size: 7.5px; color: #6B7280; letter-spacing: .05em; }
.box b { font-family: Consolas, 'Courier New', monospace; font-size: 11px; }
.chips { display: flex; gap: 4px; margin-top: 5px; }
.info { border: 1px solid #BFDBFE; background: #EFF6FF; color: #1E3A8A; border-radius: 6px; padding: 7px; font-size: 8.5px; line-height: 1.4; }
.law { border: 1px solid #BFDBFE; background: #F8FBFF; border-radius: 6px; padding: 7px; font-size: 8.5px; line-height: 1.4; color: #1E3A8A; }
.law b { display: block; margin-bottom: 2px; }
.lbl { font-size: 8.5px; font-weight: 700; color: #374151; }
.sel2 { border: 1px solid #D1D5DB; border-radius: 5px; padding: 5px 7px; font-size: 9.5px; display: flex; }
.sel2 span { margin-left: auto; color: #6B7280; }
.save { margin-top: auto; background: #1B51A4; color: #fff; text-align: center; font-weight: 700; border-radius: 5px; padding: 7px; font-size: 9.5px; }
.verified { position: absolute; right: 40px; top: 14px; z-index: 5; font-size: 12px; font-weight: 900; letter-spacing: .08em; color: #fff; background: #16A34A;
  border-radius: 999px; padding: 8px 15px; box-shadow: 0 0 22px rgba(74,222,128,.6); }

/* badges */
.badge { position: absolute; z-index: 5; display: flex; align-items: center; gap: 12px; padding: 12px 18px 12px 14px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(8,47,73,.82), rgba(4,20,40,.82)); border: 1.5px solid rgba(56,189,248,.75);
  box-shadow: 0 0 22px rgba(56,189,248,.45), inset 0 0 18px rgba(56,189,248,.18); }
.bi { color: #67E8F9; filter: drop-shadow(0 0 6px rgba(103,232,249,.8)); }
.bn { font-size: 30px; font-weight: 900; line-height: 1; letter-spacing: -.01em; text-shadow: 0 0 14px rgba(125,211,252,.6); }
.bt { font-size: 15px; font-weight: 800; color: #E0F2FE; margin-top: 2px; }
.bs { font-size: 11.5px; color: #7DD3FC; }
.b1 { left: 30px; top: 104px; }
.b2 { left: 44px; top: 214px; }
.b3 { left: 24px; top: 488px; border-color: rgba(251,191,36,.8); box-shadow: 0 0 22px rgba(251,191,36,.4), inset 0 0 18px rgba(251,191,36,.15); }
.b3 .bi { color: #FCD34D; filter: drop-shadow(0 0 6px rgba(252,211,77,.8)); }
.b3 .bs { color: #FDE68A; }
.pango { position: absolute; left: 150px; top: 238px; width: 360px; height: 360px; z-index: 4; filter: drop-shadow(0 22px 34px rgba(0,0,0,.6)) drop-shadow(0 0 30px rgba(37,99,235,.35)); }
.floor { position: absolute; left: 170px; top: 560px; width: 330px; height: 40px; border-radius: 50%; background: radial-gradient(closest-side, rgba(56,189,248,.45), transparent); z-index: 3; }

/* features */
.feats { position: absolute; left: 400px; right: 40px; bottom: 26px; z-index: 5; display: grid; grid-template-columns: repeat(3, 1fr);
  border-radius: 16px; background: linear-gradient(135deg, rgba(8,30,62,.88), rgba(5,15,35,.88)); border: 1.5px solid rgba(56,189,248,.6);
  box-shadow: 0 0 26px rgba(56,189,248,.35); }
.feat { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-left: 1px solid rgba(125,211,252,.22); }
.feat:first-child { border-left: 0; }
.fi { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; color: #67E8F9; border: 1.5px solid rgba(103,232,249,.6); box-shadow: inset 0 0 12px rgba(103,232,249,.25); flex: none; }
.ft { font-size: 16px; font-weight: 800; }
.fs { font-size: 12.5px; color: #93C5FD; margin-top: 2px; }
.note { position: absolute; left: 34px; bottom: 12px; font-size: 10.5px; color: #64748B; z-index: 5; }
</style></head><body><div class="stage">
<div class="grid"></div>
<div class="streak" style="left:300px;top:610px;width:520px"></div>
<div class="streak" style="left:820px;top:22px;width:380px;opacity:.6"></div>
<div class="brand"><div class="tile"><img src="img/logo.png" alt=""></div><div><b>PIIGuard Shield</b><span>Enterprise PII Governance · P-138</span></div></div>
<div class="monitor"><div class="bezel"><div class="screen">
  <div class="side">
    <div class="logo"><img src="img/logo.png" alt=""><div><b>PIIGuard Shield</b><span>Data Intelligence &amp; Governance</span></div></div>
    <div class="newa">+ New Action</div>
    <div class="sec">CATALOG &amp; WORKSPACES</div>
    <div class="nav on">DPO · Quét &amp; duyệt</div>
    <div class="nav">Runs &amp; datasets</div>
    <div class="sec">SECURITY &amp; COMPLIANCE</div>
    <div class="nav">Quy định NĐ 13</div>
    <div class="nav">Demo che mờ</div>
    <div class="nav">Audit Hash-Chain</div>
    <div class="who"><i>D</i><div><b>dpo</b><br><span style="color:#6B7280">DPO</span></div></div>
  </div>
  <div class="main">
    <div class="top"><div class="crumb">Northwind Production <span>› public › customers</span></div><div class="st">READY_TO_BUILD</div><div class="pub">Lưu &amp; build</div></div>
    <div class="tabs"><div class="on">Tổng quan &amp; phân loại</div><div>Rủi ro &amp; đánh giá</div><div>Nhật ký kiểm toán</div><div>Dữ liệu cho Analyst</div></div>
    <div class="body">
      <div class="tbl">
        <div class="grp">▾ customers</div>
        <div class="th"><div>Cột</div><div>Kiểu</div><div>Phân loại</div><div>Nguồn</div><div>Hành động</div></div>
        ${rows}
        <div class="ver">Verifier · join_matched customers → orders<span>PASS</span></div>
      </div>
      <div class="drawer">
        <div class="dh">${icon('shield', 14)}Chi tiết chính sách cột</div>
        <div class="box"><small>CỘT DỮ LIỆU</small><b>cccd</b><div class="chips"><span class="cls l2">L2 · Cơ bản</span><span class="src">Regex Pattern</span></div></div>
        <div class="info">Khóa nối với <b>orders.customer_cccd</b>. Hành động áp dụng cho mọi đầu nối để Analyst vẫn ghép bảng được.</div>
        <div class="law"><b>Căn cứ pháp lý</b>Luật 91/2025/QH15 · NĐ 356/2025/NĐ-CP: dữ liệu cá nhân cơ bản giúp nhận dạng cá nhân.</div>
        <div class="lbl">Hành động (đề xuất: Băm HMAC)</div>
        <div class="sel2">Băm HMAC<span>▾</span></div>
        <div class="save">Lưu &amp; Áp dụng thay đổi</div>
      </div>
    </div>
  </div>
</div></div><div class="glare"></div></div>
<div class="verified">VERIFIED → PUBLISHED</div>
${badges}
<div class="floor"></div>
<img class="pango" src="img/pango-scanning.png" alt="">
<div class="feats">${features}</div>
<div class="note">Số liệu báo cáo nghiệm thu P1</div>
</div></body></html>`;
}

// ---------------------------------------------------------------- HTML renderer
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rgba = (hex, transp = 0) => {
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${(100 - transp) / 100})`;
};
const paragraphs = (content) =>
  (Array.isArray(content) ? content : [content]).map((p) => (typeof p === 'string' ? [{ text: p }] : p.map((r) => (typeof r === 'string' ? { text: r } : r))));
const VALIGN = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };

function htmlEl(e) {
  const box = `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;`;
  if (e.t === 'rect') {
    const radius = e.r === 'full' ? '50%' : `${e.r || 0}px`;
    const border = e.line ? `border:${e.lineW || 1}px solid #${e.line};` : '';
    const fill = e.fill ? `background:${rgba(e.fill, e.transp)};` : '';
    const shadow = e.shadow ? 'box-shadow:0 4pt 12pt rgba(15,23,42,.12);' : '';
    return `<div class="el" style="${box}${fill}${border}border-radius:${radius};${shadow}"></div>`;
  }
  if (e.t === 'img') return `<img class="el" style="${box}" src="${e.src}" alt="${esc(e.alt || '')}">`;
  if (e.t === 'arrow') {
    const color = `#${e.color || C.flow}`;
    const pad = 8;
    const x = Math.min(e.x1, e.x2) - pad, y = Math.min(e.y1, e.y2) - pad;
    const w = Math.abs(e.x2 - e.x1) + 2 * pad, h = Math.abs(e.y2 - e.y1) + 2 * pad;
    const [x1, y1, x2, y2] = [e.x1 - x, e.y1 - y, e.x2 - x, e.y2 - y];
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const head = (dx, dy) => `${x2 - 9 * Math.cos(ang) + dx * Math.sin(ang)},${y2 - 9 * Math.sin(ang) - dx * Math.cos(ang) + dy}`;
    return `<svg class="el" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:visible" viewBox="0 0 ${w} ${h}">`
      + `<line x1="${x1}" y1="${y1}" x2="${x2 - 6 * Math.cos(ang)}" y2="${y2 - 6 * Math.sin(ang)}" stroke="${color}" stroke-width="${(e.weight || 2.25) * 4 / 3}"/>`
      + `<polygon points="${x2},${y2} ${head(5, 0)} ${head(-5, 0)}" fill="${color}"/></svg>`;
  }
  const paras = paragraphs(e.content).map((runs, i, all) => {
    const mb = i < all.length - 1 && e.para ? `margin-bottom:${e.para}pt;` : '';
    const spans = runs.map((r) => {
      const st = [
        r.b !== undefined ? `font-weight:${r.b ? 700 : 400}` : '',
        r.color ? `color:#${r.color}` : '',
        r.size ? `font-size:${r.size}pt` : '',
        r.i ? 'font-style:italic' : '',
      ].filter(Boolean).join(';');
      const inner = r.link ? `<a href="${esc(r.link)}">${esc(r.text)}</a>` : esc(r.text);
      return st ? `<span style="${st}">${inner}</span>` : inner;
    }).join('');
    return `<p style="${mb}">${spans}</p>`;
  }).join('');
  const st = [
    `justify-content:${VALIGN[e.valign || 'top']}`,
    `text-align:${e.align || 'left'}`,
    `font-size:${e.size || 16}pt`,
    `color:#${e.color || C.body}`,
    `font-weight:${e.bold ? 700 : 400}`,
    e.italic ? 'font-style:italic' : '',
    e.spacing ? `letter-spacing:${e.spacing}pt` : '',
    e.font ? `font-family:'${e.font}'` : '',
  ].filter(Boolean).join(';');
  return `<div class="el tx" style="${box}${st}">${paras}</div>`;
}

function htmlSlide(s, index) {
  const m = MASTERS[s.master];
  const els = [...m.objects];
  if (s.kicker) els.push(...kicker(s.kicker));
  els.push(text(m.title.x, m.title.y, m.title.w, m.title.h, s.title, { size: m.title.size, bold: true, color: m.title.color }));
  els.push(...s.els);
  if (m.number) els.push(text(m.number.x, m.number.y, m.number.w, m.number.h, String(index + 1), { size: m.number.size, color: m.number.color, align: 'right', valign: 'middle' }));
  return `<section class="slide">${els.map(htmlEl).join('')}</section>`;
}

const htmlDoc = (title, body) => `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
@page { size: 1280px 720px; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #${C.bg}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.slide { position: relative; width: 1280px; height: 720px; overflow: hidden; background: #${C.bg}; page-break-after: always; break-after: page; }
.slide:last-child { page-break-after: auto; break-after: auto; }
.el { position: absolute; }
.tx { display: flex; flex-direction: column; font-family: Arial, Helvetica, sans-serif; line-height: 1.17; }
.tx p { margin: 0; }
.tx a { color: inherit; text-decoration: none; }
</style></head><body>${body}</body></html>`;

// ---------------------------------------------------------------- PPTX renderer
const IN = (px) => +(px / 96).toFixed(4);
// pptxgenjs writes the local file path as alt text when none is given, so decorative images get this.
const DECOR = 'Nền gradient Brand DNA (trang trí)';

function pptxRuns(e) {
  const paras = paragraphs(e.content);
  const out = [];
  paras.forEach((runs, pi) => runs.forEach((r, ri) => {
    const o = {};
    if (r.b !== undefined) o.bold = r.b;
    if (r.color) o.color = r.color;
    if (r.size) o.fontSize = r.size;
    if (r.i) o.italic = true;
    if (r.link) o.hyperlink = { url: r.link };
    if (e.para && pi < paras.length - 1) o.paraSpaceAfter = e.para;
    if (ri === runs.length - 1 && pi < paras.length - 1) o.breakLine = true;
    out.push({ text: r.text, options: o });
  }));
  return out;
}

function textOptions(e) {
  return {
    x: IN(e.x), y: IN(e.y), w: IN(e.w), h: IN(e.h),
    fontFace: e.font || FONT, fontSize: e.size || 16, color: e.color || C.body, bold: !!e.bold, italic: !!e.italic,
    align: e.align || 'left', valign: e.valign || 'top', margin: 0, isTextBox: true,
    ...(e.spacing ? { charSpacing: e.spacing } : {}),
  };
}

function addPptxEl(pres, slide, e, name) {
  if (e.t === 'rect') {
    const shape = e.r === 'full' ? pres.shapes.OVAL : e.r ? pres.shapes.ROUNDED_RECTANGLE : pres.shapes.RECTANGLE;
    slide.addShape(shape, {
      x: IN(e.x), y: IN(e.y), w: IN(e.w), h: IN(e.h), objectName: name,
      fill: e.fill ? { color: e.fill, transparency: e.transp || 0 } : { type: 'none' },
      line: e.line ? { color: e.line, width: (e.lineW || 1) * 0.75 } : { type: 'none' },
      ...(e.r && e.r !== 'full' ? { rectRadius: IN(e.r) } : {}),
      ...(e.shadow ? { shadow: { type: 'outer', color: C.navy, opacity: 0.12, blur: 12, offset: 4, angle: 90 } } : {}),
    });
  } else if (e.t === 'img') {
    slide.addImage({ path: path.join(BUILD, e.src), x: IN(e.x), y: IN(e.y), w: IN(e.w), h: IN(e.h), objectName: name, altText: e.alt || DECOR });
  } else if (e.t === 'arrow') {
    slide.addShape(pres.shapes.LINE, {
      x: IN(Math.min(e.x1, e.x2)), y: IN(Math.min(e.y1, e.y2)), w: IN(Math.abs(e.x2 - e.x1)), h: IN(Math.abs(e.y2 - e.y1)),
      flipH: e.x2 < e.x1, flipV: e.y2 < e.y1, objectName: name,
      line: { color: e.color || C.flow, width: e.weight || 2.25, endArrowType: 'triangle' },
    });
  } else {
    slide.addText(pptxRuns(e), { ...textOptions(e), objectName: name });
  }
}

function masterObject(e) {
  if (e.t === 'img') return { image: { path: path.join(BUILD, e.src), x: IN(e.x), y: IN(e.y), w: IN(e.w), h: IN(e.h), altText: e.alt || DECOR } };
  if (e.t === 'text') return { text: { text: e.content, options: textOptions(e) } };
  throw new Error(`unsupported master object ${e.t}`);
}

async function patchTheme(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/theme\/theme\d+\.xml$/.test(n))) {
    let xml = await zip.file(name).async('string');
    for (const [k, v] of Object.entries(THEME.colors)) {
      xml = xml.replace(new RegExp(`<a:${k}>[\\s\\S]*?</a:${k}>`), `<a:${k}><a:srgbClr val="${v}"/></a:${k}>`);
    }
    xml = xml.replace(/<a:clrScheme name="[^"]*"/, `<a:clrScheme name="${THEME.name}"`);
    zip.file(name, xml);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

async function buildPptx(file) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'Team P-138';
  pres.company = 'VinUni AI20K Build Phase';
  pres.title = 'PIIGuard Shield — Demo Day';
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };

  for (const [name, m] of Object.entries(MASTERS)) {
    pres.defineSlideMaster({
      title: name,
      background: { color: C.bg },
      objects: [
        ...m.objects.map(masterObject),
        {
          placeholder: {
            options: {
              name: 'title', type: 'title', x: IN(m.title.x), y: IN(m.title.y), w: IN(m.title.w), h: IN(m.title.h),
              fontFace: FONT, fontSize: m.title.size, bold: true, color: m.title.color, align: 'left', valign: 'top', margin: 0,
            },
            text: '',
          },
        },
      ],
      ...(m.number ? {
        slideNumber: { x: IN(m.number.x), y: IN(m.number.y), w: IN(m.number.w), h: IN(m.number.h), fontFace: FONT, fontSize: m.number.size, color: m.number.color, align: 'right' },
      } : {}),
    });
  }

  let section = null;
  slides.forEach((s, i) => {
    if (s.section !== section) {
      pres.addSection({ title: s.section });
      section = s.section;
    }
    const slide = pres.addSlide({ masterName: s.master, sectionTitle: s.section });
    slide.addText(s.title, { placeholder: 'title' });
    const els = [...(s.kicker ? kicker(s.kicker) : []), ...s.els];
    els.forEach((e, j) => addPptxEl(pres, slide, e, `s${i + 1}-${e.t}-${j + 1}`));
    slide.addNotes(s.notes);
  });

  await pres.writeFile({ fileName: file });
  await patchTheme(file);
}

// ---------------------------------------------------------------- assets
async function prepareAssets() {
  fs.mkdirSync(path.join(BUILD, 'img'), { recursive: true });
  fs.mkdirSync(path.join(BUILD, 'gen'), { recursive: true });
  slides.forEach((s) => s.kicker && kicker(s.kicker)); // registers the kicker gradients
  const mascotDir = path.join(ROOT, 'assets', 'mascot');
  for (const f of fs.readdirSync(mascotDir).filter((n) => n.endsWith('.webp'))) {
    await sharp(path.join(mascotDir, f)).png().toFile(path.join(BUILD, 'img', f.replace('.webp', '.png')));
  }
  await sharp(path.join(ROOT, 'assets', 'brand', 'logo.webp')).png().toFile(path.join(BUILD, 'img', 'logo.png'));
  for (const [key, { w, h, r }] of gradients) {
    const stops = GRADIENT.map(([o, c]) => `<stop offset="${o}" stop-color="#${c}"/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${h * 2}" viewBox="0 0 ${w} ${h}">`
      + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs>`
      + `<rect width="${w}" height="${h}" rx="${r}" fill="url(#g)"/></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(BUILD, 'gen', key));
  }
  const qr = { width: 600, margin: 1, color: { dark: `#${C.navy}`, light: '#FFFFFF' }, errorCorrectionLevel: 'M' };
  await QRCode.toFile(path.join(BUILD, 'gen', 'qr-video.png'), LINKS.video, qr);
  await QRCode.toFile(path.join(BUILD, 'gen', 'qr-app.png'), LINKS.app, qr);
}

// ---------------------------------------------------------------- Chrome (PDF + PNG)
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Chrome/Edge not found; set CHROME_PATH.');
  return found;
}

function chrome(args, scale = 1) {
  execFileSync(findChrome(), ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--force-device-scale-factor=${scale}`,
    '--allow-file-access-from-files', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=3000', ...args], { stdio: 'ignore' });
}
const screenshot = (html, png, scale = 1) => chrome([`--screenshot=${png}`, '--window-size=1280,720', pathToFileURL(html).href], scale);

// ---------------------------------------------------------------- main
async function main() {
  await prepareAssets();
  await buildPptx(path.join(OUT, 'pitch_deck.pptx'));

  const deckHtml = path.join(BUILD, 'slides.html');
  fs.writeFileSync(deckHtml, htmlDoc('PIIGuard Shield — Demo Day', slides.map(htmlSlide).join('')));
  chrome(['--no-pdf-header-footer', `--print-to-pdf=${path.join(OUT, 'pitch_deck.pdf')}`, pathToFileURL(deckHtml).href]);

  const thumbHtml = path.join(BUILD, 'thumbnail.html');
  fs.writeFileSync(thumbHtml, thumbnailHtml());
  screenshot(thumbHtml, path.join(OUT, 'thumbnail.png'), 1.5); // 1920x1080

  if (QA) {
    fs.mkdirSync(path.join(BUILD, 'qa'), { recursive: true });
    slides.forEach((s, i) => {
      const n = String(i + 1).padStart(2, '0');
      const f = path.join(BUILD, `qa-slide-${n}.html`);
      fs.writeFileSync(f, htmlDoc(`Slide ${n}`, htmlSlide(s, i)));
      screenshot(f, path.join(BUILD, 'qa', `slide-${n}.png`));
    });
  }
  console.log('Built pitch_deck.pptx, pitch_deck.pdf, thumbnail.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
