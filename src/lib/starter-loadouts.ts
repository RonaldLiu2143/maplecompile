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
   *
   * Multi-slot types (ring ×4, pendant ×2): matchers are tried in order;
   * each matcher can fill remaining capacity with distinct items.
   */
  typeMatchers?: Partial<Record<string, string[]>>;
};

/** Job-variant Gold Lab emblems (WhackyBeanz / GMS). */
const GOLD_EMBLEM = [
  "gold maple",
  "gold knight",
  "gold crystal",
  "gold hitman",
  "gold resistance",
  "gold agent",
  "gold abyss",
  "gold",
];

const CRA_HAT = ["highness", "faf"];
const CRA_TOP = ["eagle eye", "faf"];
const CRA_BOTTOM = ["trickster", "faf"];

/**
 * Heroic progression presets from the Equipment Setup PDF matrix.
 * Resolved against the loaded class catalog (job-filtered weapons / armor).
 *
 * Catalog setTypes / GMS name cues:
 * - pensalir — Pensalir armor + Utgard weapons (injected)
 * - faf — CRA: Highness / Eagle Eye / Trickster + Fafnir weapons
 * - abs — Absolabs
 * - acs — Arcane Umbra (catalog may say Arcaneshade; renamed on load)
 * - eternal — Eternal armor
 * - genesis / destiny — liberation weapons (setType eternal; default 22★)
 * - eventRing — Oz / Seed special skill rings (injected)
 */
