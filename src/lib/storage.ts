import type { EquipSetup, FlameSetup, JobType, StatEquiv } from "./types";
import type { BuffState, LinkState } from "./scouter/buffs";
import type { ScouterInput } from "./scouter/types";

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

const SCOUTER_LAST_KEY = "maplecompile-scouter-last";
const SCOUTER_LAST_KEY_LEGACY = "maplehub-scouter-last";

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
  setJobType: (v: JobType | "") => writeJson("jobType", v),

  getCharType: () => readJson<string>("charType", ""),
  setCharType: (v: string) => writeJson("charType", v),

  getEquipSetup: () => readJson<EquipSetup>("equipSetup", {}),
  setEquipSetup: (v: EquipSetup) => writeJson("equipSetup", v),

  getFlameSetup: () => readJson<FlameSetup>("flameSetup", {}),
  setFlameSetup: (v: FlameSetup) => writeJson("flameSetup", v),

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
  },

  getScouterLast: () =>
    readJsonMigrating<ScouterLastState | null>(
      SCOUTER_LAST_KEY,
      SCOUTER_LAST_KEY_LEGACY,
      null,
    ),
  setScouterLast: (v: ScouterLastState) => writeJson(SCOUTER_LAST_KEY, v),
};
