// Builds the pitch deck and the video thumbnail from ONE layout source, so the
// editable PPTX and the PDF/PNG renders stay identical.
//
//   cd presentation/source && npm install && npm run build      # or: node build_deck.js --qa
//
// Outputs: ../pitch_deck.pptx, ../pitch_deck.pdf, ../thumbnail.png (1920x1080).
// Intermediate HTML, PNG assets and QA renders go to ./build/ (gitignored).
// Layout unit is the pixel of a 1280x720 canvas (96 px = 1 inch = LAYOUT_WIDE in PowerPoint).
// Colors follow the app theme (front_end/src/app/theme/theme.ts) and the login background
// (assets/svg/login-background.svg). Never put raw PII or secrets on a slide.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');

const JSZip = require(require.resolve('jszip', { paths: [require.resolve('pptxgenjs')] }));

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(__dirname, '..');
const BUILD = path.join(__dirname, 'build');
const QA = process.argv.includes('--qa');

// ---------------------------------------------------------------- app design tokens
const C = {
  ink: '111827', body: '374151', muted: '6B7280', border: 'E5E7EB', bg: 'F5F8FC', white: 'FFFFFF', code: 'F9FAFB',
  primary: '1B51A4', primaryLight: 'EBF3FB', primaryLine: 'BFD4F0', primaryDark: '123A75',
  navy: '0F2F63', navyDeep: '081733', onDark: 'BFDBFE', onDarkMuted: '93C5FD', sky: '7DD3FC',
  info: '2563EB', infoLight: 'EFF6FF', infoLine: 'BFDBFE',
  accent: '7C3AED', accentLight: 'F5F3FF', accentLine: 'DDD6FE',
  success: '16A34A', successLight: 'ECFDF5', successLine: 'A7F3D0',
  warning: 'D97706', warningLight: 'FFFBEB', warningLine: 'FCD34D',
  error: 'DC2626', errorLight: 'FEF2F2', errorLine: 'FECACA',
};
// [main, light fill, border] per tone; action tones match policyLabels.ts (MASK warning, REDACT info, HMAC accent, DROP error).
const TONE = {
  primary: [C.primary, C.primaryLight, C.primaryLine],
  info: [C.info, C.infoLight, C.infoLine],
  accent: [C.accent, C.accentLight, C.accentLine],
  success: [C.success, C.successLight, C.successLine],
  warning: [C.warning, C.warningLight, C.warningLine],
  error: [C.error, C.errorLight, C.errorLine],
};
const PANEL = [['0%', C.navyDeep], ['55%', C.navy], ['100%', C.primary]];
const FONT = 'Arial';
const THEME = {
  name: 'PIIGuard Shield',
  colors: {
    dk1: C.ink, lt1: C.white, dk2: C.navy, lt2: C.bg,
    accent1: C.primary, accent2: C.info, accent3: C.accent, accent4: C.success, accent5: C.warning, accent6: C.error,
    hlink: C.primary, folHlink: C.muted,
  },
};

// Stroke icons (24x24, lucide style), rendered to PNG for the deck and inlined in the thumbnail.
const ICONS = {
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
  chain: '<path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1"/><path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1"/>',
  user: '<circle cx="10" cy="8" r="4"/><path d="M3 20a7 7 0 0 1 12-5"/><path d="m15 18 2 2 4-4"/>',
  shield: '<path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  gavel: '<path d="m14.5 12.5-8 8a2.1 2.1 0 1 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>',
  unlink: '<path d="m18.8 12.3 1.8-1.8a5 5 0 0 0-7.1-7.1l-1.7 1.8"/><path d="m5.2 11.7-1.7 1.8a5 5 0 0 0 7.1 7.1l1.7-1.8"/><path d="M8 2v3M2 8h3M16 22v-3M22 16h-3"/>',
  fileq: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 12a2 2 0 1 1 2.5 1.9c-.3.1-.5.4-.5.7V15"/><path d="M12 18h.01"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  server: '<rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  flask: '<path d="M9 3h6"/><path d="M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
  code: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
  git: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M6 8.5v7"/><path d="M18 10.5c0 4-6 3-11 6"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0"/><path d="M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  plus: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>',
  bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
};

// ---------------------------------------------------------------- layout primitives
const rect = (x, y, w, h, o = {}) => ({ t: 'rect', x, y, w, h, ...o });
const text = (x, y, w, h, content, o = {}) => ({ t: 'text', x, y, w, h, content, ...o });
const img = (x, y, w, h, src, o = {}) => ({ t: 'img', x, y, w, h, src, ...o });
const hl = (t, color = C.primary) => ({ text: t, color });

const gradients = new Map();
function grad(x, y, w, h, r) {
  const key = `grad-${w}x${h}-r${r}.png`;
  gradients.set(key, { w, h, r });
  return img(x, y, w, h, `gen/${key}`, { alt: '' });
}
const icons = new Map();
function ico(x, y, d, name, color) {
  const key = `ic-${name}-${color}.png`;
  icons.set(key, { name, color });
  return img(x, y, d, d, `gen/${key}`, { alt: '' });
}
const iconChip = (x, y, d, name, tone, o = {}) => {
  const [main, light, line] = TONE[tone];
  return [
    rect(x, y, d, d, { fill: o.fill ?? light, line: o.line ?? line, lineW: 1, r: Math.round(d * 0.28) }),
    ico(x + d * 0.22, y + d * 0.22, d * 0.56, name, o.color ?? main),
  ];
};
const chevron = (x, y, d = 28) => ico(x, y, d, 'chevron', C.primaryLine);
const card = (x, y, w, h, o = {}) =>
  rect(x, y, w, h, { fill: C.white, line: C.border, lineW: 1, r: 14, shadow: true, ...o });
const pill = (x, y, w, h, label, o = {}) => [
  rect(x, y, w, h, { fill: o.fill ?? C.primaryLight, line: o.line ?? C.primaryLine, lineW: 1, r: h / 2, transp: o.transp }),
  text(x, y, w, h, label, { size: o.size ?? 12, bold: o.bold ?? true, color: o.color ?? C.primary, align: 'center', valign: 'middle' }),
];
const actionPill = (x, y, w, h, label, tone, size = 12) =>
  pill(x, y, w, h, label, { fill: TONE[tone][0], line: TONE[tone][0], color: C.white, size });
