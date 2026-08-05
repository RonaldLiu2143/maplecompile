/**
 * Shared active-character switch: roster primary + workspace + tool focus.
 * Dashboard Manager star and ActiveCharacterBar both use this path.
 */

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
  type RosterState,
} from "@/lib/dashboard/roster";
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
 */
export function switchActiveCharacter(entry: RosterEntry): RosterState {
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
    applyLivePairingForCharacter(nextKey);
    syncBossActiveKey(nextKey);
    syncLiberationActive(nextKey);
    notifyMapleDataChanged("other");
  }

  return next;
}
