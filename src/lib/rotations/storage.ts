import { nanoid } from "nanoid";
import type {
  CastOrderEntry,
  ClassRotationsStore,
  SavedClassRotation,
  SavedClassRotationV1,
  TimelineBlock,
} from "./types";
import { getRotationClassData } from "./class-data";
import { skillMapForCharType } from "./skills";
import { autoPlaceTimeline, rebuildTimelineFromCastOrder } from "./placement";

export const CLASS_ROTATIONS_KEY = "maplecompile.class-rotations.v2";
export const CLASS_ROTATIONS_KEY_V1 = "maplecompile.class-rotations.v1";

function emptyStore(): ClassRotationsStore {
  return { version: 2, byCharType: {} };
}

function isCastEntry(raw: unknown): raw is CastOrderEntry {
  if (!raw || typeof raw !== "object") return false;
  const e = raw as Record<string, unknown>;
  return typeof e.slotId === "string" && typeof e.skillId === "string";
}

function isTimelineBlock(raw: unknown): raw is TimelineBlock {
  if (!raw || typeof raw !== "object") return false;
  const b = raw as Record<string, unknown>;
  return (
    typeof b.blockId === "string" &&
    typeof b.skillId === "string" &&
    typeof b.startSec === "number" &&
    typeof b.durationSec === "number"
  );
}

function migrateV1(raw: SavedClassRotationV1): SavedClassRotation {
  const castOrder: CastOrderEntry[] = (raw.slots ?? []).map((s) => ({
    slotId: s.slotId,
    skillId: s.skillId,
  }));
  const skillsById = skillMapForCharType(raw.charType);
  const timeline =
    castOrder.length > 0
      ? rebuildTimelineFromCastOrder(castOrder, skillsById)
      : [];
  return {
    version: 2,
    charType: raw.charType,
    jobType: raw.jobType,
    name: raw.name?.trim() || "Rotation",
    notes: raw.notes ?? "",
    castOrder,
    timeline,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeRotation(raw: unknown): SavedClassRotation | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (r.version === 1) {
    return migrateV1(raw as SavedClassRotationV1);
  }

  if (r.version !== 2) return null;
  if (typeof r.charType !== "string" || !r.charType.trim()) return null;
  if (typeof r.jobType !== "string") return null;

  const castOrder = Array.isArray(r.castOrder)
    ? r.castOrder.filter(isCastEntry)
    : [];
  const timeline = Array.isArray(r.timeline)
    ? r.timeline.filter(isTimelineBlock)
    : [];

  return {
    version: 2,
    charType: r.charType.trim(),
    jobType: String(r.jobType),
    name:
      typeof r.name === "string" && r.name.trim()
        ? r.name.trim()
        : "Rotation",
    notes: typeof r.notes === "string" ? r.notes : "",
    castOrder,
    timeline,
    updatedAt:
      typeof r.updatedAt === "string" && r.updatedAt
        ? r.updatedAt
        : new Date().toISOString(),
  };
}

function readRawStore(): ClassRotationsStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    let raw = localStorage.getItem(CLASS_ROTATIONS_KEY);
    if (!raw) {
      raw = localStorage.getItem(CLASS_ROTATIONS_KEY_V1);
    }
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as {
      version?: number;
      byCharType?: Record<string, unknown>;
    };
    const byCharType: Record<string, SavedClassRotation> = {};
    if (parsed.byCharType) {
      for (const [k, v] of Object.entries(parsed.byCharType)) {
        const norm = normalizeRotation(v);
        if (norm) byCharType[k] = norm;
      }
    } else if (parsed.version === 1 || parsed.version === 2) {
      const single = normalizeRotation(parsed);
      if (single) byCharType[single.charType] = single;
    }
    return { version: 2, byCharType };
  } catch {
    return emptyStore();
  }
}

export function readClassRotationsStore(): ClassRotationsStore {
  return readRawStore();
}

export function writeClassRotationsStore(store: ClassRotationsStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLASS_ROTATIONS_KEY, JSON.stringify(store));
  localStorage.removeItem(CLASS_ROTATIONS_KEY_V1);
  window.dispatchEvent(new Event("maplecompile-class-rotations"));
}

export function getSavedRotation(
  charType: string,
): SavedClassRotation | null {
  const store = readClassRotationsStore();
  return store.byCharType[charType] ?? null;
}

export function saveClassRotation(
  rotation: Omit<SavedClassRotation, "version" | "updatedAt"> & {
    updatedAt?: string;
  },
): SavedClassRotation {
  const next: SavedClassRotation = {
    version: 2,
    charType: rotation.charType,
    jobType: rotation.jobType,
    name: rotation.name.trim() || "Rotation",
    notes: rotation.notes,
    castOrder: rotation.castOrder,
    timeline: rotation.timeline,
    updatedAt: rotation.updatedAt ?? new Date().toISOString(),
  };
  const store = readClassRotationsStore();
  store.byCharType[next.charType] = next;
  writeClassRotationsStore(store);
  return next;
}

export function deleteClassRotation(charType: string): void {
  const store = readClassRotationsStore();
  delete store.byCharType[charType];
  writeClassRotationsStore(store);
}

export function listSavedRotations(): SavedClassRotation[] {
  return Object.values(readClassRotationsStore().byCharType).sort((a, b) =>
    a.charType.localeCompare(b.charType),
  );
}

export function exportRotationJson(rotation: SavedClassRotation): string {
  return JSON.stringify(rotation, null, 2);
}

export function importRotationJson(text: string): SavedClassRotation | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    const norm = normalizeRotation(parsed);
    if (!norm) return null;
    return saveClassRotation(norm);
  } catch {
    return null;
  }
}

export function emptyRotation(
  charType: string,
  jobType: string,
): SavedClassRotation {
  void getRotationClassData(charType);
  return {
    version: 2,
    charType,
    jobType,
    name: "Rotation",
    notes: "",
    castOrder: [],
    timeline: [],
    updatedAt: new Date().toISOString(),
  };
}

export function syncTimelineFromCastOrder(
  castOrder: CastOrderEntry[],
  charType: string,
  existing?: TimelineBlock[],
): TimelineBlock[] {
  const skillsById = skillMapForCharType(charType);
  return autoPlaceTimeline(castOrder, skillsById, existing);
}

export function newCastEntry(skillId: string): CastOrderEntry {
  return { slotId: nanoid(), skillId };
}
