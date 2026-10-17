import { describe, expect, it } from 'vitest';
import { countPendingChanges, getReviewActions } from './reviewActions';

describe('getReviewActions', () => {
  it('has no run action before a scan (the scope step owns the scan button)', () => {
    expect(getReviewActions({ runStatus: null, datasetStatus: null, hasPendingChanges: false })).toEqual({
      primary: null,
      secondary: null,
      editable: false,
      lock: null,
    });
  });

  it('saves while the decisions are under review', () => {
    for (const runStatus of ['REVIEW_REQUIRED', 'READY_TO_BUILD'] as const) {
      expect(getReviewActions({ runStatus, datasetStatus: null, hasPendingChanges: false })).toMatchObject({
        primary: 'BUILD',
        editable: true,
        lock: null,
      });
    }
  });

  it('publishes a saved run and keeps it editable', () => {
    expect(getReviewActions({ runStatus: 'VERIFIED', datasetStatus: 'VERIFIED', hasPendingChanges: false })).toEqual({
      primary: 'PUBLISH',
      secondary: null,
      editable: true,
      lock: null,
    });
  });

  it('asks to save unsaved edits before publishing', () => {
    expect(
      getReviewActions({ runStatus: 'VERIFIED', datasetStatus: 'VERIFIED', hasPendingChanges: true }).primary,
    ).toBe('BUILD');
  });

  it('lets a run whose verification failed be fixed and saved again', () => {
    expect(getReviewActions({ runStatus: 'FAILED', datasetStatus: 'FAILED', hasPendingChanges: false })).toMatchObject({
      primary: 'BUILD',
      editable: true,
    });
  });

  it('only rescans a run that failed before anything was saved', () => {
    expect(getReviewActions({ runStatus: 'FAILED', datasetStatus: null, hasPendingChanges: false })).toMatchObject({
      primary: 'RESCAN',
      editable: false,
    });
  });

  it('locks a published run and offers revoking it', () => {
    const actions = getReviewActions({ runStatus: 'PUBLISHED', datasetStatus: 'PUBLISHED', hasPendingChanges: false });
    expect(actions).toMatchObject({ primary: null, secondary: 'REVOKE', editable: false });
    expect(actions.lock?.message).toContain('Thu hồi');
  });
});

describe('countPendingChanges', () => {
  const fields = [
    { id: 1, recommended_action: 'MASK' as const },
    { id: 2, recommended_action: 'HMAC' as const },
  ];

  it('is zero when the screen matches the saved decisions', () => {
    const saved = [
      { field_profile_id: 1, action: 'MASK' as const },
      { field_profile_id: 2, action: 'HMAC' as const },
    ];
    expect(countPendingChanges(fields, (field) => field.recommended_action, saved)).toBe(0);
  });

  it('counts edited and never-saved fields', () => {
    const saved = [{ field_profile_id: 1, action: 'MASK' as const }];
    expect(countPendingChanges(fields, (field) => (field.id === 1 ? 'DROP' : field.recommended_action), saved)).toBe(2);
  });
});
