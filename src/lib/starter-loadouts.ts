import type { Equip, EquipSetup, EquipsResponse } from "./types";
import { SLOT_CAPACITY } from "./slots";

export type StarterLoadout = {
  id: string;
  name: string;
  description: string;
  /** Prefer setType/name containing any of these (case-insensitive), first match wins. */
  armorMatchers: string[];
  /** Rings / pendants / face / eye / etc. */
  accessoryMatchers: string[];
};

/** Heroic progression ladders — resolved against the loaded class catalog. */
export const STARTER_LOADOUTS: StarterLoadout[] = [
  {
    id: "heroic-early",
    name: "Early (RA / Pensalir)",
    description: "Root Abyss / Pensalir-style gear for early Heroic.",
    armorMatchers: ["pensalir", "root abyss", "ra ", "cra"],
    accessoryMatchers: ["boss", "dawn", "sweetwater", "meister", "superior"],
  },
  {
    id: "heroic-cra",
    name: "Mid (CRA)",
    description: "Chaos Root Abyss set pieces when available for your class.",
    armorMatchers: ["cra", "chaos root", "root abyss"],
    accessoryMatchers: ["dawn", "boss", "sweetwater", "superior", "meister"],
  },
  {
    id: "heroic-absolab",
    name: "Mid-late (Absolab)",
    description: "Absolute Labs armor / weapon ladder.",
    armorMatchers: ["absolab", "absolute"],
    accessoryMatchers: ["dawn", "boss", "pitched", "superior"],
  },
  {
    id: "heroic-arcane",
    name: "Late (Arcane Umbra)",
    description: "Arcane Umbra set for late Heroic progression.",
    armorMatchers: ["arcane umbra", "arcane"],
    accessoryMatchers: ["dawn", "pitched", "boss", "eternal"],
  },
  {
    id: "heroic-eternal",
    name: "End (Eternal)",
    description: "Eternal set pieces when available.",
    armorMatchers: ["eternal"],
    accessoryMatchers: ["pitched", "eternal", "dawn", "boss"],
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

const ARMORISH = new Set([
  "weapon",
  "secondary",
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
  const hay = `${equip.setType ?? ""} ${equip.name ?? ""}`.toLowerCase();
  return matchers.some((m) => hay.includes(m.toLowerCase()));
}

function pickEquips(
  bucket: Equip[] | undefined,
  matchers: string[],
  capacity: number,
): Equip[] {
  if (!bucket?.length || capacity <= 0) return [];
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
    const matchers = ARMORISH.has(type)
      ? loadout.armorMatchers
      : loadout.accessoryMatchers;
    const picked = pickEquips(bucket, matchers, capacity);
    if (picked.length) setup[type] = picked;
  }
  return setup;
}

export function countFilledSlots(setup: EquipSetup): number {
  return Object.values(setup).reduce((n, list) => n + (list?.length ?? 0), 0);
}
