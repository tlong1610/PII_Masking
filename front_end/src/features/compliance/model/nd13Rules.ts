/**
 * Pure domain model for Law on Protection of Personal Data 2025 (Luật 91/2025/QH15)
 * and Decree 356/2025/ND-CP detailing its implementation.
 * Strictly pure TypeScript: no React, no I/O.
 */

export interface LegalDocumentSource {
  id: string;
  code: string;
  title: string;
  promulgatedBy: string;
  effectiveDate: string;
  summary: string;
  officialUrl: string;
  primaryBadge: string;
  keyArticles: string;
}

export const OFFICIAL_LEGAL_DOCUMENTS: readonly LegalDocumentSource[] = [
  {
    id: 'luat-91-2025',
    code: 'Luật số 91/2025/QH15',
    title: 'Luật Bảo vệ Dữ liệu Cá nhân 2025',
    promulgatedBy: 'Quốc hội nước CHXHCN Việt Nam',
    effectiveDate: '01/01/2026',
    summary: 'Đạo luật tối cao quy định nguyên tắc xử lý dữ liệu, quyền của chủ thể dữ liệu (Điều 9), nghĩa vụ của DPO và cơ quan kiểm soát dữ liệu cá nhân tại Việt Nam.',
    officialUrl: 'https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-Bao-ve-du-lieu-ca-nhan-2025-91-2025-QH15-612456.aspx',
    primaryBadge: 'Luật Cốt Lõi (Primary Law)',
    keyArticles: 'Điều 2 (Định nghĩa PII), Điều 9 (Quyền chủ thể), Điều 31 (Dữ liệu nhạy cảm)',
  },
  {
    id: 'nghi-dinh-356-2025',
    code: 'Nghị định 356/2025/NĐ-CP',
    title: 'Nghị định Quy định Chi tiết Luật Bảo vệ Dữ liệu Cá nhân',
    promulgatedBy: 'Chính phủ',
    effectiveDate: '01/01/2026',
    summary: 'Văn bản hướng dẫn thi hành trực tiếp: quy định phân loại chi tiết PII Cơ bản (Điều 3) và PII Nhạy cảm (Điều 4), sàn kỹ thuật che mờ và đánh giá tác động DPIA.',
    officialUrl: 'https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-356-2025-ND-CP-huong-dan-Luat-Bao-ve-du-lieu-ca-nhan-628392.aspx',
    primaryBadge: 'Nghị Định Hướng Dẫn Trọng Tâm',
    keyArticles: 'Điều 3 (PII cơ bản), Điều 4 (PII nhạy cảm), Điều 17 (Bảo vệ an toàn), Điều 24 (DPIA)',
  },
] as const;

export interface Nd13Article {
  id: string;
  articleNumber: string;
  title: string;
  summary: string;
  details: string[];
  scope: 'DPO' | 'ORGANIZATION' | 'DATA_SUBJECT';
  legalBasis: string;
  sourceUrl: string;
}

export interface PiiClassificationRule {
  level: 'L1' | 'L2' | 'L3';
  categoryName: string;
  badgeLabel: string;
  badgeColor: 'default' | 'info' | 'warning' | 'error';
  description: string;
  examples: string[];
  securityFloor: 'HMAC_RECOMMENDED' | 'MASK_OR_HMAC_MINIMUM' | 'MASK_OR_DROP_MANDATORY';
  allowedActions: ('MASK' | 'HMAC' | 'DROP' | 'KEEP')[];
  exceptionPolicy: string;
  legalBasis: string;
  sourceUrl: string;
}

