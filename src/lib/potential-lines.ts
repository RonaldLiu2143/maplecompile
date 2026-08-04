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

function pct(id: string, values: number[], noun: string): PotentialLineOption[] {
  return values.map((value) => ({
    id,
    value,
    label: `${value}% ${noun}`,
  }));
}

/** Common Heroic-relevant main-potential options for an item (MVP dropdown). */
export function potentialLineOptions(equip: Equip): PotentialLineOption[] {
  const type = equip.equipType;
  const isWse =
    type === "weapon" || type === "secondary" || type === "emblem";
  const isGlove = type === "gloves";
  const isAccessory = [
    "ring",
    "pendant",
    "face",
    "eye",
    "earring",
    "belt",
    "shoulder",
    "pocket",
    "badge",
    "heart",
    "medal",
  ].includes(type);

  const opts: PotentialLineOption[] = [EMPTY];

  if (isWse) {
    opts.push(
      ...pct("attPercent", [13, 12, 10, 9, 7], "ATT"),
      ...pct("mattPercent", [13, 12, 10, 9, 7], "MATT"),
      ...pct("bossPercent", [40, 35, 30], "Boss Damage"),
      ...pct("iedPercent", [40, 35, 30], "IED"),
      ...pct("damagePercent", [13, 10, 9], "Damage"),
    );
  } else {
    opts.push(
      ...pct("mainStatPercent", [13, 12, 10, 9, 7], "Main Stat"),
      ...pct("allStatPercent", [10, 9, 7, 6], "All Stats"),
      ...pct("hpPercent", [13, 12, 10, 9, 7], "Max HP"),
      ...pct("attPercent", [13, 12, 10, 9, 7], "ATT"),
      ...pct("mattPercent", [13, 12, 10, 9, 7], "MATT"),
    );
  }

  if (isGlove) {
    opts.push(...pct("critDamage", [8], "Critical Damage"));
  }

  if (isAccessory) {
    opts.push(
      ...pct("mesoPercent", [20], "Mesos Obtained"),
      ...pct("dropPercent", [20], "Item Drop"),
      ...pct("iedPercent", [40, 35, 30], "IED"),
    );
  }

  // Deduplicate by id+value while preserving order
  const seen = new Set<string>();
  return opts.filter((o) => {
    const key = `${o.id}:${o.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
