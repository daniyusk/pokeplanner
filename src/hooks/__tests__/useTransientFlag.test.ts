import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTransientFlag, useTransientValue } from '@/hooks/useTransientFlag';

describe('useTransientFlag', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('activates when triggered and resets after durationMs', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTransientFlag(1500));

    expect(result.current[0]).toBe(false);
    act(() => {
      result.current[1]();
    });
    expect(result.current[0]).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current[0]).toBe(false);
  });

  it('clears pending timer on unmount without errors', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => useTransientFlag(1800));

    act(() => {
      result.current[1]();
    });
    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });

  it('tracks a transient keyed value and resets to null when duration expires', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTransientValue<string>(1500));

    expect(result.current[0]).toBeNull();
    act(() => {
      result.current[1]('garchomp');
    });
    expect(result.current[0]).toBe('garchomp');

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current[0]).toBeNull();
  });
});
