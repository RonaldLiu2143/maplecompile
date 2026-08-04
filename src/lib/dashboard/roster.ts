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

function entryKey(entry: Pick<RosterEntry, "name" | "region">): string {
  return `${entry.region}:${entry.name.toLowerCase()}`;
}

function writeRoster(entries: RosterEntry[]): RosterEntry[] {
  localStorage.setItem(ROSTER_KEY, JSON.stringify(entries));
  // Keep legacy single-pin key in sync (first entry = primary).
  try {
    if (entries.length === 0) {
      localStorage.removeItem(PINNED_CHARACTER_KEY);
    } else {
      const primary = entries[0];
      localStorage.setItem(
        PINNED_CHARACTER_KEY,
        JSON.stringify({
          name: primary.name,
          region: primary.region,
          pinnedAt: primary.addedAt,
        } satisfies PinnedCharacter),
      );
    }
  } catch {
    /* ignore legacy sync failures */
  }
  return entries;
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

/** Read roster from localStorage, migrating the legacy single pin if needed. */
export function readRoster(): RosterEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    // One-shot migrate: only when roster key has never been written.
    if (raw === null) {
      const pin = readLegacyPin();
      return pin ? writeRoster([pin]) : [];
    }

    const parsed = JSON.parse(raw) as unknown;
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
  } catch {
    return [];
  }
}

export function addToRoster(
  entry: Omit<RosterEntry, "addedAt"> & { addedAt?: number },
): { roster: RosterEntry[]; added: boolean; entry: RosterEntry } {
  const nextEntry: RosterEntry = {
    name: entry.name.trim(),
    region: entry.region,
    addedAt: entry.addedAt ?? Date.now(),
  };
  const current = readRoster();
  if (current.some((e) => entryKey(e) === entryKey(nextEntry))) {
    return { roster: current, added: false, entry: nextEntry };
  }
  const roster = writeRoster([...current, nextEntry]);
  return { roster, added: true, entry: nextEntry };
}

export function removeFromRoster(
  target: Pick<RosterEntry, "name" | "region">,
): RosterEntry[] {
  const key = entryKey(target);
  return writeRoster(readRoster().filter((e) => entryKey(e) !== key));
}

export function moveRosterEntry(
  target: Pick<RosterEntry, "name" | "region">,
  direction: "up" | "down",
): RosterEntry[] {
  const current = readRoster();
  const key = entryKey(target);
  const index = current.findIndex((e) => entryKey(e) === key);
  if (index < 0) return current;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= current.length) return current;
  const next = [...current];
  const tmp = next[index];
  next[index] = next[swapWith];
  next[swapWith] = tmp;
  return writeRoster(next);
}

export function clearRoster(): void {
  writeRoster([]);
}
