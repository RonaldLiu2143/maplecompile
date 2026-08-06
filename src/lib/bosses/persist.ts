import { entryKey, type RosterEntry } from "@/lib/dashboard/roster";
import { compactAgainstDefaults } from "@/lib/storage-compact";
import {
  clampPartySize,
  defaultSelections,
  type BossClearSelection,
  type WorldType,
} from "./income";
import { currentBossWeekId } from "./weekly-reset";

export const BOSS_INCOME_STORAGE_KEY = "maplecompile.boss-income.v2";
const LEGACY_STORAGE_KEY = "maplecompile.boss-income.v1";

/** Fallback bucket when no roster character is selected. */
export const LOCAL_BOSS_KEY = "__local__";

export type CharacterBossState = {
  selections: BossClearSelection[];
};

export type BossIncomeStore = {
  version: 2;
  world: WorldType;
  /** Active character key (`region:name`) or LOCAL_BOSS_KEY. */
  activeKey: string | null;
  byCharacter: Record<string, CharacterBossState>;
  /**
   * ISO date (YYYY-MM-DD) of the Thursday UTC week these `cleared` flags belong to.
   * When the week rolls, clears are reset on read.
   */
  clearWeekId?: string;
};

function normalizeWorld(raw: unknown): WorldType {
  return raw === "interactive" ? "interactive" : "heroic";
}

function normalizeSelections(raw: unknown): BossClearSelection[] {
  const defaults = defaultSelections();
  if (!Array.isArray(raw)) return defaults;
  const byId = new Map<string, BossClearSelection>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const s = item as Partial<BossClearSelection>;
    if (typeof s.bossId !== "string") continue;
    byId.set(s.bossId, {
      bossId: s.bossId,
      difficulty: typeof s.difficulty === "string" ? s.difficulty : "",
      enabled: !!s.enabled,
      partySize: clampPartySize(s.bossId, Number(s.partySize) || 1),
      cleared: !!s.cleared,
    });
  }
  return defaults.map((d) => {
    const saved = byId.get(d.bossId);
    if (!saved) return d;
    return {
      bossId: d.bossId,
      difficulty: saved.difficulty || d.difficulty,
      enabled: saved.enabled,
      partySize: clampPartySize(d.bossId, saved.partySize),
      // Disabled bosses cannot stay marked cleared.
      cleared: saved.enabled ? saved.cleared : false,
    };
  });
}

function normalizeCharacterState(raw: unknown): CharacterBossState {
  if (!raw || typeof raw !== "object") {
    return { selections: defaultSelections() };
  }
  const obj = raw as Partial<CharacterBossState>;
  return { selections: normalizeSelections(obj.selections) };
}

function emptyStore(): BossIncomeStore {
  return {
    version: 2,
    world: "heroic",
    activeKey: null,
    byCharacter: {},
    clearWeekId: currentBossWeekId(),
  };
}

function resetClearedFlags(store: BossIncomeStore): BossIncomeStore {
  const byCharacter: Record<string, CharacterBossState> = {};
  for (const [key, state] of Object.entries(store.byCharacter)) {
    byCharacter[key] = {
      selections: state.selections.map((s) => ({ ...s, cleared: false })),
    };
  }
  return {
    ...store,
    byCharacter,
    clearWeekId: currentBossWeekId(),
  };
}

/** If stored clears are from a prior week, zero `cleared` and stamp the new week. */
export function ensureBossClearsForCurrentWeek(
  store: BossIncomeStore,
): BossIncomeStore {
  const weekId = currentBossWeekId();
  if (store.clearWeekId === weekId) return store;
  return resetClearedFlags(store);
}

function readLegacyV1(): BossIncomeStore | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      world?: unknown;
      selections?: unknown;
    };
    return {
      version: 2,
      world: normalizeWorld(parsed.world),
      activeKey: LOCAL_BOSS_KEY,
      byCharacter: {
        [LOCAL_BOSS_KEY]: normalizeCharacterState({
          selections: parsed.selections,
        }),
      },
    };
  } catch {
    return null;
  }
}

