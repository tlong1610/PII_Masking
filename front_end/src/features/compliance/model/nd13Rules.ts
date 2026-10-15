/**
 * Pure domain model for Decree 13/2023/ND-CP and Law on Protection of Personal Data 2025.
 * Strictly pure TypeScript: no React, no I/O.
 */

export interface Nd13Article {
  id: string;
  articleNumber: string;
  title: string;
  summary: string;
  details: string[];
  scope: 'DPO' | 'ORGANIZATION' | 'DATA_SUBJECT';
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
  },
] as const;
