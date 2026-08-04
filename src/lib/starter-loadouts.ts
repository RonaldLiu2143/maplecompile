import type { Equip, EquipSetup, EquipsResponse } from "./types";
import { SLOT_CAPACITY } from "./slots";

export type StarterLoadout = {
  id: string;
  name: string;
  description: string;
  /**
   * Prefer setType / name containing any of these (case-insensitive).
   * First matcher wins; use catalog setType keys when possible.
   */
  armorMatchers: string[];
  /** Weapons / secondaries (defaults to armorMatchers when omitted). */
  weaponMatchers?: string[];
  /** Rings / pendants / face / eye / etc. */
  accessoryMatchers: string[];
};

/**
 * Heroic progression ladders — resolved against the loaded class catalog.
 *
 * Catalog setTypes / GMS name cues:
 * - pensalir — Pensalir (8th) armor (injected; overalls live in `top`)
 * - faf — CRA: Highness / Eagle Eye / Trickster armor + Fafnir weapons
 * - abs — Absolabs
 * - acs — Arcane Umbra (catalog may say Arcaneshade; renamed on load)
 * - eternal — Eternal
 */
export const STARTER_LOADOUTS: StarterLoadout[] = [
  {
    id: "heroic-early",
    name: "Early (Pensalir / CRA)",
    description:
      "Pensalir armor with a Fafnir (CRA) weapon when available — early Heroic.",
    armorMatchers: ["pensalir"],
    weaponMatchers: ["faf", "fafnir"],
    accessoryMatchers: [
      "superiorGollux",
      "dawnBossAcc",
      "bossAcc",
      "meister",
      "sweetwater",
    ],
  },
  {
    id: "heroic-cra",
    name: "Mid (CRA)",
    description:
      "Chaos Root Abyss pieces (Highness / Eagle Eye / Trickster / Fafnir).",
    armorMatchers: ["faf", "fafnir", "highness", "eagle eye", "trickster"],
    accessoryMatchers: [
      "dawnBossAcc",
      "superiorGollux",
      "bossAcc",
      "meister",
      "sweetwater",
    ],
  },
  {
    id: "heroic-absolab",
    name: "Mid-late (Absolabs)",
    description: "Absolabs armor / weapon ladder.",
    armorMatchers: ["abs", "absolabs", "absolab"],
    accessoryMatchers: [
      "dawnBossAcc",
      "bossAcc",
      "radiantBossAcc",
      "superiorGollux",
    ],
  },
  {
    id: "heroic-arcane",
    name: "Late (Arcane Umbra)",
    description: "Arcane Umbra set for late Heroic progression.",
    armorMatchers: ["acs", "arcane umbra", "arcaneshade", "arcane"],
    accessoryMatchers: [
      "dawnBossAcc",
      "radiantBossAcc",
      "bossAcc",
      "eternal",
    ],
  },
  {
    id: "heroic-eternal",
    name: "End (Eternal)",
    description: "Eternal set pieces when available.",
    armorMatchers: ["eternal"],
    accessoryMatchers: [
      "radiantBossAcc",
      "dawnBossAcc",
      "eternal",
      "bossAcc",
    ],
  },
];

const EQUIP_TYPES = [
  "weapon",
  "secondary",
  "emblem",
  "badge",
  "medal",
  "hat",
  "top",
  "bottom",
  "overall",
  "gloves",
  "shoes",
  "cape",
  "shoulder",
  "belt",
  "pocket",
  "heart",
  "android",
  "face",
  "eye",
  "earring",
  "ring",
  "pendant",
] as const;

const WEAPONISH = new Set(["weapon"]);

const ARMORISH = new Set([
  "hat",
  "top",
  "bottom",
  "overall",
  "gloves",
  "shoes",
  "cape",
  "shoulder",
  "belt",
]);

function matchesAny(equip: Equip, matchers: string[]): boolean {
  const set = (equip.setType ?? "").toLowerCase();
  const name = (equip.name ?? "").toLowerCase();
  const id = (equip.id ?? "").toLowerCase();
  return matchers.some((m) => {
    const needle = m.toLowerCase();
    // Exact setType only — avoids bossAcc matching hardBossAcc / dawnBossAcc.
    if (set === needle) return true;
    if (id === needle || id.startsWith(`${needle}-`)) return true;
    if (name.includes(needle)) return true;
    return false;
  });
}

function pickEquips(
  bucket: Equip[] | undefined,
  matchers: string[],
  capacity: number,
): Equip[] {
  if (!bucket?.length || capacity <= 0 || !matchers.length) return [];
  const picked: Equip[] = [];
  const used = new Set<string>();
  for (const matcher of matchers) {
    for (const equip of bucket) {
      if (picked.length >= capacity) break;
      if (used.has(equip.id)) continue;
      if (!matchesAny(equip, [matcher])) continue;
      picked.push(equip);
      used.add(equip.id);
    }
    if (picked.length >= capacity) break;
  }
  return picked;
}

function matchersForType(
  type: string,
  loadout: StarterLoadout,
): string[] {
  if (WEAPONISH.has(type)) {
    return loadout.weaponMatchers ?? loadout.armorMatchers;
  }
  if (ARMORISH.has(type)) return loadout.armorMatchers;
  return loadout.accessoryMatchers;
}

/**
 * Build an EquipSetup from the current class catalog using starter matchers.
 * Missing slots stay empty when the catalog has no match.
 */
export function buildStarterSetup(
  equipByType: EquipsResponse["equipByType"],
  loadout: StarterLoadout,
): EquipSetup {
  const setup: EquipSetup = {};
  for (const type of EQUIP_TYPES) {
    const bucket = equipByType[type]?.equips;
    if (!bucket?.length) continue;
    const capacity = SLOT_CAPACITY[type] ?? 1;
    const matchers = matchersForType(type, loadout);
    const picked = pickEquips(bucket, matchers, capacity);
    if (picked.length) setup[type] = picked;
  }
  return setup;
}

export function countFilledSlots(setup: EquipSetup): number {
  return Object.values(setup).reduce((n, list) => n + (list?.length ?? 0), 0);
}
