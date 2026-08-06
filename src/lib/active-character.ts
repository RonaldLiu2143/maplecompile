/**
 * Shared active-character switch: roster primary + workspace + tool focus.
 * Dashboard Manager star and ActiveCharacterBar both use this path.
 *
 * ## Active Character lock
 * - Default: unlocked (new users).
 * - Locking stores a sticky default for the current primary. That character
 *   remains the active/primary until the user unlocks.
 * - While locked, sticky switches are blocked (ActiveCharacterBar dropdown,
 *   Manager ★, HEXA/tool list clicks that would call `switchActiveCharacter`).
 *   Callers should show `UNLOCK_TO_CHANGE_ACTIVE_MSG` when blocked.
 * - Tools may still browse other characters via local view state (e.g. HEXA
 *   `rosterKey`) without changing primary or clearing the lock.
 * - Switching back to the locked character itself is always allowed.
 * - Share import does not overwrite primary while a lock is set (unless the
 *   import target is already the locked character).
 * - Removing the locked character from the roster clears the lock.
 */

import { readSessionCharacter } from "@/lib/character/client";
import {
  applyWorkspaceToLive,
  emptyWorkspace,
  getWorkspace,
  persistLiveToWorkspace,
} from "@/lib/character-workspace";
import {
  entryKey,
  readRosterState,
  setPrimary,
  type RosterEntry,
  type RosterPrimary,
  type RosterState,
} from "@/lib/dashboard/roster";
import { classFromJobName } from "@/lib/jobs";
import {
  ensureCharacterBundle,
  readLiberationStore,
  writeLiberationStore,
} from "@/lib/liberation/persist";
import {
  readBossIncomeStore,
  writeBossIncomeStore,
} from "@/lib/bosses/persist";
import { notifyMapleDataChanged } from "@/lib/maple-events";
import { applyLivePairingForCharacter } from "@/lib/pairing";
import { storage } from "@/lib/storage";
import type { JobType } from "@/lib/types";

/** Persisted sticky default while Active Character lock is on. */
export const ACTIVE_CHARACTER_LOCK_KEY = "maplecompile-active-character-lock";

/** Shown when a sticky primary switch is attempted while locked. */
export const UNLOCK_TO_CHANGE_ACTIVE_MSG =
  "Unlock to change active character";

function normalizeLock(
  raw: Partial<RosterPrimary> | null | undefined,
): RosterPrimary | null {
  if (!raw || typeof raw !== "object") return null;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const region =
    raw.region === "eu" || raw.region === "na" ? raw.region : null;
  if (!name || !region) return null;
  return { name, region };
}

/** Locked sticky default, or null when unlocked. */
export function readActiveCharacterLock(): RosterPrimary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_CHARACTER_LOCK_KEY);
    if (!raw) return null;
    return normalizeLock(JSON.parse(raw) as Partial<RosterPrimary>);
  } catch {
    return null;
  }
}

export function writeActiveCharacterLock(
  target: Pick<RosterEntry, "name" | "region"> | null,
): void {
  if (typeof window === "undefined") return;
  try {
    if (!target) {
      localStorage.removeItem(ACTIVE_CHARACTER_LOCK_KEY);
    } else {
      const lock: RosterPrimary = {
        name: target.name.trim(),
        region: target.region,
      };
      localStorage.setItem(ACTIVE_CHARACTER_LOCK_KEY, JSON.stringify(lock));
    }
    notifyMapleDataChanged("other");
  } catch {
    /* ignore */
  }
}

export function isActiveCharacterLocked(): boolean {
  return readActiveCharacterLock() != null;
}

/** True when `target` is the locked sticky default. */
export function isLockedActiveCharacter(
  target: Pick<RosterEntry, "name" | "region">,
): boolean {
  const lock = readActiveCharacterLock();
  if (!lock) return false;
  return entryKey(lock) === entryKey(target);
}

/**
 * True when setting `target` as sticky primary would be refused because a
 * different character is locked. Switching to the locked character is fine.
 */
export function isStickyActiveSwitchBlocked(
  target: Pick<RosterEntry, "name" | "region">,
): boolean {
  const lock = readActiveCharacterLock();
  if (!lock) return false;
  return entryKey(lock) !== entryKey(target);
}

/**
 * Lock the current (or given) character as sticky default.
 * Ensures they are also the live primary.
 */
