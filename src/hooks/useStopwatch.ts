import { useRef, useCallback } from 'react';

export function useStopwatch() {
  const startTimeRef = useRef<number | null>(null);

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
  }, []);

  const stop = useCallback(() => {
    if (startTimeRef.current === null) {
      return 0;
    }
    const elapsed = Date.now() - startTimeRef.current;
    startTimeRef.current = null;
    return elapsed;
  }, []);

  const getElapsed = useCallback(() => {
    if (startTimeRef.current === null) {
      return 0;
    }
    return Date.now() - startTimeRef.current;
  }, []);

  const reset = useCallback(() => {
    startTimeRef.current = null;
  }, []);

  return { start, stop, getElapsed, reset };
}

