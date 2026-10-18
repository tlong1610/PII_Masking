import { createContext, useContext } from 'react';
import type { UnreadResult } from './alertPolicy';

export type LongTask = { startedAt: number };

export type LongTaskOutcome = {
  kind: 'done' | 'error';
  /** Shown by the browser notification when the tab is hidden. */
  title: string;
  body?: string;
  /** Run to open from the notification and to flag with the red dot. */
  runId?: number;
  /** Whether a missed outcome deserves a red dot (scans; failed verification). */
  flagUnread?: boolean;
};

export type Alerts = {
  startLongTask: () => LongTask;
  finishLongTask: (task: LongTask, outcome: LongTaskOutcome) => void;
  /** The run on screen: its result counts as seen while the page is visible. */
  setViewingRun: (runId: number | null) => void;
  unread: UnreadResult[];
  soundOn: boolean;
  toggleSound: () => void;
};

const noop = (): void => undefined;

// Without a provider (isolated component tests) alerts are simply dropped.
export const AlertsContext = createContext<Alerts>({
  startLongTask: () => ({ startedAt: Date.now() }),
  finishLongTask: noop,
  setViewingRun: noop,
  unread: [],
  soundOn: false,
  toggleSound: noop,
});

export function useAlerts(): Alerts {
  return useContext(AlertsContext);
}
