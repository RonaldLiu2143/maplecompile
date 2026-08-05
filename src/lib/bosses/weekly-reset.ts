/**
 * GMS weekly boss crystal reset — Thursday 00:00 UTC.
 * Week id is the ISO date (YYYY-MM-DD) of that Thursday.
 */

const MS_DAY = 24 * 60 * 60 * 1000;

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

export function formatResetCountdown(
  now: Date = new Date(),
): { label: string; msRemaining: number } {
  const target = nextWeeklyReset(now);
  const msRemaining = Math.max(0, target.getTime() - now.getTime());
  const totalHours = Math.floor(msRemaining / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) {
    return {
      label: `${days}d ${hours}h until reset`,
      msRemaining,
    };
  }
  const minutes = Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));
  if (totalHours > 0) {
    return {
      label: `${hours}h ${minutes}m until reset`,
      msRemaining,
    };
  }
  return {
    label: `${minutes}m until reset`,
    msRemaining,
  };
}
