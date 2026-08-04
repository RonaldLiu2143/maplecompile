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
  /** Weapons (defaults to armorMatchers when omitted). */
  weaponMatchers?: string[];
  /** Rings / pendants / face / eye / etc. */
  accessoryMatchers: string[];
  /**
   * Optional per-equipType preferred matchers (ordered). When set, replaces
   * the category matchers for that type — used for mixed armor tiers and
   * specific pitched / Oz / Gollux accessory picks.
   */
  typeMatchers?: Partial<Record<string, string[]>>;
};

/** Shared pitched + dawn accessory fallbacks (GMS names / setTypes). */
const PITCHED_ACC = [
  "hardBossAcc",
  "endless terror",
  "berserked",
  "magic eyepatch",
  "commanding force",
  "source of suffering",
  "dreamy belt",
  "cursed red spellbook",
  "genesis badge",
  "mitra's rage",
  "black heart",
];

const GOLLUX_ACC = [
  "superiorGollux",
  "superior gollux",
  "reinforcedGollux",
  "reinforced gollux",
];

/**
 * Heroic progression ladders — resolved against the loaded class catalog.
 *
 * Catalog setTypes / GMS name cues:
 * - pensalir — Pensalir (8th) armor (injected; overalls live in `top`)
 * - faf — CRA: Highness / Eagle Eye / Trickster armor + Fafnir weapons
 * - abs — Absolabs
 * - acs — Arcane Umbra (catalog may say Arcaneshade; renamed on load)
 * - eternal — Eternal / Destiny (Brilliant) weapons
 * - genesis — Genesis weapons (name match; setType is also eternal)
 *
 * Presets 3–6 follow Adele Heroic screenshots (class gear variants per catalog).
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
    name: "Early midgame (Absolab)",
    description:
      "5 Absolab + CRA top/bottom, Superior Gollux line, Pink Holy Grail pocket.",
    armorMatchers: ["abs", "absolabs", "absolab"],
    weaponMatchers: ["abs", "absolabs", "absolab"],
    accessoryMatchers: [
      ...GOLLUX_ACC,
      "kanna",
      "sweetwater",
      "pink holy grail",
      "bossAcc",
      "fairy heart",
      "gold maple",
      "gold knight",
      "gold crystal",
      "gold",
    ],
    typeMatchers: {
      // Absolab 5-set + CRA armor (Eagle Eye / Trickster), not Absolab overall.
      hat: ["abs", "absolabs", "absolab"],
      top: ["faf", "eagle eye"],
      bottom: ["faf", "trickster"],
      cape: ["abs", "absolabs", "absolab"],
      gloves: ["abs", "absolabs", "absolab"],
      shoes: ["abs", "absolabs", "absolab"],
      shoulder: ["abs", "absolabs", "absolab"],
      weapon: ["abs", "absolabs", "absolab"],
      ring: [
        "superior-gollux-ring",
        "reinforced-gollux-ring",
        "kanna-ring",
        "kanna",
        "meister signet",
        "silver blossom",
      ],
      pendant: [
        "superior-gollux-pendant",
        "reinforced-gollux-pendant",
        "superiorGollux",
        "reinforcedGollux",
      ],
      earring: ["superior-gollux-earrings", "superiorGollux"],
      belt: ["superior-gollux-belt", "superiorGollux"],
      face: ["sweetwater tattoo", "sweetwater"],
      eye: ["sweetwater monocle", "sweetwater"],
      pocket: ["pink holy grail", "phg"],
      emblem: [
        "gold maple",
        "gold knight",
        "gold crystal",
        "gold hitman",
        "gold resistance",
        "gold agent",
        "gold abyss",
        "gold",
      ],
      heart: ["fairy heart"],
      secondary: ["astra", "terminus", "princess nou", "deimos"],
      medal: ["seven-day monster parker", "monsterPark"],
    },
  },
  {
    id: "heroic-arcane",
    name: "Midgame (Arcane)",
    description:
      "Full Arcane Umbra armor / weapon with pitched + Superior Gollux accessories.",
    armorMatchers: ["acs", "arcane umbra", "arcaneshade", "arcane"],
    weaponMatchers: ["acs", "arcane umbra", "arcaneshade"],
    accessoryMatchers: [
      ...PITCHED_ACC,
      ...GOLLUX_ACC,
      "guardian angel ring",
      "kanna",
      "fairy heart",
      "dawnBossAcc",
      "bossAcc",
    ],
    typeMatchers: {
      hat: ["acs", "arcane umbra"],
      top: ["acs", "arcane umbra"],
      // Arcane overall lives in `top`; leave bottom empty.
      bottom: [],
      cape: ["acs", "arcane umbra"],
      gloves: ["acs", "arcane umbra"],
      shoes: ["acs", "arcane umbra"],
      shoulder: ["acs", "arcane umbra"],
      weapon: ["acs", "arcane umbra"],
      ring: [
        "endless terror",
        "guardian-angel-ring",
        "superior-gollux-ring",
        "kanna-ring",
      ],
      pendant: ["source of suffering", "superior-gollux-pendant"],
      face: ["berserked"],
      eye: ["magic eyepatch"],
      earring: ["commanding force"],
      belt: ["dreamy belt", "superior-gollux-belt"],
      pocket: ["cursed red spellbook"],
      badge: ["genesis badge"],
      emblem: ["mitra's rage"],
      heart: ["fairy heart"],
      secondary: ["astra", "terminus", "princess nou", "deimos"],
      medal: ["seven-day monster parker", "monsterPark"],
    },
  },
  {
    id: "heroic-pitched",
    name: "Lategame (Pitched)",
    description:
      "Eternal hat/top/bottom/shoulder + Arcane gloves/shoes/cape, pitched accessories, Genesis weapon.",
    armorMatchers: ["eternal"],
    weaponMatchers: ["genesis"],
    accessoryMatchers: [
      ...PITCHED_ACC,
      ...GOLLUX_ACC,
      "guardian angel ring",
      "kanna",
      "fairy heart",
      "radiantBossAcc",
      "dawnBossAcc",
    ],
    typeMatchers: {
      hat: ["eternal"],
      top: ["eternal"],
      bottom: ["eternal"],
      shoulder: ["eternal"],
      gloves: ["acs", "arcane umbra"],
      shoes: ["acs", "arcane umbra"],
      cape: ["acs", "arcane umbra"],
      weapon: ["genesis"],
      ring: [
        "endless terror",
        "guardian-angel-ring",
        "kanna-ring",
        "superior-gollux-ring",
      ],
      pendant: ["source of suffering", "superior-gollux-pendant"],
      face: ["berserked"],
      eye: ["magic eyepatch"],
      earring: ["commanding force"],
      belt: ["superior-gollux-belt", "dreamy belt"],
      pocket: ["cursed red spellbook"],
      badge: ["genesis badge"],
      emblem: ["mitra's rage"],
      heart: ["fairy heart"],
      secondary: ["astra", "terminus", "princess nou", "deimos"],
      medal: ["seven-day monster parker", "monsterPark"],
    },
  },
  {
    id: "heroic-eternal",
    name: "Endgame (Brilliant)",
    description:
      "Full Eternal armor, Destiny (Brilliant) weapon, pitched + Oz rings, Dreamy Belt.",
    armorMatchers: ["eternal"],
    weaponMatchers: ["destiny"],
    accessoryMatchers: [
      ...PITCHED_ACC,
      "ring of restraint",
      "continuous ring",
      "guardian angel ring",
      "radiantBossAcc",
      "black heart",
    ],
    typeMatchers: {
      hat: ["eternal"],
      top: ["eternal"],
      bottom: ["eternal"],
      cape: ["eternal"],
      gloves: ["eternal"],
      shoes: ["eternal"],
      shoulder: ["eternal"],
      weapon: ["destiny"],
      ring: [
        "guardian-angel-ring",
        "endless terror",
        "ring-of-restraint",
        "continuous-ring",
      ],
      pendant: [
        "source of suffering",
        "oath of death",
        "superior-gollux-pendant",
      ],
      face: ["berserked"],
      eye: ["magic eyepatch"],
      earring: ["commanding force"],
      belt: ["dreamy belt"],
      pocket: ["cursed yellow spellbook", "cursed red spellbook"],
      badge: ["genesis badge"],
      emblem: ["mitra's rage"],
      heart: ["black heart"],
      secondary: ["astra", "terminus", "princess nou", "deimos"],
      medal: ["seven-day monster parker", "monsterPark"],
    },
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

function matchersForType(type: string, loadout: StarterLoadout): string[] {
  if (loadout.typeMatchers && Object.prototype.hasOwnProperty.call(loadout.typeMatchers, type)) {
    return loadout.typeMatchers[type] ?? [];
  }
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
