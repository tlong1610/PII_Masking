import { getFieldKind } from './fieldDecision';

/** Vietnamese names for the PII types the scanner reports in `taxonomy_id` (see src/services/run_scanner.py). */
const PII_TYPE_LABELS: Record<string, string> = {
  FULL_NAME: 'Họ tên',
  NAME: 'Họ tên',
  CCCD: 'Số CCCD',
  PHONE: 'Số điện thoại',
  EMAIL: 'Email',
  ADDRESS: 'Địa chỉ',
  DOB: 'Ngày sinh',
  GENDER: 'Giới tính',
  TAX_CODE: 'Mã số thuế',
  TAX_CODE_ORG: 'MST tổ chức',
  FREE_TEXT_PII: 'Văn bản chứa PII',
  OCR_TEXT: 'Văn bản OCR',
  CITY: 'Thành phố',
  DISTRICT: 'Quận/Huyện',
  IP_ADDRESS: 'Địa chỉ IP',
  JOB_TITLE: 'Chức danh',
  BIOMETRIC: 'Sinh trắc học',
  BIOMETRIC_FILE: 'Tệp sinh trắc',
  HEALTH: 'Sức khỏe',
  MEDICAL: 'Y tế',
  PATIENT_ID: 'Mã bệnh nhân',
  CREDIT_CARD: 'Thẻ tín dụng',
  BANK_ACCOUNT: 'Tài khoản ngân hàng',
  FINANCIAL: 'Tài chính',
  OCR_IDENTITY_DOC: 'Giấy tờ tuỳ thân',
  INTERNAL_FILE_PATH: 'Đường dẫn tệp',
  TRACKING_CODE: 'Mã vận đơn',
  MONEY_ALONE: 'Số tiền',
  EMPTY_COLUMN: 'Cột rỗng',
};

const KIND_FALLBACK = {
  SENSITIVE: 'Dữ liệu nhạy cảm',
  PII: 'Dữ liệu cá nhân',
  QUASI: 'Định danh gián tiếp',
  NON_PERSONAL: 'Không phải DLCN',
  UNKNOWN: 'Chưa xác định',
} as const;

/** Label for the "Loại PII" column: the detected type, or the classification when no type is known. */
export function getPiiTypeLabel(taxonomyId: string | null, classification: string): string {
  const known = taxonomyId ? PII_TYPE_LABELS[taxonomyId.toUpperCase()] : undefined;
  return known ?? KIND_FALLBACK[getFieldKind(classification)];
}
