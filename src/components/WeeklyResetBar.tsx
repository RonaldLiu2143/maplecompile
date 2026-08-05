"use client";

import { useEffect, useState } from "react";
import {
  formatDailyResetCountdown,
  formatWeeklyResetCountdown,
} from "@/lib/bosses";

/**
 * Slim site-wide Daily + Weekly reset countdowns (UTC midnight / Thursday).
 * Mounted in SiteShell (sticky top stack) so it stays visible across pages.
 */
export function WeeklyResetBar() {
  const [daily, setDaily] = useState("…");
  const [weekly, setWeekly] = useState("…");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setDaily(formatDailyResetCountdown(now).label);
      setWeekly(formatWeeklyResetCountdown(now).label);
    };
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
      <div className="mx-auto flex w-full max-w-7xl items-center justify-end gap-2 text-right text-[0.7rem] font-semibold tracking-wide sm:gap-3 sm:text-xs">
        <span className="tabular-nums text-accent">
          Daily {daily}
        </span>
        <span className="opacity-35" aria-hidden>
          ·
        </span>
        <span className="tabular-nums text-accent">
          Weekly {weekly}
        </span>
      </div>
    </div>
  );
}
