import { describe, expect, it } from 'vitest';
import { MASKING_DEMO_ITEMS, maskString, simulateHmacSha256 } from './maskingDemos';

describe('maskingDemos model', () => {
  it('covers essential personal data types', () => {
    const ids = MASKING_DEMO_ITEMS.map((item) => item.id);
    expect(ids).toContain('full-name');
    expect(ids).toContain('phone-number');
    expect(ids).toContain('citizen-id');
    expect(ids).toContain('email-address');
    expect(ids).toContain('bank-account');
    expect(ids).toContain('health-record');
    expect(ids).toContain('join-key');
  });

  it('marks join-key as joinable with HMAC transformation', () => {
    const joinKeyItem = MASKING_DEMO_ITEMS.find((item) => item.id === 'join-key');
    expect(joinKeyItem).toBeDefined();
    expect(joinKeyItem?.joinable).toBe(true);
    expect(joinKeyItem?.hmacValue).toHaveLength(64);
  });

  it('provides non-empty transformed values for each mode', () => {
    for (const item of MASKING_DEMO_ITEMS) {
      expect(item.rawValue.length).toBeGreaterThan(0);
      expect(item.maskValue.length).toBeGreaterThan(0);
      expect(item.hmacValue.length).toBeGreaterThan(0);
      expect(item.dropValue.length).toBeGreaterThan(0);
      expect(item.keepValue.length).toBeGreaterThan(0);
    }
  });

  it('masks various types of strings uniformly as ***', () => {
    expect(maskString('phuc.nguyen@enterprise.vn')).toBe('***');
    expect(maskString('0912345678')).toBe('***');
    expect(maskString('Nguyễn Văn Phúc')).toBe('***');
    expect(maskString('')).toBe('***');
  });

  it('masks full-name and all demo items strictly as *** placeholder', () => {
    const nameItem = MASKING_DEMO_ITEMS.find((item) => item.id === 'full-name');
    expect(nameItem?.maskValue).toBe('***');
    for (const item of MASKING_DEMO_ITEMS) {
      expect(item.maskValue).toMatch(/^\*\*\*/);
    }
  });

  it('generates 64-char pseudo-HMAC hex string', () => {
    const hash = simulateHmacSha256('test');
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });
});


