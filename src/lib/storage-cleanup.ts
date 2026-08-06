/**
 * One-shot localStorage cleanup: drop migrated legacy keys and stop leaving
 * stale maplehub / v1 blobs behind after the per-character stores took over.
 */

import {
  loadBossPresets,
  saveBossPresets,
} from "@/lib/bosses/presets";
import {
  readBossIncomeStore,
  writeBossIncomeStore,
} from "@/lib/bosses/persist";
import {
  CHARACTER_WORKSPACE_KEY,
  pruneWorkspacesToRosterKeys,
} from "@/lib/character-workspace";
import { entryKey, readRosterState } from "@/lib/dashboard/roster";
import { migrateLegacyHexaTracker } from "@/lib/hexa-tracker";
import {
  readLiberationStore,
  writeLiberationStore,
} from "@/lib/liberation/persist";
import { migrateLegacyPairing } from "@/lib/pairing";
import { storage } from "@/lib/storage";

/** Bump when adding new one-shot prune steps so existing browsers re-run once. */
export const STORAGE_CLEANUP_KEY = "maplecompile-storage-cleanup-v2";

/** Keys that are safe to delete once their replacements exist (or are unused). */
const DEAD_KEYS_ALWAYS = [
  // Pre-rebrand scouter draft / single-preset blobs
  "maplehub-scouter-last",
  "maplehub-scouter-preset",
  "maplecompile-scouter-preset",
  // Unused / planned key still listed in storage listeners
  "maplecompile-dailies-v1",
  // Flame odds are computed on demand in the Flame Calculator UI
  "flameProbabilities",
] as const;

function hasKey(key: string): boolean {
  try {
    return localStorage.getItem(key) != null;
  } catch {
    return false;
  }
}

function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Prune known-dead localStorage keys. Idempotent; gated by STORAGE_CLEANUP_KEY
 * so we only scan once per browser (re-run by clearing that flag).
 */
export function runStorageCleanupOnce(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(STORAGE_CLEANUP_KEY) === "1") return;
  } catch {
    return;
  }

  // Ensure one-shot migrations ran before we drop legacy blobs.
  try {
    migrateLegacyHexaTracker();
    migrateLegacyPairing();
    // maplehub → maplecompile scouter-last / single-preset migrate + prune
    storage.getScouterLast();
    storage.listScouterPresets();
    // v1 → v2 liberation / boss income, then rewrite once to compact sparse selections
    writeLiberationStore(readLiberationStore());
    writeBossIncomeStore(readBossIncomeStore());
  } catch {
    /* ignore */
  }

  for (const key of DEAD_KEYS_ALWAYS) {
    removeKey(key);
  }

  // Liberation / boss income: v1 only needed until v2 is written.
  if (hasKey("maplecompile.liberation.v2")) {
    removeKey("maplecompile.liberation.v1");
  }
  if (hasKey("maplecompile.boss-income.v2")) {
    removeKey("maplecompile.boss-income.v1");
  }

  // HEXA: migrate above copies into by-char; drop leftover single-blob mirrors.
  if (hasKey("maplecompile-hexa-tracker-by-char-v1")) {
    removeKey("maplecompile-hexa-tracker-v1");
    removeKey("maplecompile-hexa-scouter-pair");
  } else if (
    localStorage.getItem("maplecompile-hexa-tracker-migrated-v1") === "1"
  ) {
    // Migrated with nothing to copy — still safe to drop empty leftovers.
    removeKey("maplecompile-hexa-tracker-v1");
    removeKey("maplecompile-hexa-scouter-pair");
  }

  // Roster replaced the old single-pin key; pin is only for one-shot migrate.
  if (hasKey("maplecompile-roster")) {
    removeKey("maplecompile-dashboard-pinned");
  }

  // Drop character workspaces for characters no longer on the roster.
  try {
    if (hasKey(CHARACTER_WORKSPACE_KEY)) {
      const roster = readRosterState();
      const allowed = new Set(roster.entries.map((e) => entryKey(e)));
      pruneWorkspacesToRosterKeys(allowed);
    }
  } catch {
    /* ignore */
  }

  // Soft-cap preset / share-token maps that may already exceed limits.
  try {
    storage.enforceStorageCaps();
    saveBossPresets(loadBossPresets());
  } catch {
    /* ignore */
  }

  // Drop the previous one-shot flag so we do not leave a useless key behind.
  removeKey("maplecompile-storage-cleanup-v1");

  try {
    localStorage.setItem(STORAGE_CLEANUP_KEY, "1");
  } catch {
    /* ignore */
  }
}
