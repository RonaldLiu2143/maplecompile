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
  /** Draft preset name (e.g. from a gallery share) — not auto-saved as a preset. */
  name?: string;
};

export type ScouterPreset = ScouterLastState & {
  id: string;
  name: string;
  updatedAt: number;
};

/** User-saved Equipment Setup snapshot (localStorage). */
export type EquipSetupPreset = {
  id: string;
  name: string;
  updatedAt: number;
  setup: EquipSetup;
  flameSetup?: FlameSetup;
  /** Roster character key when saved under an active character. */
  characterKey?: string | null;
  jobType?: string;
  charType?: string;
};

const SCOUTER_LAST_KEY = "maplecompile-scouter-last";
const SCOUTER_LAST_KEY_LEGACY = "maplehub-scouter-last";
const SCOUTER_PRESETS_KEY = "maplecompile-scouter-presets";
const SCOUTER_PRESET_KEY_LEGACY_SINGLE = "maplecompile-scouter-preset";
const SCOUTER_PRESET_KEY_LEGACY_HUB = "maplehub-scouter-preset";
const EQUIP_PRESETS_KEY = "maplecompile-equip-presets";

function newPresetId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * File-style unique names: "Foo" → "Foo (1)" → "Foo (2)" …
 * When `excludeId` is set (overwrite), that preset's current name is allowed.
 */
export function uniquePresetName(
  desired: string,
  existing: { id: string; name: string }[],
  excludeId?: string,
): string {
  const base = desired.trim() || "Untitled";
  const taken = new Set(
    existing.filter((p) => p.id !== excludeId).map((p) => p.name),
  );
  if (!taken.has(base)) return base;
  let n = 1;
  while (taken.has(`${base} (${n})`)) n += 1;
  return `${base} (${n})`;
}

/** @deprecated Prefer `uniquePresetName`. */
export const uniqueScouterPresetName = uniquePresetName;

function readEquipPresets(): EquipSetupPreset[] {
  const list = readJson<EquipSetupPreset[] | null>(EQUIP_PRESETS_KEY, null);
  if (!Array.isArray(list)) return [];
  return list.filter(
    (p) =>
      p &&
      typeof p === "object" &&
      typeof p.id === "string" &&
      typeof p.name === "string" &&
      p.setup &&
      typeof p.setup === "object",
  );
}

