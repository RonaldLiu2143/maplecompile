import { isFlammable } from "./flames";
import { isNoPotentialEventRing } from "./event-rings";
import { defaultStarForce, MAX_STAR_FORCE } from "./planner/starforce";
import type { Equip } from "./types";

/**
 * GMS seed / Oz / special rings that cannot take Star Force, flames, or
 * potential. Normal rings (GAR, Superior Gollux, Endless Terror, …) are
 * excluded by matching known special-ring names only.
 */
const SPECIAL_RING_NAME_PATTERNS: RegExp[] = [
  /\bring of restraint\b/i,
  /\brestraint ring\b/i,
  /\bcontinuous ring\b/i,
  /\bweapon jump\b/i,
  /\bring of sum\b/i,
  /\brisk[- ]?taker/i,
  /\bcritical damage ring\b/i,
  /\bcri(?:tical)?(?:\s*dmg|\s*damage)? ring\b/i,
  /\blevel jump ring\b/i,
  /\bultimatum ring\b/i,
  /\bdurable ring\b/i,
  /\bdurability ring\b/i,
  /\boverdrive ring\b/i,
  /\bclean stance\b/i,
  /\bhealth cut\b/i,
  /\bmana cut\b/i,
  /\btower enhance\b/i,
  /\bsnipe ring\b/i,
  /\bswift ring\b/i,
  /\bguard ring\b/i,
  /\bheal ring\b/i,
  /\bcleave ring\b/i,
  /\blimit ring\b/i,
];

export type EquipCapabilities = {
  starForce: boolean;
  flames: boolean;
  potential: boolean;
};

/**
 * Princess No (GMS) / Princess Nou (WhackyBeanz) class secondaries.
 * Matches renamed GMS titles (e.g. Princess No's Immortal Bladebinder) and
 * catalog ids (`pnou-*`, including Len's Immortal Dragon Crystal).
 */
const PRINCESS_NO_SECONDARY_NAME_RE = /\bprincess\s+no[u]?'?s\b/i;

/** True for Oz / seed / special rings that block SF, flames, and potential. */
export function isSpecialRing(equip: Equip): boolean {
  if (equip.equipType !== "ring") return false;
  const name = equip.name ?? "";
  const id = (equip.id ?? "").replace(/[-_]+/g, " ");
  return SPECIAL_RING_NAME_PATTERNS.some(
    (re) => re.test(name) || re.test(id),
  );
}

/**
 * Princess No secondaries cannot take Star Force (GMS Immortal / class
 * secondaries; catalog often still spells the prefix "Princess Nou's").
 */
export function isPrincessNoSecondary(equip: Equip): boolean {
  if (equip.equipType !== "secondary") return false;
  const name = equip.name ?? "";
  const id = equip.id ?? "";
  const idNorm = id.replace(/[-_]+/g, " ");
  return (
    PRINCESS_NO_SECONDARY_NAME_RE.test(name) ||
    PRINCESS_NO_SECONDARY_NAME_RE.test(idNorm) ||
    /^pnou(?:[-_]|$)/i.test(id)
  );
}

export function canStarForce(equip: Equip): boolean {
  const type = equip.equipType;
  if (
    type === "pocket" ||
    type === "emblem" ||
    type === "android" ||
    type === "medal" ||
    type === "badge"
  ) {
    return false;
  }
  if (isSpecialRing(equip)) return false;
  // GMS Oz + event gear rings (Awake, Eternal Flame, …) cannot take Star Force.
  if (equip.setType === "eventRing") return false;
  if (isPrincessNoSecondary(equip)) return false;
  return true;
}

/**
 * GMS max Star Force by equip level (MapleStory Wiki — Star Force Enhancement).
 * Bands: 0–94 → 5, 95–107 → 8, 108–117 → 10, 118–127 → 15,
 * 128–137 → 20, 138+ → 30.
 */
