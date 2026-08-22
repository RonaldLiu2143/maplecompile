/**
 * Bookmarked character profiles (MapleRanks-style "Saved").
 * Separate from Manager roster (`maplecompile-roster` / useRoster).
 */

import {
  CHARACTER_NAME_REGEX,
  type NexonRegion,
} from "@/lib/character/lookup";
import { sanitizeAvatarUrl } from "@/lib/character/maplehub";
import { entryKey } from "@/lib/dashboard/roster";

export const SAVED_CHARACTERS_KEY = "maplecompile-saved-characters";

export type SavedCharacter = {
  name: string;
  region: NexonRegion;
  savedAt: number;
  /** Optional snapshot for list cards (updated when viewing profile). */
  level?: number;
  /** Current EXP within the level — drives Saved card progress bar. */
  exp?: number;
  jobName?: string;
  worldName?: string;
  characterImgURL?: string | null;
};

export type SavedCharacterTarget = Pick<SavedCharacter, "name" | "region">;

/** Input for add/toggle/sync — `savedAt` optional (defaults to now). */
export type SavedCharacterInput = Omit<SavedCharacter, "savedAt"> & {
  savedAt?: number;
};

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
  if (typeof raw.exp === "number" && Number.isFinite(raw.exp) && raw.exp >= 0) {
    entry.exp = raw.exp;
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
    entry.characterImgURL = sanitizeAvatarUrl(raw.characterImgURL);
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

/** Persist list; returns sorted list on success, or `false` if storage write fails. */
function writeList(entries: SavedCharacter[]): SavedCharacter[] | false {
  const sorted = [...entries].sort((a, b) => b.savedAt - a.savedAt);
  try {
    localStorage.setItem(SAVED_CHARACTERS_KEY, JSON.stringify(sorted));
    return sorted;
  } catch {
    return false;
  }
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
  entry: SavedCharacterInput,
): { list: SavedCharacter[]; added: boolean; entry: SavedCharacter } {
  const next: SavedCharacter = {
    name: entry.name.trim(),
    region: entry.region,
    savedAt: entry.savedAt ?? Date.now(),
    level: entry.level,
    exp: entry.exp,
    jobName: entry.jobName,
    worldName: entry.worldName,
    characterImgURL: entry.characterImgURL,
  };
  const current = readSavedCharacters();
  if (current.some((e) => entryKey(e) === entryKey(next))) {
    return { list: current, added: false, entry: next };
  }
  const written = writeList([next, ...current]);
  if (written === false) {
    return { list: current, added: false, entry: next };
  }
  return { list: written, added: true, entry: next };
}

export function removeSavedCharacter(
  target: SavedCharacterTarget,
): SavedCharacter[] {
  const current = readSavedCharacters();
  const key = entryKey(target);
  const next = current.filter((e) => entryKey(e) !== key);
  if (next.length === current.length) return current;
  const written = writeList(next);
  return written === false ? current : written;
}

export function toggleSavedCharacter(
  entry: SavedCharacterInput,
): { list: SavedCharacter[]; saved: boolean } {
  if (isCharacterSaved(entry)) {
    return { list: removeSavedCharacter(entry), saved: false };
  }
  const { list } = addSavedCharacter(entry);
  return { list, saved: true };
}

/** Compare saved card fields to a fresh lookup snapshot. */
export function snapshotFieldsEqual(
  a: SavedCharacter,
  snapshot: SavedCharacterInput,
): boolean {
  const name = snapshot.name.trim() || a.name;
  const level = snapshot.level ?? a.level;
  const exp = snapshot.exp ?? a.exp;
  const jobName = snapshot.jobName ?? a.jobName;
  const worldName = snapshot.worldName ?? a.worldName;
  const characterImgURL =
    snapshot.characterImgURL !== undefined
      ? snapshot.characterImgURL
      : a.characterImgURL;
  return (
    a.name === name &&
    a.level === level &&
    a.exp === exp &&
    a.jobName === jobName &&
    a.worldName === worldName &&
    a.characterImgURL === characterImgURL
  );
}

/** Refresh snapshot fields when opening a saved profile (keeps list cards current). */
export function updateSavedCharacterSnapshot(
  snapshot: SavedCharacterInput,
  /** When syncing React state, pass the in-memory list to preserve reference if unchanged. */
  currentList?: ReadonlyArray<SavedCharacter>,
): SavedCharacter[] {
  const current =
    currentList != null ? [...currentList] : readSavedCharacters();
  const key = entryKey(snapshot);
  let changed = false;
  const next = current.map((e) => {
    if (entryKey(e) !== key) return e;
    if (snapshotFieldsEqual(e, snapshot)) return e;
    changed = true;
    return {
      ...e,
      name: snapshot.name.trim() || e.name,
      level: snapshot.level ?? e.level,
      exp: snapshot.exp ?? e.exp,
      jobName: snapshot.jobName ?? e.jobName,
      worldName: snapshot.worldName ?? e.worldName,
      characterImgURL:
        snapshot.characterImgURL !== undefined
          ? snapshot.characterImgURL
          : e.characterImgURL,
    };
  });
  if (!changed) {
    return currentList != null ? [...currentList] : current;
  }
  const written = writeList(next);
  return written === false
    ? currentList != null
      ? [...currentList]
      : current
    : written;
}
