import { describe, expect, it } from 'vitest';
import { getRunDeleteBlocker, getRunNextAction, getRunStatusLabel, getRunTab, RUN_STATUSES } from './runActions';

describe('getRunNextAction', () => {
  it('sends runs awaiting review back to the review screen', () => {
    expect(getRunNextAction({ status: 'REVIEW_REQUIRED' })).toEqual({ kind: 'review', label: 'Tiếp tục duyệt' });
    expect(getRunNextAction({ status: 'READY_TO_BUILD' }).kind).toBe('review');
    expect(getRunNextAction({ status: 'FAILED', latest_dataset_id: 3 }).kind).toBe('review');
  });

  it('publishes a saved run and revokes a published one, in place', () => {
    expect(getRunNextAction({ status: 'VERIFIED', latest_dataset_id: 7 })).toEqual({
      kind: 'publish',
      label: 'Phát hành',
      datasetId: 7,
    });
    expect(getRunNextAction({ status: 'PUBLISHED', latest_dataset_id: 7 })).toMatchObject({ kind: 'revoke' });
  });

  it('only opens runs with nothing left to do', () => {
    expect(getRunNextAction({ status: 'FAILED' }).kind).toBe('view');
    expect(getRunNextAction({ status: 'CANCELLED' }).kind).toBe('view');
  });
});

describe('getRunTab', () => {
  it('groups runs by what the DPO has to do', () => {
    expect(getRunTab({ status: 'READY_TO_BUILD' })).toBe('REVIEW');
    expect(getRunTab({ status: 'VERIFIED' })).toBe('READY');
    expect(getRunTab({ status: 'PUBLISHED' })).toBe('PUBLISHED');
    expect(getRunTab({ status: 'FAILED', latest_dataset_id: 2 })).toBe('REVIEW');
    expect(getRunTab({ status: 'FAILED' })).toBe('OTHER');
  });
});

describe('getRunStatusLabel', () => {
  it('has a label for every status', () => {
    for (const status of RUN_STATUSES) {
      expect(getRunStatusLabel(status)).not.toBe('');
    }
  });
});

describe('getRunDeleteBlocker', () => {
  it('blocks runs whose latest dataset still has a snapshot', () => {
    expect(getRunDeleteBlocker({ latest_dataset_id: 4, latest_dataset_status: 'PUBLISHED' })).toContain('#4');
    expect(getRunDeleteBlocker({ latest_dataset_id: 4, latest_dataset_status: 'VERIFIED' })).not.toBeNull();
  });

  it('allows runs without a live snapshot', () => {
    expect(getRunDeleteBlocker({ latest_dataset_id: null, latest_dataset_status: null })).toBeNull();
    expect(getRunDeleteBlocker({ latest_dataset_id: 4, latest_dataset_status: 'REVOKED' })).toBeNull();
    expect(getRunDeleteBlocker({ latest_dataset_id: 4, latest_dataset_status: 'FAILED' })).toBeNull();
  });
});
