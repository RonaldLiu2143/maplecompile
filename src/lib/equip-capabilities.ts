import { isFlammable } from "./flames";
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

/** True for Oz / seed / special rings that block SF, flames, and potential. */
export function isSpecialRing(equip: Equip): boolean {
  if (equip.equipType !== "ring") return false;
  const name = equip.name ?? "";
  const id = (equip.id ?? "").replace(/[-_]+/g, " ");
  return SPECIAL_RING_NAME_PATTERNS.some(
    (re) => re.test(name) || re.test(id),
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
  return true;
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
  return true;
}

export function equipCapabilities(equip: Equip): EquipCapabilities {
  return {
    starForce: canStarForce(equip),
    flames: canFlame(equip),
    potential: canPotential(equip),
  };
}
