import type { StatusTone } from '@/shared/ui';

export type PolicyAction = 'MASK' | 'REDACT' | 'HMAC' | 'DROP' | 'KEEP';
export type DatasetStatus = 'STAGING' | 'VERIFIED' | 'PUBLISHED' | 'REVOKED' | 'FAILED';
export type TransformKind = 'MASK' | 'REDACT' | 'HMAC' | 'KEEP' | 'DROPPED';
export type DetectorSource = 'rule' | 'ai' | 'dpo' | 'unknown';

export const POLICY_ACTIONS: PolicyAction[] = ['MASK', 'REDACT', 'HMAC', 'DROP', 'KEEP'];
export const TRANSFORMS: TransformKind[] = ['MASK', 'REDACT', 'HMAC', 'KEEP', 'DROPPED'];

export function getActionLabel(action: PolicyAction): string {
  if (action === 'MASK') return 'Che dữ liệu';
  if (action === 'REDACT') return 'Che thực thể (NER)';
  if (action === 'HMAC') return 'Băm HMAC';
  if (action === 'DROP') return 'Loại bỏ';
  return 'Giữ nguyên';
}

/** One colour per action, shared by the action dropdown, action chips and transform chips. */
const ACTION_TONES: Record<PolicyAction, StatusTone> = {
  KEEP: 'default',
  MASK: 'warning',
  REDACT: 'info',
  HMAC: 'accent',
  DROP: 'error',
};

export function getActionTone(action: PolicyAction): StatusTone {
  return ACTION_TONES[action];
}

/** What an Analyst can do with a column after protection. */
export function getTransformAnalystHint(transform: TransformKind): string {
  if (transform === 'KEEP') return 'Dùng trực tiếp để phân tích (lọc, nhóm, tính tổng...).';
  if (transform === 'HMAC')
    return 'Mã thay thế cố định: dùng để ghép bảng hoặc đếm số khách riêng biệt; không thể giải ngược ra giá trị gốc.';
  if (transform === 'MASK') return 'Đã che toàn bộ (***): chỉ cho biết cột có dữ liệu, không dùng để lọc hay ghép bảng.';
  if (transform === 'REDACT')
    return 'Văn bản vẫn đọc được; tên, số điện thoại, email... đã thay bằng nhãn như [PHONE]. Không dùng để ghép bảng.';
  return 'Đã bị loại khỏi dataset, Analyst không nhận được cột này.';
}


export function getClassificationLabel(classification: string): string {
  if (classification.includes('NON_PERSONAL')) return 'Không phải dữ liệu cá nhân';
  if (classification.includes('QUASI')) return 'Định danh gián tiếp (L1)';
  if (classification.includes('PERSONAL_SENSITIVE')) return 'Dữ liệu cá nhân nhạy cảm';
  if (classification.includes('PERSONAL_BASIC')) return 'Dữ liệu cá nhân cơ bản';
  if (classification.includes('UNKNOWN')) return 'Chưa xác định';
  return classification;
}

export function getDetectorSourceLabel(source: DetectorSource): string {
  if (source === 'rule') return 'Luật';
  if (source === 'ai') return 'AI';
  if (source === 'dpo') return 'DPO';
  return 'Chưa rõ';
}

export function getCoverageStatusLabel(status: string): string {
  if (status === 'full') return 'Đủ dữ liệu';
  if (status === 'partial') return 'Thiếu ngữ cảnh';
  if (status === 'stub') return 'Demo';
  if (status === 'REVIEW_REQUIRED') return 'Cần duyệt';
  if (status === 'AUTO_SUPPORTED') return 'Tự động';
  if (status === 'UNSUPPORTED') return 'Không hỗ trợ';
  return status;
}
