import { getFieldKind } from './fieldDecision';
import type { PolicyAction } from './policyLabels';

interface StatField {
  id: number;
  classification: string;
  recommended_action: PolicyAction;
}

export interface FieldStats {
  total: number;
  /** L3 sensitive, L2 basic, L1 indirect (quasi-identifier); `other` is non-personal or not yet classified. */
  sensitive: number;
  basic: number;
  indirect: number;
  other: number;
  /** L3 + L2 columns: personal data that must not stay raw. */
  mustProtect: number;
  /** Of those, how many are MASK/REDACT/HMAC/DROP under the current decisions. */
  protectedCount: number;
  /** Columns whose action differs from the scanner's recommendation. */
  overridden: number;
}

/** Counts behind the summary cards of a run, computed from the decisions currently on screen. */
export function getFieldStats<T extends StatField>(fields: T[], getAction: (field: T) => PolicyAction): FieldStats {
  return fields.reduce<FieldStats>(
    (stats, field) => {
      const kind = getFieldKind(field.classification);
      const action = getAction(field);
      const mustProtect = kind === 'SENSITIVE' || kind === 'PII';
      return {
        total: stats.total + 1,
        sensitive: stats.sensitive + (kind === 'SENSITIVE' ? 1 : 0),
        basic: stats.basic + (kind === 'PII' ? 1 : 0),
        indirect: stats.indirect + (kind === 'QUASI' ? 1 : 0),
        other: stats.other + (kind === 'NON_PERSONAL' || kind === 'UNKNOWN' ? 1 : 0),
        mustProtect: stats.mustProtect + (mustProtect ? 1 : 0),
        protectedCount: stats.protectedCount + (mustProtect && action !== 'KEEP' ? 1 : 0),
        overridden: stats.overridden + (action !== field.recommended_action ? 1 : 0),
      };
    },
    { total: 0, sensitive: 0, basic: 0, indirect: 0, other: 0, mustProtect: 0, protectedCount: 0, overridden: 0 },
  );
}

/** Share of L3/L2 columns protected, or null when the run has none. */
export function getProtectionPercent(stats: FieldStats): number | null {
  return stats.mustProtect === 0 ? null : Math.round((stats.protectedCount / stats.mustProtect) * 100);
}