const mascot = (pose, x, y, d) =>
  img(x, y, d, d, `img/pango-${pose}.png`, { alt: `Mascot Pango (${pose})` });
const panel = (x, y, w, h, r = 18) => grad(x, y, w, h, r);

// ---------------------------------------------------------------- slide layouts (masters)
const MASTERS = {
  CONTENT: {
    objects: [
      img(0, 0, 1280, 720, 'gen/bg-light.png', { alt: '' }),
      img(1068, 30, 22, 22, 'img/logo.png'),
      text(1096, 30, 128, 22, 'PIIGuard Shield', { size: 12, bold: true, color: C.navy, valign: 'middle' }),
    ],
    title: { x: 56, y: 62, w: 1168, h: 50, size: 30, color: C.ink },
  },
  COVER: {
    objects: [img(0, 0, 1280, 720, 'gen/bg-dark.png', { alt: '' })],
    title: { x: 184, y: 206, w: 600, h: 80, size: 58, color: C.white },
  },
};

// "02 | Vấn đề" in the top-left corner of every content slide; the number follows slide order.
const header = (n, label) => text(56, 30, 700, 22, [[
  { text: String(n).padStart(2, '0'), b: true, color: C.primary },
  { text: '  |  ', color: 'CBD5E1' },
  { text: label, color: C.muted },
]], { size: 12, bold: true, valign: 'middle' });

// ---------------------------------------------------------------- slides
const slides = [];

// 1 — Title
slides.push({
  master: 'COVER', title: 'PIIGuard Shield',
  els: [
    ...pill(88, 128, 440, 34, 'Bảo vệ dữ liệu cá nhân theo Luật 91/2025/QH15', { fill: C.white, line: C.white, transp: 86, color: C.white, size: 13 }),
    rect(88, 206, 76, 76, { fill: C.white, r: 18 }),
    img(98, 216, 56, 56, 'img/logo.png', { alt: 'Logo PIIGuard Shield' }),
    text(88, 300, 660, 72, [[{ text: 'Bảo vệ dữ liệu cá nhân, ' }, hl('giữ nguyên giá trị phân tích', C.sky)]], { size: 25, bold: true, color: C.white }),
    text(88, 392, 600, 84,
      'Giúp DPO rà soát dữ liệu cá nhân trong PostgreSQL và MongoDB, duyệt cách bảo vệ từng trường và phát hành bản sao an toàn cho Analyst.',
      { size: 17, color: C.onDark }),
    ...[['MASK', 'warning'], ['REDACT', 'info'], ['HMAC', 'accent'], ['DROP', 'error']]
      .flatMap(([a, tone], i) => actionPill(88 + i * 106, 490, 96, 32, a, tone, 13)),
    rect(88, 556, 360, 76, { fill: C.white, r: 16, transp: 88 }),
    ...iconChip(106, 572, 44, 'users', 'primary', { fill: C.white, line: C.white }),
    text(166, 568, 270, 52, [
      [{ text: 'Team P-138', b: true, size: 17 }],
      [{ text: 'Phúc · Tùng · Kiên · Long', color: C.onDark }],
    ], { size: 14, color: C.white, valign: 'middle', para: 2 }),
    rect(810, 140, 400, 400, { fill: C.white, r: 'full', transp: 90 }),
    mascot('protected', 790, 120, 440),
    card(900, 540, 300, 84, { r: 16 }),
    ...iconChip(918, 560, 44, 'check', 'success'),
    text(976, 556, 214, 52, [
      [{ text: 'Verifier PASS', b: true, color: C.ink, size: 16 }],
      [{ text: 'Sẵn sàng cho Analyst' }],
    ], { size: 13, color: C.muted, valign: 'middle', para: 2 }),
  ],
  notes: 'PIIGuard Shield là cổng bảo mật giữa database gốc và Analyst: phát hiện dữ liệu cá nhân, DPO duyệt cách bảo vệ từng trường (MASK, REDACT, HMAC, DROP), kiểm chứng rồi mới phát hành. Team P-138: Phúc, Tùng, Kiên, Long.',
});

