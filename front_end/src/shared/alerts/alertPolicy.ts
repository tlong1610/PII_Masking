/** A finished task earns a sound / red dot only past this, or while the user looks elsewhere (FE-32). */
export const LONG_TASK_ALERT_MS = 10_000;

export function shouldAlert(elapsedMs: number, pageHidden: boolean): boolean {
  return pageHidden || elapsedMs >= LONG_TASK_ALERT_MS;
}

export type UnreadResult = { runId: number; kind: 'done' | 'error' };

/** One entry per run: a newer outcome of the same run replaces the older one. */
export function addUnread(list: UnreadResult[], item: UnreadResult): UnreadResult[] {
  return [...list.filter((entry) => entry.runId !== item.runId), item];
}

export function removeUnread(list: UnreadResult[], runId: number): UnreadResult[] {
  return list.some((entry) => entry.runId === runId) ? list.filter((entry) => entry.runId !== runId) : list;
}

export function withUnreadCount(title: string, count: number): string {
  const base = title.replace(/^\(\d+\) /, '');
  return count > 0 ? `(${count}) ${base}` : base;
}
