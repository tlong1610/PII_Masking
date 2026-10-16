import { describe, expect, it } from 'vitest';
import { groupByDay } from './activityGroups';

describe('groupByDay', () => {
  const now = new Date(2026, 9, 16, 12, 0);
  const at = (day: number, hour: number) => ({ created_at: new Date(2026, 9, day, hour).toISOString() });

  it('labels today and yesterday and keeps the order', () => {
    const groups = groupByDay([at(16, 11), at(16, 9), at(15, 20), at(13, 8)], now);
    expect(groups.map((group) => group.label.startsWith('Hôm') ? group.label : 'date')).toEqual([
      'Hôm nay',
      'Hôm qua',
      'date',
    ]);
    expect(groups.map((group) => group.items.length)).toEqual([2, 1, 1]);
  });
});
