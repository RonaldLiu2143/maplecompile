/** MapleScouter GMS Oz / Seed rings (icons on maplescouter.com). */

export type OzRingField =
  | "ozContinuousLevel"
  | "ozRestraintLevel"
  | "ozWeaponJumpLevel"
  | "ozRingOfSumLevel";

export type OzContinuousStatus = "noUse" | "use";

export type OzRingDef = {
  id: string;
  label: string;
  icon: string;
  field: OzRingField;
  /** Which Continuous Use Status values show this ring */
  visibleIn: readonly OzContinuousStatus[];
};

export const OZ_RING_MAX = 6;

export const OZ_RINGS: OzRingDef[] = [
  {
    id: "restraint",
    label: "Restraint Ring",
    icon: "/seedring/restraint.png",
    field: "ozRestraintLevel",
    visibleIn: ["noUse"],
  },
  {
    id: "weaponJump",
    label: "Weapon Jump Ring",
    icon: "/seedring/weapon.png",
    field: "ozWeaponJumpLevel",
    visibleIn: ["noUse"],
  },
  {
    id: "ringOfSum",
    label: "Ring of Sum",
    icon: "/seedring/ringofsum.png",
    field: "ozRingOfSumLevel",
    visibleIn: ["noUse", "use"],
  },
  {
    id: "continuous",
    label: "Continuous Ring",
    icon: "/seedring/continuos.png",
    field: "ozContinuousLevel",
    visibleIn: ["use"],
  },
];

export function getVisibleOzRings(status: OzContinuousStatus): OzRingDef[] {
  return OZ_RINGS.filter((r) => r.visibleIn.includes(status));
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
