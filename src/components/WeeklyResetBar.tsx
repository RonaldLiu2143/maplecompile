"use client";

import { ThemeSchemeSwitch } from "@/components/ThemeSchemeSwitch";
import { ResetCountdowns } from "@/components/ResetCountdowns";

/**
 * Slim site-wide Daily + Weekly reset countdowns (UTC midnight / Thursday).
 * Desktop only — phones use the compact header next to the wordmark.
 */
export function WeeklyResetBar() {
  return (
    <div
      className="border-b border-border/50 bg-surface-muted/95 px-4 py-1.5"
      role="status"
      aria-live="polite"
      aria-label="Daily and weekly reset countdowns"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <ThemeSchemeSwitch />
        <ResetCountdowns className="sm:gap-3 sm:text-xs" />
      </div>
    </div>
  );
}
