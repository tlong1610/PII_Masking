// Builds the Demo Day pitch deck and the video thumbnail from ONE layout source, so the
// editable PPTX and the PDF/PNG renders stay identical.
//
//   cd presentation/source && npm install && npm run build      # or: node build_deck.js --qa
//
// Outputs: ../pitch_deck.pptx, ../pitch_deck.pdf, ../thumbnail.png (1280x720).
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

// ---------------------------------------------------------------- thumbnail (1280x720, HTML only)
const thumbnail = [
  rect(0, 0, 1280, 720, { fill: C.bg }),
  grad(32, 32, 780, 656, 32),
  rect(80, 84, 76, 76, { fill: C.white, r: 18 }),
  img(88, 92, 60, 60, 'img/logo.png', { alt: 'Logo PIIGuard Shield' }),
  text(176, 84, 600, 76, [[{ text: 'DEMO DAY · DATA-06 · TEAM P-138', b: true }], [{ text: 'VinUni AI20K Build Phase · Cohort 4', color: C.onDark }]],
    { size: 15, color: C.white, valign: 'middle', para: 4, spacing: 1 }),
  text(80, 206, 720, 100, 'PIIGuard Shield', { size: 64, bold: true, color: C.white }),
  text(80, 306, 720, 50, 'Protect data. Preserve utility.', { size: 30, color: C.white }),
  text(80, 366, 700, 50, 'Che dữ liệu cá nhân — vẫn JOIN được.', { size: 24, bold: true, color: C.onDark }),
  ...['Scan', 'DPO Review', 'Verify', 'Publish'].flatMap((t, i, arr) => {
    const widths = [104, 170, 118, 128];
    const x = 80 + widths.slice(0, i).reduce((a, b) => a + b + 34, 0);
    const out = pill(x, 470, widths[i], 46, t, { fill: C.white, line: C.white, transp: 82, color: C.white, size: 17 });
    if (i < arr.length - 1) out.push(arrow(x + widths[i] + 6, 493, x + widths[i] + 28, 493, { color: C.onDark }));
    return out;
  }),
  text(80, 574, 700, 70, 'PostgreSQL · MongoDB · Luật 91/2025 · NĐ 356/2025', { size: 17, color: C.onDark, valign: 'middle' }),
  rect(866, 120, 360, 360, { fill: C.softFill, r: 'full' }),
  mascot('protected', 836, 90, 420),
  ...pill(906, 548, 280, 58, 'VERIFIED ✓', { fill: C.verified, line: C.verified, color: C.white, size: 24 }),
];

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

function chrome(args) {
  execFileSync(findChrome(), ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--allow-file-access-from-files', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=3000', ...args], { stdio: 'ignore' });
}
const screenshot = (html, png) => chrome([`--screenshot=${png}`, '--window-size=1280,720', pathToFileURL(html).href]);

// ---------------------------------------------------------------- main
async function main() {
  await prepareAssets();
  await buildPptx(path.join(OUT, 'pitch_deck.pptx'));

  const deckHtml = path.join(BUILD, 'slides.html');
  fs.writeFileSync(deckHtml, htmlDoc('PIIGuard Shield — Demo Day', slides.map(htmlSlide).join('')));
  chrome(['--no-pdf-header-footer', `--print-to-pdf=${path.join(OUT, 'pitch_deck.pdf')}`, pathToFileURL(deckHtml).href]);

  const thumbHtml = path.join(BUILD, 'thumbnail.html');
  fs.writeFileSync(thumbHtml, htmlDoc('PIIGuard Shield — Thumbnail', `<section class="slide">${thumbnail.map(htmlEl).join('')}</section>`));
  screenshot(thumbHtml, path.join(OUT, 'thumbnail.png'));

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
