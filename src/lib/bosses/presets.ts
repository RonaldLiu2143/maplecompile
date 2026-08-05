import {
  clampPartySize,
  defaultSelections,
  type BossClearSelection,
} from "./income";
import { BOSS_CRYSTALS, WEEKLY_CRYSTAL_LIMIT } from "./crystals";

export const BOSS_PRESETS_KEY = "maplecompile.boss-presets.v1";

export type BossPresetEntry = {
  bossId: string;
  difficulty: string;
  partySize: number;
};

export type BossPreset = {
  id: string;
  name: string;
  createdAt: number;
  bosses: BossPresetEntry[];
};

function newId(): string {
  return `bp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function normalizePreset(raw: unknown): BossPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<BossPreset>;
  if (typeof p.id !== "string" || typeof p.name !== "string") return null;
  if (!Array.isArray(p.bosses)) return null;
  const bosses: BossPresetEntry[] = [];
  for (const item of p.bosses) {
    if (!item || typeof item !== "object") continue;
    const b = item as Partial<BossPresetEntry>;
    if (typeof b.bossId !== "string") continue;
    if (!BOSS_CRYSTALS.some((c) => c.id === b.bossId)) continue;
    bosses.push({
      bossId: b.bossId,
      difficulty: typeof b.difficulty === "string" ? b.difficulty : "",
      partySize: clampPartySize(b.bossId, Number(b.partySize) || 1),
    });
  }
  if (bosses.length === 0) return null;
  return {
    id: p.id,
    name: p.name.trim() || "Preset",
    createdAt:
      typeof p.createdAt === "number" && Number.isFinite(p.createdAt)
        ? p.createdAt
        : Date.now(),
    bosses,
  };
}

export function loadBossPresets(): BossPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOSS_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizePreset)
      .filter((p): p is BossPreset => p != null);
  } catch {
    return [];
  }
}

export function saveBossPresets(presets: BossPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BOSS_PRESETS_KEY, JSON.stringify(presets));
  } catch {
    /* ignore */
  }
}

/** Build a preset from currently enabled selections. */
export function presetFromSelections(
  selections: BossClearSelection[],
  name: string,
): BossPreset | null {
  const bosses: BossPresetEntry[] = selections
    .filter((s) => s.enabled)
    .map((s) => ({
      bossId: s.bossId,
      difficulty: s.difficulty,
      partySize: clampPartySize(s.bossId, s.partySize || 1),
    }));
  if (bosses.length === 0) return null;
  return {
    id: newId(),
    name: name.trim() || "Boss preset",
    createdAt: Date.now(),
    bosses,
  };
}

/**
 * Apply a preset onto a character's selections.
 * Enables preset bosses (respecting weekly 14-cap) and disables others.
 * Does not mark clears.
 */
export function applyPresetToSelections(
  current: BossClearSelection[],
  preset: BossPreset,
): BossClearSelection[] {
  const byId = new Map(preset.bosses.map((b) => [b.bossId, b]));
  const base = (current.length ? current : defaultSelections()).map((s) => {
    const hit = byId.get(s.bossId);
    if (!hit) {
      return { ...s, enabled: false, cleared: false };
    }
    return {
      ...s,
      enabled: false, // enable in a second pass so we can enforce weekly cap order
      difficulty: hit.difficulty || s.difficulty,
      partySize: clampPartySize(s.bossId, hit.partySize),
      cleared: false,
    };
  });

  // Enable in preset order; skip weekly bosses past the cap.
  let weekly = 0;
  const enabledIds = new Set<string>();
  for (const entry of preset.bosses) {
    const boss = BOSS_CRYSTALS.find((b) => b.id === entry.bossId);
    if (!boss) continue;
    if (boss.frequency === "weekly") {
      if (weekly >= WEEKLY_CRYSTAL_LIMIT) continue;
      weekly += 1;
    }
    enabledIds.add(entry.bossId);
  }

  return base.map((s) =>
    enabledIds.has(s.bossId) ? { ...s, enabled: true } : s,
  );
}

export function deleteBossPreset(
  presets: BossPreset[],
  id: string,
): BossPreset[] {
  return presets.filter((p) => p.id !== id);
}
