/**
 * Pure domain model for Masking Showcase (Demo che dữ liệu).
 * Compares transformations across all major personal data types.
 */

export interface MaskingDemoItem {
  id: string;
  dataTypeName: string;
  piiLevel: 'L1' | 'L2' | 'L3';
  description: string;
  rawValue: string;
  maskValue: string;
  hmacValue: string;
  dropValue: string;
  keepValue: string;
  algorithmNote: string;
  preservesFormat: boolean;
  joinable: boolean;
}

export const MASKING_DEMO_ITEMS: readonly MaskingDemoItem[] = [
  {
    id: 'full-name',
    dataTypeName: 'Họ và tên (Full Name)',
    piiLevel: 'L2',
    description: 'Tên định danh trực tiếp của chủ thể dữ liệu.',
    rawValue: 'Nguyễn Văn Phúc',
    maskValue: 'N***** V** P***',
    hmacValue: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    dropValue: '(Cột đã bị loại bỏ hoàn toàn)',
    keepValue: 'Nguyễn Văn Phúc (Rủi ro lộ danh tính)',
    algorithmNote: 'Che mờ giữ ký tự đầu của từng từ (First-letter masking) giúp nhận biết danh xưng mà không để lộ đầy đủ tên.',
    preservesFormat: true,
    joinable: false,
  },
  {
    id: 'phone-number',
    dataTypeName: 'Số điện thoại (Phone Number)',
    piiLevel: 'L2',
    description: 'Kênh liên lạc trực tiếp gắn với thẻ SIM và định danh cá nhân.',
    rawValue: '0912345678',
    maskValue: '091****678',
    hmacValue: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    dropValue: '(Cột đã bị loại bỏ hoàn toàn)',
    keepValue: '0912345678 (Cảnh báo: Vi phạm sàn bảo mật)',
    algorithmNote: 'Giữ lại 3 chữ số đầu (Mã nhà mạng) và 3 chữ số cuối để kiểm tra đối soát, che mờ hoàn toàn các số ở giữa.',
    preservesFormat: true,
    joinable: false,
  },
  {
    id: 'citizen-id',
    dataTypeName: 'Căn cước công dân / CMND (CCCD)',
    piiLevel: 'L2',
    description: 'Số định danh cá nhân duy nhất do Bộ Công an cấp.',
    rawValue: '079095012345',
    maskValue: '079******345',
    hmacValue: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    dropValue: '(Cột đã bị loại bỏ hoàn toàn)',
    keepValue: '079095012345 (Cực kỳ nguy hiểm: Dữ liệu định danh quốc gia)',
    algorithmNote: 'Giữ lại mã tỉnh/thành phố (079 = TP.HCM) và che mờ 6 chữ số cá nhân ở giữa.',
    preservesFormat: true,
    joinable: false,
  },
  {
    id: 'email-address',
    dataTypeName: 'Địa chỉ Email (Email Address)',
    piiLevel: 'L2',
    description: 'Địa chỉ hòm thư điện tử cá nhân hoặc doanh nghiệp.',
    rawValue: 'phuc.nguyen@enterprise.vn',
    maskValue: 'p***.n****n@enterprise.vn',
    hmacValue: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    dropValue: '(Cột đã bị loại bỏ hoàn toàn)',
    keepValue: 'phuc.nguyen@enterprise.vn (Rủi ro lừa đảo qua email)',
    algorithmNote: 'Che mờ phần user mailbox nhưng giữ nguyên domain (@enterprise.vn) để Analyst phân tích phân khúc khách hàng.',
    preservesFormat: true,
    joinable: false,
  },
  {
    id: 'bank-account',
    dataTypeName: 'Tài khoản Ngân hàng (Bank Account)',
    piiLevel: 'L3',
    description: 'Dữ liệu cá nhân nhạy cảm về tài chính và giao dịch.',
    rawValue: '9704123456789012',
    maskValue: '9704********9012',
    hmacValue: 'c68832a84578b87b76420e176b92f7e71f98d4d87a552bf9b5c3e725ce83e440',
    dropValue: '(Cột đã bị loại bỏ hoàn toàn)',
    keepValue: '9704123456789012 (Vi phạm nghiêm trọng: Dữ liệu tài chính)',
    algorithmNote: 'Format-Preserving Masking chuẩn PCI-DSS: Chỉ hiển thị 4 số BIN đầu và 4 số cuối, toàn bộ số giữa bị giấu.',
    preservesFormat: true,
    joinable: false,
  },
  {
    id: 'health-record',
    dataTypeName: 'Thông tin Sức khỏe / Bệnh án (Medical Record)',
    piiLevel: 'L3',
    description: 'Dữ liệu đời tư y tế nhạy cảm đặc biệt theo Điều 17 NĐ 13.',
    rawValue: 'Viêm phổi cấp độ 2, điều trị phác đồ kháng sinh Augmentin',
    maskValue: '[HỒ SƠ BỆNH ÁN ĐÃ CHE MỜ BẢO MẬT]',
    hmacValue: '2c624232cdd221771294dfbb310aca000a0df6ec9b5feb983f14042f24a8acdc',
    dropValue: '(Cột đã bị loại bỏ hoàn toàn)',
    keepValue: 'Viêm phổi cấp độ 2, điều trị... (VI PHẠM BẢO VỆ ĐỜI TƯ Y TẾ)',
    algorithmNote: 'Áp dụng Generalization hoặc Redaction toàn phần. Tuyệt đối không lưu vết triệu chứng cụ thể của từng cá nhân.',
    preservesFormat: false,
    joinable: false,
  },
  {
    id: 'join-key',
    dataTypeName: 'Khóa nối liên kết (Join Key / Foreign Key)',
    piiLevel: 'L1',
    description: 'Mã khách hàng được dùng làm Foreign Key nối bảng Orders với Customers.',
    rawValue: 'cust_uuid_98412_hcm',
    maskValue: 'c***_****_hcm (Mất khả năng Join)',
    hmacValue: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    dropValue: '(Bị loại bỏ - Không thể kết nối dữ liệu giữa các bảng)',
    keepValue: 'cust_uuid_98412_hcm (Lộ mã định danh gốc)',
    algorithmNote: 'Salted SHA-256 HMAC với Secret Key nhất quán: Cho phép Analyst thực hiện JOIN và GROUP BY chính xác 100% giữa các bảng mà không bao giờ biết được ID thật.',
    preservesFormat: false,
    joinable: true,
  },
] as const;