export function readBossIncomeStore(): BossIncomeStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(BOSS_INCOME_STORAGE_KEY);
    if (!raw) {
      const legacy = readLegacyV1();
      if (legacy) {
        writeBossIncomeStore(legacy);
        try {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        return legacy;
      }
      return emptyStore();
    }
    const parsed = JSON.parse(raw) as Partial<BossIncomeStore>;
    const byCharacter: Record<string, CharacterBossState> = {};
    if (parsed.byCharacter && typeof parsed.byCharacter === "object") {
      for (const [key, value] of Object.entries(parsed.byCharacter)) {
        if (!key) continue;
        byCharacter[key] = normalizeCharacterState(value);
      }
    }
    const store: BossIncomeStore = {
      version: 2,
      world: normalizeWorld(parsed.world),
      activeKey:
        typeof parsed.activeKey === "string" ? parsed.activeKey : null,
      byCharacter,
      clearWeekId:
        typeof parsed.clearWeekId === "string"
          ? parsed.clearWeekId
          : undefined,
    };
    const next = ensureBossClearsForCurrentWeek(store);
    if (next !== store) {
      writeBossIncomeStore(next);
    }
    return next;
  } catch {
    return emptyStore();
  }
}

function compactSelectionsForStorage(
  selections: BossClearSelection[],
): BossClearSelection[] {
  const defaults = defaultSelections();
  return compactAgainstDefaults(
    selections,
    defaults,
    (s) => s.bossId,
    (s, d) =>
      !s.enabled &&
      !s.cleared &&
      s.difficulty === d.difficulty &&
      s.partySize === d.partySize,
  );
}

export function writeBossIncomeStore(store: BossIncomeStore): void {
  if (typeof window === "undefined") return;
  try {
    const compacted: BossIncomeStore = {
      ...store,
      byCharacter: Object.fromEntries(
        Object.entries(store.byCharacter).map(([key, state]) => [
          key,
          {
            selections: compactSelectionsForStorage(
              normalizeSelections(state.selections),
            ),
          },
        ]),
      ),
    };
    localStorage.setItem(BOSS_INCOME_STORAGE_KEY, JSON.stringify(compacted));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getCharacterBossState(
  store: BossIncomeStore,
  key: string,
): CharacterBossState {
  return store.byCharacter[key] ?? { selections: defaultSelections() };
}

/**
 * Resolve which character key to use given roster + store preference.
 * Prefers stored activeKey when still on roster; else primary; else first; else local.
 */
export function resolveActiveBossKey(
  store: BossIncomeStore,
  roster: ReadonlyArray<Pick<RosterEntry, "name" | "region">>,
  primary: Pick<RosterEntry, "name" | "region"> | null,
): string {
  const rosterKeys = new Set(roster.map((e) => entryKey(e)));
  if (store.activeKey && rosterKeys.has(store.activeKey)) {
    return store.activeKey;
  }
  if (primary && rosterKeys.has(entryKey(primary))) {
    return entryKey(primary);
  }
  if (roster.length > 0) {
    return entryKey(roster[0]);
  }
  return LOCAL_BOSS_KEY;
}

export function upsertCharacterState(
  store: BossIncomeStore,
  key: string,
  state: CharacterBossState,
): BossIncomeStore {
  return {
    ...store,
    byCharacter: {
      ...store.byCharacter,
      [key]: {
        selections: normalizeSelections(state.selections),
      },
    },
  };
}

/** One-shot: if primary has no state but LOCAL_BOSS_KEY does, copy it over. */
export function maybeMigrateLocalToPrimary(
  store: BossIncomeStore,
  primaryKey: string | null,
): BossIncomeStore {
  if (!primaryKey || primaryKey === LOCAL_BOSS_KEY) return store;
  if (store.byCharacter[primaryKey]) return store;
  const local = store.byCharacter[LOCAL_BOSS_KEY];
  if (!local) return store;
  return upsertCharacterState(store, primaryKey, local);
}
