/**
 * GMS reset times (UTC):
 * - Daily: every day at 00:00 UTC
 * - Weekly boss crystal: Thursday 00:00 UTC
 * Week id is the ISO date (YYYY-MM-DD) of that Thursday.
 */

const MS_DAY = 24 * 60 * 60 * 1000;

/** Next daily reset — tomorrow's (or upcoming) 00:00 UTC. */
export function nextDailyReset(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
}

/** UTC Thursday 00:00 that starts the current GMS weekly boss period. */
export function currentWeeklyResetStart(now: Date = new Date()): Date {
  const utc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0,
    0,
    0,
    0,
  );
  const day = new Date(utc).getUTCDay(); // 0 Sun … 4 Thu
  const daysSinceThursday = (day + 7 - 4) % 7;
  return new Date(utc - daysSinceThursday * MS_DAY);
}

export function currentBossWeekId(now: Date = new Date()): string {
  return currentWeeklyResetStart(now).toISOString().slice(0, 10);
}

/** Next Thursday 00:00 UTC after the current week's start (countdown target). */
export function nextWeeklyReset(now: Date = new Date()): Date {
  const start = currentWeeklyResetStart(now);
  const end = new Date(start.getTime() + 7 * MS_DAY);
  if (now.getTime() < end.getTime()) return end;
  return new Date(end.getTime() + 7 * MS_DAY);
}

/** Compact countdown like `3d 12h`, `5h 20m`, or `12m`. */
export function formatCountdownCompact(msRemaining: number): string {
  const ms = Math.max(0, msRemaining);
  const totalHours = Math.floor(ms / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  if (totalHours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatResetCountdown(
  now: Date = new Date(),
): { label: string; msRemaining: number } {
  const target = nextWeeklyReset(now);
  const msRemaining = Math.max(0, target.getTime() - now.getTime());
  return {
    label: `${formatCountdownCompact(msRemaining)} until reset`,
    msRemaining,
  };
}