// 2 — Problem: the legal frame tightened in 2026
const laws = [
  ['Hiệu lực 01/01/2026', 'primary', 'Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15', 'Luật riêng đầu tiên về dữ liệu cá nhân; cấm mua bán, cố ý làm lộ dữ liệu (Điều 7).'],
  ['Hiệu lực 01/01/2026', 'primary', 'Nghị định 356/2025/NĐ-CP', 'Hướng dẫn thi hành Luật: danh mục dữ liệu cơ bản và nhạy cảm (Điều 3–4), thay NĐ 13/2023.'],
  ['Ký 19/08/2026', 'error', 'Nghị định 330/2026/NĐ-CP', 'Xử phạt hành chính về an ninh mạng và bảo vệ dữ liệu cá nhân: chế tài cho từng hành vi.'],
];
const fines = [
  ['5%', 'doanh thu năm trước: vi phạm chuyển dữ liệu cá nhân xuyên biên giới'],
  ['10×', 'khoản thu có được: mua bán dữ liệu cá nhân'],
  ['3 tỷ đ', 'các vi phạm khác về bảo vệ dữ liệu cá nhân'],
];
const pains = [
  ['scan', 'error', 'Bỏ sót dữ liệu cá nhân', 'PII rải rác trong hàng trăm cột, văn bản tự do và document MongoDB lồng nhau.'],
  ['unlink', 'warning', 'Che sai làm hỏng JOIN', 'Khóa nối bị che không nhất quán, Analyst mất liên kết giữa các bảng.'],
  ['fileq', 'primary', 'Thiếu căn cứ, bằng chứng', 'Khó chứng minh ai duyệt, theo điều luật nào, đã kiểm tra tác động chưa.'],
];
slides.push({
  master: 'CONTENT', label: 'Vấn đề',
  title: ['Luật đã có ', hl('chế tài', C.error), ', DPO vẫn rà dữ liệu bằng tay'],
  els: [
    card(56, 128, 652, 372),
    ...iconChip(80, 148, 36, 'gavel', 'primary'),
    text(128, 148, 560, 36, 'Khung pháp lý mới về dữ liệu cá nhân', { size: 17, bold: true, color: C.ink, valign: 'middle' }),
    ...laws.flatMap(([when, tone, name, desc], i) => {
      const y = 206 + i * 96;
      const out = [
        ...pill(80, y + 2, 150, 28, when, { fill: TONE[tone][1], line: TONE[tone][2], color: TONE[tone][0], size: 11 }),
        text(246, y, 440, 26, name, { size: 16, bold: true, color: C.ink, valign: 'middle' }),
        text(246, y + 30, 440, 50, desc, { size: 13.5 }),
      ];
      if (i < laws.length - 1) out.push(rect(80, y + 86, 604, 1, { fill: C.border }));
      return out;
    }),
    panel(728, 128, 496, 372, 16),
    text(756, 150, 440, 20, 'MỨC PHẠT TIỀN TỐI ĐA · ĐIỀU 8 LUẬT 91/2025', { size: 11, bold: true, color: C.onDarkMuted, spacing: 1 }),
    ...fines.flatMap(([n, desc], i) => {
      const y = 184 + i * 90;
      const out = [
        text(756, y, 168, 80, n, { size: 36, bold: true, color: C.white, valign: 'middle' }),
        text(932, y, 268, 80, desc, { size: 14, color: C.onDark, valign: 'middle' }),
      ];
      if (i < fines.length - 1) out.push(rect(756, y + 84, 440, 1, { fill: C.white, transp: 80 }));
      return out;
    }),
    text(756, 460, 440, 24, 'Áp dụng cho tổ chức; cá nhân tối đa bằng một nửa.', { size: 12, color: C.onDarkMuted, valign: 'middle' }),
    ...pains.flatMap(([icon, tone, t, b], i) => {
      const x = 56 + i * 396;
      return [
        card(x, 520, 376, 124),
        ...iconChip(x + 20, 540, 40, icon, tone),
        text(x + 74, 536, 284, 26, t, { size: 16, bold: true, color: C.ink, valign: 'middle' }),
        text(x + 74, 564, 284, 64, b, { size: 13 }),
      ];
    }),
    text(56, 656, 1168, 20, 'Nguồn: Luật 91/2025/QH15 (Điều 7, 8), NĐ 356/2025/NĐ-CP, NĐ 330/2026/NĐ-CP. Bản gốc trong docs/legal/.', { size: 10.5, color: C.muted, valign: 'middle' }),
  ],
  notes: 'Từ 01/01/2026, Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP có hiệu lực, thay Nghị định 13/2023. Ngày 19/08/2026 Chính phủ ký Nghị định 330/2026/NĐ-CP về xử phạt hành chính trong lĩnh vực an ninh mạng và bảo vệ dữ liệu cá nhân. Theo Điều 8 Luật 91, mức phạt tối đa với tổ chức: 5% doanh thu năm trước khi vi phạm chuyển dữ liệu xuyên biên giới, 10 lần khoản thu khi mua bán dữ liệu, 3 tỷ đồng với các vi phạm khác; cá nhân bằng một nửa. Trong khi đó DPO vẫn rà từng trường bằng tay: dễ bỏ sót PII, che sai làm hỏng JOIN, và thiếu bằng chứng ai duyệt, theo căn cứ nào.',
});

// 3 — Solution
const methods = [
  ['MASK', 'warning', 'Che dữ liệu', '0912 *** 789', 'Che định danh trực tiếp; chỉ còn nhận biết được dạng dữ liệu.'],
  ['REDACT', 'info', 'Che thực thể (NER)', 'Gọi [PHONE] lúc 9h', 'Văn bản tự do vẫn đọc được; tên, SĐT, email được thay bằng nhãn.'],
  ['HMAC', 'accent', 'Băm HMAC', 'c7f3e1…9a21', 'Mã thay thế cố định: vẫn ghép bảng, đếm khách; không giải ngược.'],
  ['DROP', 'error', 'Loại bỏ', '(cột bị loại)', 'Trường rủi ro hoặc không cần cho phân tích; Analyst không nhận cột.'],
];
slides.push({
  master: 'CONTENT', label: 'Giải pháp',
  title: ['Cổng bảo mật giữa ', hl('database gốc'), ' và Analyst'],
  els: [
    card(56, 128, 324, 190),
    ...iconChip(80, 150, 44, 'database', 'warning'),
    text(80, 206, 280, 30, 'Database gốc', { size: 20, bold: true, color: C.ink }),
    text(80, 242, 280, 60, [['PostgreSQL · MongoDB'], ['Chỉ đọc, không ghi ngược']], { size: 14, para: 3 }),
    chevron(390, 209),
    panel(428, 128, 424, 190, 18),
    mascot('protected', 438, 136, 174),
    text(616, 146, 220, 154, [
      [{ text: 'PIIGuard Shield', b: true, size: 20, color: C.white }],
      ['Quét → DPO duyệt'],
      ['Build → Kiểm chứng'],
      ['→ Publish'],
    ], { size: 14, color: C.onDark, valign: 'middle', para: 4 }),
    chevron(862, 209),
    card(900, 128, 324, 190),
    ...iconChip(924, 150, 44, 'shield', 'success'),
    text(924, 206, 280, 30, 'Dataset đã bảo vệ', { size: 20, bold: true, color: C.ink }),
    text(924, 242, 280, 60, [['Bản sao riêng, đã kiểm chứng'], ['Analyst chỉ thấy bản PUBLISHED']], { size: 14, para: 3 }),
    text(56, 340, 1168, 28, [[hl('4 cách bảo vệ'), { text: ', DPO chọn cho từng trường dữ liệu' }]], { size: 18, bold: true, color: C.ink, valign: 'middle' }),
    ...methods.flatMap(([a, tone, name, ex, use], i) => {
      const x = 56 + i * 296;
      return [
        card(x, 380, 280, 254),
        ...actionPill(x + 20, 400, 92, 28, a, tone),
        text(x + 20, 440, 240, 28, name, { size: 18, bold: true, color: C.ink, valign: 'middle' }),
        rect(x + 20, 478, 240, 40, { fill: C.code, line: C.border, lineW: 1, r: 8 }),
        text(x + 32, 478, 216, 40, ex, { size: 14, bold: true, color: TONE[tone][0], valign: 'middle', font: 'Courier New' }),
        text(x + 20, 530, 240, 90, use, { size: 14 }),
      ];
    }),
    text(56, 648, 1168, 20, 'Dữ liệu không phải dữ liệu cá nhân được giữ nguyên (KEEP). Ví dụ trên là dữ liệu tổng hợp.', { size: 11, color: C.muted, valign: 'middle' }),
  ],
  notes: 'PIIGuard đứng giữa database gốc và Analyst. Nguồn chỉ đọc; đầu ra là một bản sao riêng đã được bảo vệ và kiểm chứng, Analyst chỉ thấy bản đã PUBLISHED. DPO chọn một trong 4 cách bảo vệ cho từng trường: MASK che một phần, REDACT thay thực thể PII trong văn bản tự do bằng nhãn như [PHONE], HMAC tạo mã thay thế cố định để vẫn ghép bảng được, DROP loại cột. Dữ liệu không phải dữ liệu cá nhân thì giữ nguyên (KEEP).',
});

