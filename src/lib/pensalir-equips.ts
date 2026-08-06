import type { Equip, JobType } from "./types";

const IMG = "https://media.maplestorywiki.net/yetidb";

type PensalirPiece = {
  equipType: Equip["equipType"];
  /** Stable id suffix after `pensalir-{job}-` (armor) or `pensalir-weapon-`. */
  idSuffix: string;
  name: string;
  img: string;
  stats?: Equip["stats"];
  /** When set, only inject for these class ids. */
  charType?: string[];
};

/**
 * GMS Pensalir (8th job) armor — missing from the WhackyBeanz catalog.
 * Overalls are typed as `top` so they fit the equip window (no overall slot).
 */
const PENSALIR_PIECES: Record<JobType, PensalirPiece[]> = {
  warrior: [
    {
      equipType: "hat",
      idSuffix: "hat",
      name: "Pensalir Battle Helm",
      img: `${IMG}/Eqp_Pensalir_Battle_Helm.png`,
      stats: { str: 16, dex: 10, maxHp: 150, maxMp: 150 },
    },
    {
      equipType: "top",
      idSuffix: "overall",
      name: "Pensalir Battle Mail",
      img: `${IMG}/Eqp_Pensalir_Battle_Mail.png`,
      stats: { str: 20, dex: 20, att: 1 },
    },
    {
      equipType: "shoes",
      idSuffix: "shoes",
      name: "Pensalir Battle Boots",
      img: `${IMG}/Eqp_Pensalir_Boots.png`,
      stats: { str: 15, dex: 9, att: 1 },
    },
    {
      equipType: "gloves",
      idSuffix: "gloves",
      name: "Pensalir Battle Gloves",
      img: `${IMG}/Eqp_Pensalir_Gloves.png`,
      stats: { str: 11, dex: 10, maxHp: 200, att: 2 },
    },
    {
      equipType: "cape",
      idSuffix: "cape",
      name: "Pensalir Battle Cape",
      img: `${IMG}/Eqp_Pensalir_Cape.png`,
      stats: { str: 4, dex: 4, int: 4, luk: 4 },
    },
  ],
  magician: [
    {
      equipType: "hat",
      idSuffix: "hat",
      name: "Pensalir Mage Sallet",
      img: `${IMG}/Eqp_Pensalir_Mage_Sallet.png`,
      stats: { int: 16, luk: 15, maxHp: 150, maxMp: 150 },
    },
    {
      equipType: "top",
      idSuffix: "overall",
      name: "Pensalir Mage Robe",
      img: `${IMG}/Eqp_Pensalir_Mage_Robe.png`,
      stats: { int: 20, luk: 20, matt: 1, maxMp: 60 },
    },
    {
      equipType: "shoes",
      idSuffix: "shoes",
      name: "Pensalir Mage Boots",
      img: `${IMG}/Eqp_Pensalir_Boots.png`,
      stats: { int: 11, luk: 10, matt: 1 },
    },
    {
      equipType: "gloves",
      idSuffix: "gloves",
      name: "Pensalir Mage Gloves",
      img: `${IMG}/Eqp_Pensalir_Gloves.png`,
      stats: { int: 11, luk: 11, maxHp: 200, matt: 2 },
    },
    {
      equipType: "cape",
      idSuffix: "cape",
      name: "Pensalir Mage Cape",
      img: `${IMG}/Eqp_Pensalir_Cape.png`,
      stats: { str: 4, dex: 4, int: 4, luk: 4 },
    },
  ],
  archer: [
    {
      equipType: "hat",
      idSuffix: "hat",
      name: "Pensalir Sentinel Cap",
      img: `${IMG}/Eqp_Pensalir_Sentinel_Cap.png`,
      stats: { str: 15, dex: 16, maxHp: 150, maxMp: 150 },
    },
    {
      equipType: "top",
      idSuffix: "overall",
      name: "Pensalir Sentinel Suit",
      img: `${IMG}/Eqp_Pensalir_Sentinel_Suit.png`,
      stats: { str: 18, dex: 20, att: 1 },
    },
    {
      equipType: "shoes",
      idSuffix: "shoes",
      name: "Pensalir Sentinel Boots",
      img: `${IMG}/Eqp_Pensalir_Boots.png`,
      stats: { str: 9, dex: 10, att: 1 },
    },
    {
      equipType: "gloves",
      idSuffix: "gloves",
      name: "Pensalir Sentinel Gloves",
      img: `${IMG}/Eqp_Pensalir_Gloves.png`,
      stats: { str: 10, dex: 11, maxHp: 200, att: 2 },
    },
    {
      equipType: "cape",
      idSuffix: "cape",
      name: "Pensalir Sentinel Cape",
      img: `${IMG}/Eqp_Pensalir_Cape.png`,
      stats: { str: 4, dex: 4, int: 4, luk: 4 },
    },
  ],
  thief: [
    {
      equipType: "hat",
      idSuffix: "hat",
      name: "Pensalir Chaser Hat",
      img: `${IMG}/Eqp_Pensalir_Chaser_Hat.png`,
      stats: { dex: 15, luk: 15, maxHp: 150, maxMp: 150 },
    },
    {
      equipType: "top",
      idSuffix: "overall",
      name: "Pensalir Chaser Armor",
      img: `${IMG}/Eqp_Pensalir_Chaser_Armor.png`,
      stats: { dex: 18, luk: 20, att: 1 },
    },
    {
      equipType: "shoes",
      idSuffix: "shoes",
      name: "Pensalir Chaser Boots",
      img: `${IMG}/Eqp_Pensalir_Boots.png`,
      stats: { dex: 9, luk: 10, att: 1 },
    },
    {
      equipType: "gloves",
      idSuffix: "gloves",
      name: "Pensalir Chaser Gloves",
      img: `${IMG}/Eqp_Pensalir_Gloves.png`,
      stats: { dex: 11, luk: 11, maxHp: 200, att: 2 },
    },
    {
      equipType: "cape",
      idSuffix: "cape",
      name: "Pensalir Chaser Cape",
      img: `${IMG}/Eqp_Pensalir_Cape.png`,
      stats: { str: 4, dex: 4, int: 4, luk: 4 },
    },
  ],
  pirate: [
    {
      equipType: "hat",
      idSuffix: "hat",
      name: "Pensalir Skipper Hat",
      img: `${IMG}/Eqp_Pensalir_Skipper_Hat.png`,
      stats: { str: 15, dex: 15, maxHp: 150, maxMp: 150 },
    },
    {
      equipType: "top",
      idSuffix: "overall",
      name: "Pensalir Skipper Coat",
      img: `${IMG}/Eqp_Pensalir_Skipper_Coat.png`,
      stats: { str: 20, dex: 20, att: 1 },
    },
    {
      equipType: "shoes",
      idSuffix: "shoes",
      name: "Pensalir Skipper Boots",
      img: `${IMG}/Eqp_Pensalir_Boots.png`,
      stats: { str: 10, dex: 10, att: 1 },
    },
    {
      equipType: "gloves",
      idSuffix: "gloves",
      name: "Pensalir Skipper Gloves",
      img: `${IMG}/Eqp_Pensalir_Gloves.png`,
      stats: { str: 11, dex: 11, maxHp: 200, att: 2 },
    },
    {
      equipType: "cape",
      idSuffix: "cape",
      name: "Pensalir Skipper Cape",
      img: `${IMG}/Eqp_Pensalir_Cape.png`,
      stats: { str: 4, dex: 4, int: 4, luk: 4 },
    },
  ],
};