function writeEquipPresets(list: EquipSetupPreset[]) {
  writeJson(EQUIP_PRESETS_KEY, list);
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
    const now = Date.now();
    if (args.id) {
      const idx = list.findIndex((p) => p.id === args.id);
      if (idx < 0) {
        throw new Error(`Preset not found: ${args.id}`);
      }
      const name = uniquePresetName(args.name, list, args.id);
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
    const name = uniquePresetName(args.name, list);
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

  listEquipPresets: (opts?: {
    characterKey?: string | null;
  }): EquipSetupPreset[] => {
    const key = opts?.characterKey;
    const list = readEquipPresets();
    const filtered =
      key == null || key === ""
        ? list
        : list.filter(
            (p) => !p.characterKey || p.characterKey === key,
          );
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getEquipPreset: (id: string): EquipSetupPreset | null =>
    readEquipPresets().find((p) => p.id === id) ?? null,

  saveEquipPreset: (args: {
    id?: string;
    name: string;
    setup: EquipSetup;
    flameSetup?: FlameSetup;
    characterKey?: string | null;
    jobType?: string;
    charType?: string;
  }): EquipSetupPreset => {
    const list = readEquipPresets();
    const now = Date.now();
    if (args.id) {
      const idx = list.findIndex((p) => p.id === args.id);
      if (idx < 0) {
        throw new Error(`Equip preset not found: ${args.id}`);
      }
      const name = uniquePresetName(args.name, list, args.id);
      const updated: EquipSetupPreset = {
        ...list[idx]!,
        name,
        updatedAt: now,
        setup: structuredClone(args.setup),
        flameSetup: args.flameSetup
          ? structuredClone(args.flameSetup)
          : list[idx]!.flameSetup,
        characterKey:
          args.characterKey !== undefined
            ? args.characterKey
            : list[idx]!.characterKey,
        jobType:
          args.jobType !== undefined ? args.jobType : list[idx]!.jobType,
        charType:
          args.charType !== undefined ? args.charType : list[idx]!.charType,
      };
      list[idx] = updated;
      writeEquipPresets(list);
      notifyMapleDataChanged("equipPresets");
      return updated;
    }
    const name = uniquePresetName(args.name, list);
    const created: EquipSetupPreset = {
      id: newPresetId(),
      name,
      updatedAt: now,
      setup: structuredClone(args.setup),
      flameSetup: args.flameSetup
        ? structuredClone(args.flameSetup)
        : undefined,
      characterKey: args.characterKey ?? null,
      jobType: args.jobType,
      charType: args.charType,
    };
    list.push(created);
    writeEquipPresets(list);
    notifyMapleDataChanged("equipPresets");
    return created;
  },

  deleteEquipPreset: (id: string): void => {
    writeEquipPresets(readEquipPresets().filter((p) => p.id !== id));
    notifyMapleDataChanged("equipPresets");
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
    if (id in map) {
      delete map[id];
      writeJson("maplecompile-scouter-share-tokens", map);
    }
    clearGalleryLinkForShareId(id);
  },

  /**
   * Resolve the public gallery share owned by this browser for a preset
   * (or the last public share when no preset is loaded).
   */
  getScouterGalleryShareForPreset: (
    presetId: string | null | undefined,
  ): ScouterGalleryOwnedShare | null => {
    const links = readGalleryLinks();
    const tokens = storage.getScouterShareTokens();
    // Prefer the share linked to this preset; only use lastPublic when no preset is loaded.
    const shareId = presetId
      ? links.byPresetId[presetId] ?? null
      : links.lastPublicShareId;
    if (!shareId) return null;
    const token = tokens[shareId];
    if (!token?.deleteToken || !token.public) return null;
    return {
      id: shareId,
      deleteToken: token.deleteToken,
      name: token.name,
      public: true,
    };
  },

  /** Remember which public gallery post belongs to a preset / this browser. */
  linkScouterGalleryShare: (args: {
    shareId: string;
    presetId?: string | null;
  }) => {
    const links = readGalleryLinks();
    links.lastPublicShareId = args.shareId;
    if (args.presetId) {
      links.byPresetId[args.presetId] = args.shareId;
    }
    writeGalleryLinks(links);
  },

  /** Drop gallery→preset mapping for a share (e.g. after remove / replace). */
  unlinkScouterGalleryShare: (shareId: string) => {
    clearGalleryLinkForShareId(shareId);
  },
};

type ScouterGalleryLinkMap = {
  /** Most recent public gallery share from this browser. */
  lastPublicShareId: string | null;
  /** presetId → public share id */
  byPresetId: Record<string, string>;
};

export type ScouterGalleryOwnedShare = {
  id: string;
  deleteToken: string;
  name: string;
  public: true;
};

const SCOUTER_GALLERY_LINKS_KEY = "maplecompile-scouter-gallery-links";

function readGalleryLinks(): ScouterGalleryLinkMap {
  const raw = readJson<Partial<ScouterGalleryLinkMap> | null>(
    SCOUTER_GALLERY_LINKS_KEY,
    null,
  );
  return {
    lastPublicShareId:
      typeof raw?.lastPublicShareId === "string" ? raw.lastPublicShareId : null,
    byPresetId:
      raw?.byPresetId && typeof raw.byPresetId === "object"
        ? { ...raw.byPresetId }
        : {},
  };
}

function writeGalleryLinks(links: ScouterGalleryLinkMap) {
  writeJson(SCOUTER_GALLERY_LINKS_KEY, links);
}

function clearGalleryLinkForShareId(shareId: string) {
  const links = readGalleryLinks();
  let changed = false;
  if (links.lastPublicShareId === shareId) {
    links.lastPublicShareId = null;
    changed = true;
  }
  for (const [presetId, id] of Object.entries(links.byPresetId)) {
    if (id === shareId) {
      delete links.byPresetId[presetId];
      changed = true;
    }
  }
  if (changed) writeGalleryLinks(links);
}
