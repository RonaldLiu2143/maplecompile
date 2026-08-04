import type { NexonRegion } from "@/lib/character/lookup";
import { CHARACTER_NAME_REGEX } from "@/lib/character/lookup";
import {
  PINNED_CHARACTER_KEY,
  type PinnedCharacter,
} from "@/lib/dashboard/pinned-character";

export const ROSTER_KEY = "maplecompile-roster";

export type RosterEntry = {
  name: string;
  region: NexonRegion;
  addedAt: number;
};

/** Explicit primary — independent of list order. */
export type RosterPrimary = {
  name: string;
  region: NexonRegion;
};

export type RosterState = {
  entries: RosterEntry[];
  primary: RosterPrimary | null;
};

function normalizeEntry(
  raw: Partial<RosterEntry> | Partial<PinnedCharacter> | null | undefined,
): RosterEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const region =
    raw.region === "eu" || raw.region === "na" ? raw.region : null;
  if (!name || !CHARACTER_NAME_REGEX.test(name) || !region) return null;
  const addedAtCandidate =
    "addedAt" in raw && typeof raw.addedAt === "number"
      ? raw.addedAt
      : "pinnedAt" in raw && typeof raw.pinnedAt === "number"
        ? raw.pinnedAt
        : Date.now();
  return {
    name,
    region,
    addedAt: Number.isFinite(addedAtCandidate) ? addedAtCandidate : Date.now(),
  };
}

function normalizePrimary(
  raw: Partial<RosterPrimary> | null | undefined,
): RosterPrimary | null {
  if (!raw || typeof raw !== "object") return null;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const region =
    raw.region === "eu" || raw.region === "na" ? raw.region : null;
  if (!name || !CHARACTER_NAME_REGEX.test(name) || !region) return null;
  return { name, region };
}

export function entryKey(entry: Pick<RosterEntry, "name" | "region">): string {
  return `${entry.region}:${entry.name.toLowerCase()}`;
}

function resolvePrimary(
  entries: RosterEntry[],
  preferred: RosterPrimary | null,
): RosterPrimary | null {
  if (entries.length === 0) return null;
  if (preferred) {
    const key = entryKey(preferred);
    const match = entries.find((e) => entryKey(e) === key);
    if (match) return { name: match.name, region: match.region };
  }
  // Fallback: first entry (legacy behavior / after primary removed).
  return { name: entries[0].name, region: entries[0].region };
}

function syncLegacyPin(primary: RosterPrimary | null, addedAt: number): void {
  try {
    if (!primary) {
      localStorage.removeItem(PINNED_CHARACTER_KEY);
      return;
    }
    localStorage.setItem(
      PINNED_CHARACTER_KEY,
      JSON.stringify({
        name: primary.name,
        region: primary.region,
        pinnedAt: addedAt,
      } satisfies PinnedCharacter),
    );
  } catch {
    /* ignore legacy sync failures */
  }
}

function writeRosterState(state: RosterState): RosterState {
  const primary = resolvePrimary(state.entries, state.primary);
  const next: RosterState = { entries: state.entries, primary };
  localStorage.setItem(ROSTER_KEY, JSON.stringify(next));
  const primaryEntry = primary
    ? next.entries.find((e) => entryKey(e) === entryKey(primary))
    : null;
  syncLegacyPin(primary, primaryEntry?.addedAt ?? Date.now());
  return next;
}

function readLegacyPin(): RosterEntry | null {
  try {
    const raw = localStorage.getItem(PINNED_CHARACTER_KEY);
    if (!raw) return null;
    return normalizeEntry(JSON.parse(raw) as Partial<PinnedCharacter>);
  } catch {
    return null;
  }
}

function parseEntries(parsed: unknown): RosterEntry[] {
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const entries: RosterEntry[] = [];
  for (const item of parsed) {
    const entry = normalizeEntry(item as Partial<RosterEntry>);
    if (!entry) continue;
    const key = entryKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }
  return entries;
}

