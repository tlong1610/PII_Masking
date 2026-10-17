/**
 * Pure domain model for Masking Showcase (Demo che dữ liệu).
 * Compares transformations across all major personal data types.
 * All sample values are synthetic (AGENT.md: no real PII); HMAC values come from the same
 * simulateHmacSha256 the live sandbox uses, so table and sandbox agree.
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
    rawValue: 'Nguyễn Văn A',
    maskValue: '***',
    hmacValue: simulateHmacSha256('Nguyễn Văn A'),
    dropValue: '(Cột đã bị loại bỏ hoàn toàn)',
    keepValue: 'Nguyễn Văn A (Rủi ro lộ danh tính)',
    algorithmNote: 'Thay thế toàn bộ chuỗi họ và tên bằng *** (chuẩn MASK_PLACEHOLDER) bảo vệ danh tính tuyệt đối.',
    preservesFormat: false,
    joinable: false,
  },
  {
    id: 'phone-number',
    dataTypeName: 'Số điện thoại (Phone Number)',
    piiLevel: 'L2',
    description: 'Kênh liên lạc trực tiếp gắn với thẻ SIM và định danh cá nhân.',
    rawValue: '0900000001',
    maskValue: '***',
    hmacValue: simulateHmacSha256('0900000001'),
    dropValue: '(Cột đã bị loại bỏ hoàn toàn)',
    keepValue: '0900000001 (Cảnh báo: Vi phạm sàn bảo mật)',
    algorithmNote: 'Thay thế toàn bộ số điện thoại bằng *** (chuẩn MASK_PLACEHOLDER), triệt tiêu hoàn toàn rủi ro lộ SIM và kênh liên lạc.',
    preservesFormat: false,
    joinable: false,
  },
  {
    id: 'citizen-id',
    dataTypeName: 'Căn cước công dân / CMND (CCCD)',
    piiLevel: 'L2',
    description: 'Số định danh cá nhân duy nhất do Bộ Công an cấp.',
    rawValue: '001099000001',
    maskValue: '***',
    hmacValue: simulateHmacSha256('001099000001'),
    dropValue: '(Cột đã bị loại bỏ hoàn toàn)',
    keepValue: '001099000001 (Cực kỳ nguy hiểm: Dữ liệu định danh quốc gia)',
    algorithmNote: 'Thay thế toàn bộ số định danh quốc gia bằng *** (chuẩn MASK_PLACEHOLDER) bảo vệ thông tin công dân tuyệt đối.',
    preservesFormat: false,
    joinable: false,
  },
  {
    id: 'email-address',
    dataTypeName: 'Địa chỉ Email (Email Address)',
    piiLevel: 'L2',
    description: 'Địa chỉ hòm thư điện tử cá nhân hoặc doanh nghiệp.',
    rawValue: 'nguyenvana@example.com',
    maskValue: '***',
    hmacValue: simulateHmacSha256('nguyenvana@example.com'),
    dropValue: '(Cột đã bị loại bỏ hoàn toàn)',
    keepValue: 'nguyenvana@example.com (Rủi ro lừa đảo qua email)',
    algorithmNote: 'Thay thế toàn bộ địa chỉ hòm thư bằng *** (chuẩn MASK_PLACEHOLDER), tránh phát tán danh tính trực tuyến.',
    preservesFormat: false,
    joinable: false,
  },
  {
    id: 'bank-account',
    dataTypeName: 'Tài khoản Ngân hàng (Bank Account)',
    piiLevel: 'L3',
    description: 'Dữ liệu cá nhân nhạy cảm về tài chính và giao dịch.',
    rawValue: '9704000000000001',
    maskValue: '***',
    hmacValue: simulateHmacSha256('9704000000000001'),
    dropValue: '(Cột đã bị loại bỏ hoàn toàn)',
    keepValue: '9704000000000001 (Vi phạm nghiêm trọng: Dữ liệu tài chính)',
    algorithmNote: 'Thay thế toàn bộ số tài khoản bằng *** (chuẩn MASK_PLACEHOLDER) tuân thủ nghiêm ngặt chuẩn bảo mật tài chính.',
    preservesFormat: false,
    joinable: false,
  },
  {
    id: 'health-record',
    dataTypeName: 'Thông tin Sức khỏe / Bệnh án (Medical Record)',
    piiLevel: 'L3',
    description: 'Dữ liệu đời tư y tế nhạy cảm đặc biệt theo điểm d khoản 1 Điều 4 NĐ 356/2025.',
    rawValue: 'Viêm phổi cấp độ 2, điều trị phác đồ kháng sinh Augmentin',
    maskValue: '***',
    hmacValue: simulateHmacSha256('Viêm phổi cấp độ 2, điều trị phác đồ kháng sinh Augmentin'),
    dropValue: '(Cột đã bị loại bỏ hoàn toàn)',
    keepValue: 'Viêm phổi cấp độ 2, điều trị... (VI PHẠM BẢO VỆ ĐỜI TƯ Y TẾ)',
    algorithmNote: 'Thay thế toàn bộ dữ liệu đời tư y tế bằng *** (chuẩn MASK_PLACEHOLDER) theo quy định bảo vệ dữ liệu nhạy cảm.',
    preservesFormat: false,
    joinable: false,
  },
  {
    id: 'join-key',
    dataTypeName: 'Khóa nối liên kết (Join Key / Foreign Key)',
    piiLevel: 'L1',
    description: 'Mã khách hàng được dùng làm Foreign Key nối bảng Orders với Customers.',
    rawValue: 'cust_uuid_98412_hcm',
    maskValue: '***',
    hmacValue: simulateHmacSha256('cust_uuid_98412_hcm'),
    dropValue: '(Bị loại bỏ - Không thể kết nối dữ liệu giữa các bảng)',
    keepValue: 'cust_uuid_98412_hcm (Lộ mã định danh gốc)',
    algorithmNote: 'Khi áp dụng MASK, giá trị biến thành *** và mất liên kết bảng; nếu cần JOIN/GROUP BY an toàn hãy sử dụng HMAC SHA-256.',
    preservesFormat: false,
    joinable: true,
  },
] as const;

/**
 * Transforms any raw input into standard asterisks (***) mask placeholder.
 * Aligns strictly with backend mask_engine.py MASK_PLACEHOLDER = '***'.
 */
export function maskString(input?: string): string {
  void input;
  return '***';
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

