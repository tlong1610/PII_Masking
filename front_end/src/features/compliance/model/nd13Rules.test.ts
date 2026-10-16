import { describe, expect, it } from 'vitest';
import {
  ND13_KEY_ARTICLES,
  OFFICIAL_LEGAL_DOCUMENTS,
  PII_ACTION_MATRIX,
  PII_CLASSIFICATION_RULES,
} from './nd13Rules';

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

  it('strictly orders PII action matrix from L1 -> L2 -> L3 and defines accurate protection rules', () => {
    const levels = PII_ACTION_MATRIX.map((row) => row.level);
    expect(levels).toEqual(['L1', 'L2', 'L3']);

    const l1 = PII_ACTION_MATRIX.find((row) => row.level === 'L1');
    expect(l1?.levelName).toBe('Gián tiếp');
    expect(l1?.mask.label).toBe('Hợp lệ');
    expect(l1?.hmac.label).toBe('Khuyến nghị');
    expect(l1?.drop.label).toBe('Hợp lệ');
    expect(l1?.keep.label).toBe('Hợp lệ');

    const l2 = PII_ACTION_MATRIX.find((row) => row.level === 'L2');
    expect(l2?.levelName).toBe('Cơ bản');
    expect(l2?.mask.label).toBe('Khuyến nghị');
    expect(l2?.hmac.label).toBe('Hợp lệ');
    expect(l2?.drop.label).toBe('Hợp lệ');
    expect(l2?.keep.label).toBe('Có thời hạn');

    const l3 = PII_ACTION_MATRIX.find((row) => row.level === 'L3');
    expect(l3?.levelName).toBe('Nhạy cảm');
    expect(l3?.mask.label).toBe('Bắt buộc');
    expect(l3?.mask.color).toBe('primary');
    expect(l3?.hmac.label).toBe('Hợp lệ');
    expect(l3?.drop.label).toBe('Bắt buộc');
    expect(l3?.drop.color).toBe('primary');
    expect(l3?.keep.label).toBe('Cấm tuyệt đối');
    expect(l3?.keep.color).toBe('error');
  });
});