/**
 * Utgard weapons (Pensalir / 8th set weapons) — missing from WhackyBeanz.
 * Stats from MapleStory Wiki 8th job set pages.
 */
const PENSALIR_WEAPONS: Record<JobType, PensalirPiece[]> = {
  warrior: [
    {
      equipType: "weapon",
      idSuffix: "restraint",
      name: "Utgard Restraint",
      img: `${IMG}/Eqp_Utgard_Restraint.png`,
      charType: ["adele"],
      stats: { att: 122, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "hellslayer",
      name: "Utgard Hellslayer",
      img: `${IMG}/Eqp_Utgard_Hellslayer.png`,
      charType: ["aran"],
      stats: { att: 122, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "hrimthurs",
      name: "Utgard Hrimthurs",
      img: `${IMG}/Eqp_Utgard_Hrimthurs.png`,
      charType: ["blaster"],
      stats: { att: 90, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "spear",
      name: "Utgard Spear",
      img: `${IMG}/Eqp_Utgard_Spear.png`,
      charType: ["dk"],
      stats: { att: 124, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "desperado",
      name: "Utgard Desperado",
      img: `${IMG}/Eqp_Utgard_Desperado.png`,
      charType: ["da"],
      stats: { att: 122, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "1h-axe",
      name: "Utgard Axe",
      img: `${IMG}/Eqp_Utgard_Axe.png`,
      charType: ["ds", "hero"],
      stats: { att: 118, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "katana",
      name: "Utgard Katana",
      img: `${IMG}/Eqp_Utgard_Katana.png`,
      charType: ["hayato"],
      stats: { att: 118, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "saber",
      name: "Utgard Saber",
      img: `${IMG}/Eqp_Utgard_Saber.png`,
      charType: ["hero", "paladin", "sm", "mihile"],
      stats: { att: 118, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "hair",
      name: "Utgard Hair",
      img: `${IMG}/Eqp_Utgard_Hair.png`,
      charType: ["paladin"],
      stats: { att: 118, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "2h-sword",
      name: "Utgard Two-handed Sword",
      img: `${IMG}/Eqp_Utgard_Two-handed_Sword.png`,
      charType: ["hero", "paladin", "sm", "kaiser"],
      stats: { att: 122, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "2h-axe",
      name: "Utgard Two-handed Axe",
      img: `${IMG}/Eqp_Utgard_Two-handed_Axe.png`,
      charType: ["hero"],
      stats: { att: 124, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "2h-hammer",
      name: "Utgard Two-handed Hammer",
      img: `${IMG}/Eqp_Utgard_Two-handed_Hammer.png`,
      charType: ["paladin"],
      stats: { att: 124, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "giantslayer",
      name: "Utgard Giantslayer Sword",
      img: `${IMG}/Eqp_Utgard_Giantslayer_Sword.png`,
      charType: ["len"],
      stats: { att: 122, slots: 8 },
    },
  ],
  magician: [
    {
      equipType: "weapon",
      idSuffix: "staff",
      name: "Utgard Staff",
      img: `${IMG}/Eqp_Utgard_Staff.png`,
      charType: ["bam", "bs", "fp", "il", "fw", "evan"],
      stats: { att: 98, matt: 155, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "wand",
      name: "Utgard Wand",
      img: `${IMG}/Eqp_Utgard_Wand.png`,
      charType: ["bs", "fp", "il", "fw", "evan", "lara"],
      stats: { att: 93, matt: 153, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "shining-rod",
      name: "Utgard Shining Rod",
      img: `${IMG}/Eqp_Utgard_Shining_Rod.png`,
      charType: ["lumi"],
      stats: { att: 93, matt: 153, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "lucent-gauntlet",
      name: "Utgard Lucent Gauntlet",
      img: `${IMG}/Eqp_Utgard_Lucent_Gauntlet.png`,
      charType: ["illium"],
      stats: { att: 93, matt: 153, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "spirit-fan",
      name: "Utgard Spirit Walker Fan",
      img: `${IMG}/Eqp_Utgard_Spirit_Walker_Fan.png`,
      charType: ["kanna"],
      stats: { att: 93, matt: 115, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "psy-limiter",
      name: "Utgard Psy-limiter",
      img: `${IMG}/Eqp_Utgard_Psy-limiter.png`,
      charType: ["kinesis"],
      stats: { att: 93, matt: 153, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "memorial-staff",
      name: "Utgard Memorial Staff",
      img: `${IMG}/Eqp_Utgard_Memorial_Staff.png`,
      charType: ["lynn"],
      stats: { att: 93, matt: 153, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "celestial-light",
      name: "Utgard Celestial Light",
      img: `${IMG}/Eqp_Utgard_Celestial_Light.png`,
      charType: ["sia"],
      stats: { att: 93, matt: 153, slots: 8 },
    },
  ],
  archer: [
    {
      equipType: "weapon",
      idSuffix: "bow",
      name: "Utgard Bow",
      img: `${IMG}/Eqp_Utgard_Bow.png`,
      charType: ["bm", "wb"],
      stats: { att: 115, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "crossbow",
      name: "Utgard Crossbow",
      img: `${IMG}/Eqp_Utgard_Crossbow.png`,
      charType: ["xbm", "wh"],
      stats: { att: 118, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "whispershot",
      name: "Utgard Whispershot",
      img: `${IMG}/Eqp_Utgard_Whispershot.png`,
      charType: ["kain"],
      stats: { att: 115, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "dual-bowguns",
      name: "Utgard Dual Bowguns",
      img: `${IMG}/Eqp_Utgard_Dual_Bowguns.png`,
      charType: ["merc"],
      stats: { att: 115, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "ancient-bow",
      name: "Utgard Ancient Bow",
      img: `${IMG}/Eqp_Utgard_Ancient_Bow.png`,
      charType: ["pf"],
      stats: { att: 115, slots: 8 },
    },
  ],
  thief: [
    {
      equipType: "weapon",
      idSuffix: "chain",
      name: "Utgard Chain",
      img: `${IMG}/Eqp_Utgard_Chain.png`,
      charType: ["cadena"],
      stats: { att: 115, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "dagger",
      name: "Utgard Dagger",
      img: `${IMG}/Eqp_Utgard_Dagger.png`,
      charType: ["db", "sdw"],
      stats: { att: 115, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "ritual-fan",
      name: "Utgard Giant Ritual Fan",
      img: `${IMG}/Eqp_Utgard_Giant_Ritual_Fan.png`,
      charType: ["hy"],
      stats: { att: 115, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "cetus",
      name: "Utgard Cetus",
      img: `${IMG}/Eqp_Utgard_Cetus.png`,
      charType: ["khali"],
      stats: { att: 115, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "guards",
      name: "Utgard Guards",
      img: `${IMG}/Eqp_Utgard_Guards.png`,
      charType: ["nl", "nw"],
      stats: { luk: 10, att: 62, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "cane",
      name: "Utgard Cane",
      img: `${IMG}/Eqp_Utgard_Cane.png`,
      charType: ["phantom"],
      stats: { att: 118, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "energy-chain",
      name: "Utgard Energy Chain",
      img: `${IMG}/Eqp_Utgard_Energy_Chain.png`,
      charType: ["xenon"],
      stats: { att: 90, slots: 8 },
    },
  ],
  pirate: [
    {
      equipType: "weapon",
      idSuffix: "dragon-soul",
      name: "Utgard Dragon Soul",
      img: `${IMG}/Eqp_Utgard_Dragon_Soul.png`,
      charType: ["ab"],
      stats: { att: 92, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "energy-chain",
      name: "Utgard Energy Chain",
      img: `${IMG}/Eqp_Utgard_Energy_Chain.png`,
      charType: ["xenon"],
      stats: { att: 90, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "martial-brace",
      name: "Utgard Martial Brace",
      img: `${IMG}/Eqp_Utgard_Martial_Brace.png`,
      charType: ["mx"],
      stats: { att: 90, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "claw",
      name: "Utgard Claw",
      img: `${IMG}/Eqp_Utgard_Claw.png`,
      charType: ["ark", "eunwol", "striker", "viper"],
      stats: { att: 90, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "pistol",
      name: "Utgard Pistol",
      img: `${IMG}/Eqp_Utgard_Pistol.png`,
      charType: ["captain", "mech"],
      stats: { att: 90, slots: 8 },
    },
    {
      equipType: "weapon",
      idSuffix: "siege-gun",
      name: "Utgard Siege Gun",
      img: `${IMG}/Eqp_Utgard_Siege_Gun.png`,
      charType: ["cm"],
      stats: { att: 122, slots: 8 },
    },
  ],
};

function matchesChar(piece: PensalirPiece, charType?: string): boolean {
  if (!piece.charType?.length) return true;
  if (!charType) return true;
  return piece.charType.includes(charType);
}

function toEquip(jobType: JobType, piece: PensalirPiece): Equip {
  const isWeapon = piece.equipType === "weapon";
  return {
    id: isWeapon
      ? `pensalir-weapon-${piece.idSuffix}`
      : `pensalir-${jobType}-${piece.idSuffix}`,
    name: piece.name,
    jobType,
    charType: piece.charType ?? [],
    setType: "pensalir",
    equipType: piece.equipType,
    level: 140,
    imgUrl: piece.img,
    stats: piece.stats,
    tags: isWeapon ? ["pensalir", "utgard", "gms"] : ["pensalir", "gms"],
    isNormalFlame: true,
  };
}

/**
 * Pensalir armor for the job branch, plus Utgard weapons matching `charType`.
 */
export function getPensalirEquips(
  jobType: JobType,
  charType?: string,
): Equip[] {
  const armor = (PENSALIR_PIECES[jobType] ?? []).map((p) =>
    toEquip(jobType, p),
  );
  const weapons = (PENSALIR_WEAPONS[jobType] ?? [])
    .filter((p) => matchesChar(p, charType))
    .map((p) => toEquip(jobType, p));
  return [...armor, ...weapons];
}
