import { describe, expect, it } from 'vitest';
import { formatDateTime } from './formatDateTime';

describe('formatDateTime', () => {
  it('renders a dash for missing or invalid values', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('not-a-date')).toBe('—');
  });

  it('treats zone-less timestamps as UTC', () => {
    expect(formatDateTime('2026-10-11T08:30:00')).toBe(formatDateTime('2026-10-11T08:30:00Z'));
  });

  it('formats a valid timestamp with date and time', () => {
    expect(formatDateTime('2026-10-11T08:30:00Z')).toMatch(/2026/);
  });
});
