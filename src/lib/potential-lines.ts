import potentialCatalog from "./cubing/potentialCatalog.json";
import { equipTypeToCubeCategory } from "./cubing/itemCategory";
import type { Equip, PotentialLine } from "./types";

export const POTENTIAL_TIER_LABELS = [
  "Rare",
  "Epic",
  "Unique",
  "Legendary",
] as const;

const TIER_KEYS = ["rare", "epic", "unique", "legendary"] as const;

export type PotentialLineOption = {
  id: string;
  value: number;
  label: string;
};

const EMPTY: PotentialLineOption = { id: "", value: 0, label: "— empty —" };

/**
 * Heroic-relevant line families for Equip Setup dropdowns.
 * Catalog is derived from `cubeRates.json` via
 * `scripts/generate-potential-catalog.mjs` (junk / flats / decent skills /
 * auto-steal / invincibility omitted — not tracked in setup).
 */
const LINE_ORDER: string[] = [
  "attPercent",
  "mattPercent",
  "bossPercent",
  "iedPercent",
  "damagePercent",
  "critDamage",
  "critChance",
  "skillCooldown",
  "mesoPercent",
  "dropPercent",
  "mainStatPercent",
  "allStatPercent",
  "hpPercent",
];

/**
 * % families that gain +1 at item level ≥ 160.
 * Matches cubing `convertCubeDataForLevel`, plus `damagePercent` (GMS scales
 * Damage% like ATT%; the calculator adjust set currently omits it).
 */
const LEVEL_PLUS_ONE = new Set([
  "attPercent",
  "mattPercent",
  "damagePercent",
  "mainStatPercent",
  "allStatPercent",
  "hpPercent",
]);

type CatalogEntry = { id: string; values: number[] };
type CatalogRoot = Record<
  string,
  Partial<Record<(typeof TIER_KEYS)[number], CatalogEntry[]>>
>;

const CATALOG = potentialCatalog as CatalogRoot;

const NOUNS: Record<string, string> = {
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

export function formatPotentialLineLabel(line: PotentialLine): string {
  if (line.id === "skillCooldown") return `Skill Cooldowns -${line.value} sec`;
  const noun = NOUNS[line.id];
  if (noun) return `${line.value}% ${noun}`;
  return `${line.id} ${line.value}`;
}

/** Cube-rates / catalog table key for an equip type (accessories → ring). */
export function cubeTableKeyForEquipType(equipType: string): string | null {
  const key = equipTypeToCubeCategory(equipType);
  if (!key || !CATALOG[key]) return null;
  return key;
}

function optionLabel(id: string, value: number): string {
  if (id === "skillCooldown") return `-${value}s Skill Cooldown`;
  const noun = NOUNS[id] ?? id;
  return `${value}% ${noun}`;
}

/**
 * Main-potential options for this item's cube category + selected tier.
 *
 * Category: {@link equipTypeToCubeCategory} (ring table for accessories).
 * Tier: Rare…Legendary — only lines that exist on that tier in cube tables.
 * Level ≥ 160: +1 on ATT/MATT/stat/HP % (matches cubing level adjust).
 * Saved lines not in the pool stay selectable as "(saved)".
 */
export function potentialLineOptions(
  equip: Equip,
  selected: (PotentialLine | null | undefined)[] = [],
  potentialTier: 0 | 1 | 2 | 3 = 3,
): PotentialLineOption[] {
  const category = cubeTableKeyForEquipType(equip.equipType) ?? "top";
  const tierKey = TIER_KEYS[potentialTier] ?? "legendary";
  const raw = CATALOG[category]?.[tierKey] ?? [];

  const levelBonus = (equip.level ?? 0) >= 160 ? 1 : 0;
  const entries = raw
    .map((entry) => {
      if (!levelBonus || !LEVEL_PLUS_ONE.has(entry.id)) return entry;
      return {
        id: entry.id,
        values: entry.values.map((v) => v + levelBonus),
      };
    })
    .sort(
      (a, b) =>
        (LINE_ORDER.indexOf(a.id) < 0 ? 99 : LINE_ORDER.indexOf(a.id)) -
        (LINE_ORDER.indexOf(b.id) < 0 ? 99 : LINE_ORDER.indexOf(b.id)),
    );

  const opts: PotentialLineOption[] = [EMPTY];
  for (const entry of entries) {
    for (const value of entry.values) {
      opts.push({
        id: entry.id,
        value,
        label: optionLabel(entry.id, value),
      });
    }
  }

  const seen = new Set<string>();
  const filtered = opts.filter((o) => {
    const key = o.id ? `${o.id}:${o.value}` : "";
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (const line of selected) {
    if (!line?.id) continue;
    const key = `${line.id}:${line.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    filtered.push({
      id: line.id,
      value: line.value,
      label: `${formatPotentialLineLabel(line)} (saved)`,
    });
  }

  return filtered;
}

export function lineOptionKey(
  line: PotentialLine | PotentialLineOption,
): string {
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
