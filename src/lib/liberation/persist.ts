import {
  clampTracesHeld,
  defaultLiberationQuest,
  defaultTraceSelections,
  mergeSelections,
  type TraceSelection,
} from "./calc";
import type { LiberationType } from "./data";
import { targetForType } from "./data";

export const LIBERATION_STORAGE_KEY = "maplecompile.liberation.v2";
export const PREVIEW_KEY = "__preview__";

export type LiberationMode = "preview" | "characters";

export type LiberationCharacterInputs = {
  liberationType: LiberationType;
  currentTraces: number;
  targetTraces: number;
  startDate: string;
  genesisPass: boolean;
  liberationQuest: string;
  bossSelections: TraceSelection[];
  completionRate: number;
};

export type CharacterLiberationBundle = {
  genesis: LiberationCharacterInputs;
  destiny: LiberationCharacterInputs;
  currentTab: LiberationType;
};

export type LiberationStore = {
  version: 2;
  mode: LiberationMode;
  activeCharacterId: string | null;
  selectedCharacterIds: string[];
  characterData: Record<string, CharacterLiberationBundle>;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function defaultInputs(
  type: LiberationType,
): LiberationCharacterInputs {
  return {
    liberationType: type,
    currentTraces: 0,
    targetTraces: targetForType(type),
    startDate: todayISO(),
    genesisPass: false,
    liberationQuest: defaultLiberationQuest(type),
    bossSelections: defaultTraceSelections(type),
    completionRate: 0,
  };
}

export function defaultBundle(): CharacterLiberationBundle {
  return {
    genesis: defaultInputs("genesis"),
    destiny: defaultInputs("destiny"),
    currentTab: "genesis",
  };
}

function normalizeInputs(
  raw: Partial<LiberationCharacterInputs> | null | undefined,
  type: LiberationType,
): LiberationCharacterInputs {
  const base = defaultInputs(type);
  if (!raw || typeof raw !== "object") return base;
  return {
    liberationType: type,
    currentTraces: clampTracesHeld(
      Number(raw.currentTraces) || 0,
      type,
      typeof raw.liberationQuest === "string" && raw.liberationQuest
        ? raw.liberationQuest
        : defaultLiberationQuest(type),
    ),
    targetTraces: targetForType(type),
    startDate:
      typeof raw.startDate === "string" && raw.startDate
        ? raw.startDate
        : base.startDate,
    genesisPass: !!raw.genesisPass,
    liberationQuest:
      typeof raw.liberationQuest === "string" && raw.liberationQuest
        ? raw.liberationQuest
        : defaultLiberationQuest(type),
    bossSelections: mergeSelections(type, raw.bossSelections),
    completionRate: Math.max(
      0,
      Math.min(100, Math.round(Number(raw.completionRate) || 0)),
    ),
  };
}

function normalizeBundle(
  raw: Partial<CharacterLiberationBundle> | null | undefined,
): CharacterLiberationBundle {
  const base = defaultBundle();
  if (!raw || typeof raw !== "object") return base;
  // Migrate flat v1-style character payload
  if (
    "currentTraces" in raw &&
    !("genesis" in raw) &&
    !("destiny" in raw)
  ) {
    const flat = raw as unknown as LiberationCharacterInputs;
    const type =
      flat.liberationType === "destiny" ? "destiny" : "genesis";
    const inputs = normalizeInputs(flat, type);
    return {
      genesis: type === "genesis" ? inputs : defaultInputs("genesis"),
      destiny: type === "destiny" ? inputs : defaultInputs("destiny"),
      currentTab: type,
    };
  }
  return {
    genesis: normalizeInputs(raw.genesis, "genesis"),
    destiny: normalizeInputs(raw.destiny, "destiny"),
    currentTab: raw.currentTab === "destiny" ? "destiny" : "genesis",
  };
}

export function defaultStore(): LiberationStore {
  return {
    version: 2,
    mode: "preview",
    activeCharacterId: null,
    selectedCharacterIds: [],
    characterData: {
      [PREVIEW_KEY]: defaultBundle(),
    },
  };
}

/** Migrate maplecompile.liberation.v1 flat state into preview bundle. */
function migrateV1(raw: string): LiberationStore | null {
  try {
    const parsed = JSON.parse(raw) as {
      type?: string;
      tracesHeld?: number;
      milestoneTraces?: number;
      useGenesisPass?: boolean;
      startDate?: string;
      selections?: TraceSelection[];
    };
    const type = parsed.type === "destiny" ? "destiny" : "genesis";
    const questFromMilestone = (n: number): string => {
      const list: Array<[number, string]> =
        type === "destiny"
          ? [
              [0, "0|Seren"],
              [2000, "2000|Kalos"],
              [4500, "4500|Kaling"],
            ]
          : [
              [0, "0|Von Leon"],
              [500, "500|Arkarium"],
              [1000, "1000|Magnus"],
              [1500, "1500|Lotus"],
              [2500, "2500|Damien"],
              [3500, "3500|Will"],
              [4500, "4500|Lucid"],
              [5500, "5500|Verus Hilla"],
            ];
      let best = list[0]![1];
      for (const [req, val] of list) {
        if ((n || 0) >= req) best = val;
      }
      return best;
    };

    const inputs = normalizeInputs(
      {
        liberationType: type,
        currentTraces: parsed.tracesHeld,
        startDate: parsed.startDate,
        genesisPass: parsed.useGenesisPass,
        liberationQuest: questFromMilestone(
          Number(parsed.milestoneTraces) || 0,
        ),
        bossSelections: (parsed.selections ?? []).map((s) => ({
          bossName: s.bossName,
          difficulty:
            "included" in s && !(s as { included?: boolean }).included
              ? "Not doing"
              : s.difficulty === "Not doing"
                ? "Not doing"
                : s.difficulty,
          partySize: s.partySize,
          cleared: !!(s as TraceSelection).cleared,
        })),
      },
      type,
    );

    const store = defaultStore();
    store.characterData[PREVIEW_KEY] = {
      genesis: type === "genesis" ? inputs : defaultInputs("genesis"),
      destiny: type === "destiny" ? inputs : defaultInputs("destiny"),
      currentTab: type,
    };
    return store;
  } catch {
    return null;
  }
}

export function readLiberationStore(): LiberationStore {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = localStorage.getItem(LIBERATION_STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem("maplecompile.liberation.v1");
      if (legacy) {
        const migrated = migrateV1(legacy);
        if (migrated) {
          writeLiberationStore(migrated);
          return migrated;
        }
      }
      return defaultStore();
    }
    const parsed = JSON.parse(raw) as Partial<LiberationStore>;
    const characterData: Record<string, CharacterLiberationBundle> = {};
    const src = parsed.characterData ?? {};
    for (const [id, bundle] of Object.entries(src)) {
      characterData[id] = normalizeBundle(bundle);
    }
    if (!characterData[PREVIEW_KEY]) {
      characterData[PREVIEW_KEY] = defaultBundle();
    }
    return {
      version: 2,
      mode: parsed.mode === "characters" ? "characters" : "preview",
      activeCharacterId:
        typeof parsed.activeCharacterId === "string"
          ? parsed.activeCharacterId
          : null,
      selectedCharacterIds: Array.isArray(parsed.selectedCharacterIds)
        ? parsed.selectedCharacterIds.filter((x) => typeof x === "string")
        : [],
      characterData,
    };
  } catch {
    return defaultStore();
  }
}

