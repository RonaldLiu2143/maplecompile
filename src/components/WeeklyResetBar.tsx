"use client";

import { useEffect, useState } from "react";
import { formatResetCountdown } from "@/lib/bosses";

/**
 * Slim site-wide countdown to GMS weekly boss reset (Thursday 00:00 UTC).
 * Mounted in SiteShell (sticky top stack) so it stays visible across pages.
 */
export function WeeklyResetBar() {
  const [label, setLabel] = useState("… until reset");

  useEffect(() => {
    const tick = () => setLabel(formatResetCountdown().label);
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="border-b border-border/50 bg-surface-muted/90 px-4 py-1.5 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-label="Weekly boss reset countdown"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-center gap-2 text-center text-[0.7rem] font-semibold tracking-wide sm:justify-between sm:text-left sm:text-xs">
        <span className="tabular-nums text-accent">{label}</span>
        <span className="hidden opacity-55 sm:inline">
          Weekly bosses · Thursday 00:00 UTC
        </span>
      </div>
    </div>
  );
}
