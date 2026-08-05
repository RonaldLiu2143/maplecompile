/**
 * Compact account-level daily checklist (GMS).
 * Clears auto-reset at 00:00 UTC via `clearDayId` (mirrors boss `clearWeekId`).
 */

import { currentDailyDayId } from "@/lib/bosses/weekly-reset";
import { notifyMapleDataChanged } from "@/lib/maple-events";

export const DAILIES_STORAGE_KEY = "maplecompile-dailies-v1";

export type DailySlotId =
  | "ursus"
  | "daily-bosses"
  | "monster-park"
  | "symbols"
  | "maple-tour";

export type DailySlotDef = {
  id: DailySlotId;
  label: string;
  hint?: string;
};

/** Practical GMS dailies — account checklist, not a full MapleHub clone. */
export const DAILY_SLOTS: readonly DailySlotDef[] = [
  { id: "ursus", label: "Ursus", hint: "Account" },
  { id: "daily-bosses", label: "Daily bosses", hint: "Per char" },
  { id: "monster-park", label: "Monster Park" },
  { id: "symbols", label: "Symbols", hint: "Arcane / Sacred" },
  { id: "maple-tour", label: "Maple Tour" },
] as const;

export type DailiesStore = {
  version: 1;
  /**
   * ISO date (YYYY-MM-DD) of the UTC day these clears belong to.
   * When the day rolls at 00:00 UTC, clears reset on read.
   */
  clearDayId: string;
  cleared: Partial<Record<DailySlotId, boolean>>;
};

function emptyStore(dayId: string = currentDailyDayId()): DailiesStore {
  return {
    version: 1,
    clearDayId: dayId,
    cleared: {},
  };
}

function resetClears(store: DailiesStore): DailiesStore {
  return {
    ...store,
    clearDayId: currentDailyDayId(),
    cleared: {},
  };
}

export function ensureDailiesForCurrentDay(store: DailiesStore): DailiesStore {
  const dayId = currentDailyDayId();
  if (store.clearDayId === dayId) return store;
  return resetClears(store);
}

function normalizeCleared(
  raw: unknown,
): Partial<Record<DailySlotId, boolean>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<DailySlotId, boolean>> = {};
  for (const slot of DAILY_SLOTS) {
    if ((raw as Record<string, unknown>)[slot.id] === true) {
      out[slot.id] = true;
    }
  }
  return out;
}

export function readDailiesStore(): DailiesStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(DAILIES_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<DailiesStore>;
    const store: DailiesStore = {
      version: 1,
      clearDayId:
        typeof parsed.clearDayId === "string" && parsed.clearDayId
          ? parsed.clearDayId
          : currentDailyDayId(),
      cleared: normalizeCleared(parsed.cleared),
    };
    const next = ensureDailiesForCurrentDay(store);
    if (next !== store) writeDailiesStore(next);
    return next;
  } catch {
    return emptyStore();
  }
}

export function writeDailiesStore(store: DailiesStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DAILIES_STORAGE_KEY, JSON.stringify(store));
    notifyMapleDataChanged("other");
  } catch {
    /* ignore quota / private mode */
  }
}

export function isDailyCleared(
  store: DailiesStore,
  id: DailySlotId,
): boolean {
  return store.cleared[id] === true;
}

export function setDailyCleared(
  store: DailiesStore,
  id: DailySlotId,
  cleared: boolean,
): DailiesStore {
  const nextCleared = { ...store.cleared };
  if (cleared) nextCleared[id] = true;
  else delete nextCleared[id];
  const next: DailiesStore = {
    ...ensureDailiesForCurrentDay(store),
    cleared: nextCleared,
  };
  writeDailiesStore(next);
  return next;
}

export function toggleDailyCleared(
  store: DailiesStore,
  id: DailySlotId,
): DailiesStore {
  return setDailyCleared(store, id, !isDailyCleared(store, id));
}

export function clearAllDailies(store: DailiesStore): DailiesStore {
  const next: DailiesStore = {
    ...ensureDailiesForCurrentDay(store),
    cleared: {},
  };
  writeDailiesStore(next);
  return next;
}

export function markAllDailiesDone(store: DailiesStore): DailiesStore {
  const cleared: Partial<Record<DailySlotId, boolean>> = {};
  for (const slot of DAILY_SLOTS) cleared[slot.id] = true;
  const next: DailiesStore = {
    ...ensureDailiesForCurrentDay(store),
    cleared,
  };
  writeDailiesStore(next);
  return next;
}

export function dailiesProgress(store: DailiesStore): {
  cleared: number;
  total: number;
} {
  const ensured = ensureDailiesForCurrentDay(store);
  let cleared = 0;
  for (const slot of DAILY_SLOTS) {
    if (ensured.cleared[slot.id]) cleared += 1;
  }
  return { cleared, total: DAILY_SLOTS.length };
}
