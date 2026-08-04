import type { Equip, PotentialLine } from "./types";

export const POTENTIAL_TIER_LABELS = [
  "Rare",
  "Epic",
  "Unique",
  "Legendary",
] as const;

export type PotentialLineOption = {
  id: string;
  value: number;
  label: string;
};

const EMPTY: PotentialLineOption = { id: "", value: 0, label: "— empty —" };

/** Equip types that use accessory (ring) cube tables — meso/drop lines. */
const ACCESSORY_TYPES = new Set([
  "ring",
  "pendant",
  "face",
  "eye",
  "earring",
]);

function pct(id: string, values: number[], noun: string): PotentialLineOption[] {
  return values.map((value) => ({
    id,
    value,
    label: `${value}% ${noun}`,
  }));
}

function cooldown(values: number[]): PotentialLineOption[] {
  return values.map((value) => ({
    id: "skillCooldown",
    value,
    label: `-${value}s Skill Cooldown`,
  }));
}

function formatLineLabel(line: PotentialLine): string {
  if (line.id === "skillCooldown") return `-${line.value}s Skill Cooldown`;
  const nouns: Record<string, string> = {
    attPercent: "ATT",
    mattPercent: "MATT",
    bossPercent: "Boss Damage",
    iedPercent: "IED",
    damagePercent: "Damage",
    mainStatPercent: "Main Stat",
    allStatPercent: "All Stats",
    hpPercent: "Max HP",
    critDamage: "Critical Damage",
    mesoPercent: "Mesos Obtained",
    dropPercent: "Item Drop",
    critChance: "Critical Chance",
  };
  const noun = nouns[line.id];
  if (noun) return `${line.value}% ${noun}`;
  return `${line.id} ${line.value}`;
}

/**
 * Heroic-relevant main-potential options filtered by equip type/slot.
 * Line pools follow cubing `cubeRates.json` categories (weapon / emblem /
 * gloves / hat / ring-accessory / armor / heart).
 */
export function potentialLineOptions(
  equip: Equip,
  selected: (PotentialLine | null | undefined)[] = [],
): PotentialLineOption[] {
  const type = equip.equipType;
  const isWeaponOrSecondary = type === "weapon" || type === "secondary";
  const isEmblem = type === "emblem";
  const isWse = isWeaponOrSecondary || isEmblem;
  const isGlove = type === "gloves";
  const isHat = type === "hat";
  const isAccessory = ACCESSORY_TYPES.has(type);

  const opts: PotentialLineOption[] = [EMPTY];

  if (isWse) {
    // Weapon / secondary / emblem cube tables
    opts.push(
      ...pct("attPercent", [13, 12, 10, 9, 7, 6, 3], "ATT"),
      ...pct("mattPercent", [13, 12, 10, 9, 7, 6, 3], "MATT"),
      ...pct("damagePercent", [13, 12, 10, 9, 6, 3], "Damage"),
      ...pct("iedPercent", [40, 35, 30, 15], "IED"),
      ...pct("critChance", [12, 9, 8, 4], "Critical Chance"),
    );
    // Boss Damage is not obtainable on emblems
    if (isWeaponOrSecondary) {
      opts.push(...pct("bossPercent", [40, 35, 30], "Boss Damage"));
    }
    opts.push(
      ...pct("mainStatPercent", [13, 12, 10, 9, 7, 6, 3], "Main Stat"),
      ...pct("allStatPercent", [10, 9, 7, 6, 3], "All Stats"),
    );
  } else {
    // Armor, accessories, heart-like: stat % only (no ATT%/Boss%/IED%)
    opts.push(
      ...pct("mainStatPercent", [13, 12, 10, 9, 7, 6, 3], "Main Stat"),
      ...pct("allStatPercent", [10, 9, 7, 6, 3], "All Stats"),
      ...pct("hpPercent", [13, 12, 10, 9, 7, 6, 3], "Max HP"),
    );
  }

  if (isGlove) {
    opts.push(...pct("critDamage", [8], "Critical Damage"));
  }

  if (isHat) {
    opts.push(...cooldown([1, 2]));
  }

  if (isAccessory) {
    opts.push(
      ...pct("mesoPercent", [20], "Mesos Obtained"),
      ...pct("dropPercent", [20], "Item Drop"),
    );
  }

  // Deduplicate by id+value while preserving order
  const seen = new Set<string>();
  const filtered = opts.filter((o) => {
    const key = `${o.id}:${o.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Keep saved/selected lines visible even if no longer in the filtered pool
  for (const line of selected) {
    if (!line?.id) continue;
    const key = `${line.id}:${line.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    filtered.push({
      id: line.id,
      value: line.value,
      label: `${formatLineLabel(line)} (saved)`,
    });
  }

  return filtered;
}

export function lineOptionKey(line: PotentialLine | PotentialLineOption): string {
  if (!line.id) return "";
  return `${line.id}:${line.value}`;
}

export function parseLineOptionKey(key: string): PotentialLine | null {
  if (!key) return null;
  const idx = key.lastIndexOf(":");
  if (idx < 0) return null;
  const id = key.slice(0, idx);
  const value = Number(key.slice(idx + 1));
  if (!id || !Number.isFinite(value)) return null;
  return { id, value };
}

export function normalizePotentialLines(
  lines: PotentialLine[] | undefined,
): (PotentialLine | null)[] {
  const src = lines ?? [];
  return [0, 1, 2].map((i) => src[i] ?? null);
}
