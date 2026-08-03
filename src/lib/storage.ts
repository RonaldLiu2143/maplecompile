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

const SCOUTER_LAST_KEY = "maplehub-scouter-last";

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
    readJson<ScouterLastState | null>(SCOUTER_LAST_KEY, null),
  setScouterLast: (v: ScouterLastState) => writeJson(SCOUTER_LAST_KEY, v),
};
