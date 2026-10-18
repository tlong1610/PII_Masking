import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { addUnread, removeUnread, shouldAlert, type UnreadResult, withUnreadCount } from './alertPolicy';
import { AlertsContext, type Alerts, type LongTask, type LongTaskOutcome } from './alertsContext';

const UNREAD_KEY = 'piiguard.unreadRuns';
const SOUND_KEY = 'piiguard.alertSound';

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function store(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / blocked storage: the alerts still work for this session.
  }
}

function pageHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

function playSound(kind: 'done' | 'error'): void {
  try {
    void new Audio(`/sounds/${kind}.wav`).play().catch(() => undefined);
  } catch {
    // No audio support (tests, locked-down browsers): stay silent.
  }
}

/** Sound, red dot and (tab hidden) browser notification when a long scan or build ends — nothing else (FE-32). */
export function AlertsProvider({ children }: PropsWithChildren): JSX.Element {
  const navigate = useNavigate();
  const [unread, setUnread] = useState<UnreadResult[]>(() => readStored<UnreadResult[]>(UNREAD_KEY, []));
  const [soundOn, setSoundOn] = useState<boolean>(() => readStored<boolean>(SOUND_KEY, true));
  const viewingRun = useRef<number | null>(null);

  useEffect(() => store(UNREAD_KEY, unread), [unread]);
  useEffect(() => store(SOUND_KEY, soundOn), [soundOn]);
  useEffect(() => {
    document.title = withUnreadCount(document.title, unread.length);
  }, [unread.length]);

  // Coming back to the tab counts as seeing the run that is on screen.
  useEffect(() => {
    const onVisible = (): void => {
      const runId = viewingRun.current;
      if (!pageHidden() && runId !== null) setUnread((list) => removeUnread(list, runId));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const setViewingRun = useCallback((runId: number | null) => {
    viewingRun.current = runId;
    if (runId !== null && !pageHidden()) setUnread((list) => removeUnread(list, runId));
  }, []);

  const startLongTask = useCallback((): LongTask => {
    // Asked here, on a user click, never on page load.
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => undefined);
    }
    return { startedAt: Date.now() };
  }, []);

  const finishLongTask = useCallback(
    (task: LongTask, outcome: LongTaskOutcome) => {
      const hidden = pageHidden();
      if (!shouldAlert(Date.now() - task.startedAt, hidden)) return;
      if (soundOn) playSound(outcome.kind);

      const { runId } = outcome;
      if (outcome.flagUnread && runId !== undefined && (hidden || viewingRun.current !== runId)) {
        setUnread((list) => addUnread(list, { runId, kind: outcome.kind }));
      }
      if (hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const notification = new Notification(outcome.title, { body: outcome.body, tag: `run-${runId ?? 'task'}` });
          notification.onclick = () => {
            window.focus();
            if (runId !== undefined) navigate(routes.dpoRun(runId));
            notification.close();
          };
        } catch {
          // Some browsers only allow notifications from a service worker.
        }
      }
    },
    [navigate, soundOn],
  );

  const toggleSound = useCallback(() => setSoundOn((on) => !on), []);

  const value = useMemo<Alerts>(
    () => ({ startLongTask, finishLongTask, setViewingRun, unread, soundOn, toggleSound }),
    [startLongTask, finishLongTask, setViewingRun, unread, soundOn, toggleSound],
  );
  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}
