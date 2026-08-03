export const OZ_RINGS = [
  {
    id: "continuous",
    label: "Continuous Ring",
    icon: "/seedring/continuos.png",
    field: "ozContinuousLevel" as const,
    max: 15,
  },
  {
    id: "weaponJump",
    label: "Weapon Jump",
    icon: "/seedring/weapon.png",
    field: "ozWeaponJumpLevel" as const,
    max: 15,
  },
  {
    id: "riskTaker",
    label: "Risk Taker",
    icon: "/seedring/risktaker.png",
    field: "ozRiskTakerLevel" as const,
    max: 15,
  },
] as const;

export const OZ_CONTINUOUS_STATUS = [
  { id: "noUse" as const, label: "Continuous No Use" },
  { id: "use" as const, label: "Continuous Use" },
];

export const INNER_ABILITY_OPTIONS = [
  { id: "none" as const, label: "None" },
  { id: "passivePlus1" as const, label: "Passive Skills +1" },
  { id: "mobTargeted" as const, label: "+1 Mob Targeted" },
];
