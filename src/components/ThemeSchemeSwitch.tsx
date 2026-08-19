"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME_PREFS,
  isLightThemeId,
  preferredDarkThemeId,
  readThemePrefs,
  rememberDarkThemeId,
  setThemeScheme,
  subscribeThemePrefs,
} from "@/lib/theme";
import { Moon, Sun } from "lucide-react";

function getServerThemePrefs() {
  return DEFAULT_THEME_PREFS;
}

/**
 * Compact Light / Dark control for the sticky top bar.
 * Light ↔ Compile; if the user was on Contrast, Dark restores Contrast.
 * Theme DOM apply lives in SiteShell (`useApplyThemeToDocument`).
 */
export function ThemeSchemeSwitch({ className }: { className?: string }) {
  const prefs = useSyncExternalStore(
    subscribeThemePrefs,
    readThemePrefs,
    getServerThemePrefs,
  );

  useEffect(() => {
    rememberDarkThemeId(prefs.id);
  }, [prefs.id]);

  const light = isLightThemeId(prefs.id);

  const setLight = (nextLight: boolean) => {
    if (nextLight === light) return;
    setThemeScheme(nextLight ? "light" : "dark");
  };

  return (
    <div
      className={[
        "inline-flex items-center rounded-lg border border-border/60 bg-surface/80 p-0.5",
        className ?? "",
      ].join(" ")}
      role="group"
      aria-label="Color scheme"
    >
      <button
        type="button"
        onClick={() => setLight(true)}
        className={`rounded-md px-2 py-0.5 text-[0.65rem] font-semibold transition sm:text-[0.7rem] ${
          light
            ? "bg-accent text-primary-foreground"
            : "text-foreground/65 hover:bg-surface-muted hover:text-foreground"
        }`}
        aria-pressed={light}
      >
        <Sun className="mr-1 inline size-3" aria-hidden />
        Light
      </button>
      <button
        type="button"
        onClick={() => setLight(false)}
        className={`rounded-md px-2 py-0.5 text-[0.65rem] font-semibold transition sm:text-[0.7rem] ${
          !light
            ? "bg-accent text-primary-foreground"
            : "text-foreground/65 hover:bg-surface-muted hover:text-foreground"
        }`}
        aria-pressed={!light}
        title={
          preferredDarkThemeId() === "contrast"
            ? "Dark (Contrast)"
            : "Dark (Compile)"
        }
      >
        <Moon className="mr-1 inline size-3" aria-hidden />
        Dark
      </button>
    </div>
  );
}
