import type { Equip } from "./types";

const IMG = "https://media.maplestorywiki.net/yetidb";

type FrozenPiece = {
  equipType: Equip["equipType"];
  idSuffix: string;
  name: string;
  img: string;
  level?: number;
  charType?: string[];
  stats?: Equip["stats"];
};

/**
 * GMS Frozen Set (Burning / Legendary Cryptic Chest).
 * Armor is job-agnostic; weapons are filtered by class id.
 * Overall (Frozen Suit) is typed as `top` to match the equip window.
 * Icons: Onyx Maple sprites (same art as Frozen in-game).
 */
const FROZEN_ARMOR: FrozenPiece[] = [
  {
    equipType: "hat",
    idSuffix: "hat",
    name: "Frozen Hat",
    img: `${IMG}/Eqp_Onyx_Maple_Hat.png`,
    stats: {
      str: 23,
      dex: 23,
      int: 23,
      luk: 23,
      maxHp: 270,
      maxMp: 270,
      att: 1,
      matt: 1,
    },
  },
  {
    equipType: "top",
    idSuffix: "suit",
    name: "Frozen Suit",
    img: `${IMG}/Eqp_Onyx_Maple_Suit.png`,
    stats: {
      str: 27,
      dex: 27,
      int: 27,
      luk: 27,
      att: 1,
      matt: 1,
    },
  },
  {
    equipType: "cape",
    idSuffix: "cape",
    name: "Frozen Cape",
    img: `${IMG}/Eqp_Onyx_Maple_Cape.png`,
    stats: {
      str: 7,
      dex: 7,
      int: 7,
      luk: 7,
      att: 7,
      matt: 7,
    },
  },
];

