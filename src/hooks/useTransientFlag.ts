import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages a transient value (e.g., an applied item key or status token) that resets
 * to `null` after `durationMs` and clears pending timers on unmount or re-trigger.
 */
export function useTransientValue<T>(durationMs = 1800): [T | null, (value: T) => void] {
  const [value, setValue] = useState<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const trigger = useCallback(
    (nextValue: T) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      setValue(nextValue);
      timerRef.current = setTimeout(() => {
        setValue(null);
        timerRef.current = null;
      }, durationMs);
    },
    [durationMs],
  );

  return [value, trigger];
}

/**
 * Manages a boolean feedback flag (e.g. "Copied", "Applied") that automatically resets
 * after `durationMs` and cleans up pending timers on unmount or re-trigger.
 */
export function useTransientFlag(durationMs = 1800): [boolean, () => void] {
  const [active, triggerValue] = useTransientValue<true>(durationMs);
  const trigger = useCallback(() => triggerValue(true), [triggerValue]);
  return [active !== null, trigger];
}
