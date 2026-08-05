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
import { activeCharacterKey } from "./character-workspace";
import { entryKey, readRosterState } from "./dashboard/roster";

export const HEXA_TRACKER_KEY = "maplecompile-hexa-tracker-v1";
/** Per-character HEXA store (v2). */
export const HEXA_TRACKER_BY_CHAR_KEY = "maplecompile-hexa-tracker-by-char-v1";
export const HEXA_SCOUTER_PAIR_KEY = "maplecompile-hexa-scouter-pair";
export const HEXA_SCOUTER_PAIR_BY_CHAR_KEY =
  "maplecompile-hexa-scouter-pair-by-char-v1";
const HEXA_MIGRATED_KEY = "maplecompile-hexa-tracker-migrated-v1";

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

type HexaByCharacter = Record<string, HexaTrackerState>;
type HexaPairByCharacter = Record<string, HexaScouterPairing>;

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

export function defaultHexaTrackerState(
  rosterKey: string | null = null,
): HexaTrackerState {
  return {
    levels: defaultHexaLevels().map(() => 0),
    fragments: 0,
    erda: 0,
    rosterKey,
    updatedAt: Date.now(),
  };
}

function normalizeTracker(
  raw: Partial<HexaTrackerState> | null | undefined,
  rosterKey: string | null,
): HexaTrackerState {
  if (!raw) return defaultHexaTrackerState(rosterKey);
  return {
    levels: normalizeLevels(raw.levels),
    fragments: Math.max(0, Math.floor(Number(raw.fragments) || 0)),
    erda: Math.max(0, Math.floor(Number(raw.erda) || 0)),
    rosterKey:
      typeof raw.rosterKey === "string"
        ? raw.rosterKey
        : rosterKey,
    updatedAt: Number(raw.updatedAt) || Date.now(),
  };
}

function readByCharacter(): HexaByCharacter {
  const raw = readJson<HexaByCharacter | null>(HEXA_TRACKER_BY_CHAR_KEY, null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: HexaByCharacter = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key) continue;
    out[key] = normalizeTracker(value, key);
  }
  return out;
}

function writeByCharacter(map: HexaByCharacter) {
  writeJson(HEXA_TRACKER_BY_CHAR_KEY, map);
}

function readPairByCharacter(): HexaPairByCharacter {
  const raw = readJson<HexaPairByCharacter | null>(
    HEXA_SCOUTER_PAIR_BY_CHAR_KEY,
    null,
  );
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: HexaPairByCharacter = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key || !value?.scouter) continue;
    out[key] = value;
  }
  return out;
}

function writePairByCharacter(map: HexaPairByCharacter) {
  writeJson(HEXA_SCOUTER_PAIR_BY_CHAR_KEY, map);
}

/** One-shot: migrate legacy single-blob HEXA into primary (or tagged) key. */
export function migrateLegacyHexaTracker(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(HEXA_MIGRATED_KEY) === "1") return;
  } catch {
    return;
  }

  const map = readByCharacter();
  const legacy = readJson<Partial<HexaTrackerState> | null>(
    HEXA_TRACKER_KEY,
    null,
  );
  const primaryKey = primaryRosterKey();
  const targetKey =
    (legacy && typeof legacy.rosterKey === "string" && legacy.rosterKey) ||
    primaryKey;

  if (legacy && targetKey && !map[targetKey]) {
    map[targetKey] = normalizeTracker(legacy, targetKey);
    writeByCharacter(map);
  }

  const pairMap = readPairByCharacter();
  const legacyPair = readJson<HexaScouterPairing | null>(
    HEXA_SCOUTER_PAIR_KEY,
    null,
  );
  const pairKey =
    (legacyPair && typeof legacyPair.rosterKey === "string"
      ? legacyPair.rosterKey
      : null) || primaryKey;
  if (legacyPair?.scouter && pairKey && !pairMap[pairKey]) {
    pairMap[pairKey] = legacyPair;
    writePairByCharacter(pairMap);
  }

  try {
    localStorage.setItem(HEXA_MIGRATED_KEY, "1");
  } catch {
    /* ignore */
  }
}

