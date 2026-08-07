import {
  entryKey,
  readRosterState,
  type RosterPrimary,
} from "@/lib/dashboard/roster";
import { notifyMapleDataChanged } from "@/lib/maple-events";
import { countFilledSlots } from "@/lib/starter-loadouts";
import {
  storage,
  type ScouterLastState,
} from "@/lib/storage";
import type { EquipSetup, JobType } from "@/lib/types";
import type { NexonRegion } from "@/lib/character/lookup";

export const CHARACTER_WORKSPACE_KEY = "maplecompile-character-workspace-v1";
const WORKSPACE_MIGRATED_KEY = "maplecompile-character-workspace-migrated-v1";

export type CharacterWorkspace = {
  scouterLast: ScouterLastState | null;
  equipSetup: EquipSetup;
  jobType: string;
  charType: string;
  /** When scouter + equip were last paired for this character. */
  pairedAt?: number;
  updatedAt: number;
};

type WorkspaceMap = Record<string, CharacterWorkspace>;

function readMap(): WorkspaceMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CHARACTER_WORKSPACE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as WorkspaceMap;
  } catch {
    return {};
  }
}

function writeMap(map: WorkspaceMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHARACTER_WORKSPACE_KEY, JSON.stringify(map));
  notifyMapleDataChanged("other");
}

export function emptyWorkspace(): CharacterWorkspace {
  return {
    scouterLast: null,
    equipSetup: {},
    jobType: "",
    charType: "",
    updatedAt: Date.now(),
  };
}

function normalizeWorkspace(hit: CharacterWorkspace): CharacterWorkspace {
  return {
    scouterLast: hit.scouterLast ?? null,
    equipSetup:
      hit.equipSetup && typeof hit.equipSetup === "object"
        ? hit.equipSetup
        : {},
    jobType: typeof hit.jobType === "string" ? hit.jobType : "",
    charType: typeof hit.charType === "string" ? hit.charType : "",
    pairedAt: typeof hit.pairedAt === "number" ? hit.pairedAt : undefined,
    updatedAt: typeof hit.updatedAt === "number" ? hit.updatedAt : Date.now(),
  };
}

/** Full workspace map (one localStorage read). */
export function loadWorkspaceMap(): WorkspaceMap {
  const raw = readMap();
  const out: WorkspaceMap = {};
  for (const [key, hit] of Object.entries(raw)) {
    if (!key || !hit || typeof hit !== "object") continue;
    out[key] = normalizeWorkspace(hit);
  }
  return out;
}

export function getWorkspace(key: string): CharacterWorkspace | null {
  if (!key) return null;
  const hit = readMap()[key];
  if (!hit || typeof hit !== "object") return null;
  return normalizeWorkspace(hit);
}

export function setWorkspace(key: string, workspace: CharacterWorkspace) {
  if (!key) return;
  const map = readMap();
  map[key] = { ...workspace, updatedAt: Date.now() };
  writeMap(map);
}

/** Drop one character's workspace blob (e.g. after roster remove). */
export function removeWorkspace(key: string): void {
  if (!key) return;
  const map = readMap();
  if (!(key in map)) return;
  delete map[key];
  writeMap(map);
}

/**
 * Drop workspace keys that are no longer on the roster.
 * Safe to call repeatedly; only writes when something was removed.
 */
export function pruneWorkspacesToRosterKeys(
  allowedKeys: Iterable<string>,
): void {
  const allowed = allowedKeys instanceof Set
    ? allowedKeys
    : new Set(allowedKeys);
  const map = readMap();
  let changed = false;
  for (const key of Object.keys(map)) {
    if (!allowed.has(key)) {
      delete map[key];
      changed = true;
    }
  }
  if (changed) writeMap(map);
}

export function patchWorkspace(
  key: string,
  patch: Partial<CharacterWorkspace>,
): CharacterWorkspace {
  const prev = getWorkspace(key) ?? emptyWorkspace();
  const next: CharacterWorkspace = {
    ...prev,
    ...patch,
    updatedAt: Date.now(),
  };
  setWorkspace(key, next);
  return next;
}

export function activeCharacterKey(
  primary?: RosterPrimary | null,
): string | null {
  const p = primary ?? readRosterState().primary;
  if (!p) return null;
  return entryKey(p);
}

/**
 * One-shot: copy global scouter-last + equipSetup + pairing into the primary
 * character workspace when that key has no workspace yet.
 */
