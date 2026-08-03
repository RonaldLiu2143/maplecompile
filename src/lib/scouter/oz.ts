/** MapleScouter GMS Oz / Seed rings (icons on maplescouter.com). */

export type OzRingField =
  | "ozContinuousLevel"
  | "ozRestraintLevel"
  | "ozWeaponJumpLevel"
  | "ozRingOfSumLevel";

export type OzRingDef = {
  id: string;
  label: string;
  icon: string;
  field: OzRingField;
  /** MapleScouter validates levels ≤ 6 */
  max: number;
};

export const OZ_RING_MAX = 6;

/**
 * Full GMS Oz ring set used by MapleScouter.
 * Visibility depends on Continuous Use Status (same as their UI).
 */
export const OZ_RINGS: OzRingDef[] = [
  {
    id: "restraint",
    label: "Restraint Ring",
    icon: "/seedring/restraint.png",
    field: "ozRestraintLevel",
    max: OZ_RING_MAX,
  },
  {
    id: "weaponJump",
    label: "Weapon Jump Ring",
    icon: "/seedring/weapon.png",
    field: "ozWeaponJumpLevel",
    max: OZ_RING_MAX,
  },
  {
    id: "ringOfSum",
    label: "Ring of Sum",
    icon: "/seedring/ringofsum.png",
    field: "ozRingOfSumLevel",
    max: OZ_RING_MAX,
  },
  {
    id: "continuous",
    label: "Continuous Ring",
    icon: "/seedring/continuos.png",
    field: "ozContinuousLevel",
    max: OZ_RING_MAX,
  },
];

/**
 * MapleScouter GMS visibility:
 * - Continuous No Use → Restraint + Weapon Jump + Ring of Sum
 * - Continuous Use → Continuous + Ring of Sum
 */
export function getVisibleOzRings(
  status: "noUse" | "use",
): OzRingDef[] {
  if (status === "use") {
    return OZ_RINGS.filter(
      (r) => r.id === "continuous" || r.id === "ringOfSum",
    );
  }
  return OZ_RINGS.filter(
    (r) =>
      r.id === "restraint" ||
      r.id === "weaponJump" ||
      r.id === "ringOfSum",
  );
}

export const OZ_CONTINUOUS_STATUS = [
  { id: "noUse" as const, label: "Continuous No Use" },
  { id: "use" as const, label: "Continuous Use" },
];

export const INNER_ABILITY_OPTIONS = [
  { id: "none" as const, label: "None" },
  { id: "passivePlus1" as const, label: "Passive Skills +1" },
  { id: "mobTargeted" as const, label: "+1 Mob Targeted" },
];
