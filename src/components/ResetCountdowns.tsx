"use client";

import { useEffect, useState } from "react";
import {
  formatDailyResetCountdown,
  formatWeeklyResetCountdown,
} from "@/lib/bosses";
import { cn } from "@/lib/utils";

export function ResetCountdowns({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
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
    <p
      className={cn(
        "flex min-w-0 items-center justify-end gap-2 text-right text-xs font-semibold tabular-nums tracking-wide text-accent",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Daily and weekly reset countdowns"
    >
      <span className="truncate">
        {compact ? "D" : "Daily"} {daily}
      </span>
      <span className="text-muted-soft" aria-hidden>
        ·
      </span>
      <span className="truncate">
        {compact ? "W" : "Weekly"} {weekly}
      </span>
    </p>
  );
}
