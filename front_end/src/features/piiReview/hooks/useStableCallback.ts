import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * A handler with a fixed identity that always calls the latest `fn`. Lets memoized table rows skip
 * re-rendering when the page state behind a handler changes.
 */
export function useStableCallback<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
): (...args: Args) => Result {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: Args) => ref.current(...args), []);
}
