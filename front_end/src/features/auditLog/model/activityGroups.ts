import { parseTimestamp } from '@/shared/lib/formatDateTime';

const DAY_FORMAT = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
const TIME_FORMAT = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });

export interface DayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Splits newest-first events into local days: "Hôm nay", "Hôm qua", then the full date. */
export function groupByDay<T extends { created_at: string }>(items: T[], now: Date = new Date()): DayGroup<T>[] {
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const date = parseTimestamp(item.created_at);
    const key = date ? dayKey(date) : 'unknown';
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const label =
        key === today ? 'Hôm nay' : key === yesterday ? 'Hôm qua' : date ? DAY_FORMAT.format(date) : 'Không rõ thời điểm';
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export function formatTime(value: string): string {
  const date = parseTimestamp(value);
  return date ? TIME_FORMAT.format(date) : '—';
}
