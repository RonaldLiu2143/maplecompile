import type {
  ClassRotationsStore,
  RotationMode,
  RotationSlot,
  RotationWhen,
  SavedClassRotation,
} from "./types";

export const CLASS_ROTATIONS_KEY = "maplecompile.class-rotations.v1";

const WHEN: ReadonlySet<string> = new Set([
  "cd_ready",
  "always",
  "burst_only",
  "hold",
]);

function emptyStore(): ClassRotationsStore {
  return { version: 1, byCharType: {} };
}

function isSlot(raw: unknown): raw is RotationSlot {
  if (!raw || typeof raw !== "object") return false;
  const s = raw as Record<string, unknown>;
  return (
    typeof s.slotId === "string" &&
    typeof s.skillId === "string" &&
    typeof s.when === "string" &&
    WHEN.has(s.when)
  );
}

function normalizeRotation(raw: unknown): SavedClassRotation | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return null;
  if (typeof r.charType !== "string" || !r.charType.trim()) return null;
  if (typeof r.jobType !== "string") return null;
  if (!Array.isArray(r.slots)) return null;
  const slots = r.slots.filter(isSlot);
  const mode: RotationMode = r.mode === "boss" ? "boss" : "dummy";
  return {
    version: 1,
    charType: r.charType.trim(),
    jobType: String(r.jobType),
    name: typeof r.name === "string" && r.name.trim() ? r.name.trim() : "Rotation",
    mode,
    notes: typeof r.notes === "string" ? r.notes : "",
    slots,
    updatedAt:
      typeof r.updatedAt === "string" && r.updatedAt
        ? r.updatedAt
        : new Date().toISOString(),
  };
}

export function readClassRotationsStore(): ClassRotationsStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(CLASS_ROTATIONS_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<ClassRotationsStore>;
    if (parsed.version !== 1 || !parsed.byCharType) return emptyStore();
    const byCharType: Record<string, SavedClassRotation> = {};
    for (const [k, v] of Object.entries(parsed.byCharType)) {
      const norm = normalizeRotation(v);
      if (norm) byCharType[k] = norm;
    }
    return { version: 1, byCharType };
  } catch {
    return emptyStore();
  }
}

export function writeClassRotationsStore(store: ClassRotationsStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLASS_ROTATIONS_KEY, JSON.stringify(store));
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
    version: 1,
    charType: rotation.charType,
    jobType: rotation.jobType,
    name: rotation.name.trim() || "Rotation",
    mode: rotation.mode,
    notes: rotation.notes,
    slots: rotation.slots,
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

export function defaultWhen(): RotationWhen {
  return "cd_ready";
}
