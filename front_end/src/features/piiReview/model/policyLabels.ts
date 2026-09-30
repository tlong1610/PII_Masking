export type PolicyAction = 'MASK' | 'HMAC' | 'DROP' | 'KEEP';
export type DatasetStatus = 'STAGING' | 'VERIFIED' | 'PUBLISHED' | 'REVOKED' | 'FAILED';
export type TransformKind = 'MASK' | 'HMAC' | 'KEEP' | 'DROPPED';
export type DetectorSource = 'rule' | 'ai' | 'dpo' | 'unknown';
export type ChipTone = 'default' | 'error' | 'info' | 'success' | 'warning';
export type ActionTone = 'error' | 'info' | 'success' | 'warning';

export const POLICY_ACTIONS: PolicyAction[] = ['MASK', 'HMAC', 'DROP', 'KEEP'];
export const TRANSFORMS: TransformKind[] = ['MASK', 'HMAC', 'KEEP', 'DROPPED'];

export function getActionLabel(action: PolicyAction): string {
  if (action === 'MASK') return 'Che dữ liệu';
  if (action === 'HMAC') return 'Băm HMAC';
  if (action === 'DROP') return 'Loại bỏ';
  return 'Giữ nguyên';
}

export function getActionColor(action: PolicyAction): ActionTone {
  if (action === 'DROP') return 'error';
  if (action === 'MASK') return 'warning';
  if (action === 'HMAC') return 'info';
  return 'success';
}

export function getDatasetStatusLabel(status: DatasetStatus): string {
  if (status === 'PUBLISHED') return 'Đã phát hành';
  if (status === 'VERIFIED') return 'Đã xác minh';
  if (status === 'STAGING') return 'Đang chuẩn bị';
  if (status === 'REVOKED') return 'Đã thu hồi';
  return 'Thất bại';
}

export function getDatasetStatusColor(status: DatasetStatus): ChipTone {
  if (status === 'PUBLISHED' || status === 'VERIFIED') return 'success';
  if (status === 'FAILED' || status === 'REVOKED') return 'error';
  return 'warning';
}

export function getTransformLabel(transform: TransformKind): string {
  if (transform === 'MASK') return 'Đã che';
  if (transform === 'HMAC') return 'Băm HMAC';
  if (transform === 'KEEP') return 'Giữ nguyên';
  return 'Đã loại bỏ';
}

export function getTransformColor(transform: TransformKind): ChipTone {
  if (transform === 'DROPPED') return 'error';
  if (transform === 'MASK') return 'warning';
  if (transform === 'HMAC') return 'info';
  return 'success';
}

export function getRiskTone(classification: string): ChipTone {
  if (classification.includes('NON_PERSONAL')) return 'default';
  if (classification.includes('SENSITIVE')) return 'error';
  if (classification.includes('PERSONAL')) return 'warning';
  return 'default';
}

export function getRiskLabel(classification: string): string {
  if (classification.includes('NON_PERSONAL')) return 'Rủi ro thấp';
  if (classification.includes('SENSITIVE')) return 'Nhạy cảm';
  if (classification.includes('PERSONAL')) return 'Có PII';
  if (classification.includes('UNKNOWN')) return 'Cần kiểm tra';
  return 'Rủi ro thấp';
}

export function getClassificationLabel(classification: string): string {
  if (classification.includes('NON_PERSONAL')) return 'Không phải dữ liệu cá nhân';
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