export function writeLiberationStore(store: LiberationStore): void {
  try {
    localStorage.setItem(LIBERATION_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function getActiveKey(store: LiberationStore): string {
  if (store.mode === "preview") return PREVIEW_KEY;
  if (
    store.activeCharacterId &&
    store.characterData[store.activeCharacterId]
  ) {
    return store.activeCharacterId;
  }
  return store.selectedCharacterIds[0] ?? PREVIEW_KEY;
}

export function getActiveBundle(
  store: LiberationStore,
): CharacterLiberationBundle {
  const key = getActiveKey(store);
  return store.characterData[key] ?? defaultBundle();
}

export function getActiveInputs(
  store: LiberationStore,
): LiberationCharacterInputs {
  const bundle = getActiveBundle(store);
  return bundle[bundle.currentTab];
}

export function upsertActiveInputs(
  store: LiberationStore,
  patch: Partial<LiberationCharacterInputs> & {
    liberationType?: LiberationType;
  },
): LiberationStore {
  const key = getActiveKey(store);
  const bundle = store.characterData[key] ?? defaultBundle();
  const type = patch.liberationType ?? bundle.currentTab;
  const current = bundle[type];
  const nextInputs = normalizeInputs({ ...current, ...patch, liberationType: type }, type);
  return {
    ...store,
    characterData: {
      ...store.characterData,
      [key]: {
        ...bundle,
        currentTab: type,
        [type]: nextInputs,
      },
    },
  };
}

export function ensureCharacterBundle(
  store: LiberationStore,
  characterId: string,
): LiberationStore {
  if (store.characterData[characterId]) return store;
  return {
    ...store,
    characterData: {
      ...store.characterData,
      [characterId]: defaultBundle(),
    },
  };
}