// 4 — Product flow
const steps = [
  ['Kết nối nguồn', 'chỉ đọc'], ['Chọn phạm vi', 'bảng · collection'], ['Quét PII', 'rules + AI'],
  ['DPO duyệt', 'có căn cứ pháp lý'], ['Build', 'bản sao riêng'], ['Kiểm chứng', 'thử nối bảng (JOIN)'], ['Publish', 'Analyst sử dụng'],
];
const GATES = [3, 5];
const moments = [
  ['scanning', 'Quét & đề xuất', 'Rules làm nền, AI hỗ trợ trường mơ hồ. Mỗi trường có phân loại, căn cứ pháp lý và hành động đề xuất.'],
  ['awaiting', 'DPO duyệt trên 4 tab', 'Tổng quan & phân loại PII · Rủi ro & đánh giá · Nhật ký hoạt động · Dữ liệu cho Analyst. Ghi đè đề xuất của AI bắt buộc ghi lý do.'],
  ['protected', 'Có PASS mới Publish', 'Bản sao được chạy thử phép nối bảng trên cả PostgreSQL và MongoDB. Analyst chỉ thấy dataset đã PUBLISHED.'],
];
const COL = 1168 / 7;
slides.push({
  master: 'CONTENT', label: 'Sản phẩm',
  title: ['7 bước từ kết nối đến phát hành, ', hl('có người duyệt')],
  els: [
    rect(56 + COL / 2, 150, COL * 6, 3, { fill: C.primaryLine }),
    ...steps.flatMap(([t, s], i) => {
      const cx = Math.round(56 + COL * (i + 0.5));
      const gate = GATES.includes(i);
      const out = [
        rect(cx - 22, 130, 44, 44, { fill: gate ? C.primary : C.white, line: C.primary, lineW: 2, r: 'full' }),
        text(cx - 22, 130, 44, 44, String(i + 1), { size: 16, bold: true, color: gate ? C.white : C.primary, align: 'center', valign: 'middle' }),
        text(cx - 80, 184, 160, 22, t, { size: 15, bold: true, color: C.ink, align: 'center', valign: 'middle' }),
        text(cx - 80, 208, 160, 22, s, { size: 12, color: C.muted, align: 'center', valign: 'middle' }),
      ];
      if (gate) out.push(...pill(cx - 58, 236, 116, 22, 'Cổng kiểm soát', { size: 10 }));
      return out;
    }),
    ...moments.flatMap(([pose, t, b], i) => {
      const x = 56 + i * 396;
      return [
        card(x, 280, 376, 364),
        mascot(pose, x + 103, 292, 170),
        text(x + 26, 474, 324, 28, t, { size: 18, bold: true, color: C.ink, valign: 'middle' }),
        text(x + 26, 510, 324, 124, b, { size: 15 }),
      ];
    }),
  ],
  notes: 'Luồng 7 bước: kết nối nguồn ở chế độ chỉ đọc, chọn bảng/collection cần quét, quét PII bằng rules và AI, DPO duyệt, build bản sao riêng, kiểm chứng bằng cách chạy thử phép nối bảng (JOIN trên PostgreSQL, $lookup là phép nối tương đương trên MongoDB), rồi publish cho Analyst. Bước 4 (DPO duyệt) và bước 6 (Kiểm chứng) là hai cổng kiểm soát: backend chặn publish nếu chưa qua.',
});

