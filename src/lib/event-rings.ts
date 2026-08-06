import type { Equip } from "./types";

const IMG = "https://media.maplestorywiki.net/yetidb";

/**
 * Oz / Seed / Special Skill Rings (GMS "event rings" category for setup).
 * Flat +4 all-stat / ATT/MATT base matches existing WhackyBeanz Oz ring rows.
 * No Star Force / flames / potential — see `isSpecialRing`.
 */
type EventRingDef = {
  id: string;
  name: string;
  img: string;
};

const EVENT_RING_DEFS: EventRingDef[] = [
  {
    id: "ring-of-restraint",
    name: "Ring of Restraint",
    img: `${IMG}/Eqp_Ring_of_Restraint.png`,
  },
  {
    id: "continuous-ring",
    name: "Continuous Ring",
    img: `${IMG}/Eqp_Continuous_Ring.png`,
  },
  {
    id: "weapon-jump-ring",
    name: "Weapon Jump Ring",
    img: `${IMG}/Eqp_Weapon_Jump_Ring.png`,
  },
  {
    id: "risk-taker-ring",
    name: "Risk Taker Ring",
    img: `${IMG}/Eqp_Risk_Taker_Ring.png`,
  },
  {
    id: "totalling-ring",
    name: "Totalling Ring",
    img: `${IMG}/Eqp_Totalling_Ring.png`,
  },
  {
    id: "critical-damage-ring",
    name: "Critical Damage Ring",
    img: `${IMG}/Eqp_Critical_Damage_Ring.png`,
  },
  {
    id: "level-jump-ring",
    name: "Level Jump Ring",
    img: `${IMG}/Eqp_Level_Jump_Ring.png`,
  },
  {
    id: "ultimatum-ring",
    name: "Ultimatum Ring",
    img: `${IMG}/Eqp_Ultimatum_Ring.png`,
  },
  {
    id: "durability-ring",
    name: "Durability Ring",
    img: `${IMG}/Eqp_Durability_Ring.png`,
  },
  {
    id: "overdrive-ring",
    name: "Overdrive Ring",
    img: `${IMG}/Eqp_Overdrive_Ring.png`,
  },
  {
    id: "clean-stance-ring",
    name: "Clean Stance Ring",
    img: `${IMG}/Eqp_Clean_Stance_Ring.png`,
  },
  {
    id: "health-cut-ring",
    name: "Health Cut Ring",
    img: `${IMG}/Eqp_Health_Cut_Ring.png`,
  },
  {
    id: "mana-cut-ring",
    name: "Mana Cut Ring",
    img: `${IMG}/Eqp_Mana_Cut_Ring.png`,
  },
  {
    id: "limit-ring",
    name: "Limit Ring",
    img: `${IMG}/Eqp_Limit_Ring.png`,
  },
  {
    id: "swift-ring",
    name: "Swift Ring",
    img: `${IMG}/Eqp_Swift_Ring.png`,
  },
  // Wiki filenames missing for these — reuse Restraint icon (same Oz ring frame).
  {
    id: "tower-enhance-ring",
    name: "Tower Enhance Ring",
    img: `${IMG}/Eqp_Ring_of_Restraint.png`,
  },
  {
    id: "snipe-ring",
    name: "Snipe Ring",
    img: `${IMG}/Eqp_Ring_of_Restraint.png`,
  },
  {
    id: "guard-ring",
    name: "Guard Ring",
    img: `${IMG}/Eqp_Ring_of_Restraint.png`,
  },
  {
    id: "heal-ring",
    name: "Heal Ring",
    img: `${IMG}/Eqp_Ring_of_Restraint.png`,
  },
  {
    id: "cleave-ring",
    name: "Cleave Ring",
    img: `${IMG}/Eqp_Ring_of_Restraint.png`,
  },
];

const OZ_STATS = {
  str: 4,
  dex: 4,
  int: 4,
  luk: 4,
  att: 4,
  matt: 4,
} as const;

function toEquip(def: EventRingDef): Equip {
  return {
    id: def.id,
    name: def.name,
    jobType: "common",
    charType: [],
    setType: "eventRing",
    equipType: "ring",
    level: 110,
    imgUrl: def.img,
    height: 28,
    width: 28,
    stats: { ...OZ_STATS },
    tags: ["event-ring", "oz", "gms"],
  };
}

/** All Oz / special skill rings for the Event Rings set. */
export function getEventRings(): Equip[] {
  return EVENT_RING_DEFS.map(toEquip);
}

/** True if this catalog ring should be filed under Event Rings. */
export function isEventRingEquip(equip: Equip): boolean {
  if (equip.equipType !== "ring") return false;
  if (equip.setType === "eventRing") return true;
  const id = equip.id ?? "";
  return EVENT_RING_DEFS.some((d) => d.id === id);
}
