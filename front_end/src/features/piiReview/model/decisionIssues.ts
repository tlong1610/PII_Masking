import { type FieldDecisionNote, EMPTY_FIELD_NOTE, getFieldKind, validateFieldDecision } from './fieldDecision';
import { JOIN_KEY_ACTIONS } from './joinKeys';
import { type PolicyAction, getActionLabel } from './policyLabels';

/** A decision problem tied to one field, so the UI can jump straight to it. */
export interface DecisionIssue {
  fieldId: number;
  fieldLabel: string;
  message: string;
}

interface IssueField {
  id: number;
  source_path: string;
  field_path: string;
  classification: string;
  recommended_action: PolicyAction;
}

function labelOf(field: IssueField): string {
  return `${field.source_path}.${field.field_path}`;
}

/** Every problem the backend would reject, found before submitting (one entry per field/join group). */
export function collectDecisionIssues(input: {
  fields: IssueField[];
  getAction: (field: IssueField) => PolicyAction;
  notes: Record<number, FieldDecisionNote>;
  joinGroups: Map<number, number[]>;
  today: string;
}): DecisionIssue[] {
  const { fields, getAction, notes, joinGroups, today } = input;
  const issues: DecisionIssue[] = [];
  const byId = new Map(fields.map((field) => [field.id, field]));
  const checkedGroups = new Set<string>();

  fields.forEach((field) => {
    const group = joinGroups.get(field.id);
    const groupKey = group ? [...group].sort((a, b) => a - b).join(',') : '';
    if (group && !checkedGroups.has(groupKey)) {
      checkedGroups.add(groupKey);
      const members = group.map((id) => byId.get(id)).filter((m): m is IssueField => m !== undefined);
      const actions = new Set(members.map(getAction));
      const [only] = [...actions];
      if (actions.size > 1 || (only !== undefined && !JOIN_KEY_ACTIONS.includes(only))) {
        const detail = members.map((m) => `${labelOf(m)} (${getActionLabel(getAction(m))})`).join(', ');
        issues.push({
          fieldId: field.id,
          fieldLabel: labelOf(field),
          message: `Khóa nối phải cùng Băm HMAC hoặc cùng Giữ nguyên ở mọi đầu: ${detail}.`,
        });
      }
    }

    const note = notes[field.id] ?? EMPTY_FIELD_NOTE;
    const kind = getFieldKind(field.classification);
    const action = getAction(field);
    // A plain override gets a default reason in the payload; only confirmations/exceptions need a typed one.
    const needsTypedReason = note.notPersonal || (kind === 'PII' && action === 'KEEP');
    const message = validateFieldDecision({
      kind,
      action,
      recommendedAction: field.recommended_action,
      note: needsTypedReason ? note : { ...note, reason: note.reason || 'default' },
      today,
    });
    if (message) issues.push({ fieldId: field.id, fieldLabel: labelOf(field), message });
  });
  return issues;
}

/** Maps a 422 body (field error or join_key_violations) to issues; empty when it names no field. */
export function issuesFromApiError(responseBody: unknown, fields: IssueField[]): DecisionIssue[] {
  if (typeof responseBody !== 'object' || responseBody === null || !('detail' in responseBody)) return [];
  const detail = responseBody.detail;
  if (typeof detail !== 'object' || detail === null) return [];
  const message = 'message' in detail && typeof detail.message === 'string' ? detail.message : '';
  const byLabel = new Map(fields.map((field) => [labelOf(field), field]));

  if ('field_profile_id' in detail && typeof detail.field_profile_id === 'number') {
    const field = fields.find((item) => item.id === detail.field_profile_id);
    return field ? [{ fieldId: field.id, fieldLabel: labelOf(field), message }] : [];
  }

  if ('join_key_violations' in detail && Array.isArray(detail.join_key_violations)) {
    return detail.join_key_violations.flatMap((violation: unknown) => {
      if (typeof violation !== 'object' || violation === null || !('from' in violation) || !('to' in violation)) {
        return [];
      }
      const from = byLabel.get(String(violation.from));
      if (!from) return [];
      return [
        {
          fieldId: from.id,
          fieldLabel: labelOf(from),
          message: `Khóa nối với ${String(violation.to)} phải dùng cùng một hành động (Băm HMAC hoặc Giữ nguyên).`,
        },
      ];
    });
  }
  return [];
}