// 5 — Architecture, explained by what each layer guarantees
const dataLane = [
  ['database', 'warning', 'Database gốc', 'PostgreSQL · MongoDB, chỉ đọc'],
  ['cpu', 'primary', 'Bộ xử lý', 'Quét PII, che theo quyết định của DPO'],
  ['copy', 'primary', 'Bản sao đã bảo vệ', 'Schema / DB riêng, tạo lại mỗi lần build'],
  ['check', 'success', 'Kiểm chứng', 'Thử nối bảng; chưa PASS thì chặn'],
  ['users', 'info', 'Analyst', 'Chỉ xem dataset đã PUBLISHED'],
];
const controlLane = [
  ['monitor', 'Giao diện web', 'React · Vercel. DPO và Analyst làm việc trên trình duyệt'],
  ['server', 'Máy chủ API', 'FastAPI · Render. Kiểm tra đăng nhập, vai trò, trạng thái'],
  ['chain', 'Nhật ký hoạt động', 'Mọi thao tác ghi thành chuỗi hash SHA-256'],
];
const layers = [
  ['lock', 'warning', 'Lớp 1 · Chỉ đọc nguồn', 'Hệ thống không ghi vào database gốc, nên vận hành của doanh nghiệp không bị ảnh hưởng.'],
  ['copy', 'primary', 'Lớp 2 · Che trên bản sao riêng', 'Mỗi lần build tạo lại bản sao mới. Cấu hình sai thì sửa và build lại, dữ liệu gốc vẫn nguyên.'],
  ['check', 'success', 'Lớp 3 · Kiểm chứng trước khi chia sẻ', 'Che xong phải chứng minh các bảng vẫn nối được. Chưa PASS thì backend chặn Publish.'],
];
slides.push({
  master: 'CONTENT', label: 'Kiến trúc',
  title: ['Dữ liệu đi qua ', hl('3 lớp kiểm soát'), ' trước khi tới Analyst'],
  els: [
    text(56, 122, 600, 18, 'ĐƯỜNG DỮ LIỆU', { size: 11, bold: true, color: C.muted, spacing: 1 }),
    ...dataLane.flatMap(([icon, tone, t, s], i) => {
      const x = 56 + i * 242;
      const out = [
        card(x, 146, 200, 104, { r: 12 }),
        ...iconChip(x + 14, 160, 34, icon, tone),
        text(x + 56, 158, 136, 40, t, { size: 14.5, bold: true, color: C.ink, valign: 'middle' }),
        text(x + 14, 204, 176, 38, s, { size: 12, color: C.muted }),
      ];
      if (i < dataLane.length - 1) out.push(chevron(x + 207, 184));
      return out;
    }),
    text(56, 270, 600, 18, 'ĐƯỜNG ĐIỀU KHIỂN', { size: 11, bold: true, color: C.muted, spacing: 1 }),
    ...controlLane.flatMap(([icon, t, s], i) => {
      const x = 56 + i * 403;
      const out = [
        card(x, 294, 362, 82, { r: 12 }),
        ...iconChip(x + 16, 314, 42, icon, 'primary'),
        text(x + 72, 304, 276, 24, t, { size: 15, bold: true, color: C.ink, valign: 'middle' }),
        text(x + 72, 330, 276, 38, s, { size: 12, color: C.muted }),
      ];
      if (i < controlLane.length - 1) out.push(chevron(x + 368, 321));
      return out;
    }),
    text(56, 400, 600, 18, 'VÌ SAO THIẾT KẾ NHƯ VẬY?', { size: 11, bold: true, color: C.muted, spacing: 1 }),
    ...layers.flatMap(([icon, tone, t, b], i) => {
      const x = 56 + i * 396;
      return [
        card(x, 424, 376, 184),
        ...iconChip(x + 20, 442, 44, icon, tone),
        text(x + 78, 438, 282, 52, t, { size: 16, bold: true, color: C.ink, valign: 'middle' }),
        text(x + 20, 502, 336, 96, b, { size: 14 }),
      ];
    }),
    text(56, 626, 1168, 22, [[
      { text: 'Công nghệ: ', b: true, color: C.body },
      { text: 'React · TypeScript · MUI   ·   Python 3.11 · FastAPI · LangGraph   ·   PostgreSQL · MongoDB   ·   Docker · GitHub Actions' },
    ]], { size: 12, color: C.muted, valign: 'middle' }),
  ],
  notes: 'Đọc theo hai đường. Đường dữ liệu: database gốc chỉ được đọc; bộ xử lý quét PII và áp dụng quyết định của DPO; kết quả ghi vào một bản sao riêng (schema hoặc database khác), tạo lại mỗi lần build; bước kiểm chứng chạy thử phép nối bảng trên bản sao; Analyst chỉ xem dataset đã publish. Đường điều khiển: giao diện web gọi máy chủ API, API kiểm tra đăng nhập, vai trò và trạng thái từng bước, mọi thao tác được ghi vào nhật ký dạng chuỗi hash. Ba lớp kiểm soát: chỉ đọc nguồn, che trên bản sao riêng, kiểm chứng trước khi chia sẻ.',
});

// 6 — AI approach
const funnel = [
  ['Tầng 1 · Regex / rules + taxonomy Luật 91', C.navy, 640],
  ['Tầng 2 · BM25 tri thức phân loại', C.primaryDark, 584],
  ['Tầng 3 · Hybrid vector (ChromaDB)', C.primary, 528],
  ['LLM · chỉ vùng xám · metadata / thống kê', C.accent, 472],
  ['Đề xuất → DPO duyệt (HITL)', C.success, 416],
];
const stats = [
  ['100%', 'Action accuracy', 'Luồng A · 339 cột CSDL (trước HITL: 85.25%)'],
  ['97.86%', 'Recall', 'Luồng B · văn bản tự do, cascade NER'],
  ['97.51%', 'F1', 'Luồng B · Precision 97.16%'],
];
slides.push({
  master: 'CONTENT', label: 'AI / LLM',
  title: ['AI ', hl('đề xuất'), ', DPO ', hl('quyết định', C.success)],
  els: [
    text(56, 116, 1100, 24, 'LLM chỉ nhận metadata và thống kê đã lọc, không bao giờ nhận giá trị mẫu thô.', { size: 15, color: C.muted, valign: 'middle' }),
    ...funnel.flatMap(([t, fill, w], i) => {
      const x = 56 + (640 - w) / 2;
      const y = 156 + i * 60;
      return [
        rect(x, y, w, 50, { fill, r: 12 }),
        text(x, y, w, 50, t, { size: 15, bold: true, color: C.white, align: 'center', valign: 'middle' }),
      ];
    }),
    rect(56, 470, 640, 166, { fill: C.accentLight, line: C.accentLine, lineW: 1, r: 16 }),
    ...iconChip(78, 492, 44, 'sparkles', 'accent', { fill: C.white }),
    text(136, 492, 540, 44, 'HITL few-shot memory', { size: 17, bold: true, color: C.ink, valign: 'middle' }),
    text(78, 548, 600, 76, 'Mỗi lần DPO ghi đè đề xuất, quyết định đó thành ví dụ cho lần quét sau. Tắt AI hoặc LLM lỗi: rules vẫn chạy độc lập.', { size: 14.5 }),
    panel(728, 156, 496, 480, 18),
    text(756, 178, 440, 20, 'KẾT QUẢ ĐÁNH GIÁ · SAU HITL', { size: 11, bold: true, color: C.onDarkMuted, spacing: 1 }),
    ...stats.flatMap(([n, t, s], i) => {
      const y = 212 + i * 124;
      const out = [
        text(756, y, 200, 100, n, { size: 40, bold: true, color: C.white, valign: 'middle' }),
        text(964, y + 18, 236, 26, t, { size: 16, bold: true, color: C.white, valign: 'middle' }),
        text(964, y + 46, 236, 44, s, { size: 13, color: C.onDark }),
      ];
      if (i < stats.length - 1) out.push(rect(756, y + 112, 440, 1, { fill: C.white, transp: 80 }));
      return out;
    }),
    text(756, 596, 440, 22, 'Nguồn: performance/sau_HITL/ · dữ liệu tổng hợp', { size: 11, color: C.onDarkMuted, valign: 'middle' }),
  ],
  notes: 'Phễu phát hiện nhiều tầng trong LangGraph: regex và rules theo taxonomy Luật 91, BM25, hybrid vector, và chỉ gửi LLM phần vùng xám, chỉ với metadata và thống kê. AI chỉ đề xuất; DPO quyết định, và mỗi lần ghi đè trở thành ví dụ few-shot cho lần sau. Kết quả trong performance/sau_HITL: Luồng A 100% action accuracy trên 339 cột (trước HITL 85.25%); Luồng B văn bản tự do recall 97.86%, precision 97.16%, F1 97.51%.',
});

