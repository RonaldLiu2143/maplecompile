"use client";

import { useEffect, useState } from "react";
import {
  formatCountdownCompact,
  nextDailyReset,
  nextWeeklyReset,
} from "@/lib/bosses";

type ResetLabels = { daily: string; weekly: string };

function readLabels(now = new Date()): ResetLabels {
  return {
    daily: formatCountdownCompact(nextDailyReset(now).getTime() - now.getTime()),
    weekly: formatCountdownCompact(
      nextWeeklyReset(now).getTime() - now.getTime(),
    ),
  };
}

/**
 * Slim site-wide daily + weekly GMS reset countdowns (00:00 UTC / Thu 00:00 UTC).
 * Mounted in SiteShell (sticky top stack) so it stays visible across pages.
 */
export function WeeklyResetBar() {
  const [labels, setLabels] = useState<ResetLabels>({
    daily: "…",
    weekly: "…",
  });

  useEffect(() => {
    const tick = () => setLabels(readLabels());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="border-b border-border/50 bg-surface-muted/90 px-4 py-1.5 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-label="Daily and weekly reset countdowns"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-end gap-x-4 gap-y-1 text-right text-[0.7rem] font-semibold tracking-wide sm:text-xs">
        <span className="inline-flex items-baseline gap-1.5">
          <span className="opacity-55">Daily</span>
          <span className="tabular-nums text-accent">{labels.daily}</span>
        </span>
        <span className="inline-flex items-baseline gap-1.5">
          <span className="opacity-55">Weekly</span>
          <span className="tabular-nums text-accent">{labels.weekly}</span>
        </span>
      </div>
    </div>
  );
}
