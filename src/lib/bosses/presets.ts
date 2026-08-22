import {
  clampPartySize,
  defaultSelections,
  type BossClearSelection,
} from "./income";
import { BOSS_CRYSTALS, WEEKLY_CRYSTAL_LIMIT } from "./crystals";
import { lruCapByTime } from "@/lib/lru";

export const BOSS_PRESETS_KEY = "maplecompile.boss-presets.v1";
export const BOSS_PRESETS_LIMIT = 20;

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
  /** MapleHub default mule presets — not deletable / not persisted. */
  builtin?: boolean;
};

/**
 * MapleHub default boss presets (`tmp_mh_BossTracker.js` `bs` / `js` arrays).
 * Labels like "Normal Slime" map to Guardian Angel Slime; "Normal Akechi" → Mitsuhide.
 */
const MAPLEHUB_LABEL_ALIASES: Record<string, string> = {
  Slime: "Guardian Angel Slime",
  Akechi: "Akechi Mitsuhide",
};

/** Raw MapleHub preset configs: keyed by `"Difficulty BossName"` labels. */
const MAPLEHUB_RAW_PRESETS: Record<
  string,
  Record<string, { partySize: number; difficulty: string }>
> = {
  "NLomien Mule": {
    "Normal Lotus": { partySize: 1, difficulty: "Normal" },
    "Normal Damien": { partySize: 1, difficulty: "Normal" },
    "Normal Akechi": { partySize: 1, difficulty: "Normal" },
    "Chaos Papulatus": { partySize: 1, difficulty: "Chaos" },
    "Chaos Vellum": { partySize: 1, difficulty: "Chaos" },
    "Hard Magnus": { partySize: 1, difficulty: "Hard" },
    "Chaos Crimson Queen": { partySize: 1, difficulty: "Chaos" },
    "Chaos Pierre": { partySize: 1, difficulty: "Chaos" },
    "Normal Princess No": { partySize: 1, difficulty: "Normal" },
    "Chaos Von Bon": { partySize: 1, difficulty: "Chaos" },
    "Chaos Zakum": { partySize: 1, difficulty: "Chaos" },
    "Normal Cygnus": { partySize: 1, difficulty: "Normal" },
    "Chaos Pink Bean": { partySize: 1, difficulty: "Chaos" },
    "Hard Hilla": { partySize: 1, difficulty: "Hard" },
  },
  "HLotus Mule": {
    "Hard Lotus": { partySize: 1, difficulty: "Hard" },
    "Normal Slime": { partySize: 1, difficulty: "Normal" },
    "Easy Lucid": { partySize: 1, difficulty: "Easy" },
    "Normal Damien": { partySize: 1, difficulty: "Normal" },
    "Normal Akechi": { partySize: 1, difficulty: "Normal" },
    "Chaos Papulatus": { partySize: 1, difficulty: "Chaos" },
    "Chaos Vellum": { partySize: 1, difficulty: "Chaos" },
    "Hard Magnus": { partySize: 1, difficulty: "Hard" },
    "Chaos Crimson Queen": { partySize: 1, difficulty: "Chaos" },
    "Chaos Pierre": { partySize: 1, difficulty: "Chaos" },
    "Normal Princess No": { partySize: 1, difficulty: "Normal" },
    "Chaos Von Bon": { partySize: 1, difficulty: "Chaos" },
    "Chaos Zakum": { partySize: 1, difficulty: "Chaos" },
    "Normal Cygnus": { partySize: 1, difficulty: "Normal" },
  },
  "Ctene Mule": {
    "Hard Lotus": { partySize: 1, difficulty: "Hard" },
    "Hard Verus Hilla": { partySize: 1, difficulty: "Hard" },
    "Hard Darknell": { partySize: 1, difficulty: "Hard" },
    "Hard Will": { partySize: 1, difficulty: "Hard" },
    "Chaos Slime": { partySize: 1, difficulty: "Chaos" },
    "Chaos Gloom": { partySize: 1, difficulty: "Chaos" },
    "Hard Lucid": { partySize: 1, difficulty: "Hard" },
    "Hard Damien": { partySize: 1, difficulty: "Hard" },
    "Normal Akechi": { partySize: 1, difficulty: "Normal" },
    "Chaos Papulatus": { partySize: 1, difficulty: "Chaos" },
    "Chaos Vellum": { partySize: 1, difficulty: "Chaos" },
    "Hard Magnus": { partySize: 1, difficulty: "Hard" },
    "Chaos Crimson Queen": { partySize: 1, difficulty: "Chaos" },
    "Normal Princess No": { partySize: 1, difficulty: "Normal" },
  },
};

function resolveBossIdFromMaplehubLabel(label: string): string | null {
  // Prefer longest boss name match after optional difficulty prefix.
  const sorted = [...BOSS_CRYSTALS].sort(
    (a, b) => b.name.length - a.name.length,
  );
  for (const boss of sorted) {
    if (label === boss.name || label.endsWith(` ${boss.name}`)) {
      return boss.id;
    }
  }
  for (const [short, full] of Object.entries(MAPLEHUB_LABEL_ALIASES)) {
    if (label === short || label.endsWith(` ${short}`)) {
      const boss = BOSS_CRYSTALS.find((b) => b.name === full);
      return boss?.id ?? null;
    }
  }
  return null;
}