export const PII_CLASSIFICATION_RULES: readonly PiiClassificationRule[] = [
  {
    level: 'L1',
    categoryName: 'Dữ liệu Gián tiếp / Định danh kỹ thuật',
    badgeLabel: 'Gián tiếp (L1)',
    badgeColor: 'info',
    description: 'Mã định danh hệ thống, khóa liên kết bảng có thể dùng để suy đoán hoặc liên kết ngang hồ sơ người dùng.',
    examples: ['User ID / Customer UUID', 'Device ID / MAC Address', 'IP Address / Session Token', 'Mã khóa ngoại (Foreign Join Keys)'],
    securityFloor: 'HMAC_RECOMMENDED',
    allowedActions: ['HMAC', 'MASK', 'DROP', 'KEEP'],
    exceptionPolicy: 'Khuyến nghị áp dụng Salted HMAC để bảo toàn tính liên kết bảng (Joinable) mà không làm lộ ID nội bộ.',
    legalBasis: 'Khoản 1 Điều 2 Luật 91/2025/QH15 (Định danh gián tiếp & Khóa liên kết)',
    sourceUrl: 'https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-Bao-ve-du-lieu-ca-nhan-2025-91-2025-QH15-612456.aspx',
  },
  {
    level: 'L2',
    categoryName: 'Dữ liệu cá nhân Cơ bản (Basic PII)',
    badgeLabel: 'Cơ bản (L2)',
    badgeColor: 'warning',
    description: 'Dữ liệu xác định danh tính trực tiếp của cá nhân theo quy định pháp luật bảo vệ dữ liệu cá nhân.',
    examples: ['Họ và tên', 'Ngày sinh, giới tính', 'Số điện thoại', 'Địa chỉ email', 'Nơi thường trú / Tạm trú', 'Số CCCD / CMND / Hộ chiếu'],
    securityFloor: 'MASK_OR_HMAC_MINIMUM',
    allowedActions: ['MASK', 'HMAC', 'DROP', 'KEEP'],
    exceptionPolicy: 'Được phép KEEP có thời hạn nếu có phê duyệt bằng văn bản của DPO (bắt buộc kèm exceptionUntil).',
    legalBasis: 'Điều 3 Nghị định 356/2025/NĐ-CP & Điều 2 Luật 91/2025/QH15 (Dữ liệu cá nhân cơ bản)',
    sourceUrl: 'https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-356-2025-ND-CP-huong-dan-Luat-Bao-ve-du-lieu-ca-nhan-628392.aspx',
  },
  {
    level: 'L3',
    categoryName: 'Dữ liệu cá nhân Nhạy cảm (Sensitive PII)',
    badgeLabel: 'Nhạy cảm (L3)',
    badgeColor: 'error',
    description: 'Dữ liệu gắn liền với quyền riêng tư cần bảo vệ đặc biệt theo quy chuẩn an toàn dữ liệu cá nhân nhạy cảm.',
    examples: [
      'Tình trạng sức khỏe, bệnh án, đời tư y tế',
      'Thông tin tài chính, số tài khoản ngân hàng, lịch sử giao dịch',
      'Quan điểm chính trị, tôn giáo, tín ngưỡng',
      'Dữ liệu sinh trắc học (vân tay, khuôn mặt, mống mắt)',
      'Dữ liệu vị trí địa lý chính xác',
    ],
    securityFloor: 'MASK_OR_DROP_MANDATORY',
    allowedActions: ['MASK', 'DROP', 'HMAC'],
    exceptionPolicy: 'Nghiêm cấm KEEP trong môi trường Analyst thông thường. Mọi ngoại lệ bắt buộc phải có thẩm định rủi ro DPIA.',
    legalBasis: 'Điều 4 Nghị định 356/2025/NĐ-CP & Điều 9, 31 Luật 91/2025/QH15 (Dữ liệu cá nhân nhạy cảm)',
    sourceUrl: 'https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-356-2025-ND-CP-huong-dan-Luat-Bao-ve-du-lieu-ca-nhan-628392.aspx',
  },
] as const;

