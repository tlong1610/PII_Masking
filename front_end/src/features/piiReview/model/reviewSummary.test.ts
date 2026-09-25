import { describe, expect, it } from 'vitest';
import { canBuildDataset, getReviewSummary } from './reviewSummary';
import type { ReviewField } from './types';

const baseField: ReviewField = {
  id: 'field',
  path: 'customers.name',
  dataType: 'text',
  filteredProfile: 'pattern: person-name',
  classification: 'PERSONAL_BASIC',
  taxonomyLabel: 'Họ tên',
  legalBasis: 'Điều 3 khoản 1',
  suggestionSource: 'rule',
  coverage: 'AUTO_SUPPORTED',
  action: 'MASK',
  reviewState: 'accepted',
  impact: 'Không ảnh hưởng downstream',
  reason: 'Tên khách hàng không cần cho tác vụ mẫu.',
};

describe('reviewSummary', () => {
  it('counts pending fields and unknown drops', () => {
    const fields: ReviewField[] = [
      baseField,
      {
        ...baseField,
        id: 'unknown',
        classification: 'UNKNOWN',
        action: 'DROP',
        reviewState: 'edited',
      },
      {
        ...baseField,
        id: 'pending',
        action: 'HMAC',
        reviewState: 'pending',
      },
    ];

    expect(getReviewSummary(fields)).toMatchObject({
      total: 3,
      decided: 2,
      pending: 1,
      unknownDropped: 1,
      mask: 1,
      drop: 1,
      hmac: 1,
    });
    expect(canBuildDataset(fields)).toBe(false);
  });
});
