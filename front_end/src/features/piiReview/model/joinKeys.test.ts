import { describe, expect, it } from 'vitest';
import { buildJoinGroups, formatJoinKeyViolations, getJoinPartnerLabel } from './joinKeys';

const fields = [
  { id: 1, source_path: 'customers', field_path: 'customer_id' },
  { id: 2, source_path: 'orders', field_path: 'customer_id' },
  { id: 3, source_path: 'support_tickets', field_path: 'customer_id' },
  { id: 4, source_path: 'orders', field_path: 'order_id' },
  { id: 5, source_path: 'customers', field_path: 'phone' },
];

const keys = [
  { from_table: 'orders', from_column: 'customer_id', to_table: 'customers', to_column: 'customer_id' },
  { from_table: 'support_tickets', from_column: 'customer_id', to_table: 'customers', to_column: 'customer_id' },
  { from_table: 'missing', from_column: 'x', to_table: 'orders', to_column: 'order_id' },
];

describe('buildJoinGroups', () => {
  it('links every end of a shared key into one group and ignores unscanned ends', () => {
    const groups = buildJoinGroups(fields, keys);
    expect([...(groups.get(2) ?? [])].sort()).toEqual([1, 2, 3]);
    expect(groups.get(1)).toBe(groups.get(3));
    expect(groups.has(4)).toBe(false);
    expect(groups.has(5)).toBe(false);
  });

  it('labels the other ends of a field', () => {
    const groups = buildJoinGroups(fields, keys);
    expect(getJoinPartnerLabel(1, groups, fields).split(', ').sort()).toEqual([
      'orders.customer_id',
      'support_tickets.customer_id',
    ]);
  });
});

describe('formatJoinKeyViolations', () => {
  it('formats the build 422 payload', () => {
    const message = formatJoinKeyViolations({
      detail: {
        message: 'Build blocked',
        join_key_violations: [
          { from: 'orders.customer_id', from_action: 'MASK', to: 'customers.customer_id', to_action: 'HMAC' },
        ],
      },
    });
    expect(message).toContain('orders.customer_id (Che dữ liệu) ≠ customers.customer_id (Băm HMAC)');
  });

  it('ignores other errors', () => {
    expect(formatJoinKeyViolations({ detail: 'Run not found' })).toBeNull();
    expect(formatJoinKeyViolations(null)).toBeNull();
  });
});