// 7 — Technical highlights (test counts re-run on this branch, 18/10/2026)
const techStats = [
  ['flask', '312', 'Backend tests pass', 'pytest · 5 skip (cần DB live)', 36],
  ['code', '184', 'Frontend tests pass', 'vitest · 42 file test', 36],
  ['check', '0', 'Lỗi Ruff', 'lint sạch trên src/ và tests/', 36],
  ['chain', 'SHA-256', 'Nhật ký chuỗi hash', '/audit/verify chỉ ra bản ghi bị sửa', 30],
];
const pipeline = [
  ['git', 'Push / Pull request', 'feature → develop → main', false],
  ['flask', 'GitHub Actions', 'Self-hosted runner chạy Ruff + pytest', false],
  ['rocket', 'Release main', 'Gắn tag SemVer, kích hoạt deploy Render', false],
  ['cloud', 'Production', 'API trên Render (Docker), web trên Vercel', true],
];
slides.push({
  master: 'CONTENT', label: 'Kỹ thuật',
  title: ['Kiểm thử, CI/CD và ', hl('nhật ký chống sửa')],
  els: [
    ...techStats.flatMap(([icon, n, t, s, size], i) => {
      const x = 56 + i * 295;
      return [
        card(x, 128, 283, 168),
        ...iconChip(x + 20, 146, 36, icon, 'primary'),
        text(x + 20, 188, 243, 48, n, { size, bold: true, color: C.primary, valign: 'middle' }),
        text(x + 20, 238, 243, 22, t, { size: 15, bold: true, color: C.ink, valign: 'middle' }),
        text(x + 20, 262, 243, 22, s, { size: 12, color: C.muted, valign: 'middle' }),
      ];
    }),
    text(56, 318, 600, 26, 'Từ commit đến production', { size: 17, bold: true, color: C.ink, valign: 'middle' }),
    ...pipeline.flatMap(([icon, t, s, live], i) => {
      const x = 56 + i * 302;
      const out = [
        card(x, 354, 262, 104, { r: 12, ...(live ? { fill: C.successLight, line: C.successLine } : {}) }),
        ...iconChip(x + 16, 370, 36, icon, live ? 'success' : 'primary', live ? { fill: C.white } : {}),
        text(x + 62, 370, 186, 36, t, { size: 15, bold: true, color: C.ink, valign: 'middle' }),
        text(x + 16, 412, 232, 40, s, { size: 12.5, color: C.muted }),
      ];
      if (i < pipeline.length - 1) out.push(chevron(x + 268, 392));
      return out;
    }),
    rect(56, 480, 1168, 70, { fill: C.primaryLight, line: C.primaryLine, lineW: 1, r: 14 }),
    ...iconChip(76, 495, 40, 'lock', 'primary', { fill: C.white }),
    text(130, 480, 1076, 70,
      'Không commit .env hay secret · URL nguồn do DPO đăng ký được mã hoá Fernet, không bao giờ trả về · Analyst không có endpoint đọc source.',
      { size: 14, color: C.navy, valign: 'middle' }),
    rect(56, 562, 1168, 70, { fill: C.successLight, line: C.successLine, lineW: 1, r: 14 }),
    ...iconChip(76, 577, 40, 'shield', 'success', { fill: C.white }),
    text(130, 562, 1076, 70,
      'Test tự động kiểm tra response API và báo cáo không chứa giá trị PII thô; backend chặn Publish khi run chưa VERIFIED.',
      { size: 14, color: C.navy, valign: 'middle' }),
    text(56, 646, 1168, 20, 'Số test chạy lại ngày 18/10/2026 trên nhánh hiện tại. CI chạy Ruff + pytest; vitest chạy local.', { size: 11, color: C.muted, valign: 'middle' }),
  ],
  notes: 'Chạy lại ngày 18/10/2026: backend 312 test pass (5 test cần database live được bỏ qua), frontend 184 test pass trên 42 file, Ruff không lỗi. CI chạy Ruff và pytest trên GitHub Actions self-hosted runner; merge vào main thì gắn tag SemVer và kích hoạt deploy Render, kèm kiểm tra /health. API chạy trên Render bằng Docker, web trên Vercel. Nhật ký hoạt động là chuỗi hash SHA-256: mỗi bản ghi băm cùng hash của bản ghi trước, /audit/verify chỉ ra bản ghi đầu tiên bị sửa.',
});

