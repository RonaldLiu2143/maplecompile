import { notifyMapleDataChanged } from "./maple-events";
import {
  type PairedScouterRef,
  hasScouterStats,
} from "./pairing";
import {
  DEFAULT_FRAGMENT_RATE,
  HEXA_CORE_MAX_LEVEL,
  HEXA_STAT_MAX_LEVEL,
  type FragmentRateSettings,
  type WeeklyDungeonId,
  WEEKLY_DUNGEON_FRAGMENTS,
} from "./hexa-costs";
import {
  HEXA_MAX_LEVEL,
  HEXA_SLOT_COUNT,
  clampHexaForGms,
  defaultHexaLevels,
} from "./scouter/buffs";
import {
  DEFAULT_BOSS_CONVERTED_STAT,
  normalizeBossConvertedStat,
} from "./hexa-priority";
import { storage, type ScouterLastState } from "./storage";
import {
  activeCharacterKey,
  getWorkspace,
  patchWorkspace,
  persistLiveToWorkspace,
} from "./character-workspace";
import { entryKey, readRosterState } from "./dashboard/roster";

export const HEXA_TRACKER_KEY = "maplecompile-hexa-tracker-v1";
/** Per-character HEXA store (v2). */
export const HEXA_TRACKER_BY_CHAR_KEY = "maplecompile-hexa-tracker-by-char-v1";
export const HEXA_SCOUTER_PAIR_KEY = "maplecompile-hexa-scouter-pair";
export const HEXA_SCOUTER_PAIR_BY_CHAR_KEY =
  "maplecompile-hexa-scouter-pair-by-char-v1";
export const HEXA_MIGRATED_KEY = "maplecompile-hexa-tracker-migrated-v1";

export type HexaTrackerState = {
  /** Per-slot skill levels (length HEXA_SLOT_COUNT). */
  levels: number[];
  /** Per-slot target levels (default 30). */
  targets: number[];
  /** Sol Erda fragments held. */
  fragments: number;
  /** Optional Sol Erda energy held. */
  erda: number;
  /** Hexa Stat node level (0–3). */
  hexaStatLevel: number;
  /** Hexa Stat target (0–3). */
  hexaStatTarget: number;
  /**
   * HEXA Converted score (raw entered value) used for upgrade priority banding.
   * Default 85000 (MapleHub base band). Nearest band is chosen only when
   * ranking upgrades — this field is never snapped on save.
   */
  bossConvertedStat: number;
  /** Fragment farming rate assumptions. */
  rate: FragmentRateSettings;
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

export type HexaByCharacter = Record<string, HexaTrackerState>;
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

function defaultTargets(): number[] {
  return Array.from({ length: HEXA_SLOT_COUNT }, (_, i) => {
    // GMS-unavailable stay 0; others default target max.
    if (i === 10 || i === 11) return 0;
    return HEXA_CORE_MAX_LEVEL;
  });
}

function normalizeTargets(raw: unknown, levels: number[]): number[] {
  const base = defaultTargets();
  if (!Array.isArray(raw)) {
    // Legacy: target = max(current, default max) so progress isn't empty.
    return base.map((t, i) => Math.max(t, levels[i] ?? 0));
  }
  return base.map((fallback, i) => {
    if (i === 10 || i === 11) return 0;
    const n = Math.floor(Number(raw[i]));
    if (!Number.isFinite(n)) return Math.max(fallback, levels[i] ?? 0);
    return Math.max(0, Math.min(HEXA_CORE_MAX_LEVEL, n));
  });
}

function normalizeRate(raw: unknown): FragmentRateSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_FRAGMENT_RATE };
  const r = raw as Partial<FragmentRateSettings>;
  const dungeon = String(r.weeklyDungeon ?? "none") as WeeklyDungeonId;
  return {
    fragPerWap: Math.max(0, Math.floor(Number(r.fragPerWap) || 0)),
    wapsPerDay: Math.max(0, Number(r.wapsPerDay) || 0),
    weeklyQuestEnabled: r.weeklyQuestEnabled !== false,
    weeklyDungeon:
      dungeon in WEEKLY_DUNGEON_FRAGMENTS ? dungeon : "none",
  };
}

export function defaultHexaTrackerState(
  rosterKey: string | null = null,
): HexaTrackerState {
  return {
    levels: defaultHexaLevels().map(() => 0),
    targets: defaultTargets(),
    fragments: 0,
    erda: 0,
    hexaStatLevel: 0,
    hexaStatTarget: HEXA_STAT_MAX_LEVEL,
    bossConvertedStat: DEFAULT_BOSS_CONVERTED_STAT,
    rate: { ...DEFAULT_FRAGMENT_RATE },
    rosterKey,
    updatedAt: Date.now(),
  };
}

