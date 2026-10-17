import type { StatusTone } from '@/shared/ui';
import type { TransformKind } from './types';

const TRANSFORM_LABELS: Record<TransformKind, string> = {
  MASK: 'Đã che',
  REDACT: 'Đã che thực thể',
  HMAC: 'Băm HMAC',
  KEEP: 'Giữ nguyên',
  DROPPED: 'Đã loại bỏ',
};

// Same colour per protection as the DPO action picker (MASK amber, HMAC violet, DROP red...).
const TRANSFORM_TONES: Record<TransformKind, StatusTone> = {
  MASK: 'warning',
  REDACT: 'info',
  HMAC: 'accent',
  KEEP: 'default',
  DROPPED: 'error',
};

export function getTransformLabel(transform: TransformKind): string {
  return TRANSFORM_LABELS[transform];
}

export function getTransformTone(transform: TransformKind): StatusTone {
  return TRANSFORM_TONES[transform];
}
