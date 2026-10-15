import { describe, expect, it } from 'vitest';
import { ND13_KEY_ARTICLES, OFFICIAL_LEGAL_DOCUMENTS, PII_CLASSIFICATION_RULES } from './nd13Rules';

describe('nd13Rules model', () => {
  it('defines rules for L1, L2, and L3 PII levels and strictly orders them as L1 -> L2 -> L3', () => {
    const levels = PII_CLASSIFICATION_RULES.map((rule) => rule.level);
    expect(levels).toEqual(['L1', 'L2', 'L3']);
  });

  it('mandates MASK or DROP for sensitive PII (L3)', () => {
    const sensitive = PII_CLASSIFICATION_RULES.find((rule) => rule.level === 'L3');
    expect(sensitive).toBeDefined();
    expect(sensitive?.securityFloor).toBe('MASK_OR_DROP_MANDATORY');
    expect(sensitive?.allowedActions).not.toContain('KEEP');
  });

  it('includes key legal articles of Decree 13 and Law 91', () => {
    const articleNumbers = ND13_KEY_ARTICLES.map((article) => article.articleNumber);
    expect(articleNumbers).toContain('Điều 9');
    expect(articleNumbers).toContain('Điều 10 & 11');
    expect(articleNumbers).toContain('Điều 17');
    expect(articleNumbers).toContain('Điều 24');
  });

  it('features the 2 primary legal framework documents with valid web URLs', () => {
    expect(OFFICIAL_LEGAL_DOCUMENTS).toHaveLength(2);

    const codes = OFFICIAL_LEGAL_DOCUMENTS.map((doc) => doc.code);
    expect(codes).toContain('Luật số 91/2025/QH15');
    expect(codes).toContain('Nghị định 356/2025/NĐ-CP');

    for (const doc of OFFICIAL_LEGAL_DOCUMENTS) {
      expect(doc.officialUrl).toMatch(/^https:\/\/thuvienphapluat\.vn\//);
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.promulgatedBy.length).toBeGreaterThan(0);
      expect(doc.effectiveDate.length).toBeGreaterThan(0);
    }
  });

  it('provides verifiable legal citations and web links for every PII classification rule', () => {
    for (const rule of PII_CLASSIFICATION_RULES) {
      expect(rule.legalBasis.length).toBeGreaterThan(0);
      expect(rule.sourceUrl).toMatch(/^https:\/\/thuvienphapluat\.vn\//);
    }
  });

  it('provides verifiable legal citations and web links for every key article', () => {
    for (const article of ND13_KEY_ARTICLES) {
      expect(article.legalBasis.length).toBeGreaterThan(0);
      expect(article.sourceUrl).toMatch(/^https:\/\/thuvienphapluat\.vn\//);
    }
  });
});
