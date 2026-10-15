import { describe, expect, it } from 'vitest';
import { ND13_KEY_ARTICLES, PII_CLASSIFICATION_RULES } from './nd13Rules';

describe('nd13Rules model', () => {
  it('defines rules for L1, L2, and L3 PII levels', () => {
    const levels = PII_CLASSIFICATION_RULES.map((rule) => rule.level);
    expect(levels).toContain('L1');
    expect(levels).toContain('L2');
    expect(levels).toContain('L3');
  });

  it('mandates MASK or DROP for sensitive PII (L3)', () => {
    const sensitive = PII_CLASSIFICATION_RULES.find((rule) => rule.level === 'L3');
    expect(sensitive).toBeDefined();
    expect(sensitive?.securityFloor).toBe('MASK_OR_DROP_MANDATORY');
    expect(sensitive?.allowedActions).not.toContain('KEEP');
  });

  it('includes key legal articles of Decree 13', () => {
    const articleNumbers = ND13_KEY_ARTICLES.map((article) => article.articleNumber);
    expect(articleNumbers).toContain('Điều 9');
    expect(articleNumbers).toContain('Điều 10 & 11');
    expect(articleNumbers).toContain('Điều 17');
    expect(articleNumbers).toContain('Điều 24');
  });
});
