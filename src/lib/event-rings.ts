import type { Equip } from "./types";

const WIKI_IMG = "https://media.maplestorywiki.net/yetidb";
const IO_ICON = (id: number) =>
  `https://maplestory.io/api/gms/255/item/${id}/icon`;

/**
 * Oz / Seed / Special Skill Rings + GMS event gear rings (Awake, Eternal Flame,
 * etc.) for the Equipment Setup "Event Rings" set bucket.
 *
 * Oz rings: flat +4 all-stat / ATT/MATT — no Star Force / flames / potential
 * (`isSpecialRing`). Event gear rings: real GMS item ids + wiki/CDN icons;
 * potential allowed except `noPotential`; SF blocked via `eventRing` setType.
 */
type EventRingDef = {
  id: string;
  name: string;
  img: string;
  /** GMS item id when known (for reference / CDN fallbacks). */
  itemId?: number;
  level?: number;
  stats?: Partial<Equip["stats"]>;
  /** Wiki: cannot gain potential (Deep Dark / Abyss Hunter). */
  noPotential?: boolean;
  /** Oz / special skill ring (SF + flames + potential blocked). */
  oz?: boolean;
};

const OZ_STATS = {
  str: 4,
  dex: 4,
  int: 4,
  luk: 4,
  att: 4,
  matt: 4,
} as const;

const TIER1_EVENT_STATS = {
  str: 40,
  dex: 40,
  int: 40,
  luk: 40,
  maxHp: 4000,
  maxMp: 4000,
  att: 25,
  matt: 25,
} as const;