export function lockActiveCharacter(
  entry: Pick<RosterEntry, "name" | "region">,
): RosterState {
  // Clear any prior lock first so switchActiveCharacter is not blocked when
  // re-locking to a different character.
  writeActiveCharacterLock(null);
  const state = switchActiveCharacter(entry as RosterEntry);
  writeActiveCharacterLock(entry);
  return state;
}

export function unlockActiveCharacter(): void {
  writeActiveCharacterLock(null);
}

/**
 * Toggle lock for the given character (usually current primary).
 * - Unlocked → lock this character (and set as primary).
 * - Locked to this character → unlock (primary unchanged).
 * - Locked to someone else → re-lock to this character.
 * Returns whether lock is now on.
 */
export function toggleActiveCharacterLock(
  primary: Pick<RosterEntry, "name" | "region"> | null,
): boolean {
  if (!primary) return false;
  if (isLockedActiveCharacter(primary)) {
    unlockActiveCharacter();
    return false;
  }
  lockActiveCharacter(primary);
  return true;
}

/** Clear lock when the locked roster entry is removed. */
export function clearActiveCharacterLockIfKey(characterKey: string): void {
  const lock = readActiveCharacterLock();
  if (!lock) return;
  if (entryKey(lock) === characterKey) {
    writeActiveCharacterLock(null);
  }
}

/**
 * If a lock is set and still on the roster, restore that character as primary.
 * No-op when unlocked, lock missing from roster, or already primary.
 * Returns the roster state when a restore switch ran; otherwise null.
 */
export function restoreLockedActiveCharacter(): RosterState | null {
  const lock = readActiveCharacterLock();
  if (!lock) return null;

  const { entries, primary } = readRosterState();
  const match = entries.find((e) => entryKey(e) === entryKey(lock));
  if (!match) {
    // Locked character left the roster — drop stale lock.
    writeActiveCharacterLock(null);
    return null;
  }

  if (primary && entryKey(primary) === entryKey(match)) {
    return null;
  }

  return switchActiveCharacter(match);
}

/** Sync Boss Income focus to the active roster key. */
export function syncBossActiveKey(characterKey: string): void {
  if (typeof window === "undefined" || !characterKey) return;
  try {
    const store = readBossIncomeStore();
    if (store.activeKey === characterKey) return;
    writeBossIncomeStore({ ...store, activeKey: characterKey });
  } catch {
    /* ignore */
  }
}

/**
 * Sync Liberation calculator to the active roster character (characters mode).
 * Ensures a bundle exists and selects the character.
 */
export function syncLiberationActive(characterKey: string): void {
  if (typeof window === "undefined" || !characterKey) return;
  try {
    let store = readLiberationStore();
    store = ensureCharacterBundle(store, characterKey);
    const selected = new Set(store.selectedCharacterIds);
    selected.add(characterKey);
    writeLiberationStore({
      ...store,
      mode: "characters",
      selectedCharacterIds: [...selected],
      activeCharacterId: characterKey,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Persist the previous primary's live Scouter/Equip, set the new primary,
 * load that character's workspace, and sync Boss/Liberation/pairing focus.
 *
 * When a lock is set for a different character, this is a no-op (primary and
 * lock unchanged). Use tool-local view state to browse other characters.
 */
export function switchActiveCharacter(entry: RosterEntry): RosterState {
  if (isStickyActiveSwitchBlocked(entry)) {
    return readRosterState();
  }

  const prev = readRosterState();
  const prevKey = prev.primary ? entryKey(prev.primary) : null;
  const nextKey = entryKey(entry);

  if (prevKey && prevKey !== nextKey) {
    persistLiveToWorkspace(prevKey);
  }

  const next = setPrimary(entry);

  if (prevKey !== nextKey) {
    const ws = getWorkspace(nextKey) ?? emptyWorkspace();
    applyWorkspaceToLive(ws);
    // Empty workspace / no scouter class: infer from cached character jobName.
    if (!storage.getJobType() || !storage.getCharType()) {
      const session = readSessionCharacter(entry.name, entry.region);
      const mapped = classFromJobName(session?.jobName);
      if (mapped) {
        storage.setJobType(mapped.jobType as JobType);
        storage.setCharType(mapped.charType);
      }
    }
    applyLivePairingForCharacter(nextKey);
    syncBossActiveKey(nextKey);
    syncLiberationActive(nextKey);
    notifyMapleDataChanged("other");
  }

  return next;
}
