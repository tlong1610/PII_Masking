import { describe, expect, it } from 'vitest';
import { addUnread, LONG_TASK_ALERT_MS, removeUnread, shouldAlert, withUnreadCount } from './alertPolicy';

describe('shouldAlert', () => {
  it('stays quiet for a short task the user is watching', () => {
    expect(shouldAlert(3_000, false)).toBe(false);
  });

  it('alerts for a long task or when the page is hidden', () => {
    expect(shouldAlert(LONG_TASK_ALERT_MS, false)).toBe(true);
    expect(shouldAlert(1_000, true)).toBe(true);
  });
});

describe('unread results', () => {
  it('counts each run once and drops it when seen', () => {
    let list = addUnread([], { runId: 7, kind: 'done' });
    list = addUnread(list, { runId: 7, kind: 'error' });
    list = addUnread(list, { runId: 8, kind: 'done' });
    expect(list).toEqual([
      { runId: 7, kind: 'error' },
      { runId: 8, kind: 'done' },
    ]);
    expect(removeUnread(list, 7)).toEqual([{ runId: 8, kind: 'done' }]);
    expect(removeUnread(list, 99)).toBe(list);
  });

  it('prefixes the tab title with the count and removes it again', () => {
    expect(withUnreadCount('PIIGuard Shield', 2)).toBe('(2) PIIGuard Shield');
    expect(withUnreadCount('(2) PIIGuard Shield', 0)).toBe('PIIGuard Shield');
  });
});
