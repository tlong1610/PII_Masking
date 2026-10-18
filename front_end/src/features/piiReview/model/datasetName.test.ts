import { describe, expect, it } from 'vitest';
import { cleanDatasetName, DATASET_NAME_MAX, suggestDatasetName } from './datasetName';

describe('suggestDatasetName', () => {
  it('keeps a name the DPO already chose', () => {
    expect(suggestDatasetName('Doanh thu Q3', 'Dtb Phúc', ['orders'])).toBe('Doanh thu Q3');
  });

  it('replaces the technical default with source and tables', () => {
    expect(suggestDatasetName('run-7-snapshot', 'Dtb Phúc', ['customers', 'orders'])).toBe('Dtb Phúc – customers, orders');
    expect(suggestDatasetName(null, 'CRM', ['a', 'b', 'c', 'd', 'e'])).toBe('CRM – a, b, c +2');
  });

  it('stays within the server limit', () => {
    expect(suggestDatasetName(null, 'x'.repeat(200), ['t']).length).toBeLessThanOrEqual(DATASET_NAME_MAX);
  });
});

describe('cleanDatasetName', () => {
  it('collapses whitespace like the server does', () => {
    expect(cleanDatasetName('  Khách   hàng \n Q3 ')).toBe('Khách hàng Q3');
  });
});
