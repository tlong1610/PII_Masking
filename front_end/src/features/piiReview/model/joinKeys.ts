import { type PolicyAction, getActionLabel } from './policyLabels';

/** One join between two scanned fields (from GET /runs/{id}/join-keys). */
export interface JoinKey {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
}

interface JoinField {
  id: number;
  source_path: string;
  field_path: string;
}

/** Join keys only survive protection when every end uses the same deterministic action. */
export const JOIN_KEY_ACTIONS: PolicyAction[] = ['HMAC', 'KEEP'];

/**
 * fieldId -> ids of every field linked to it through join keys (itself included).
 * Linked fields form one group: customers.customer_id, orders.customer_id and
 * support_tickets.customer_id must all share one action.
 */
export function buildJoinGroups(fields: JoinField[], keys: JoinKey[]): Map<number, number[]> {
  const idByPath = new Map(fields.map((field) => [`${field.source_path}.${field.field_path}`, field.id]));
  const parent = new Map<number, number>();
  const find = (id: number): number => {
    let root = id;
    while (parent.get(root) !== undefined && parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };

  keys.forEach((key) => {
    const from = idByPath.get(`${key.from_table}.${key.from_column}`);
    const to = idByPath.get(`${key.to_table}.${key.to_column}`);
    if (from === undefined || to === undefined || from === to) return;
    if (!parent.has(from)) parent.set(from, from);
    if (!parent.has(to)) parent.set(to, to);
    parent.set(find(from), find(to));
  });

  const members = new Map<number, number[]>();
  parent.forEach((_, id) => {
    const root = find(id);
    members.set(root, [...(members.get(root) ?? []), id]);
  });
  const groups = new Map<number, number[]>();
  members.forEach((ids) => ids.forEach((id) => groups.set(id, ids)));
  return groups;
}

/** "orders.customer_id, support_tickets.customer_id" for the other ends of a field's join group. */
export function getJoinPartnerLabel(fieldId: number, groups: Map<number, number[]>, fields: JoinField[]): string {
  const byId = new Map(fields.map((field) => [field.id, field]));
  return (groups.get(fieldId) ?? [])
    .filter((id) => id !== fieldId)
    .map((id) => byId.get(id))
    .filter((field): field is JoinField => field !== undefined)
    .map((field) => `${field.source_path}.${field.field_path}`)
    .join(', ');
}

interface JoinKeyViolation {
  from: string;
  from_action: string;
  to: string;
  to_action: string;
}

function isViolation(value: unknown): value is JoinKeyViolation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'from' in value &&
    'to' in value &&
    'from_action' in value &&
    'to_action' in value
  );
}

function actionLabel(action: string): string {
  return (['MASK', 'HMAC', 'DROP', 'KEEP'] as string[]).includes(action)
    ? getActionLabel(action as PolicyAction)
    : action;
}

/** Turns the build's 422 join_key_violations payload into a readable message, else null. */
export function formatJoinKeyViolations(responseBody: unknown): string | null {
  if (typeof responseBody !== 'object' || responseBody === null || !('detail' in responseBody)) return null;
  const detail = responseBody.detail;
  if (typeof detail !== 'object' || detail === null || !('join_key_violations' in detail)) return null;
  const violations = Array.isArray(detail.join_key_violations)
    ? detail.join_key_violations.filter(isViolation)
    : [];
  if (violations.length === 0) return null;
  const lines = violations.map(
    (v) => `• ${v.from} (${actionLabel(v.from_action)}) ≠ ${v.to} (${actionLabel(v.to_action)})`,
  );
  return [
    'Không thể build: hai đầu của khóa nối phải cùng Băm HMAC hoặc cùng Giữ nguyên, nếu không Analyst sẽ không ghép bảng được.',
    ...lines,
  ].join('\n');
}
