"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME_PREFS,
  applyThemeToDocument,
  readThemePrefs,
  subscribeThemePrefs,
} from "@/lib/theme";

/**
 * Single owner for syncing theme prefs onto `document`. Mount once (e.g. SiteShell).
 * Pickers should write prefs only — not re-apply on every store tick.
 */
export function useApplyThemeToDocument(): void {
  const prefs = useSyncExternalStore(
    subscribeThemePrefs,
    readThemePrefs,
    () => DEFAULT_THEME_PREFS,
  );

  useLayoutEffect(() => {
    applyThemeToDocument(prefs);
  }, [prefs]);
}