// 8 — Challenges & learnings
const challenges = [
  ['unlink', 'primary', 'THÁCH THỨC', 'Che dữ liệu mà vẫn JOIN được', 'CÁCH XỬ LÝ', 'HMAC-SHA-256 cho khóa nối, đồng bộ hai đầu quan hệ; link_scope giữ bảng liên kết chỉ có khóa.'],
  ['sparkles', 'accent', 'THÁCH THỨC', 'Dùng LLM mà không lộ PII', 'CÁCH XỬ LÝ', 'LLM chỉ nhận metadata và thống kê định tính; rules chạy độc lập khi tắt AI hoặc LLM lỗi.'],
  ['key', 'error', 'GIỚI HẠN CÒN MỞ', 'Ngoại lệ KEEP cho PII', 'VIỆC TIẾP THEO', 'KEEP vẫn chép giá trị gốc sang bản sao và chưa tự thu hồi theo hạn. Cần chặn trước khi khẳng định Zero Raw PII.'],
];
slides.push({
  master: 'CONTENT', label: 'Bài học',
  title: ['Ba thách thức và ', hl('điều chúng em học được')],
  els: [
    ...challenges.flatMap(([icon, tone, k1, t, k2, b], i) => {
      const x = 56 + i * 396;
      const [main, light] = TONE[tone];
      return [
        card(x, 128, 376, 368),
        ...iconChip(x + 22, 150, 44, icon, tone),
        text(x + 80, 148, 276, 18, k1, { size: 11, bold: true, color: main, spacing: 1, valign: 'middle' }),
        text(x + 80, 168, 276, 56, t, { size: 18, bold: true, color: C.ink }),
        rect(x + 20, 240, 336, 236, { fill: light, r: 12 }),
        text(x + 38, 258, 300, 18, k2, { size: 11, bold: true, color: main, spacing: 1, valign: 'middle' }),
        text(x + 38, 284, 300, 180, b, { size: 17 }),
      ];
    }),
    panel(56, 520, 1168, 120, 18),
    text(88, 538, 900, 20, 'BÀI HỌC LỚN NHẤT', { size: 11, bold: true, color: C.onDarkMuted, spacing: 1, valign: 'middle' }),
    text(88, 562, 940, 60, 'Che dữ liệu chưa đủ, phải chứng minh dataset vẫn dùng được.', { size: 22, bold: true, color: C.white, valign: 'middle' }),
    mascot('awaiting', 1064, 486, 150),
  ],
  notes: 'Hai thách thức đã giải: giữ JOIN bằng HMAC đồng bộ hai đầu quan hệ và link_scope; dùng LLM nhưng chỉ cho xem metadata. Giới hạn nói thẳng: ngoại lệ KEEP cho PII vẫn đưa giá trị gốc vào bản sao và chưa tự thu hồi theo hạn, đây là việc ưu tiên tiếp theo. Bài học: che dữ liệu chưa đủ, phải chứng minh dataset vẫn dùng được.',
});

// 9 — Team & next steps
const team = [
  ['users', 'Nguyễn Đình Phúc', 'PO / Team Lead', 'Frontend, phạm vi quét, căn cứ pháp lý, pitch'],
  ['sparkles', 'Trần Xuân Tùng', 'Phát hiện & AI', 'Rules / LLM, workflow phát hiện, đánh giá AI'],
  ['database', 'Nguyễn Trung Kiên', 'MongoDB & dữ liệu', 'Connector MongoDB, fixture, nhãn chuẩn, eval'],
  ['server', 'Đoàn Tuấn Long', 'Backend & bảo mật', 'Backend, connector Postgres, guardrail, phân quyền'],
];
const roadmap = [
  ['lock', 'Chặn KEEP cho PII', 'Tự thu hồi theo hạn trước khi khẳng định Zero Raw PII.'],
  ['refresh', 'Đồng bộ realtime', 'CDC với Debezium / Kafka thay cho build theo lần.'],
  ['key', 'Quản lý khóa & SSO', 'KMS / Vault cho khóa HMAC, SSO SAML / OIDC.'],
  ['plus', 'Thêm nguồn dữ liệu', 'ClickHouse, Snowflake, Databricks.'],
];
slides.push({
  master: 'CONTENT', label: 'Team & bước tiếp theo',
  title: ['Team ', hl('P-138'), ' và chặng đường tiếp theo'],
  els: [
    ...team.flatMap(([icon, n, role, d], i) => {
      const x = 56 + i * 295;
      return [
        card(x, 128, 283, 132),
        ...iconChip(x + 20, 146, 44, icon, 'primary'),
        text(x + 76, 144, 196, 24, n, { size: 16, bold: true, color: C.ink, valign: 'middle' }),
        text(x + 76, 168, 196, 22, role, { size: 12.5, bold: true, color: C.primary, valign: 'middle' }),
        text(x + 20, 204, 243, 44, d, { size: 12 }),
      ];
    }),
    text(56, 282, 600, 22, 'LỘ TRÌNH TIẾP THEO', { size: 12, bold: true, color: C.primary, spacing: 1, valign: 'middle' }),
    ...roadmap.flatMap(([icon, t, d], i) => {
      const x = 56 + i * 295;
      return [
        card(x, 312, 283, 136),
        text(x + 20, 328, 40, 22, `0${i + 1}`, { size: 13, bold: true, color: C.primary, valign: 'middle' }),
        ico(x + 239, 328, 24, icon, C.primary),
        text(x + 20, 354, 243, 26, t, { size: 15.5, bold: true, color: C.ink, valign: 'middle' }),
        text(x + 20, 384, 243, 54, d, { size: 13 }),
      ];
    }),
    panel(56, 474, 1168, 166, 20),
    text(96, 506, 860, 52, 'Cảm ơn Ban giám khảo đã lắng nghe!', { size: 32, bold: true, color: C.white, valign: 'middle' }),
    text(96, 566, 860, 40, 'PIIGuard Shield: bảo vệ dữ liệu cá nhân, giữ nguyên giá trị phân tích.', { size: 16, color: C.onDark, valign: 'middle' }),
    rect(1040, 468, 160, 160, { fill: C.white, r: 'full', transp: 88 }),
    mascot('protected', 1022, 444, 196),
  ],
  notes: 'Bốn thành viên và vai trò. Lộ trình: ưu tiên chặn ngoại lệ KEEP cho PII và tự thu hồi theo hạn; sau đó đồng bộ realtime bằng CDC, quản lý khóa HMAC bằng KMS/Vault và SSO, mở rộng thêm nguồn dữ liệu. Cảm ơn Ban giám khảo.',
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
const icon = (name, size) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

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
.mask { color: #92400E; background: #FFFBEB; border: 1px solid #FCD34D; }
.redact { color: #1D4ED8; background: #EFF6FF; border: 1px solid #BFDBFE; }
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
    <div class="nav on">Quét &amp; duyệt</div>
    <div class="nav">Lịch sử quét</div>
    <div class="nav">Nhật ký hoạt động</div>
    <div class="sec">SECURITY &amp; COMPLIANCE</div>
    <div class="nav">Demo che dữ liệu</div>
    <div class="nav">Quy định pháp luật</div>
    <div class="who"><i>D</i><div><b>dpo</b><br><span style="color:#6B7280">DPO</span></div></div>
  </div>
  <div class="main">
    <div class="top"><div class="crumb">Northwind Production <span>› public › customers</span></div><div class="st">READY_TO_BUILD</div><div class="pub">Lưu &amp; build</div></div>
    <div class="tabs"><div class="on">Tổng quan &amp; phân loại PII</div><div>Rủi ro &amp; đánh giá</div><div>Nhật ký hoạt động</div><div>Dữ liệu cho Analyst</div></div>
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
    const shadow = e.shadow ? 'box-shadow:0 3pt 10pt rgba(27,81,164,.10);' : '';
    return `<div class="el" style="${box}${fill}${border}border-radius:${radius};${shadow}"></div>`;
  }
  if (e.t === 'img') return `<img class="el" style="${box}" src="${e.src}" alt="${esc(e.alt || '')}">`;
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

// A title is a string or a list of runs (see hl()) that highlights a keyword.
const titleContent = (title) => (Array.isArray(title) ? [title] : title);
const slideEls = (s, index) => [...(s.label ? [header(index + 1, s.label)] : []), ...s.els];

function htmlSlide(s, index) {
  const m = MASTERS[s.master];
  const els = [...m.objects];
  els.push(text(m.title.x, m.title.y, m.title.w, m.title.h, titleContent(s.title), { size: m.title.size, bold: true, color: m.title.color }));
  els.push(...slideEls(s, index));
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
      ...(e.shadow ? { shadow: { type: 'outer', color: C.primary, opacity: 0.1, blur: 10, offset: 3, angle: 90 } } : {}),
    });
  } else if (e.t === 'img') {
    slide.addImage({ path: path.join(BUILD, e.src), x: IN(e.x), y: IN(e.y), w: IN(e.w), h: IN(e.h), objectName: name, altText: e.alt || DECOR });
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
  pres.title = 'PIIGuard Shield';
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
    });
  }

  slides.forEach((s, i) => {
    const slide = pres.addSlide({ masterName: s.master });
    slide.addText(pptxRuns({ content: titleContent(s.title) }), { placeholder: 'title' });
    slideEls(s, i).forEach((e, j) => addPptxEl(pres, slide, e, `s${i + 1}-${e.t}-${j + 1}`));
    slide.addNotes(s.notes);
  });

  await pres.writeFile({ fileName: file });
  await patchTheme(file);
}

