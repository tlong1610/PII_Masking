import { describe, expect, it } from 'vitest';
import { getRunDeleteBlocker, getRunNextAction, getRunStatusLabel, RUN_STATUSES } from './runActions';

describe('getRunNextAction', () => {
  it('sends runs awaiting review back to the review screen', () => {
    expect(getRunNextAction({ status: 'REVIEW_REQUIRED' })).toEqual({ kind: 'review', label: 'Tiếp tục duyệt' });
    expect(getRunNextAction({ status: 'READY_TO_BUILD' }).kind).toBe('review');
  });

  it('links verified and published runs to their dataset', () => {
    expect(getRunNextAction({ status: 'VERIFIED', latest_dataset_id: 7 })).toEqual({
      kind: 'dataset',
      label: 'Xem & phát hành',
      datasetId: 7,
    });
    expect(getRunNextAction({ status: 'PUBLISHED', latest_dataset_id: 7 })).toMatchObject({ kind: 'dataset' });
  });

  it('falls back to opening the run when there is no dataset', () => {
    expect(getRunNextAction({ status: 'PUBLISHED', latest_dataset_id: null }).kind).toBe('view');
    expect(getRunNextAction({ status: 'FAILED' }).kind).toBe('view');
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
