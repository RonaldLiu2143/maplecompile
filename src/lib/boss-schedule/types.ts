/** Availability for a schedule member on a given event. */
export type AvailabilityStatus = "available" | "maybe" | "unavailable";

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  available: "Available",
  maybe: "Maybe",
  unavailable: "Unavailable",
};

/** Recurring weekly slot: dayOfWeek 0=Sun … 6=Sat (local). */
export type BossScheduleEvent = {
  id: string;
  title: string;
  /** Optional catalog boss id from Boss Income. */
  bossId?: string;
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number;
  /** Minutes from local midnight (0–1439). */
  startMinutes: number;
  /** Duration in minutes (default 60). */
  durationMinutes: number;
  notes?: string;
};

export type BossScheduleMember = {
  id: string;
  name: string;
  /** eventId → status (missing = unset). */
  availability: Record<string, AvailabilityStatus>;
};

export type BossScheduleState = {
  title: string;
  events: BossScheduleEvent[];
  members: BossScheduleMember[];
  /** IANA timezone label for display (optional). */
  timezone?: string;
};

export type BossScheduleShareRecord = {
  id: string;
  createdAt: number;
  updatedAt: number;
  state: BossScheduleState;
};

export const DAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export const DAY_LABELS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function emptyScheduleState(title = "Boss Schedule"): BossScheduleState {
  return {
    title,
    events: [],
    members: [],
    timezone:
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : undefined,
  };
}

export function clampDay(n: number): number {
  const d = Math.floor(Number(n));
  if (!Number.isFinite(d)) return 0;
  return ((d % 7) + 7) % 7;
}

export function clampMinutes(n: number): number {
  const m = Math.floor(Number(n));
  if (!Number.isFinite(m)) return 0;
  return Math.max(0, Math.min(23 * 60 + 59, m));
}

export function clampDuration(n: number): number {
  const m = Math.floor(Number(n));
  if (!Number.isFinite(m) || m < 15) return 60;
  return Math.max(15, Math.min(8 * 60, m));
}

export function formatTimeMinutes(minutes: number): string {
  const m = clampMinutes(minutes);
  const h = Math.floor(m / 60);
  const min = m % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

export function parseTimeToMinutes(raw: string): number | null {
  const s = raw.trim();
  const m24 = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (m24) {
    const h = Number(m24[1]);
    const min = Number(m24[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return h * 60 + min;
  }
  const m12 = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(s);
  if (m12) {
    let h = Number(m12[1]);
    const min = Number(m12[2]);
    const ap = m12[3]!.toUpperCase();
    if (h < 1 || h > 12 || min < 0 || min > 59) return null;
    if (ap === "AM") {
      if (h === 12) h = 0;
    } else if (h !== 12) {
      h += 12;
    }
    return h * 60 + min;
  }
  return null;
}

export function newLocalId(prefix = "id"): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return `${prefix}_${s}`;
}