/** Full roster state (entries + explicit primary). */
export function readRosterState(): RosterState {
  if (typeof window === "undefined") {
    return { entries: [], primary: null };
  }
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    // One-shot migrate: only when roster key has never been written.
    if (raw === null) {
      const pin = readLegacyPin();
      if (!pin) return { entries: [], primary: null };
      return writeRosterState({
        entries: [pin],
        primary: { name: pin.name, region: pin.region },
      });
    }

    const parsed = JSON.parse(raw) as unknown;

    // Legacy shape: bare array → first entry is primary.
    if (Array.isArray(parsed)) {
      const entries = parseEntries(parsed);
      return writeRosterState({
        entries,
        primary: entries[0]
          ? { name: entries[0].name, region: entries[0].region }
          : null,
      });
    }

    if (!parsed || typeof parsed !== "object") {
      return { entries: [], primary: null };
    }

    const obj = parsed as { entries?: unknown; primary?: unknown };
    const entries = parseEntries(obj.entries);
    const preferred = normalizePrimary(
      obj.primary as Partial<RosterPrimary> | null | undefined,
    );
    const primary = resolvePrimary(entries, preferred);
    // Persist if primary was missing / invalid so storage stays consistent.
    if (
      (preferred == null && primary != null) ||
      (preferred != null &&
        primary != null &&
        entryKey(preferred) !== entryKey(primary)) ||
      (preferred != null && primary == null)
    ) {
      return writeRosterState({ entries, primary });
    }
    return { entries, primary };
  } catch {
    return { entries: [], primary: null };
  }
}

/** Read roster entries from localStorage. */
export function readRoster(): RosterEntry[] {
  return readRosterState().entries;
}

export function getPrimary(): RosterPrimary | null {
  return readRosterState().primary;
}

export function isPrimary(
  target: Pick<RosterEntry, "name" | "region">,
  primary: RosterPrimary | null = getPrimary(),
): boolean {
  if (!primary) return false;
  return entryKey(target) === entryKey(primary);
}

export function setPrimary(
  target: Pick<RosterEntry, "name" | "region">,
): RosterState {
  const { entries } = readRosterState();
  const key = entryKey(target);
  const match = entries.find((e) => entryKey(e) === key);
  if (!match) return { entries, primary: resolvePrimary(entries, null) };
  return writeRosterState({
    entries,
    primary: { name: match.name, region: match.region },
  });
}

export function addToRoster(
  entry: Omit<RosterEntry, "addedAt"> & { addedAt?: number },
): { state: RosterState; added: boolean; entry: RosterEntry } {
  const nextEntry: RosterEntry = {
    name: entry.name.trim(),
    region: entry.region,
    addedAt: entry.addedAt ?? Date.now(),
  };
  const current = readRosterState();
  if (current.entries.some((e) => entryKey(e) === entryKey(nextEntry))) {
    return { state: current, added: false, entry: nextEntry };
  }
  const entries = [...current.entries, nextEntry];
  // First character becomes primary automatically.
  const primary =
    current.primary ??
    ({ name: nextEntry.name, region: nextEntry.region } satisfies RosterPrimary);
  const state = writeRosterState({ entries, primary });
  return { state, added: true, entry: nextEntry };
}

export function removeFromRoster(
  target: Pick<RosterEntry, "name" | "region">,
): RosterState {
  const current = readRosterState();
  const key = entryKey(target);
  const entries = current.entries.filter((e) => entryKey(e) !== key);
  const primaryStill =
    current.primary && entryKey(current.primary) === key
      ? null
      : current.primary;
  return writeRosterState({ entries, primary: primaryStill });
}

export function moveRosterEntry(
  target: Pick<RosterEntry, "name" | "region">,
  direction: "up" | "down",
): RosterState {
  const current = readRosterState();
  const key = entryKey(target);
  const index = current.entries.findIndex((e) => entryKey(e) === key);
  if (index < 0) return current;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= current.entries.length) return current;
  const entries = [...current.entries];
  const tmp = entries[index];
  entries[index] = entries[swapWith];
  entries[swapWith] = tmp;
  // Reorder does not change primary.
  return writeRosterState({ entries, primary: current.primary });
}

export function clearRoster(): void {
  writeRosterState({ entries: [], primary: null });
}