/** One representative Frozen weapon per class (wiki ATT values). */
const FROZEN_WEAPONS: FrozenPiece[] = [
  // Warriors
  {
    equipType: "weapon",
    idSuffix: "bladecaster",
    name: "Frozen Bladecaster",
    img: `${IMG}/Eqp_Onyx_Maple_Two-handed_Sword.png`,
    charType: ["adele"],
    stats: { att: 123, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "polearm",
    name: "Frozen Polearm",
    img: `${IMG}/Eqp_Onyx_Maple_Polearm.png`,
    charType: ["aran"],
    stats: { att: 110, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "arm-cannon",
    name: "Frozen Arm Cannon",
    img: `${IMG}/Eqp_Onyx_Maple_Cannon.png`,
    charType: ["blaster"],
    stats: { att: 92, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "spear",
    name: "Frozen Spear",
    img: `${IMG}/Eqp_Onyx_Maple_Spear.png`,
    charType: ["dk"],
    stats: { att: 123, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "desperado",
    name: "Frozen Devil Sword",
    img: `${IMG}/Eqp_Onyx_Maple_Two-handed_Sword.png`,
    charType: ["da"],
    stats: { att: 123, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "1h-axe",
    name: "Frozen Axe",
    img: `${IMG}/Eqp_Onyx_Maple_Axe.png`,
    charType: ["ds", "hero"],
    stats: { att: 118, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "katana",
    name: "Frozen Katana",
    img: `${IMG}/Eqp_Onyx_Maple_Katana.png`,
    charType: ["hayato"],
    stats: { att: 118, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "1h-sword",
    name: "Frozen Sword",
    img: `${IMG}/Eqp_Onyx_Maple_Two-handed_Sword.png`,
    charType: ["hero", "paladin", "sm", "mihile"],
    stats: { att: 118, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "2h-sword",
    name: "Frozen Two-handed Sword",
    img: `${IMG}/Eqp_Onyx_Maple_Two-handed_Sword.png`,
    charType: ["hero", "paladin", "sm", "kaiser"],
    stats: { att: 123, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "gram",
    name: "Frozen Gram",
    img: `${IMG}/Eqp_Onyx_Maple_Two-handed_Sword.png`,
    charType: ["len"],
    stats: { att: 123, slots: 8 },
  },
  // Magicians
  {
    equipType: "weapon",
    idSuffix: "staff",
    name: "Frozen Staff",
    img: `${IMG}/Eqp_Onyx_Maple_Staff.png`,
    charType: ["bam", "bs", "fp", "il", "fw", "evan"],
    stats: { att: 91, matt: 147, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "wand",
    name: "Frozen Wand",
    img: `${IMG}/Eqp_Onyx_Maple_Wand.png`,
    charType: ["bs", "fp", "il", "fw", "evan", "lara"],
    stats: { att: 86, matt: 145, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "shining-rod",
    name: "Frozen Shining Rod",
    img: `${IMG}/Eqp_Onyx_Maple_Shining_Rod.png`,
    charType: ["lumi"],
    stats: { att: 86, matt: 145, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "lucent-gauntlet",
    name: "Frozen Lucent Gauntlet",
    img: `${IMG}/Eqp_Onyx_Maple_Wand.png`,
    charType: ["illium"],
    stats: { att: 86, matt: 145, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "spirit-fan",
    name: "Frozen Spirit Walker Fan",
    img: `${IMG}/Eqp_Onyx_Maple_Wand.png`,
    charType: ["kanna"],
    stats: { att: 86, matt: 145, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "psy-limiter",
    name: "Frozen Psy-limiter",
    img: `${IMG}/Eqp_Onyx_Maple_Wand.png`,
    charType: ["kinesis"],
    stats: { att: 86, matt: 145, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "memorial-staff",
    name: "Frozen Memorial Staff",
    img: `${IMG}/Eqp_Onyx_Maple_Staff.png`,
    charType: ["lynn"],
    stats: { att: 86, matt: 145, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "celestial-light",
    name: "Frozen Celestial Light",
    img: `${IMG}/Eqp_Onyx_Maple_Shining_Rod.png`,
    charType: ["sia"],
    stats: { att: 91, matt: 145, slots: 8 },
  },
  // Archers
  {
    equipType: "weapon",
    idSuffix: "bow",
    name: "Frozen Longbow",
    img: `${IMG}/Eqp_Onyx_Maple_Longbow.png`,
    charType: ["bm", "wb"],
    stats: { att: 115, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "crossbow",
    name: "Frozen Crossbow",
    img: `${IMG}/Eqp_Onyx_Maple_Crossbow.png`,
    charType: ["xbm", "wh"],
    stats: { att: 118, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "whispershot",
    name: "Frozen Whispershot",
    img: `${IMG}/Eqp_Onyx_Maple_Crossbow.png`,
    charType: ["kain"],
    stats: { att: 115, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "dual-bowguns",
    name: "Frozen Twin Angels",
    img: `${IMG}/Eqp_Onyx_Maple_Longbow.png`,
    charType: ["merc"],
    stats: { att: 115, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "ancient-bow",
    name: "Frozen Ancient Bow",
    img: `${IMG}/Eqp_Onyx_Maple_Longbow.png`,
    charType: ["pf"],
    stats: { att: 115, slots: 8 },
  },
  // Thieves
  {
    equipType: "weapon",
    idSuffix: "chain",
    name: "Frozen Nova Chain",
    img: `${IMG}/Eqp_Onyx_Maple_Cane.png`,
    charType: ["cadena"],
    stats: { att: 115, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "dagger",
    name: "Frozen Cutter",
    img: `${IMG}/Eqp_Onyx_Maple_Claw.png`,
    charType: ["db", "sdw"],
    stats: { att: 115, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "ritual-fan",
    name: "Frozen Black Ritual Fan",
    img: `${IMG}/Eqp_Onyx_Maple_Cane.png`,
    charType: ["hy"],
    stats: { att: 115, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "chakram",
    name: "Frozen Kshama",
    img: `${IMG}/Eqp_Onyx_Maple_Claw.png`,
    charType: ["khali"],
    stats: { att: 115, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "claw",
    name: "Frozen Steer",
    img: `${IMG}/Eqp_Onyx_Maple_Claw.png`,
    charType: ["nl", "nw"],
    stats: { att: 62, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "cane",
    name: "Frozen Cane",
    img: `${IMG}/Eqp_Onyx_Maple_Cane.png`,
    charType: ["phantom"],
    stats: { att: 118, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "energy-chain",
    name: "Frozen Chain Sword",
    img: `${IMG}/Eqp_Onyx_Maple_Cane.png`,
    charType: ["xenon"],
    stats: { att: 92, slots: 8 },
  },
  // Pirates
  {
    equipType: "weapon",
    idSuffix: "soul-shooter",
    name: "Frozen Soul Shooter",
    img: `${IMG}/Eqp_Onyx_Maple_Cannon.png`,
    charType: ["ab"],
    stats: { att: 92, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "knuckle",
    name: "Frozen Grip",
    img: `${IMG}/Eqp_Onyx_Maple_Claw.png`,
    charType: ["ark", "eunwol", "striker", "viper"],
    stats: { att: 92, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "cannon",
    name: "Frozen Cannon",
    img: `${IMG}/Eqp_Onyx_Maple_Cannon.png`,
    charType: ["cm"],
    stats: { att: 126, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "gun",
    name: "Frozen Shooter",
    img: `${IMG}/Eqp_Onyx_Maple_Crossbow.png`,
    charType: ["captain", "mech"],
    stats: { att: 90, slots: 8 },
  },
  {
    equipType: "weapon",
    idSuffix: "martial-brace",
    name: "Frozen Martial Brace",
    img: `${IMG}/Eqp_Onyx_Maple_Claw.png`,
    charType: ["mx"],
    stats: { att: 92, slots: 8 },
  },
];

function toEquip(piece: FrozenPiece): Equip {
  return {
    id: `frozen-${piece.idSuffix}`,
    name: piece.name,
    jobType: "common",
    charType: piece.charType ?? [],
    setType: "frozen",
    equipType: piece.equipType,
    level: piece.level ?? 100,
    imgUrl: piece.img,
    stats: piece.stats,
    tags: ["frozen", "gms", "burning"],
    isNormalFlame: true,
  };
}

function matchesChar(piece: FrozenPiece, charType?: string): boolean {
  if (!piece.charType?.length) return true;
  if (!charType) return true;
  return piece.charType.includes(charType);
}

/** Frozen armor + class-matching weapons. */
export function getFrozenEquips(charType?: string): Equip[] {
  const armor = FROZEN_ARMOR.map(toEquip);
  const weapons = FROZEN_WEAPONS.filter((p) => matchesChar(p, charType)).map(
    toEquip,
  );
  return [...armor, ...weapons];
}