export const ND13_KEY_ARTICLES: readonly Nd13Article[] = [
  {
    id: 'art-09',
    articleNumber: 'Điều 9',
    title: 'Quyền của chủ thể dữ liệu',
    summary: 'Chủ thể dữ liệu có 11 quyền cơ bản đối với dữ liệu cá nhân của mình.',
    details: [
      'Quyền được biết và đồng ý về mục đích xử lý dữ liệu.',
      'Quyền truy cập, chỉnh sửa hoặc yêu cầu chỉnh sửa dữ liệu.',
      'Quyền rút lại sự đồng ý bất cứ lúc nào.',
      'Quyền yêu cầu xóa dữ liệu hoặc hạn chế xử lý dữ liệu.',
      'Quyền phản đối xử lý dữ liệu vì mục đích quảng cáo/tiếp thị.',
    ],
    scope: 'DATA_SUBJECT',
    legalBasis: 'Điều 9 Luật 91/2025/QH15 & Nghị định hướng dẫn thi hành',
    sourceUrl: 'https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-Bao-ve-du-lieu-ca-nhan-2025-91-2025-QH15-612456.aspx',
  },
  {
    id: 'art-10-11',
    articleNumber: 'Điều 10 & 11',
    title: 'Nghĩa vụ bảo vệ an toàn dữ liệu cá nhân',
    summary: 'Bên Kiểm soát và Bên Xử lý dữ liệu phải áp dụng các biện pháp kỹ thuật và tổ chức phù hợp.',
    details: [
      'Áp dụng các biện pháp mã hóa, ẩn danh hóa, che mờ (Pseudonymization / Anonymization).',
      'Ghi nhận nhật ký xử lý dữ liệu vào hệ thống kiểm toán chống chỉnh sửa.',
      'Thông báo cho Bộ Công an (Cục An ninh mạng và phòng, chống tội phạm công nghệ cao - A05) trong 72 giờ khi xảy ra vi phạm dữ liệu.',
    ],
    scope: 'ORGANIZATION',
    legalBasis: 'Điều 10 & 11 Luật 91/2025/QH15 & NĐ 356/2025/NĐ-CP',
    sourceUrl: 'https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-356-2025-ND-CP-huong-dan-Luat-Bao-ve-du-lieu-ca-nhan-628392.aspx',
  },
  {
    id: 'art-17',
    articleNumber: 'Điều 17',
    title: 'Biện pháp bảo vệ Dữ liệu cá nhân Nhạy cảm',
    summary: 'Quy định các tiêu chuẩn bảo vệ nghiêm ngặt nhất đối với dữ liệu cá nhân nhạy cảm.',
    details: [
      'Chỉ định nhân sự hoặc bộ phận chuyên trách bảo vệ dữ liệu cá nhân (DPO).',
      'Áp dụng cơ chế kiểm soát truy cập phân quyền nghiêm ngặt theo vai trò (RBAC).',
      'Tuyệt đối không lưu trữ hoặc chia sẻ dữ liệu nhạy cảm dạng bản rõ (Plaintext) cho các mục đích phân tích thông thường.',
    ],
    scope: 'DPO',
    legalBasis: 'Điều 4, 17 NĐ 356/2025/NĐ-CP & Điều 31 Luật 91/2025/QH15',
    sourceUrl: 'https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-356-2025-ND-CP-huong-dan-Luat-Bao-ve-du-lieu-ca-nhan-628392.aspx',
  },
  {
    id: 'art-24',
    articleNumber: 'Điều 24',
    title: 'Đánh giá tác động xử lý dữ liệu cá nhân (DPIA)',
    summary: 'Lập và lưu trữ Hồ sơ đánh giá tác động xử lý dữ liệu cá nhân.',
    details: [
      'Mô tả chi tiết các luồng xử lý và mục đích chuyển đổi dữ liệu.',
      'Đánh giá rủi ro rò rỉ dữ liệu và tác động tới chủ thể dữ liệu.',
      'Đề xuất các biện pháp giảm thiểu (Che mờ, HMAC, Loại bỏ cột).',
      'Hồ sơ DPIA phải luôn sẵn sàng để phục vụ thanh tra, kiểm tra của cơ quan quản lý.',
    ],
    scope: 'DPO',
    legalBasis: 'Điều 24 NĐ 356/2025/NĐ-CP & Điều 28 Luật 91/2025/QH15',
    sourceUrl: 'https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-356-2025-ND-CP-huong-dan-Luat-Bao-ve-du-lieu-ca-nhan-628392.aspx',
  },
] as const;

export type ActionBadgeColor = 'default' | 'success' | 'info' | 'warning' | 'error';

export interface ActionBadge {
  label: string;
  color?: ActionBadgeColor;
}

export interface PiiActionMatrixRow {
  level: 'L1' | 'L2' | 'L3';
  levelLabel: string;
  badgeColor: 'info' | 'warning' | 'error';
  definition: string;
  mask: ActionBadge;
  hmac: ActionBadge;
  drop: ActionBadge;
  keep: ActionBadge;
}

export const PII_ACTION_MATRIX: readonly PiiActionMatrixRow[] = [
  {
    level: 'L1',
    levelLabel: 'L1 — Gián tiếp',
    badgeColor: 'info',
    definition: 'User ID, Session ID, Khóa nối liên kết',
    mask: { label: 'Tùy chọn', color: 'default' },
    hmac: { label: 'Khuyến nghị', color: 'success' },
    drop: { label: 'Tùy chọn', color: 'default' },
    keep: { label: 'Cho phép', color: 'info' },
  },
  {
    level: 'L2',
    levelLabel: 'L2 — Cơ bản',
    badgeColor: 'warning',
    definition: 'Họ tên, SĐT, CCCD, Email, Nơi cư trú',
    mask: { label: 'Khuyến nghị', color: 'success' },
    hmac: { label: 'Hợp lệ', color: 'info' },
    drop: { label: 'Hợp lệ', color: 'default' },
    keep: { label: 'Có thời hạn', color: 'warning' },
  },
  {
    level: 'L3',
    levelLabel: 'L3 — Nhạy cảm',
    badgeColor: 'error',
    definition: 'Bệnh án, tài chính, tôn giáo, sinh trắc học',
    mask: { label: 'Bắt buộc', color: 'success' },
    hmac: { label: 'Tùy chọn', color: 'default' },
    drop: { label: 'Bắt buộc', color: 'success' },
    keep: { label: 'Cấm tuyệt đối', color: 'error' },
  },
] as const;

