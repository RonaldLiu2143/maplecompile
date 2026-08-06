"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Ephemeral status / toast text that clears after `durationMs`.
 * Presentation stays local — this only owns the timer + string state.
 */
export function useFlashMessage(durationMs = 2800): {
  msg: string | null;
  flash: (text: string) => void;
  clear: () => void;
} {
  const [msg, setMsg] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMsg(null);
  }, []);

  const flash = useCallback(
    (text: string) => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
      setMsg(text);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setMsg(null);
      }, durationMs);
    },
    [durationMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, []);

  return { msg, flash, clear };
}
