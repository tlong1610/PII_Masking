import { describe, expect, it } from 'vitest';
import { getTransformLabel, getTransformTone } from './transformLabels';
import { TRANSFORM_KINDS } from './types';

describe('transformLabels', () => {
  it('labels every transform in Vietnamese', () => {
    expect(TRANSFORM_KINDS.map(getTransformLabel)).toEqual([
      'Đã che',
      'Đã che thực thể',
      'Băm HMAC',
      'Giữ nguyên',
      'Đã loại bỏ',
    ]);
  });

  it('marks dropped columns as error and HMAC with the accent tone', () => {
    expect(getTransformTone('DROPPED')).toBe('error');
    expect(getTransformTone('HMAC')).toBe('accent');
  });
});
