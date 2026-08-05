/**
 * GMS reset times (UTC):
 * - Daily content / dailies — every day at 00:00 UTC
 * - Weekly boss crystals — Thursday 00:00 UTC
 * Week id is the ISO date (YYYY-MM-DD) of that Thursday.
 */

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_HOUR = 60 * 60 * 1000;
const MS_MINUTE = 60 * 1000;

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

/** Next daily reset — tomorrow 00:00 UTC (GMS day boundary). */
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

/** Compact duration: `2d 4h`, `4h 12m`, or `12m`. */
export function formatCompactCountdown(msRemaining: number): string {
  const ms = Math.max(0, msRemaining);
  const totalHours = Math.floor(ms / MS_HOUR);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((ms % MS_HOUR) / MS_MINUTE);
  if (totalHours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatResetCountdown(
  now: Date = new Date(),
): { label: string; msRemaining: number } {
  const target = nextWeeklyReset(now);
  const msRemaining = Math.max(0, target.getTime() - now.getTime());
  return {
    label: `${formatCompactCountdown(msRemaining)} until reset`,
    msRemaining,
  };
}

export function formatDailyResetCountdown(
  now: Date = new Date(),
): { label: string; msRemaining: number } {
  const target = nextDailyReset(now);
  const msRemaining = Math.max(0, target.getTime() - now.getTime());
  return {
    label: formatCompactCountdown(msRemaining),
    msRemaining,
  };
}

export function formatWeeklyResetCountdown(
  now: Date = new Date(),
): { label: string; msRemaining: number } {
  const target = nextWeeklyReset(now);
  const msRemaining = Math.max(0, target.getTime() - now.getTime());
  return {
    label: formatCompactCountdown(msRemaining),
    msRemaining,
  };
}
