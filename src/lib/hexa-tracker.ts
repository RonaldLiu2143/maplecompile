import { notifyMapleDataChanged } from "./maple-events";
import {
  type PairedScouterRef,
  hasScouterStats,
} from "./pairing";
import {
  HEXA_MAX_LEVEL,
  HEXA_SLOT_COUNT,
  clampHexaForGms,
  defaultHexaLevels,
} from "./scouter/buffs";
import { storage } from "./storage";
import { entryKey, readRosterState } from "./dashboard/roster";

export const HEXA_TRACKER_KEY = "maplecompile-hexa-tracker-v1";
export const HEXA_SCOUTER_PAIR_KEY = "maplecompile-hexa-scouter-pair";

export type HexaTrackerState = {
  /** Per-slot skill levels (length HEXA_SLOT_COUNT). */
  levels: number[];
  /** Sol Erda fragments held. */
  fragments: number;
  /** Optional Sol Erda energy held. */
  erda: number;
  /** Roster character key when linked (`region:name`). */
  rosterKey: string | null;
  updatedAt: number;
};

export type HexaScouterPairing = {
  scouter: PairedScouterRef;
  /** Snapshot label for the HEXA side. */
  hexaName: string;
  rosterKey: string | null;
  updatedAt: number;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeLevels(raw: unknown): number[] {
  const base = defaultHexaLevels().map(() => 0);
  if (!Array.isArray(raw)) return clampHexaForGms(base);
  const next = base.map((_, i) => {
    const n = Math.floor(Number(raw[i]) || 0);
    return Math.max(0, Math.min(HEXA_MAX_LEVEL, n));
  });
  while (next.length < HEXA_SLOT_COUNT) next.push(0);
  return clampHexaForGms(next.slice(0, HEXA_SLOT_COUNT));
}

export function defaultHexaTrackerState(): HexaTrackerState {
  return {
    levels: defaultHexaLevels().map(() => 0),
    fragments: 0,
    erda: 0,
    rosterKey: null,
    updatedAt: Date.now(),
  };
}

export function loadHexaTracker(): HexaTrackerState {
  const raw = readJson<Partial<HexaTrackerState> | null>(HEXA_TRACKER_KEY, null);
  if (!raw) return defaultHexaTrackerState();
  return {
    levels: normalizeLevels(raw.levels),
    fragments: Math.max(0, Math.floor(Number(raw.fragments) || 0)),
    erda: Math.max(0, Math.floor(Number(raw.erda) || 0)),
    rosterKey: typeof raw.rosterKey === "string" ? raw.rosterKey : null,
    updatedAt: Number(raw.updatedAt) || Date.now(),
  };
}

export function saveHexaTracker(state: HexaTrackerState) {
  const next: HexaTrackerState = {
    ...state,
    levels: normalizeLevels(state.levels),
    fragments: Math.max(0, Math.floor(state.fragments)),
    erda: Math.max(0, Math.floor(state.erda)),
    updatedAt: Date.now(),
  };
  writeJson(HEXA_TRACKER_KEY, next);
  notifyMapleDataChanged("other");
  return next;
}

export function getHexaScouterPairing(): HexaScouterPairing | null {
  const raw = readJson<HexaScouterPairing | null>(HEXA_SCOUTER_PAIR_KEY, null);
  if (!raw?.scouter) return null;
  return raw;
}

export function setHexaScouterPairing(pairing: HexaScouterPairing) {
  writeJson(HEXA_SCOUTER_PAIR_KEY, pairing);
  notifyMapleDataChanged("pairing");
}

export function clearHexaScouterPairing() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HEXA_SCOUTER_PAIR_KEY);
  notifyMapleDataChanged("pairing");
}

export function formatHexaPairingLabel(pairing: HexaScouterPairing): string {
  const roster = pairing.rosterKey ? ` · ${pairing.rosterKey}` : "";
  return `Paired: ${pairing.hexaName} ↔ ${pairing.scouter.name}${roster}`;
}

export type PairHexaArgs = {
  scouterPresetId?: string | null;
  scouterName?: string;
  /** Prefer linking primary roster character when set. */
  rosterKey?: string | null;
  /** Push tracker levels into scouter-last hexa on pair. */
  syncLevelsToScouter?: boolean;
};

/**
 * Link current HEXA tracker progress with a scouter draft or saved preset.
 */
export function pairHexaWithScouter(args: PairHexaArgs = {}): HexaScouterPairing {
  const tracker = loadHexaTracker();
  const last = storage.getScouterLast();

  if (args.syncLevelsToScouter && last?.input) {
    storage.setScouterLast({
      ...last,
      hexa: normalizeLevels(tracker.levels),
    });
  }

  let scouter: PairedScouterRef;
  const presetId = args.scouterPresetId?.trim() || "";
  if (presetId) {
    const preset = storage.getScouterPreset(presetId);
    scouter = {
      kind: "preset",
      presetId,
      name: args.scouterName?.trim() || preset?.name || "Saved preset",
    };
  } else {
    if (!hasScouterStats() && !last?.input) {
      throw new Error("Enter scouter stats or pick a preset first");
    }
    scouter = {
      kind: "draft",
      name: args.scouterName?.trim() || "Current scouter",
    };
  }

  const rosterKey =
    args.rosterKey !== undefined
      ? args.rosterKey
      : tracker.rosterKey ?? primaryRosterKey();

  const pairing: HexaScouterPairing = {
    scouter,
    hexaName: "HEXA Tracker",
    rosterKey,
    updatedAt: Date.now(),
  };

  if (rosterKey && tracker.rosterKey !== rosterKey) {
    saveHexaTracker({ ...tracker, rosterKey });
  }

  setHexaScouterPairing(pairing);
  return pairing;
}

/** Pull hexa levels from paired scouter (last, else preset snapshot). */
export function importLevelsFromPairedScouter(): HexaTrackerState | null {
  const pairing = getHexaScouterPairing();
  if (!pairing) return null;

  let levels: number[] | null = null;
  const last = storage.getScouterLast();
  if (last?.hexa) {
    levels = normalizeLevels(last.hexa);
  } else if (pairing.scouter.kind === "preset") {
    const preset = storage.getScouterPreset(pairing.scouter.presetId);
    if (preset?.hexa) levels = normalizeLevels(preset.hexa);
  }
  if (!levels) return null;

  const tracker = loadHexaTracker();
  return saveHexaTracker({
    ...tracker,
    levels,
    rosterKey: pairing.rosterKey ?? tracker.rosterKey,
  });
}

export function primaryRosterKey(): string | null {
  const { primary } = readRosterState();
  return primary ? entryKey(primary) : null;
}

export function listRosterOptions(): {
  key: string;
  label: string;
  primary: boolean;
}[] {
  const { entries, primary } = readRosterState();
  const primaryKey = primary ? entryKey(primary) : null;
  return entries.map((e) => {
    const key = entryKey(e);
    return {
      key,
      label: `${e.name} (${e.region.toUpperCase()})`,
      primary: primaryKey === key,
    };
  });
}

export { HEXA_MAX_LEVEL, HEXA_SLOT_COUNT };
