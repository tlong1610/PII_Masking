import { describe, expect, it } from 'vitest';
import { getFieldStats, getProtectionPercent } from './fieldStats';
import { getPiiTypeLabel } from './piiTypeLabels';

const fields = [
  { id: 1, classification: 'PERSONAL_SENSITIVE', recommended_action: 'DROP' as const },
  { id: 2, classification: 'PERSONAL_BASIC', recommended_action: 'MASK' as const },
  { id: 3, classification: 'PERSONAL_BASIC', recommended_action: 'MASK' as const },
  { id: 4, classification: 'QUASI_IDENTIFIER', recommended_action: 'KEEP' as const },
  { id: 5, classification: 'NON_PERSONAL', recommended_action: 'HMAC' as const },
];

describe('getFieldStats', () => {
  it('counts levels and protection under the recommendations', () => {
    const stats = getFieldStats(fields, (field) => field.recommended_action);
    expect(stats).toEqual({
      total: 5,
      sensitive: 1,
      basic: 2,
      indirect: 1,
      other: 1,
      mustProtect: 3,
      protectedCount: 3,
      overridden: 0,
    });
    expect(getProtectionPercent(stats)).toBe(100);
  });

  it('treats KEEP on personal data as unprotected and counts the override', () => {
    const stats = getFieldStats(fields, (field) => (field.id === 2 ? 'KEEP' : field.recommended_action));
    expect(stats.protectedCount).toBe(2);
    expect(stats.overridden).toBe(1);
    expect(getProtectionPercent(stats)).toBe(67);
  });

  it('has no protection rate without personal columns', () => {
    expect(getProtectionPercent(getFieldStats([], () => 'MASK'))).toBeNull();
  });
});

describe('getPiiTypeLabel', () => {
  it('names known PII types', () => {
    expect(getPiiTypeLabel('FULL_NAME', 'PERSONAL_BASIC')).toBe('Họ tên');
    expect(getPiiTypeLabel('phone', 'PERSONAL_BASIC')).toBe('Số điện thoại');
  });

  it('falls back to the classification', () => {
    expect(getPiiTypeLabel(null, 'UNKNOWN')).toBe('Chưa xác định');
    expect(getPiiTypeLabel('PERSONAL_SENSITIVE', 'PERSONAL_SENSITIVE')).toBe('Dữ liệu nhạy cảm');
  });
});