function maplehubLabelToEntry(
  label: string,
  raw: { partySize: number; difficulty: string },
): BossPresetEntry | null {
  const bossId = resolveBossIdFromMaplehubLabel(label);
  if (!bossId) return null;
  return normalizePresetEntry({
    bossId,
    difficulty: raw.difficulty,
    partySize: raw.partySize,
  });
}

function buildBuiltinPresets(): BossPreset[] {
  const out: BossPreset[] = [];
  let order = 0;
  for (const [name, bosses] of Object.entries(MAPLEHUB_RAW_PRESETS)) {
    const entries: BossPresetEntry[] = [];
    const seen = new Set<string>();
    for (const [label, raw] of Object.entries(bosses)) {
      const entry = maplehubLabelToEntry(label, raw);
      if (!entry || seen.has(entry.bossId)) continue;
      seen.add(entry.bossId);
      entries.push(entry);
    }
    if (entries.length === 0) continue;
    out.push({
      id: `mh_${name.toLowerCase().replace(/\s+/g, "_")}`,
      name,
      createdAt: order++,
      bosses: entries,
      builtin: true,
    });
  }
  return out;
}

export const BUILTIN_BOSS_PRESETS: BossPreset[] = buildBuiltinPresets();

function newId(): string {
  return `bp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function normalizePresetEntry(
  raw: Partial<BossPresetEntry>,
): BossPresetEntry | null {
  if (typeof raw.bossId !== "string") return null;
  const boss = BOSS_CRYSTALS.find((c) => c.id === raw.bossId);
  if (!boss) return null;
  const difficulty =
    typeof raw.difficulty === "string" &&
    boss.difficulties.some((d) => d.name === raw.difficulty)
      ? raw.difficulty
      : (boss.difficulties[boss.difficulties.length - 1]?.name ?? "");
  if (!difficulty) return null;
  return {
    bossId: boss.id,
    difficulty,
    partySize: clampPartySize(boss.id, Number(raw.partySize) || 1),
  };
}

function normalizePreset(raw: unknown): BossPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<BossPreset>;
  if (typeof p.id === "string" && p.id.startsWith("mh_")) return null;
  if (typeof p.id !== "string" || typeof p.name !== "string") return null;
  if (!Array.isArray(p.bosses)) return null;
  const seen = new Set<string>();
  const bosses: BossPresetEntry[] = [];
  for (const item of p.bosses) {
    if (!item || typeof item !== "object") continue;
    const entry = normalizePresetEntry(item as Partial<BossPresetEntry>);
    if (!entry || seen.has(entry.bossId)) continue;
    seen.add(entry.bossId);
    bosses.push(entry);
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

function loadCustomBossPresets(): BossPreset[] {
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

/** Builtin MapleHub mule presets + user-saved custom presets. */
export function loadBossPresets(): BossPreset[] {
  return [...BUILTIN_BOSS_PRESETS, ...loadCustomBossPresets()];
}

/** Persist custom presets only (LRU-capped). Returns false when storage write fails. */
export function saveBossPresets(presets: BossPreset[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    const custom = presets.filter((p) => !p.builtin && !p.id.startsWith("mh_"));
    const capped = lruCapByTime(
      custom,
      BOSS_PRESETS_LIMIT,
      (p) => p.createdAt,
    );
    localStorage.setItem(BOSS_PRESETS_KEY, JSON.stringify(capped));
    return true;
  } catch {
    return false;
  }
}

/** Build a preset from currently enabled selections. */
export function presetFromSelections(
  selections: BossClearSelection[],
  name: string,
): BossPreset | null {
  const seen = new Set<string>();
  const bosses: BossPresetEntry[] = [];
  for (const s of selections) {
    if (!s.enabled || seen.has(s.bossId)) continue;
    const entry = normalizePresetEntry({
      bossId: s.bossId,
      difficulty: s.difficulty,
      partySize: s.partySize,
    });
    if (!entry) continue;
    seen.add(entry.bossId);
    bosses.push(entry);
  }
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

/** Disable every boss for this character (Edit modal Reset). */
export function clearAllBossSelections(
  current: BossClearSelection[],
): BossClearSelection[] {
  const base = current.length ? current : defaultSelections();
  return base.map((s) => ({ ...s, enabled: false, cleared: false }));
}

export function deleteBossPreset(
  presets: BossPreset[],
  id: string,
): BossPreset[] {
  const target = presets.find((p) => p.id === id);
  if (target?.builtin) return presets;
  return presets.filter((p) => p.id !== id);
}

export function isBuiltinBossPreset(preset: BossPreset): boolean {
  return !!preset.builtin || preset.id.startsWith("mh_");
}
