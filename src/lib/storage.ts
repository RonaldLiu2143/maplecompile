import type { EquipSetup, FlameSetup, JobType, StatEquiv } from "./types";
import type { BuffState, LinkState } from "./scouter/buffs";
import type { ScouterInput } from "./scouter/types";
import type { PlannerOverrides } from "./planner/types";
import { notifyMapleDataChanged } from "./maple-events";

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

export type ScouterLastState = {
  input: ScouterInput;
  buffs: BuffState;
  links: LinkState;
  hexa: number[];
};

export type ScouterPreset = ScouterLastState & {
  id: string;
  name: string;
  updatedAt: number;
};

const SCOUTER_LAST_KEY = "maplecompile-scouter-last";
const SCOUTER_LAST_KEY_LEGACY = "maplehub-scouter-last";
const SCOUTER_PRESETS_KEY = "maplecompile-scouter-presets";
const SCOUTER_PRESET_KEY_LEGACY_SINGLE = "maplecompile-scouter-preset";
const SCOUTER_PRESET_KEY_LEGACY_HUB = "maplehub-scouter-preset";

function newPresetId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function migrateLegacySinglePreset(): ScouterPreset[] {
  for (const key of [
    SCOUTER_PRESET_KEY_LEGACY_SINGLE,
    SCOUTER_PRESET_KEY_LEGACY_HUB,
  ]) {
    const legacy = readJson<ScouterLastState | null>(key, null);
    if (!legacy?.input) continue;
    const preset: ScouterPreset = {
      id: newPresetId(),
      name: "Saved preset",
      updatedAt: Date.now(),
      input: legacy.input,
      buffs: legacy.buffs,
      links: legacy.links,
      hexa: legacy.hexa,
    };
    writeJson(SCOUTER_PRESETS_KEY, [preset]);
    return [preset];
  }
  return [];
}

function readPresets(): ScouterPreset[] {
  const list = readJson<ScouterPreset[] | null>(SCOUTER_PRESETS_KEY, null);
  if (list != null) return Array.isArray(list) ? list : [];
  return migrateLegacySinglePreset();
}

function writePresets(list: ScouterPreset[]) {
  writeJson(SCOUTER_PRESETS_KEY, list);
}

function readJsonMigrating<T>(key: string, legacyKey: string, fallback: T): T {
  const next = readJson<T | null>(key, null);
  if (next != null) return next;
  const legacy = readJson<T | null>(legacyKey, null);
  if (legacy != null) {
    writeJson(key, legacy);
    return legacy;
  }
  return fallback;
}

export const storage = {
  getJobType: () => readJson<JobType | "">("jobType", ""),
  setJobType: (v: JobType | "") => {
    writeJson("jobType", v);
    notifyMapleDataChanged("jobClass");
  },

  getCharType: () => readJson<string>("charType", ""),
  setCharType: (v: string) => {
    writeJson("charType", v);
    notifyMapleDataChanged("jobClass");
  },

  getEquipSetup: () => readJson<EquipSetup>("equipSetup", {}),
  setEquipSetup: (v: EquipSetup) => {
    writeJson("equipSetup", v);
    notifyMapleDataChanged("equipSetup");
  },

  getFlameSetup: () => readJson<FlameSetup>("flameSetup", {}),
  setFlameSetup: (v: FlameSetup) => {
    writeJson("flameSetup", v);
    notifyMapleDataChanged("flameSetup");
  },

  getStatEquiv: () => readJson<Partial<StatEquiv>>("statEquiv", {}),
  setStatEquiv: (v: StatEquiv) => writeJson("statEquiv", v),

  getFlameProbabilities: () =>
    readJson<Record<string, { flameType: string; chance: number }[]>>(
      "flameProbabilities",
      {},
    ),
  setFlameProbabilities: (
    v: Record<string, { flameType: string; chance: number }[]>,
  ) => writeJson("flameProbabilities", v),

  clearSetup: () => {
    writeJson("equipSetup", {});
    writeJson("flameSetup", {});
    writeJson("flameProbabilities", {});
    notifyMapleDataChanged("equipSetup");
  },

  getPlannerOverrides: () =>
    readJson<PlannerOverrides>("maplecompile-planner-overrides", {}),
  setPlannerOverrides: (v: PlannerOverrides) => {
    writeJson("maplecompile-planner-overrides", v);
    notifyMapleDataChanged("plannerOverrides");
  },

  getScouterLast: () =>
    readJsonMigrating<ScouterLastState | null>(
      SCOUTER_LAST_KEY,
      SCOUTER_LAST_KEY_LEGACY,
      null,
    ),
  setScouterLast: (v: ScouterLastState) => {
    writeJson(SCOUTER_LAST_KEY, v);
    notifyMapleDataChanged("scouterLast");
  },

  listScouterPresets: (): ScouterPreset[] =>
    readPresets().sort((a, b) => b.updatedAt - a.updatedAt),

  getScouterPreset: (id: string): ScouterPreset | null =>
    readPresets().find((p) => p.id === id) ?? null,

  saveScouterPreset: (args: {
    id?: string;
    name: string;
    state: ScouterLastState;
  }): ScouterPreset => {
    const list = readPresets();
    const name = args.name.trim() || "Untitled";
    const now = Date.now();
    if (args.id) {
      const idx = list.findIndex((p) => p.id === args.id);
      if (idx < 0) {
        throw new Error(`Preset not found: ${args.id}`);
      }
      const updated: ScouterPreset = {
        ...list[idx]!,
        name,
        updatedAt: now,
        ...args.state,
      };
      list[idx] = updated;
      writePresets(list);
      notifyMapleDataChanged("scouterPresets");
      return updated;
    }
    const created: ScouterPreset = {
      id: newPresetId(),
      name,
      updatedAt: now,
      ...args.state,
    };
    list.push(created);
    writePresets(list);
    notifyMapleDataChanged("scouterPresets");
    return created;
  },

  deleteScouterPreset: (id: string): void => {
    writePresets(readPresets().filter((p) => p.id !== id));
    notifyMapleDataChanged("scouterPresets");
  },

  /** Delete tokens for shares created in this browser (needed to remove from gallery). */
  getScouterShareTokens: (): Record<
    string,
    { deleteToken: string; name: string; public: boolean }
  > =>
    readJson("maplecompile-scouter-share-tokens", {}),

  saveScouterShareToken: (args: {
    id: string;
    deleteToken: string;
    name: string;
    public: boolean;
  }) => {
    const map = readJson<
      Record<string, { deleteToken: string; name: string; public: boolean }>
    >("maplecompile-scouter-share-tokens", {});
    map[args.id] = {
      deleteToken: args.deleteToken,
      name: args.name,
      public: args.public,
    };
    writeJson("maplecompile-scouter-share-tokens", map);
  },

  clearScouterShareToken: (id: string) => {
    const map = readJson<
      Record<string, { deleteToken: string; name: string; public: boolean }>
    >("maplecompile-scouter-share-tokens", {});
    if (!(id in map)) return;
    delete map[id];
    writeJson("maplecompile-scouter-share-tokens", map);
  },
};