export function starForceCapByLevel(level: number): number {
  const lv = Math.max(0, Math.floor(level));
  if (lv <= 94) return 5;
  if (lv <= 107) return 8;
  if (lv <= 117) return 10;
  if (lv <= 127) return 15;
  if (lv <= 137) return 20;
  return MAX_STAR_FORCE;
}

/**
 * Named-item / Superior exceptions (wiki). Returns null to fall through to
 * level bands. Superior Gollux accessories are NOT Superior SF gear — they
 * use normal level caps.
 */
function specialStarForceCap(equip: Equip): number | null {
  const name = equip.name ?? "";

  // Superior equipment tables
  if (/\btyrant\b/i.test(name)) return 15;
  if (/\belite\s+heliseum\b/i.test(name)) return 3;
  if (/^nova\s/i.test(name.trim())) return 8;

  // Sweetwater shoes / gloves / cape only (other SW pieces use level caps)
  if (/sweetwater\s+(shoes|boots|gloves|cape|cloak)\b/i.test(name)) return 15;

  // Secondary / badge exceptions (badge slot is already non-SF here)
  if (/ghost\s*ship\s*exorcist/i.test(name)) return 22;

  // Genesis / Destiny weapons lock at 22★ (non-weapon Genesis items e.g.
  // Genesis Badge are excluded via equipType — badge already cannot SF).
  if (isGenesisOrDestinyWeapon(equip)) {
    return 22;
  }

  return null;
}

/** Genesis / Destiny primary weapons (liberation weapons; SF-capped at 22★). */
export function isGenesisOrDestinyWeapon(equip: Equip): boolean {
  return (
    equip.equipType === "weapon" &&
    /^(Genesis|Destiny)\s/i.test((equip.name ?? "").trim())
  );
}

/**
 * Default Star Force when a piece has none set.
 * Genesis / Destiny weapons default to 22★ (their hard cap); Destiny is not
 * starable in-game yet but we still default to 22★ for planning.
 */
export function defaultStarForceForEquip(equip: Equip): number {
  if (isGenesisOrDestinyWeapon(equip)) return 22;
  return defaultStarForce(equip.level);
}

/**
 * Per-item Star Force cap. Returns 0 when the item cannot take Star Force.
 * Source: MapleStory Wiki Star Force Enhancement (GMS-aligned level bands +
 * Superior / Sweetwater / Ghost Ship / Genesis·Destiny weapon exceptions).
 */
export function getStarForceCap(equip: Equip): number {
  if (!canStarForce(equip)) return 0;
  const special = specialStarForceCap(equip);
  const cap = special ?? starForceCapByLevel(equip.level);
  return Math.max(0, Math.min(MAX_STAR_FORCE, cap));
}

/** Clamp a star value to the item's SF cap (0 if non-SF). */
export function clampStarForce(equip: Equip, stars: number): number {
  const cap = getStarForceCap(equip);
  if (cap <= 0) return 0;
  const n = Number.isFinite(stars) ? Math.floor(stars) : 0;
  return Math.max(0, Math.min(cap, n));
}

/**
 * Flame eligibility. Delegates to `isFlammable` (includes Immortal Legacy
 * medal, Scarlet shoulder, pocket yes, rings/emblem/badge/android no).
 */
export function canFlame(equip: Equip): boolean {
  if (isSpecialRing(equip)) return false;
  return isFlammable(equip);
}

export function canPotential(equip: Equip): boolean {
  const type = equip.equipType;
  if (
    type === "pocket" ||
    type === "android" ||
    type === "medal" ||
    type === "badge"
  ) {
    return false;
  }
  if (isSpecialRing(equip)) return false;
  if (isNoPotentialEventRing(equip)) return false;
  return true;
}

export function equipCapabilities(equip: Equip): EquipCapabilities {
  return {
    starForce: canStarForce(equip),
    flames: canFlame(equip),
    potential: canPotential(equip),
  };
}