const EVENT_RING_DEFS: EventRingDef[] = [
  // —— Oz / Seed special skill rings ——
  {
    id: "ring-of-restraint",
    name: "Ring of Restraint",
    img: `${WIKI_IMG}/Eqp_Ring_of_Restraint.png`,
    oz: true,
  },
  {
    id: "continuous-ring",
    name: "Continuous Ring",
    img: `${WIKI_IMG}/Eqp_Continuous_Ring.png`,
    oz: true,
  },
  {
    id: "weapon-jump-ring",
    name: "Weapon Jump Ring",
    img: `${WIKI_IMG}/Eqp_Weapon_Jump_Ring.png`,
    oz: true,
  },
  {
    id: "risk-taker-ring",
    name: "Risk Taker Ring",
    img: `${WIKI_IMG}/Eqp_Risk_Taker_Ring.png`,
    oz: true,
  },
  {
    id: "totalling-ring",
    name: "Totalling Ring",
    img: `${WIKI_IMG}/Eqp_Totalling_Ring.png`,
    oz: true,
  },
  {
    id: "critical-damage-ring",
    name: "Critical Damage Ring",
    img: `${WIKI_IMG}/Eqp_Critical_Damage_Ring.png`,
    oz: true,
  },
  {
    id: "level-jump-ring",
    name: "Level Jump Ring",
    img: `${WIKI_IMG}/Eqp_Level_Jump_Ring.png`,
    oz: true,
  },
  {
    id: "ultimatum-ring",
    name: "Ultimatum Ring",
    img: `${WIKI_IMG}/Eqp_Ultimatum_Ring.png`,
    oz: true,
  },
  {
    id: "durability-ring",
    name: "Durability Ring",
    img: `${WIKI_IMG}/Eqp_Durability_Ring.png`,
    oz: true,
  },
  {
    id: "overdrive-ring",
    name: "Overdrive Ring",
    img: `${WIKI_IMG}/Eqp_Overdrive_Ring.png`,
    oz: true,
  },
  {
    id: "clean-stance-ring",
    name: "Clean Stance Ring",
    img: `${WIKI_IMG}/Eqp_Clean_Stance_Ring.png`,
    oz: true,
  },
  {
    id: "health-cut-ring",
    name: "Health Cut Ring",
    img: `${WIKI_IMG}/Eqp_Health_Cut_Ring.png`,
    oz: true,
  },
  {
    id: "mana-cut-ring",
    name: "Mana Cut Ring",
    img: `${WIKI_IMG}/Eqp_Mana_Cut_Ring.png`,
    oz: true,
  },
  {
    id: "limit-ring",
    name: "Limit Ring",
    img: `${WIKI_IMG}/Eqp_Limit_Ring.png`,
    oz: true,
  },
  {
    id: "swift-ring",
    name: "Swift Ring",
    img: `${WIKI_IMG}/Eqp_Swift_Ring.png`,
    oz: true,
  },
  // Wiki filenames missing — reuse Restraint icon (same Oz ring frame).
  {
    id: "tower-enhance-ring",
    name: "Tower Enhance Ring",
    img: `${WIKI_IMG}/Eqp_Ring_of_Restraint.png`,
    oz: true,
  },
  {
    id: "snipe-ring",
    name: "Snipe Ring",
    img: `${WIKI_IMG}/Eqp_Ring_of_Restraint.png`,
    oz: true,
  },
  {
    id: "guard-ring",
    name: "Guard Ring",
    img: `${WIKI_IMG}/Eqp_Ring_of_Restraint.png`,
    oz: true,
  },
  {
    id: "heal-ring",
    name: "Heal Ring",
    img: `${WIKI_IMG}/Eqp_Ring_of_Restraint.png`,
    oz: true,
  },
  {
    id: "cleave-ring",
    name: "Cleave Ring",
    img: `${WIKI_IMG}/Eqp_Ring_of_Restraint.png`,
    oz: true,
  },

  // —— GMS event gear rings (real item ids via maplestory.io GMS 255) ——
  {
    id: "heroic-awake-ring-lv4",
    name: "Heroic Awake Ring (Lv. 4)",
    itemId: 1114322,
    img: IO_ICON(1114322),
    level: 120,
    stats: { ...TIER1_EVENT_STATS },
  },
  {
    id: "eternal-flame-ring",
    name: "Eternal Flame Ring",
    itemId: 1114324,
    img: `${WIKI_IMG}/Eqp_Eternal_Flame_Ring.png`,
    level: 120,
    stats: { ...TIER1_EVENT_STATS },
  },
  {
    id: "heroic-tenebris-expedition-ring-complete",
    name: "Heroic Tenebris Expedition Ring (Complete)",
    itemId: 1114311,
    img: IO_ICON(1114311),
    level: 120,
    stats: { ...TIER1_EVENT_STATS },
  },
  {
    id: "glory-guard-ring-justicar",
    name: "Glory Guard Ring: Justicar",
    itemId: 1114316,
    img: `${WIKI_IMG}/Eqp_Glory_Guard_Ring_Justicar.png`,
    level: 120,
    stats: { ...TIER1_EVENT_STATS },
  },
  {
    id: "heroic-cosmos-ring",
    name: "Heroic Cosmos Ring",
    itemId: 1114323,
    img: IO_ICON(1114323),
    level: 120,
    stats: {
      str: 20,
      dex: 20,
      int: 20,
      luk: 20,
      maxHp: 2000,
      maxMp: 2000,
      att: 20,
      matt: 20,
    },
  },
  {
    id: "awake-ring",
    name: "Awake Ring",
    itemId: 1114318,
    img: `${WIKI_IMG}/Eqp_Awake_Ring.png`,
    level: 120,
    stats: {
      str: 10,
      dex: 10,
      int: 10,
      luk: 10,
      maxHp: 1000,
      maxMp: 1000,
      att: 10,
      matt: 10,
    },
  },
  {
    id: "adventure-deep-dark-critical-ring",
    name: "Adventure Deep Dark Critical Ring",
    itemId: 1114312,
    img: `${WIKI_IMG}/Eqp_Adventure_Deep_Dark_Critical_Ring.png`,
    level: 130,
    stats: {
      str: 20,
      dex: 20,
      int: 20,
      luk: 20,
      maxHp: 1000,
      maxMp: 1000,
      att: 20,
      matt: 20,
    },
    noPotential: true,
  },
  {
    id: "abyss-hunter-ring",
    name: "Abyss Hunter Ring",
    itemId: 1114327,
    img: `${WIKI_IMG}/Eqp_Abyss_Hunter_Ring.png`,
    level: 130,
    stats: {
      str: 20,
      dex: 20,
      int: 20,
      luk: 20,
      maxHp: 1000,
      maxMp: 1000,
      att: 20,
      matt: 20,
    },
    noPotential: true,
  },
];

function toEquip(def: EventRingDef): Equip {
  const tags = ["event-ring", "gms"];
  if (def.oz) tags.push("oz");
  if (def.noPotential) tags.push("no-potential");
  if (def.itemId != null) tags.push(`item-${def.itemId}`);
  return {
    id: def.id,
    name: def.name,
    jobType: "common",
    charType: [],
    setType: "eventRing",
    equipType: "ring",
    level: def.level ?? 110,
    imgUrl: def.img,
    height: 28,
    width: 28,
    stats: { ...(def.stats ?? OZ_STATS) },
    tags,
  };
}

/** All Oz / special skill / event gear rings for the Event Rings set. */
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

/** Event gear rings that cannot gain potential (wiki). */
export function isNoPotentialEventRing(equip: Equip): boolean {
  if (equip.equipType !== "ring") return false;
  const id = equip.id ?? "";
  const def = EVENT_RING_DEFS.find((d) => d.id === id);
  if (def?.noPotential) return true;
  return (equip.tags ?? []).includes("no-potential");
}
