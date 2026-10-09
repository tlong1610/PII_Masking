import { describe, expect, it } from 'vitest';
import { collectDecisionIssues, issuesFromApiError } from './decisionIssues';
import type { PolicyAction } from './policyLabels';

const fields = [
  { id: 1, source_path: 'us_states', field_path: 'state_abbr', classification: 'PERSONAL_BASIC', recommended_action: 'KEEP' as PolicyAction },
  { id: 2, source_path: 'customers', field_path: 'customer_id', classification: 'NON_PERSONAL', recommended_action: 'HMAC' as PolicyAction },
  { id: 3, source_path: 'orders', field_path: 'customer_id', classification: 'NON_PERSONAL', recommended_action: 'HMAC' as PolicyAction },
  { id: 4, source_path: 'products', field_path: 'unit_price', classification: 'NON_PERSONAL', recommended_action: 'KEEP' as PolicyAction },
];

describe('collectDecisionIssues', () => {
  it('lists every field the backend would reject, with its id', () => {
    const actions: Record<number, PolicyAction> = { 2: 'HMAC', 3: 'MASK' };
    const issues = collectDecisionIssues({
      fields,
      getAction: (field) => actions[field.id] ?? field.recommended_action,
      notes: {},
      joinGroups: new Map([
        [2, [2, 3]],
        [3, [2, 3]],
      ]),
      today: '2026-10-04',
    });
    expect(issues.map((issue) => issue.fieldId).sort()).toEqual([1, 2]);
    expect(issues.find((issue) => issue.fieldId === 1)?.fieldLabel).toBe('us_states.state_abbr');
    expect(issues.find((issue) => issue.fieldId === 2)?.message).toContain('orders.customer_id (Che dữ liệu)');
  });
});

describe('issuesFromApiError', () => {
  it('reads field errors and join violations', () => {
    expect(
      issuesFromApiError({ detail: { message: 'cần thời hạn', field_profile_id: 1, field_path: 'us_states.state_abbr' } }, fields),
    ).toEqual([{ fieldId: 1, fieldLabel: 'us_states.state_abbr', message: 'cần thời hạn' }]);

    const join = issuesFromApiError(
      {
        detail: {
          message: 'Build blocked',
          join_key_violations: [
            { from: 'orders.customer_id', from_action: 'MASK', to: 'customers.customer_id', to_action: 'HMAC' },
          ],
        },
      },
      fields,
    );
    expect(join).toHaveLength(1);
    expect(join[0]?.fieldId).toBe(3);
  });

  it('returns nothing for errors without a field', () => {
    expect(issuesFromApiError({ detail: 'Run not found' }, fields)).toEqual([]);
  });
});
