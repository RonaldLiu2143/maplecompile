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
import { entryKey, readRosterState, ROSTER_KEY } from "@/lib/dashboard/roster";
import { migrateLegacyHexaTracker } from "@/lib/hexa-tracker";
import {
  readLiberationStore,
  writeLiberationStore,
} from "@/lib/liberation/persist";
import { migrateLegacyPairing } from "@/lib/pairing";
import { storage } from "@/lib/storage";

/** Bump when adding new one-shot prune steps so existing browsers re-run once. */
export const STORAGE_CLEANUP_KEY = "maplecompile-storage-cleanup-v3";

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

  // HEXA: only drop legacy after migrate placed data under by-char (incl. __local__).
  if (hasKey("maplecompile-hexa-tracker-by-char-v1")) {
    // Prefer leaving cleanup to migrateLegacyHexaTracker; only remove empty leftovers
    // when the migrated flag is set (meaning place succeeded).
    if (
      localStorage.getItem("maplecompile-hexa-tracker-migrated-v1") === "1"
    ) {
      removeKey("maplecompile-hexa-tracker-v1");
      removeKey("maplecompile-hexa-scouter-pair");
    }
  }

  // Roster replaced the old single-pin key; pin is only for one-shot migrate.
  if (hasKey("maplecompile-roster")) {
    removeKey("maplecompile-dashboard-pinned");
  }

  // Drop character workspaces for characters no longer on the roster.
  // Skip when roster is empty/uncertain so a parse miss cannot wipe everything.
  try {
    if (hasKey(CHARACTER_WORKSPACE_KEY) && hasKey(ROSTER_KEY)) {
      const rawRoster = localStorage.getItem(ROSTER_KEY);
      if (rawRoster) {
        const roster = readRosterState();
        if (roster.entries.length > 0) {
          const allowed = new Set(roster.entries.map((e) => entryKey(e)));
          pruneWorkspacesToRosterKeys(allowed);
        }
      }
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

  // Drop the previous one-shot flags so we do not leave useless keys behind.
  removeKey("maplecompile-storage-cleanup-v1");
  removeKey("maplecompile-storage-cleanup-v2");

  try {
    localStorage.setItem(STORAGE_CLEANUP_KEY, "1");
  } catch {
    /* ignore */
  }
}