// ---------------------------------------------------------------- assets
async function prepareAssets() {
  fs.mkdirSync(path.join(BUILD, 'img'), { recursive: true });
  fs.mkdirSync(path.join(BUILD, 'gen'), { recursive: true });
  const mascotDir = path.join(ROOT, 'assets', 'mascot');
  for (const f of fs.readdirSync(mascotDir).filter((n) => n.endsWith('.webp'))) {
    await sharp(path.join(mascotDir, f)).png().toFile(path.join(BUILD, 'img', f.replace('.webp', '.png')));
  }
  await sharp(path.join(ROOT, 'assets', 'brand', 'logo.webp')).png().toFile(path.join(BUILD, 'img', 'logo.png'));
  const png = (svg, key) => sharp(Buffer.from(svg)).png().toFile(path.join(BUILD, 'gen', key));
  for (const [key, { w, h, r }] of gradients) {
    const stops = PANEL.map(([o, c]) => `<stop offset="${o}" stop-color="#${c}"/>`).join('');
    await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${h * 2}" viewBox="0 0 ${w} ${h}">`
      + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>`
      + '<radialGradient id="glow" cx="0.85" cy="0.1" r="0.6"><stop offset="0" stop-color="#2563EB" stop-opacity="0.45"/><stop offset="1" stop-color="#2563EB" stop-opacity="0"/></radialGradient></defs>'
      + `<rect width="${w}" height="${h}" rx="${r}" fill="url(#g)"/><rect width="${w}" height="${h}" rx="${r}" fill="url(#glow)"/></svg>`, key);
  }
  for (const [key, { name, color }] of icons) {
    await png(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#${color}" `
      + `stroke-width="${name === 'chevron' ? 2.6 : 1.9}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`, key);
  }
  // Content slides: airy light canvas with soft blue glows. Cover: the login screen background (navy + blue/teal/violet glows).
  const glow = (id, cx, cy, r, color, op) =>
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
  const canvas = (defs, layers) => `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 1280 720">`
    + `<defs>${defs}</defs>${layers}</svg>`;
  await png(canvas(
    glow('a', 0.95, 0.0, 0.55, '#BFDBFE', 0.7) + glow('b', 0.0, 1.0, 0.5, '#DBEAFE', 0.8) + glow('c', 0.55, 0.45, 0.6, '#FFFFFF', 0.6),
    `<rect width="1280" height="720" fill="#${C.bg}"/><rect width="1280" height="720" fill="url(#a)"/><rect width="1280" height="720" fill="url(#b)"/><rect width="1280" height="720" fill="url(#c)"/>`,
  ), 'bg-light.png');
  await png(canvas(
    '<linearGradient id="base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#081733"/><stop offset="0.55" stop-color="#0F2F63"/><stop offset="1" stop-color="#0B4F6C"/></linearGradient>'
      + glow('a', 0.22, 0.25, 0.45, '#2563EB', 0.55) + glow('b', 0.85, 0.85, 0.5, '#06B6D4', 0.4) + glow('c', 0.6, 0.1, 0.35, '#7C3AED', 0.25)
      + '<pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#FFFFFF" fill-opacity="0.09"/></pattern>',
    '<rect width="1280" height="720" fill="url(#base)"/><rect width="1280" height="720" fill="url(#a)"/><rect width="1280" height="720" fill="url(#b)"/><rect width="1280" height="720" fill="url(#c)"/><rect width="1280" height="720" fill="url(#dots)"/>',
  ), 'bg-dark.png');
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
  fs.writeFileSync(deckHtml, htmlDoc('PIIGuard Shield', slides.map(htmlSlide).join('')));
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
