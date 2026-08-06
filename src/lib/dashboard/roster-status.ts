/**
 * At-a-glance roster row status from HEXA / Liberation / workspace stores.
 */

import {
  loadWorkspaceMap,
  type CharacterWorkspace,
} from "@/lib/character-workspace";
import {
  HEXA_MAX_LEVEL,
  HEXA_SLOT_COUNT,
  loadHexaTrackerMap,
  type HexaTrackerState,
} from "@/lib/hexa-tracker";
import {
  readLiberationStore,
  type CharacterLiberationBundle,
  type LiberationStore,
} from "@/lib/liberation/persist";
import {
  loadPairingMap,
  type ScouterEquipPairing,
} from "@/lib/pairing";
import { countFilledSlots } from "@/lib/starter-loadouts";
import type { RosterEntry } from "@/lib/dashboard/roster";
import { entryKey } from "@/lib/dashboard/roster";

export type LiberationTagFlags = {
  genesis: boolean;
  destiny: boolean;
};

export type RosterStatusSnapshot = {
  hexa: {
    hasData: boolean;
    /** 0–100 from sum(levels) / (slots * max). */
    pct: number;
    levelsSum: number;
  };
  liberation: {
    hasData: boolean;
    pct: number;
    tab: "genesis" | "destiny";
    genesisLiberated: boolean;
    destinyLiberated: boolean;
  };
  gear: {
    equipCount: number;
    paired: boolean;
  };
  scouter: {
    hasData: boolean;
    paired: boolean;
  };
};

function liberationPct(bundle: CharacterLiberationBundle): {
  pct: number;
  tab: "genesis" | "destiny";
} {
  const tab = bundle.currentTab;
  const inputs = bundle[tab];
  if (inputs.liberated) return { pct: 100, tab };
  const target = Math.max(1, inputs.targetTraces || 1);
  const pct = Math.min(
    100,
    Math.round((Math.max(0, inputs.currentTraces) / target) * 100),
  );
  return { pct, tab };
}

function flagsFromBundle(
  bundle: CharacterLiberationBundle | undefined,
): LiberationTagFlags {
  return {
    genesis: !!bundle?.genesis.liberated,
    destiny: !!bundle?.destiny.liberated,
  };
}

function hexaSnapshot(state: HexaTrackerState | undefined): RosterStatusSnapshot["hexa"] {
  const levels = state?.levels ?? [];
  const levelsSum = levels.reduce((a, b) => a + b, 0);
  const hexaMax = HEXA_SLOT_COUNT * HEXA_MAX_LEVEL;
  const pct = Math.min(100, Math.round((levelsSum / hexaMax) * 100));
  const hasData =
    levelsSum > 0 || (state?.fragments ?? 0) > 0 || (state?.erda ?? 0) > 0;
  return { hasData, pct, levelsSum };
}

function liberationSnapshot(
  libStore: LiberationStore,
  key: string,
): RosterStatusSnapshot["liberation"] {
  const bundle = libStore.characterData[key];
  const empty: RosterStatusSnapshot["liberation"] = {
    hasData: false,
    pct: 0,
    tab: "genesis",
    genesisLiberated: false,
    destinyLiberated: false,
  };
  if (!bundle) return empty;
  const { pct, tab } = liberationPct(bundle);
  const genesisLiberated = !!bundle.genesis.liberated;
  const destinyLiberated = !!bundle.destiny.liberated;
  const touched =
    libStore.selectedCharacterIds.includes(key) ||
    genesisLiberated ||
    destinyLiberated ||
    bundle.genesis.currentTraces > 0 ||
    bundle.destiny.currentTraces > 0 ||
    bundle.genesis.completionRate > 0 ||
    bundle.destiny.completionRate > 0;
  return {
    hasData: touched,
    pct,
    tab,
    genesisLiberated,
    destinyLiberated,
  };
}

function buildRosterStatus(
  key: string,
  hexaMap: Record<string, HexaTrackerState>,
  libStore: LiberationStore,
  workspaces: Record<string, CharacterWorkspace>,
  pairings: Record<string, ScouterEquipPairing>,
): RosterStatusSnapshot {
  const ws = workspaces[key];
  const equipCount = ws ? countFilledSlots(ws.equipSetup) : 0;
  const hasScouter = Boolean(ws?.scouterLast?.input);
  const paired = Boolean(pairings[key] || ws?.pairedAt);

  return {
    hexa: hexaSnapshot(hexaMap[key]),
    liberation: liberationSnapshot(libStore, key),
    gear: { equipCount, paired },
    scouter: { hasData: hasScouter, paired },
  };
}

/** Per-character Genesis / Destiny liberated flags from liberation.v2. */
export function readLiberationFlags(key: string): LiberationTagFlags {
  const bundle = readLiberationStore().characterData[key];
  return flagsFromBundle(bundle);
}

/** Batched liberation flags — one store read for many keys. */
export function readLiberationFlagsByKey(
  keys: Iterable<string>,
): Record<string, LiberationTagFlags> {
  const store = readLiberationStore();
  const out: Record<string, LiberationTagFlags> = {};
  for (const key of keys) {
    out[key] = flagsFromBundle(store.characterData[key]);
  }
  return out;
}

export function readRosterStatus(key: string): RosterStatusSnapshot {
  return buildRosterStatus(
    key,
    loadHexaTrackerMap(),
    readLiberationStore(),
    loadWorkspaceMap(),
    loadPairingMap(),
  );
}

export function readRosterStatusByKey(
  roster: RosterEntry[],
): Record<string, RosterStatusSnapshot> {
  const hexaMap = loadHexaTrackerMap();
  const libStore = readLiberationStore();
  const workspaces = loadWorkspaceMap();
  const pairings = loadPairingMap();
  const out: Record<string, RosterStatusSnapshot> = {};
  for (const entry of roster) {
    const key = entryKey(entry);
    out[key] = buildRosterStatus(
      key,
      hexaMap,
      libStore,
      workspaces,
      pairings,
    );
  }
  return out;
}