/**
 * Transforms any raw input into formatted asterisks (***) mask.
 */
export function maskString(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '***';

  // Email format
  if (trimmed.includes('@')) {
    const [local, domain] = trimmed.split('@');
    if (!local || !domain) return '***@***';
    const maskedLocal = local.length <= 2 ? `${local[0]}*` : `${local[0]}***${local[local.length - 1]}`;
    return `${maskedLocal}@${domain}`;
  }

  // Numeric (Phone, CCCD, Card)
  if (/^\d+$/.test(trimmed)) {
    if (trimmed.length <= 4) return '***';
    const prefix = trimmed.slice(0, Math.min(3, Math.floor(trimmed.length / 3)));
    const suffix = trimmed.slice(-Math.min(3, Math.floor(trimmed.length / 3)));
    const stars = '*'.repeat(Math.max(3, trimmed.length - prefix.length - suffix.length));
    return `${prefix}${stars}${suffix}`;
  }

  // Full name / multi-word
  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    return words
      .map((w) => (w.length <= 1 ? '*' : `${w[0]}${'*'.repeat(Math.max(2, w.length - 1))}`))
      .join(' ');
  }

  // Single word
  if (trimmed.length <= 2) return `${trimmed[0]}*`;
  return `${trimmed[0]}${'*'.repeat(Math.max(3, trimmed.length - 2))}${trimmed[trimmed.length - 1]}`;
}

/**
 * Deterministic pseudo-HMAC SHA-256 hex generator for demo visualization.
 */
export function simulateHmacSha256(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex32 = (hash >>> 0).toString(16).padStart(8, '0');
  return `${hex32}e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d${hex32}`.slice(0, 64);
}

