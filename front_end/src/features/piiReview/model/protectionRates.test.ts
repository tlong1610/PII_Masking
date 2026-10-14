import { describe, expect, it } from 'vitest';
import { computeProtectionRates } from './protectionRates';
import type { PolicyAction } from './policyLabels';

type Field = { classification: string; action: PolicyAction };

const rates = (fields: Field[]) => computeProtectionRates(fields, (field) => field.action);

describe('computeProtectionRates', () => {
  it('counts L3 and L2 fields that are not kept as protected', () => {
    const result = rates([
      { classification: 'PERSONAL_SENSITIVE', action: 'HMAC' },
      { classification: 'PERSONAL_BASIC', action: 'MASK' },
      { classification: 'PERSONAL_BASIC', action: 'KEEP' },
      { classification: 'NON_PERSONAL', action: 'KEEP' },
    ]);
    expect(result.sensitive).toEqual({ total: 1, protectedCount: 1, percent: 100 });
    expect(result.basic).toEqual({ total: 2, protectedCount: 1, percent: 50 });
  });

  it('reports no percentage when a level has no fields', () => {
    const result = rates([{ classification: 'NON_PERSONAL', action: 'KEEP' }]);
    expect(result.sensitive.percent).toBeNull();
    expect(result.basic.percent).toBeNull();
  });
});