export const STARTER_LOADOUTS: StarterLoadout[] = [
  {
    id: "heroic-early",
    name: "Early game",
    description:
      "CRA armor, Fafnir weapon, Pensalir gloves/shoes, Tyrant cape, boss accessories, event rings.",
    armorMatchers: ["faf", "pensalir"],
    weaponMatchers: ["faf", "fafnir"],
    accessoryMatchers: ["bossAcc", "eventRing", "sengoku", "meister"],
    typeMatchers: {
      hat: CRA_HAT,
      top: CRA_TOP,
      bottom: CRA_BOTTOM,
      shoulder: ["royal black metal", "magnus-shoulder", "magnus"],
      cape: ["tyrant hyades cloak", "tyrant-cape", "tyrant"],
      gloves: ["pensalir"],
      shoes: ["pensalir"],
      weapon: ["faf", "fafnir"],
      ring: [
        "kanna's treasure",
        "kanna-ring",
        "silver blossom",
        "eventRing",
      ],
      pendant: ["dominator", "machinator", "chaos horntail", "horned tail"],
      face: ["condensed power", "condensed strength", "condensed"],
      eye: ["aqua letter"],
      earring: ["dea sidus"],
      belt: ["golden clover"],
      pocket: ["pink holy grail", "phg", "pink holy"],
      emblem: GOLD_EMBLEM,
      secondary: ["princess no", "princess nou", "pnou"],
      medal: ["chaos vellum crusher", "chaos-vellum-crusher"],
      heart: ["fairy heart"],
      badge: ["crystal ventus", "ventus-badge"],
    },
  },
  {
    id: "heroic-early-mid",
    name: "Early-mid game",
    description:
      "Absolab weapon + 5-set (cape/gloves/shoes/shoulder) with CRA top/bottom/hat, Dawn GAR line.",
    armorMatchers: ["abs", "faf"],
    weaponMatchers: ["abs", "absolabs", "absolab"],
    accessoryMatchers: [
      "dawnBossAcc",
      "superiorGollux",
      "bossAcc",
      "meister",
      "sengoku",
    ],
    typeMatchers: {
      hat: CRA_HAT,
      top: CRA_TOP,
      bottom: CRA_BOTTOM,
      shoulder: ["abs", "absolabs", "absolab"],
      cape: ["abs", "absolabs", "absolab"],
      gloves: ["abs", "absolabs", "absolab"],
      shoes: ["abs", "absolabs", "absolab"],
      weapon: ["abs", "absolabs", "absolab"],
      ring: [
        "dawn-guardian-angel-ring",
        "dawn guardian",
        "superior-gollux-ring",
        "kanna's treasure",
        "kanna-ring",
        "meister signet",
        "meister-signet",
      ],
      pendant: ["dominator", "superior-gollux-pendant", "superiorGollux"],
      face: ["condensed power", "condensed strength", "condensed"],
      eye: ["black bean"],
      earring: ["superior-gollux-earrings", "superiorGollux"],
      belt: ["golden clover"],
      pocket: ["pink holy grail", "phg", "pink holy"],
      emblem: GOLD_EMBLEM,
      secondary: ["princess no", "princess nou", "pnou"],
      medal: ["chaos vellum crusher", "chaos-vellum-crusher"],
      heart: ["fairy heart"],
      badge: ["crystal ventus", "ventus-badge"],
    },
  },
  {
    id: "heroic-mid",
    name: "Mid-game",
    description:
      "Arcane weapon + gloves/shoes/cape/shoulder, CRA top/bottom, Arcane or Highness hat, Dawn/Gollux line.",
    armorMatchers: ["acs", "faf"],
    weaponMatchers: ["acs", "arcane umbra", "arcaneshade"],
    accessoryMatchers: [
      "dawnBossAcc",
      "superiorGollux",
      "bossAcc",
      "hardBossAcc",
      "sengoku",
      "eventRing",
    ],
    typeMatchers: {
      hat: ["acs", "arcane umbra", "arcaneshade", ...CRA_HAT],
      top: CRA_TOP,
      bottom: CRA_BOTTOM,
      shoulder: ["acs", "arcane umbra", "arcaneshade"],
      cape: ["acs", "arcane umbra", "arcaneshade"],
      gloves: ["acs", "arcane umbra", "arcaneshade"],
      shoes: ["acs", "arcane umbra", "arcaneshade"],
      weapon: ["acs", "arcane umbra", "arcaneshade"],
      ring: [
        "dawn-guardian-angel-ring",
        "dawn guardian",
        "superior-gollux-ring",
        "kanna's treasure",
        "kanna-ring",
        "ring of restraint",
        "ring-of-restraint",
      ],
      pendant: [
        "daybreak",
        "superior-gollux-pendant",
        "superiorGollux",
      ],
      face: ["twilight mark", "penombre"],
      eye: ["black bean"],
      earring: ["superior-gollux-earrings", "superiorGollux"],
      belt: ["superior-gollux-belt", "superiorGollux"],
      pocket: ["pink holy grail", "phg", "pink holy"],
      emblem: GOLD_EMBLEM,
      secondary: ["princess no", "princess nou", "pnou"],
      medal: ["chaos vellum crusher", "chaos-vellum-crusher"],
      heart: ["fairy heart"],
      badge: ["crystal ventus", "ventus-badge"],
    },
  },
  {
    id: "heroic-late",
    name: "Late-game",
    description:
      "Eternal hat/top/bottom/shoulder + Arcane cape/gloves/shoes, Genesis weapon, pitched accessories.",
    armorMatchers: ["eternal", "acs"],
    weaponMatchers: ["genesis"],
    accessoryMatchers: [
      "hardBossAcc",
      "dawnBossAcc",
      "superiorGollux",
      "eventRing",
    ],
    typeMatchers: {
      hat: ["eternal"],
      top: ["eternal"],
      bottom: ["eternal"],
      shoulder: ["eternal"],
      cape: ["acs", "arcane umbra", "arcaneshade"],
      gloves: ["acs", "arcane umbra", "arcaneshade"],
      shoes: ["acs", "arcane umbra", "arcaneshade"],
      weapon: ["genesis"],
      ring: [
        "dawn-guardian-angel-ring",
        "dawn guardian",
        "superior-gollux-ring",
        "endless terror",
        "giant fear",
        "ring of restraint",
        "ring-of-restraint",
      ],
      pendant: ["daybreak", "source of suffering", "source of pain"],
      face: ["berserked", "loose control"],
      eye: ["magic eyepatch", "magical eye"],
      earring: ["commanding force", "commander force"],
      belt: ["dreamy belt", "fantasy belt"],
      pocket: ["cursed red spellbook", "cursed red magic"],
      emblem: ["mitra's rage", "mithra's rage"],
      secondary: ["princess no", "princess nou", "pnou"],
      medal: ["chaos vellum crusher", "chaos-vellum-crusher"],
      heart: ["plasma heart"],
      badge: ["crystal ventus", "ventus-badge"],
    },
  },
  {
    id: "heroic-pitched",
    name: "Endgame (Pitched)",
    description:
      "Eternal + Arcane mix, Genesis weapon, pitched accessories, Astra secondary, Total Control.",
    armorMatchers: ["eternal", "acs"],
    weaponMatchers: ["genesis"],
    accessoryMatchers: [
      "hardBossAcc",
      "dawnBossAcc",
      "superiorGollux",
      "eventRing",
    ],
    typeMatchers: {
      hat: ["eternal"],
      top: ["eternal"],
      bottom: ["eternal"],
      shoulder: ["eternal"],
      cape: ["acs", "arcane umbra", "arcaneshade"],
      gloves: ["acs", "arcane umbra", "arcaneshade"],
      shoes: ["acs", "arcane umbra", "arcaneshade"],
      weapon: ["genesis"],
      ring: [
        "dawn-guardian-angel-ring",
        "dawn guardian",
        "superior-gollux-ring",
        "endless terror",
        "giant fear",
        "ring of restraint",
        "ring-of-restraint",
      ],
      pendant: ["daybreak", "source of suffering", "source of pain"],
      face: ["berserked", "loose control"],
      eye: ["magic eyepatch", "magical eye"],
      earring: ["commanding force", "commander force"],
      belt: ["dreamy belt", "fantasy belt"],
      pocket: ["cursed red spellbook", "cursed red magic"],
      emblem: ["mitra's rage", "mithra's rage"],
      secondary: ["astra", "princess no", "princess nou", "pnou"],
      medal: ["chaos vellum crusher", "chaos-vellum-crusher"],
      heart: ["total control", "complete under control"],
      badge: ["genesis badge", "badge in the beginning"],
    },
  },
  {
    id: "heroic-brilliant",
    name: "Endgame (Brilliant)",
    description:
      "Full Eternal, Destiny weapon (22★), radiant accessories, Oz rings, Immortal Legacy.",
    armorMatchers: ["eternal"],
    weaponMatchers: ["destiny"],
    accessoryMatchers: [
      "radiantBossAcc",
      "hardBossAcc",
      "dawnBossAcc",
      "eventRing",
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
        "entrancing nightmare",
        "whisper of the source",
        "endless terror",
        "giant fear",
        "ring of restraint",
        "ring-of-restraint",
      ],
      pendant: [
        "oath of death",
        "source of suffering",
        "source of pain",
      ],
      face: ["original sin of pride", "original sin", "berserked"],
      eye: ["magic eyepatch", "magical eye"],
      earring: ["commanding force", "commander force"],
      belt: ["dreamy belt", "fantasy belt"],
      pocket: ["cursed red spellbook", "cursed red magic"],
      emblem: ["mitra's rage", "mithra's rage"],
      secondary: ["astra", "princess no", "princess nou", "pnou"],
      medal: ["immortal legacy", "radiantBossAcc"],
      heart: ["total control", "complete under control"],
      badge: ["genesis badge", "badge in the beginning"],
    },
  },
];

/** @deprecated Prefer `heroic-brilliant` — kept as alias id lookup helper. */
export const LEGACY_STARTER_IDS: Record<string, string> = {
  "heroic-cra": "heroic-early",
  "heroic-absolab": "heroic-early-mid",
  "heroic-arcane": "heroic-mid",
  "heroic-eternal": "heroic-brilliant",
};

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
      // One hit per matcher keeps ring/pendant order intentional.
      break;
    }
    if (picked.length >= capacity) break;
  }
  // If a setType matcher (e.g. eventRing) needs multiple slots, fill remainder.
  if (picked.length < capacity) {
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
  }
  return picked;
}

function matchersForType(type: string, loadout: StarterLoadout): string[] {
  if (
    loadout.typeMatchers &&
    Object.prototype.hasOwnProperty.call(loadout.typeMatchers, type)
  ) {
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

export function resolveStarterLoadout(
  id: string,
): StarterLoadout | undefined {
  const mapped = LEGACY_STARTER_IDS[id] ?? id;
  return STARTER_LOADOUTS.find((l) => l.id === mapped);
}