export function migrateGlobalsToPrimaryWorkspace(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(WORKSPACE_MIGRATED_KEY) === "1") return;
  } catch {
    return;
  }

  const primary = readRosterState().primary;
  if (!primary) {
    try {
      localStorage.setItem(WORKSPACE_MIGRATED_KEY, "1");
    } catch {
      /* ignore */
    }
    return;
  }

  const key = entryKey(primary);
  const existing = getWorkspace(key);
  const hasExisting =
    existing &&
    (existing.scouterLast?.input != null ||
      countFilledSlots(existing.equipSetup) > 0);

  if (!hasExisting) {
    const scouterLast = storage.getScouterLast();
    const equipSetup = storage.getEquipSetup();
    const jobType =
      storage.getJobType() ||
      scouterLast?.input?.jobType ||
      "";
    const charType =
      storage.getCharType() ||
      scouterLast?.input?.charType ||
      "";
    let pairedAt: number | undefined;
    try {
      const pairRaw = localStorage.getItem("maplecompile-scouter-equip-pair");
      if (pairRaw) {
        const pair = JSON.parse(pairRaw) as { updatedAt?: number };
        if (typeof pair.updatedAt === "number") pairedAt = pair.updatedAt;
      }
    } catch {
      /* ignore */
    }
    setWorkspace(key, {
      scouterLast,
      equipSetup,
      jobType,
      charType,
      pairedAt,
      updatedAt: Date.now(),
    });
  }

  try {
    localStorage.setItem(WORKSPACE_MIGRATED_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Prefer live / workspace job+char (Equipment Setup + storage.setJobType) over
 * scouterLast.input. Otherwise a stale Scouter draft class wins after Active
 * Character switch and reverts class changes made on /calc/equips/setup.
 * Scouter-driven flows still push class via Character Stats → setJobType.
 */
export function resolveWorkspaceClass(workspace: CharacterWorkspace): {
  jobType: string;
  charType: string;
} {
  const fromLiveJob = workspace.jobType || "";
  const fromLiveChar = workspace.charType || "";
  if (fromLiveJob && fromLiveChar) {
    return { jobType: fromLiveJob, charType: fromLiveChar };
  }
  const fromScouterJob = workspace.scouterLast?.input?.jobType || "";
  const fromScouterChar = workspace.scouterLast?.input?.charType || "";
  return {
    jobType: fromLiveJob || fromScouterJob || "",
    charType: fromLiveChar || fromScouterChar || "",
  };
}

function syncScouterLastClass(
  scouterLast: ScouterLastState | null,
  jobType: string,
  charType: string,
): ScouterLastState | null {
  if (!scouterLast?.input || !jobType || !charType) return scouterLast;
  if (
    scouterLast.input.jobType === jobType &&
    scouterLast.input.charType === charType
  ) {
    return scouterLast;
  }
  return {
    ...scouterLast,
    input: {
      ...scouterLast.input,
      jobType: jobType as JobType,
      charType,
      useMagicAttack: jobType === "magician",
    },
  };
}

/** Push a character workspace into the live Scouter / Equipment localStorage. */
export function applyWorkspaceToLive(workspace: CharacterWorkspace): void {
  const { jobType, charType } = resolveWorkspaceClass(workspace);
  // Keep scouter draft class aligned with resolved live class so Scouter open
  // does not autosave the old class back over Equipment Setup.
  const scouterLast = syncScouterLastClass(
    workspace.scouterLast,
    jobType,
    charType,
  );
  if (scouterLast?.input) {
    storage.setScouterLast(scouterLast);
  }
  // Always write so a previous character's class cannot linger in live storage.
  storage.setJobType((jobType || "") as JobType | "");
  storage.setCharType(charType || "");
  storage.setEquipSetup(workspace.equipSetup ?? {});
}

/** Snapshot live Scouter / Equipment into the given character workspace key. */
export function persistLiveToWorkspace(key: string | null | undefined): void {
  if (!key) return;
  const equipSetup = storage.getEquipSetup();
  // Live storage class wins (Equipment Setup / Scouter both write these).
  const jobType =
    storage.getJobType() ||
    storage.getScouterLast()?.input?.jobType ||
    "";
  const charType =
    storage.getCharType() ||
    storage.getScouterLast()?.input?.charType ||
    "";
  let scouterLast = storage.getScouterLast();
  const synced = syncScouterLastClass(scouterLast, jobType, charType);
  if (synced !== scouterLast) {
    scouterLast = synced;
    if (scouterLast) storage.setScouterLast(scouterLast);
  }
  const prev = getWorkspace(key);
  patchWorkspace(key, {
    scouterLast,
    equipSetup,
    jobType,
    charType,
    pairedAt: prev?.pairedAt,
  });
}

/**
 * Ensure migration ran, then load the active (primary) character workspace
 * into live storage. Returns the active key (or null if no primary).
 */
export function ensureActiveWorkspaceLoaded(): string | null {
  migrateGlobalsToPrimaryWorkspace();
  const key = activeCharacterKey();
  if (!key) return null;
  const ws = getWorkspace(key);
  if (ws) {
    applyWorkspaceToLive(ws);
  } else {
    // Seed from whatever is currently live so the key exists.
    persistLiveToWorkspace(key);
  }
  return key;
}

/** Write an imported build into a roster character workspace (+ live). */
export function importBuildToCharacter(args: {
  region: NexonRegion;
  name: string;
  scouterLast: ScouterLastState;
  equipSetup?: EquipSetup;
  jobType?: string;
  charType?: string;
}): string {
  const key = entryKey({ region: args.region, name: args.name });
  const jobType =
    args.jobType ||
    args.scouterLast.input?.jobType ||
    "";
  const charType =
    args.charType ||
    args.scouterLast.input?.charType ||
    "";
  const equipSetup = args.equipSetup ?? {};
  const workspace: CharacterWorkspace = {
    scouterLast: args.scouterLast,
    equipSetup,
    jobType,
    charType,
    pairedAt:
      countFilledSlots(equipSetup) > 0 && args.scouterLast.input
        ? Date.now()
        : undefined,
    updatedAt: Date.now(),
  };
  setWorkspace(key, workspace);
  applyWorkspaceToLive(workspace);
  return key;
}
