import { getFieldKind } from './fieldDecision';
import type { PolicyAction } from './policyLabels';

export interface ProtectionRate {
  total: number;
  protectedCount: number;
  /** Null when there is no field of this level (nothing to protect). */
  percent: number | null;
}

/** Share of L3 (sensitive) and L2 (basic) personal fields not left as KEEP under the current decisions. */
export function computeProtectionRates<T extends { classification: string }>(
  fields: T[],
  getAction: (field: T) => PolicyAction,
): { sensitive: ProtectionRate; basic: ProtectionRate } {
  const rate = (kind: 'SENSITIVE' | 'PII'): ProtectionRate => {
    const scoped = fields.filter((field) => getFieldKind(field.classification) === kind);
    const protectedCount = scoped.filter((field) => getAction(field) !== 'KEEP').length;
    return {
      total: scoped.length,
      protectedCount,
      percent: scoped.length === 0 ? null : Math.round((protectedCount / scoped.length) * 100),
    };
  };
  return { sensitive: rate('SENSITIVE'), basic: rate('PII') };
}
