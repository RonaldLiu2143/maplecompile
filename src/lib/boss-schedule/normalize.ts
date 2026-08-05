import {
  clampDay,
  clampDuration,
  clampMinutes,
  emptyScheduleState,
  type AvailabilityStatus,
  type BossScheduleEvent,
  type BossScheduleMember,
  type BossScheduleState,
} from "./types";

const AVAIL: ReadonlySet<string> = new Set([
  "available",
  "maybe",
  "unavailable",
]);

function normalizeAvailability(
  raw: unknown,
): Record<string, AvailabilityStatus> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, AvailabilityStatus> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!k || typeof v !== "string" || !AVAIL.has(v)) continue;
    out[k] = v as AvailabilityStatus;
  }
  return out;
}

function normalizeEvent(raw: unknown): BossScheduleEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<BossScheduleEvent>;
  if (typeof e.id !== "string" || !e.id) return null;
  if (typeof e.title !== "string" || !e.title.trim()) return null;
  return {
    id: e.id.slice(0, 40),
    title: e.title.trim().slice(0, 80),
    bossId:
      typeof e.bossId === "string" && e.bossId
        ? e.bossId.slice(0, 64)
        : undefined,
    dayOfWeek: clampDay(e.dayOfWeek ?? 0),
    startMinutes: clampMinutes(e.startMinutes ?? 20 * 60),
    durationMinutes: clampDuration(e.durationMinutes ?? 60),
    notes:
      typeof e.notes === "string" && e.notes.trim()
        ? e.notes.trim().slice(0, 200)
        : undefined,
  };
}

function normalizeMember(raw: unknown): BossScheduleMember | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Partial<BossScheduleMember>;
  if (typeof m.id !== "string" || !m.id) return null;
  if (typeof m.name !== "string" || !m.name.trim()) return null;
  return {
    id: m.id.slice(0, 40),
    name: m.name.trim().slice(0, 40),
    availability: normalizeAvailability(m.availability),
  };
}

export function normalizeScheduleState(raw: unknown): BossScheduleState {
  if (!raw || typeof raw !== "object") return emptyScheduleState();
  const s = raw as Partial<BossScheduleState>;
  const events: BossScheduleEvent[] = [];
  if (Array.isArray(s.events)) {
    for (const item of s.events) {
      const e = normalizeEvent(item);
      if (e) events.push(e);
    }
  }
  const members: BossScheduleMember[] = [];
  if (Array.isArray(s.members)) {
    for (const item of s.members) {
      const m = normalizeMember(item);
      if (m) members.push(m);
    }
  }
  return {
    title:
      typeof s.title === "string" && s.title.trim()
        ? s.title.trim().slice(0, 80)
        : "Boss Schedule",
    events: events.slice(0, 80),
    members: members.slice(0, 40),
    timezone:
      typeof s.timezone === "string" && s.timezone.trim()
        ? s.timezone.trim().slice(0, 64)
        : undefined,
  };
}

export function estimateJsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}