function normalizeTracker(
  raw: Partial<HexaTrackerState> | null | undefined,
  rosterKey: string | null,
): HexaTrackerState {
  if (!raw) return defaultHexaTrackerState(rosterKey);
  const levels = normalizeLevels(raw.levels);
  return {
    levels,
    targets: normalizeTargets(raw.targets, levels),
    fragments: Math.max(0, Math.floor(Number(raw.fragments) || 0)),
    erda: Math.max(0, Math.floor(Number(raw.erda) || 0)),
    hexaStatLevel: Math.max(
      0,
      Math.min(
        HEXA_STAT_MAX_LEVEL,
        Math.floor(Number(raw.hexaStatLevel) || 0),
      ),
    ),
    hexaStatTarget: Math.max(
      0,
      Math.min(
        HEXA_STAT_MAX_LEVEL,
        Math.floor(
          Number(raw.hexaStatTarget) || HEXA_STAT_MAX_LEVEL,
        ),
      ),
    ),
    bossConvertedStat: normalizeBossConvertedStat(
      raw.bossConvertedStat ?? DEFAULT_BOSS_CONVERTED_STAT,
    ),
    rate: normalizeRate(raw.rate),
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

/**
 * Place legacy HEXA blob under a roster key, or rematerialize to `__local__`
 * when the preferred slot is missing/taken. Returns the destination key, or
 * null when nothing could be placed (legacy must stay).
 */
function placeLegacyHexaTracker(
  map: HexaByCharacter,
  legacy: Partial<HexaTrackerState>,
  primaryKey: string | null,
): string | null {
  const preferred =
    (typeof legacy.rosterKey === "string" && legacy.rosterKey) ||
    primaryKey ||
    null;
  if (preferred && !map[preferred]) {
    map[preferred] = normalizeTracker(legacy, preferred);
    return preferred;
  }
  if (!map["__local__"]) {
    map["__local__"] = normalizeTracker(legacy, null);
    return "__local__";
  }
  // Both preferred (if any) and __local__ are occupied — leave legacy in place.
  return null;
}

function placeLegacyHexaPair(
  pairMap: HexaPairByCharacter,
  legacyPair: HexaScouterPairing,
  primaryKey: string | null,
): string | null {
  const preferred =
    (typeof legacyPair.rosterKey === "string" && legacyPair.rosterKey) ||
    primaryKey ||
    null;
  if (preferred && !pairMap[preferred]) {
    pairMap[preferred] = legacyPair;
    return preferred;
  }
  if (!pairMap["__local__"]) {
    pairMap["__local__"] = legacyPair;
    return "__local__";
  }
  return null;
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
  let trackerPlaced = !legacy;
  if (legacy) {
    const dest = placeLegacyHexaTracker(map, legacy, primaryKey);
    if (dest) {
      writeByCharacter(map);
      trackerPlaced = true;
    }
  }

  const pairMap = readPairByCharacter();
  const legacyPair = readJson<HexaScouterPairing | null>(
    HEXA_SCOUTER_PAIR_KEY,
    null,
  );
  let pairPlaced = !legacyPair?.scouter;
  if (legacyPair?.scouter) {
    const dest = placeLegacyHexaPair(pairMap, legacyPair, primaryKey);
    if (dest) {
      writePairByCharacter(pairMap);
      pairPlaced = true;
    }
  }

  // Only drop legacy after data is under a roster key or `__local__`.
  try {
    if (trackerPlaced) localStorage.removeItem(HEXA_TRACKER_KEY);
    if (pairPlaced) localStorage.removeItem(HEXA_SCOUTER_PAIR_KEY);
  } catch {
    /* ignore */
  }

  // Retry later if either blob could not be placed safely.
  if (!trackerPlaced || !pairPlaced) return;

  try {
    localStorage.setItem(HEXA_MIGRATED_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Full per-character HEXA map (migrates legacy once). */
export function loadHexaTrackerMap(): HexaByCharacter {
  migrateLegacyHexaTracker();
  return readByCharacter();
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
    targets: normalizeTargets(state.targets, normalizeLevels(state.levels)),
    fragments: Math.max(0, Math.floor(state.fragments)),
    erda: Math.max(0, Math.floor(state.erda)),
    hexaStatLevel: Math.max(
      0,
      Math.min(HEXA_STAT_MAX_LEVEL, Math.floor(state.hexaStatLevel || 0)),
    ),
    hexaStatTarget: Math.max(
      0,
      Math.min(
        HEXA_STAT_MAX_LEVEL,
        Math.floor(state.hexaStatTarget ?? HEXA_STAT_MAX_LEVEL),
      ),
    ),
    bossConvertedStat: normalizeBossConvertedStat(
      state.bossConvertedStat ?? DEFAULT_BOSS_CONVERTED_STAT,
    ),
    rate: normalizeRate(state.rate),
    rosterKey: key === "__local__" ? null : key,
    updatedAt: Date.now(),
  };
  const map = readByCharacter();
  map[key] = next;
  writeByCharacter(map);
  // Same-tab listeners use maple events; cross-tab listens on by-char key.
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

function levelsHaveProgress(levels: number[] | null | undefined): boolean {
  return Boolean(levels?.some((n) => n > 0));
}

/**
 * Resolve the scouter draft that belongs to a roster character:
 * workspace first, then live storage when that character is active.
 */
export function resolveScouterDraftForCharacter(
  characterKey?: string | null,
): ScouterLastState | null {
  const key = characterKey || null;
  if (key && key !== "__local__") {
    const ws = getWorkspace(key);
    if (ws?.scouterLast?.input) return ws.scouterLast;
    if (key === activeCharacterKey()) {
      const live = storage.getScouterLast();
      return live?.input ? live : null;
    }
    return null;
  }
  const live = storage.getScouterLast();
  return live?.input ? live : null;
}

/** True when the character (or live draft) has scouter stats to pair with. */
export function characterHasScouterDraft(
  characterKey?: string | null,
): boolean {
  if (resolveScouterDraftForCharacter(characterKey)) return true;
  if (!characterKey) return hasScouterStats();
  return false;
}

/**
 * Write hexa levels into the character's scouter draft (workspace + live when
 * that character is active). Never touches another character's draft.
 */
export function writeScouterHexaForCharacter(
  characterKey: string | null | undefined,
  levels: number[],
  base?: ScouterLastState | null,
): boolean {
  const normalized = normalizeLevels(levels);
  const key =
    characterKey && characterKey !== "__local__" ? characterKey : null;
  const draft = base ?? resolveScouterDraftForCharacter(key);
  if (!draft?.input) return false;

  const next: ScouterLastState = { ...draft, hexa: normalized };
  const active = activeCharacterKey();

  if (!key || key === active) {
    storage.setScouterLast(next);
    persistLiveToWorkspace(key || active);
    return true;
  }

  patchWorkspace(key, { scouterLast: next });
  return true;
}

export type PairHexaArgs = {
  scouterPresetId?: string | null;
  scouterName?: string;
  /** Prefer linking primary roster character when set. */
  rosterKey?: string | null;
  /**
   * Sync levels on pair (default true):
   * - tracker has progress → push into that character's scouter draft
   * - tracker empty + scouter has progress → leave scouter alone (import separately)
   * Never wipe scouter hexa with an empty tracker.
   */
  syncLevelsToScouter?: boolean;
};

/**
 * Link current HEXA tracker progress with a scouter draft or saved preset.
 * Pairing is stored per roster character and syncs into that character's
 * workspace scouter — not only the ephemeral live `scouter-last` blob.
 */
export function pairHexaWithScouter(args: PairHexaArgs = {}): HexaScouterPairing {
  const rosterKey =
    args.rosterKey !== undefined
      ? args.rosterKey
      : primaryRosterKey();
  const tracker = loadHexaTracker(rosterKey);
  const draft = resolveScouterDraftForCharacter(rosterKey);

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
    if (!draft?.input) {
      throw new Error(
        rosterKey
          ? "Open Scouter for this character (or pick a preset) first"
          : "Enter scouter stats or pick a preset first",
      );
    }
    scouter = {
      kind: "draft",
      name: args.scouterName?.trim() || "Current scouter",
    };
  }

  const shouldSync = args.syncLevelsToScouter !== false;
  if (shouldSync && draft?.input && levelsHaveProgress(tracker.levels)) {
    writeScouterHexaForCharacter(rosterKey, tracker.levels, draft);
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

/** Pull hexa levels from the paired character's scouter (workspace/draft, else preset). */
export function importLevelsFromPairedScouter(
  characterKey?: string | null,
): HexaTrackerState | null {
  const key = resolveHexaKey(characterKey);
  const pairing = getHexaScouterPairing(key);
  if (!pairing) return null;

  let levels: number[] | null = null;
  if (pairing.scouter.kind === "preset") {
    const preset = storage.getScouterPreset(pairing.scouter.presetId);
    if (preset?.hexa) levels = normalizeLevels(preset.hexa);
  } else {
    const draft = resolveScouterDraftForCharacter(
      pairing.rosterKey ?? (key === "__local__" ? null : key),
    );
    if (draft?.hexa) levels = normalizeLevels(draft.hexa);
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

/**
 * While paired to a draft scouter, push tracker levels into that character's
 * scouter workspace (and live storage when active).
 */
export function syncTrackerLevelsToPairedScouter(
  characterKey?: string | null,
  levels?: number[],
): boolean {
  const key = resolveHexaKey(characterKey);
  const pairing = getHexaScouterPairing(key);
  if (!pairing || pairing.scouter.kind !== "draft") return false;
  const tracker = loadHexaTracker(key);
  const nextLevels = levels ?? tracker.levels;
  return writeScouterHexaForCharacter(
    pairing.rosterKey ?? (key === "__local__" ? null : key),
    nextLevels,
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
