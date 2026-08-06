/**
 * At-a-glance roster row status from HEXA / Liberation / workspace stores.
 */

import { getWorkspace } from "@/lib/character-workspace";
import {
  HEXA_MAX_LEVEL,
  HEXA_SLOT_COUNT,
  loadHexaTracker,
} from "@/lib/hexa-tracker";
import {
  readLiberationStore,
  type CharacterLiberationBundle,
} from "@/lib/liberation/persist";
import { getPairing } from "@/lib/pairing";
import { countFilledSlots } from "@/lib/starter-loadouts";
import type { RosterEntry } from "@/lib/dashboard/roster";
import { entryKey } from "@/lib/dashboard/roster";

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

/** Per-character Genesis / Destiny liberated flags from liberation.v2. */
export function readLiberationFlags(key: string): {
  genesis: boolean;
  destiny: boolean;
} {
  const bundle = readLiberationStore().characterData[key];
  return {
    genesis: !!bundle?.genesis.liberated,
    destiny: !!bundle?.destiny.liberated,
  };
}

export function readRosterStatus(key: string): RosterStatusSnapshot {
  const hexaState = loadHexaTracker(key);
  const levelsSum = hexaState.levels.reduce((a, b) => a + b, 0);
  const hexaMax = HEXA_SLOT_COUNT * HEXA_MAX_LEVEL;
  const hexaPct = Math.min(100, Math.round((levelsSum / hexaMax) * 100));
  const hexaHas =
    levelsSum > 0 || hexaState.fragments > 0 || hexaState.erda > 0;

  const libStore = readLiberationStore();
  const bundle = libStore.characterData[key];
  let liberation: RosterStatusSnapshot["liberation"] = {
    hasData: false,
    pct: 0,
    tab: "genesis",
    genesisLiberated: false,
    destinyLiberated: false,
  };
  if (bundle) {
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
    liberation = {
      hasData: touched,
      pct,
      tab,
      genesisLiberated,
      destinyLiberated,
    };
  }

  const ws = getWorkspace(key);
  const equipCount = ws ? countFilledSlots(ws.equipSetup) : 0;
  const hasScouter = Boolean(ws?.scouterLast?.input);
  const paired = Boolean(getPairing(key) || ws?.pairedAt);

  return {
    hexa: { hasData: hexaHas, pct: hexaPct, levelsSum },
    liberation,
    gear: { equipCount, paired },
    scouter: { hasData: hasScouter, paired },
  };
}

export function readRosterStatusByKey(
  roster: RosterEntry[],
): Record<string, RosterStatusSnapshot> {
  const out: Record<string, RosterStatusSnapshot> = {};
  for (const entry of roster) {
    const key = entryKey(entry);
    out[key] = readRosterStatus(key);
  }
  return out;
}