function resolveHexaKey(characterKey?: string | null): string {
  if (characterKey) return characterKey;
  return (
    activeCharacterKey() ||
    primaryRosterKey() ||
    "__local__"
  );
}

export function loadHexaTracker(
  characterKey?: string | null,
): HexaTrackerState {
  migrateLegacyHexaTracker();
  const key = resolveHexaKey(characterKey);
  const map = readByCharacter();
  if (map[key]) return { ...map[key], rosterKey: key === "__local__" ? null : key };
  return defaultHexaTrackerState(key === "__local__" ? null : key);
}

export function saveHexaTracker(
  state: HexaTrackerState,
  characterKey?: string | null,
) {
  migrateLegacyHexaTracker();
  const key = resolveHexaKey(characterKey ?? state.rosterKey);
  const next: HexaTrackerState = {
    ...state,
    levels: normalizeLevels(state.levels),
    fragments: Math.max(0, Math.floor(state.fragments)),
    erda: Math.max(0, Math.floor(state.erda)),
    rosterKey: key === "__local__" ? null : key,
    updatedAt: Date.now(),
  };
  const map = readByCharacter();
  map[key] = next;
  writeByCharacter(map);
  // Mirror legacy blob for active character (compat listeners).
  writeJson(HEXA_TRACKER_KEY, next);
  notifyMapleDataChanged("other");
  return next;
}

export function getHexaScouterPairing(
  characterKey?: string | null,
): HexaScouterPairing | null {
  migrateLegacyHexaTracker();
  const key = resolveHexaKey(characterKey);
  const map = readPairByCharacter();
  if (map[key]) return map[key];
  if (key === "__local__" || !activeCharacterKey()) {
    const legacy = readJson<HexaScouterPairing | null>(
      HEXA_SCOUTER_PAIR_KEY,
      null,
    );
    if (legacy?.scouter) return legacy;
  }
  return null;
}

export function setHexaScouterPairing(
  pairing: HexaScouterPairing,
  characterKey?: string | null,
) {
  migrateLegacyHexaTracker();
  const key = resolveHexaKey(characterKey ?? pairing.rosterKey);
  const next: HexaScouterPairing = {
    ...pairing,
    rosterKey: key === "__local__" ? pairing.rosterKey : key,
  };
  const map = readPairByCharacter();
  map[key] = next;
  writePairByCharacter(map);
  writeJson(HEXA_SCOUTER_PAIR_KEY, next);
  notifyMapleDataChanged("pairing");
}

export function clearHexaScouterPairing(characterKey?: string | null) {
  if (typeof window === "undefined") return;
  migrateLegacyHexaTracker();
  const key = resolveHexaKey(characterKey);
  const map = readPairByCharacter();
  delete map[key];
  writePairByCharacter(map);
  const active = resolveHexaKey();
  if (key === active) {
    localStorage.removeItem(HEXA_SCOUTER_PAIR_KEY);
  }
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
  const rosterKey =
    args.rosterKey !== undefined
      ? args.rosterKey
      : primaryRosterKey();
  const tracker = loadHexaTracker(rosterKey);
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

  const pairing: HexaScouterPairing = {
    scouter,
    hexaName: "HEXA Tracker",
    rosterKey,
    updatedAt: Date.now(),
  };

  if (rosterKey && tracker.rosterKey !== rosterKey) {
    saveHexaTracker({ ...tracker, rosterKey }, rosterKey);
  }

  setHexaScouterPairing(pairing, rosterKey);
  return pairing;
}

/** Pull hexa levels from paired scouter (last, else preset snapshot). */
export function importLevelsFromPairedScouter(
  characterKey?: string | null,
): HexaTrackerState | null {
  const key = resolveHexaKey(characterKey);
  const pairing = getHexaScouterPairing(key);
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

  const tracker = loadHexaTracker(key);
  return saveHexaTracker(
    {
      ...tracker,
      levels,
      rosterKey: pairing.rosterKey ?? tracker.rosterKey,
    },
    key,
  );
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
