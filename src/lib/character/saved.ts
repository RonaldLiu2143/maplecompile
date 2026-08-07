/**
 * Bookmarked character profiles (MapleRanks-style "Saved").
 * Separate from Manager roster (`maplecompile-roster` / useRoster).
 */

import {
  CHARACTER_NAME_REGEX,
  type NexonRegion,
} from "@/lib/character/lookup";
import { entryKey } from "@/lib/dashboard/roster";

export const SAVED_CHARACTERS_KEY = "maplecompile-saved-characters";

export type SavedCharacter = {
  name: string;
  region: NexonRegion;
  savedAt: number;
  /** Optional snapshot for list cards (updated when viewing profile). */
  level?: number;
  jobName?: string;
  worldName?: string;
  characterImgURL?: string | null;
};

export type SavedCharacterTarget = Pick<SavedCharacter, "name" | "region">;

function normalizeSaved(
  raw: Partial<SavedCharacter> | null | undefined,
): SavedCharacter | null {
  if (!raw || typeof raw !== "object") return null;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const region =
    raw.region === "eu" || raw.region === "na" ? raw.region : null;
  if (!name || !CHARACTER_NAME_REGEX.test(name) || !region) return null;
  const savedAt =
    typeof raw.savedAt === "number" && Number.isFinite(raw.savedAt)
      ? raw.savedAt
      : Date.now();
  const entry: SavedCharacter = { name, region, savedAt };
  if (typeof raw.level === "number" && Number.isFinite(raw.level)) {
    entry.level = raw.level;
  }
  if (typeof raw.jobName === "string" && raw.jobName.trim()) {
    entry.jobName = raw.jobName.trim();
  }
  if (typeof raw.worldName === "string" && raw.worldName.trim()) {
    entry.worldName = raw.worldName.trim();
  }
  if (raw.characterImgURL === null) {
    entry.characterImgURL = null;
  } else if (
    typeof raw.characterImgURL === "string" &&
    raw.characterImgURL.trim()
  ) {
    entry.characterImgURL = raw.characterImgURL.trim();
  }
  return entry;
}

function parseList(parsed: unknown): SavedCharacter[] {
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const entries: SavedCharacter[] = [];
  for (const item of parsed) {
    const entry = normalizeSaved(item as Partial<SavedCharacter>);
    if (!entry) continue;
    const key = entryKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }
  // Newest first
  entries.sort((a, b) => b.savedAt - a.savedAt);
  return entries;
}

function writeList(entries: SavedCharacter[]): SavedCharacter[] {
  const sorted = [...entries].sort((a, b) => b.savedAt - a.savedAt);
  localStorage.setItem(SAVED_CHARACTERS_KEY, JSON.stringify(sorted));
  return sorted;
}

export function readSavedCharacters(): SavedCharacter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_CHARACTERS_KEY);
    if (!raw) return [];
    return parseList(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function isCharacterSaved(
  target: SavedCharacterTarget,
  list: ReadonlyArray<SavedCharacterTarget> = readSavedCharacters(),
): boolean {
  const key = entryKey(target);
  return list.some((e) => entryKey(e) === key);
}

export function addSavedCharacter(
  entry: Omit<SavedCharacter, "savedAt"> & { savedAt?: number },
): { list: SavedCharacter[]; added: boolean; entry: SavedCharacter } {
  const next: SavedCharacter = {
    name: entry.name.trim(),
    region: entry.region,
    savedAt: entry.savedAt ?? Date.now(),
    level: entry.level,
    jobName: entry.jobName,
    worldName: entry.worldName,
    characterImgURL: entry.characterImgURL,
  };
  const current = readSavedCharacters();
  if (current.some((e) => entryKey(e) === entryKey(next))) {
    return { list: current, added: false, entry: next };
  }
  return { list: writeList([next, ...current]), added: true, entry: next };
}

export function removeSavedCharacter(
  target: SavedCharacterTarget,
): SavedCharacter[] {
  const key = entryKey(target);
  const next = readSavedCharacters().filter((e) => entryKey(e) !== key);
  return writeList(next);
}

export function toggleSavedCharacter(
  entry: Omit<SavedCharacter, "savedAt"> & { savedAt?: number },
): { list: SavedCharacter[]; saved: boolean } {
  if (isCharacterSaved(entry)) {
    return { list: removeSavedCharacter(entry), saved: false };
  }
  const { list } = addSavedCharacter(entry);
  return { list, saved: true };
}

/** Refresh snapshot fields when opening a saved profile (keeps list cards current). */
export function updateSavedCharacterSnapshot(
  snapshot: Omit<SavedCharacter, "savedAt"> & { savedAt?: number },
): SavedCharacter[] {
  const current = readSavedCharacters();
  const key = entryKey(snapshot);
  let changed = false;
  const next = current.map((e) => {
    if (entryKey(e) !== key) return e;
    changed = true;
    return {
      ...e,
      name: snapshot.name.trim() || e.name,
      level: snapshot.level ?? e.level,
      jobName: snapshot.jobName ?? e.jobName,
      worldName: snapshot.worldName ?? e.worldName,
      characterImgURL:
        snapshot.characterImgURL !== undefined
          ? snapshot.characterImgURL
          : e.characterImgURL,
    };
  });
  if (!changed) return current;
  return writeList(next);
}

export { entryKey as savedCharacterKey };
