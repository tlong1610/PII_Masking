import type { PolicyAction } from './policyLabels';

/** Per-field DPO justification kept next to the chosen action. */
export interface FieldDecisionNote {
  reason: string;
  /** DPO confirms an UNKNOWN field is not personal data. */
  notPersonal: boolean;
  /** YYYY-MM-DD; only for a PII field kept below the masking floor. */
  exceptionUntil: string;
}

/** QUASI = indirect identifier (L1: city, IP): may be kept for analysis without an exception. */
export type FieldKind = 'SENSITIVE' | 'PII' | 'QUASI' | 'UNKNOWN' | 'NON_PERSONAL';

export const EMPTY_FIELD_NOTE: FieldDecisionNote = { reason: '', notPersonal: false, exceptionUntil: '' };

export function getFieldKind(classification: string): FieldKind {
  if (classification.includes('NON_PERSONAL')) return 'NON_PERSONAL';
  if (classification.includes('QUASI')) return 'QUASI';
  if (classification.includes('SENSITIVE')) return 'SENSITIVE';
  if (classification.includes('UNKNOWN')) return 'UNKNOWN';
  return 'PII';
}

/** KEEP on an UNKNOWN field is only allowed once the DPO confirms it is not personal data. */
export function needsNotPersonalConfirmation(kind: FieldKind, action: PolicyAction): boolean {
  return kind === 'UNKNOWN' && action === 'KEEP';
}

/** KEEP on a PII field is below the masking floor: an exception with a deadline is required. */
export function needsException(kind: FieldKind, action: PolicyAction): boolean {
  return kind === 'PII' && action === 'KEEP';
}

export function validateFieldDecision(input: {
  kind: FieldKind;
  action: PolicyAction;
  recommendedAction: PolicyAction;
  note: FieldDecisionNote;
  today: string;
}): string | null {
  const { kind, action, recommendedAction, note, today } = input;
  const hasReason = note.reason.trim().length > 0;
  if (kind === 'SENSITIVE' && action === 'KEEP') {
    return 'Dữ liệu nhạy cảm (L3) không được giữ nguyên.';
  }
  if (needsNotPersonalConfirmation(kind, action) && !note.notPersonal) {
    return 'Cột chưa xác định chỉ được giữ nguyên khi bạn xác nhận đây không phải dữ liệu cá nhân.';
  }
  if (needsException(kind, action)) {
    if (!note.exceptionUntil) return 'Giữ nguyên cột PII là ngoại lệ: bắt buộc chọn thời hạn.';
    if (note.exceptionUntil <= today) return 'Thời hạn ngoại lệ phải là một ngày trong tương lai.';
  }
  const needsReason = action !== recommendedAction || note.notPersonal || needsException(kind, action);
  if (needsReason && !hasReason) return 'Bắt buộc ghi lý do cho quyết định này.';
  return null;
}

/** Payload for PUT /runs/{id}/decisions (structurally matches the API's FieldDecisionInput). */
export function buildFieldDecisionPayload(input: {
  fieldProfileId: number;
  fieldPath: string;
  kind: FieldKind;
  action: PolicyAction;
  recommendedAction: PolicyAction;
  note: FieldDecisionNote | undefined;
}): {
  field_profile_id: number;
  action: PolicyAction;
  reason: string;
  is_exception: boolean;
  exception_until: string | null;
  classification_override: 'NON_PERSONAL' | null;
} {
  const { fieldProfileId, fieldPath, kind, action, recommendedAction } = input;
  const note = input.note ?? EMPTY_FIELD_NOTE;
  const isException = needsException(kind, action);
  const reason =
    note.reason.trim() ||
    (action === recommendedAction
      ? `DPO accepted suggested ${action} policy for ${fieldPath}`
      : `DPO changed policy to ${action} for ${fieldPath}`);
  return {
    field_profile_id: fieldProfileId,
    action,
    reason,
    is_exception: isException,
    exception_until: isException && note.exceptionUntil ? `${note.exceptionUntil}T23:59:59Z` : null,
    classification_override: kind === 'UNKNOWN' && note.notPersonal ? 'NON_PERSONAL' : null,
  };
}
