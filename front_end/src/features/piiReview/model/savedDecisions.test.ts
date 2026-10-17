import { describe, expect, it } from 'vitest';
import { getLatestDataset, restoreSavedDecisions } from './savedDecisions';

describe('restoreSavedDecisions', () => {
  it('turns saved decisions into overrides and notes', () => {
    const { overrides, notes } = restoreSavedDecisions([
      { field_profile_id: 1, action: 'MASK', reason: 'default' },
      {
        field_profile_id: 2,
        action: 'KEEP',
        reason: 'analytics need',
        is_exception: true,
        exception_until: '2026-12-31T00:00:00Z',
      },
    ]);
    expect(overrides).toEqual({ 1: 'MASK', 2: 'KEEP' });
    expect(notes[1]).toEqual({ reason: 'default', notPersonal: false, exceptionUntil: '' });
    expect(notes[2]?.exceptionUntil).toBe('2026-12-31');
  });

  it('returns empty state for a run without decisions', () => {
    expect(restoreSavedDecisions([])).toEqual({ overrides: {}, notes: {} });
  });
});

describe('getLatestDataset', () => {
  it('picks the dataset with the highest id', () => {
    expect(getLatestDataset([{ id: 3 }, { id: 9 }, { id: 5 }])).toEqual({ id: 9 });
  });

  it('returns null when nothing was built', () => {
    expect(getLatestDataset([])).toBeNull();
  });
});
