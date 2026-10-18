import type { PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertsProvider } from './AlertsProvider';
import { useAlerts } from './alertsContext';

const play = vi.fn(() => Promise.resolve());

const wrapper = ({ children }: PropsWithChildren) => (
  <MemoryRouter>
    <AlertsProvider>{children}</AlertsProvider>
  </MemoryRouter>
);

describe('AlertsProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = 'PIIGuard Shield';
    play.mockClear();
    vi.stubGlobal('Audio', vi.fn(() => ({ play })));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stays quiet when a short task ends on screen', () => {
    const { result } = renderHook(() => useAlerts(), { wrapper });
    act(() => result.current.finishLongTask(result.current.startLongTask(), { kind: 'done', title: 'x', runId: 3, flagUnread: true }));
    expect(play).not.toHaveBeenCalled();
    expect(result.current.unread).toEqual([]);
  });

  it('plays a sound and flags a long scan until its run is opened', () => {
    vi.useFakeTimers({ now: 0 });
    const { result } = renderHook(() => useAlerts(), { wrapper });
    const task = result.current.startLongTask();
    vi.setSystemTime(41_000);
    act(() => result.current.finishLongTask(task, { kind: 'done', title: 'Đã quét xong', runId: 26, flagUnread: true }));

    expect(play).toHaveBeenCalledTimes(1);
    expect(result.current.unread).toEqual([{ runId: 26, kind: 'done' }]);
    expect(document.title).toBe('(1) PIIGuard Shield');

    act(() => result.current.setViewingRun(26));
    expect(result.current.unread).toEqual([]);
    expect(document.title).toBe('PIIGuard Shield');
  });

  it('does not flag the run already on screen, and respects the mute switch', () => {
    vi.useFakeTimers({ now: 0 });
    const { result } = renderHook(() => useAlerts(), { wrapper });
    act(() => result.current.setViewingRun(5));
    act(() => result.current.toggleSound());
    const task = result.current.startLongTask();
    vi.setSystemTime(20_000);
    act(() => result.current.finishLongTask(task, { kind: 'error', title: 'x', runId: 5, flagUnread: true }));

    expect(play).not.toHaveBeenCalled();
    expect(result.current.unread).toEqual([]);
    expect(JSON.parse(localStorage.getItem('piiguard.alertSound') ?? 'null')).toBe(false);
  });
});
