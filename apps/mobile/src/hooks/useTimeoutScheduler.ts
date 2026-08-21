import { useCallback, useEffect, useRef } from 'react';

export function useTimeoutScheduler() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const schedule = useCallback(
    (callback: () => void, delayMs: number) => {
      cancel();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        callback();
      }, delayMs);
    },
    [cancel]
  );

  useEffect(() => cancel, [cancel]);

  return { schedule, cancel };
}
