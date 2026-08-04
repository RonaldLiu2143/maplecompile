import type { Equip, JobType } from "./types";

const IMG = "https://media.maplestorywiki.net/yetidb";

type PensalirPiece = {
  equipType: Equip["equipType"];
  /** Stable id suffix after `pensalir-{job}-`. */
  idSuffix: string;
  name: string;
  img: string;
  stats?: Equip["stats"];
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

function toEquip(jobType: JobType, piece: PensalirPiece): Equip {
  return {
    id: `pensalir-${jobType}-${piece.idSuffix}`,
    name: piece.name,
    jobType,
    charType: [],
    setType: "pensalir",
    equipType: piece.equipType,
    level: 140,
    imgUrl: piece.img,
    stats: piece.stats,
    tags: ["pensalir", "gms"],
    isNormalFlame: true,
  };
}

/** Pensalir pieces for a job branch (shared across that job's classes). */
export function getPensalirEquips(jobType: JobType): Equip[] {
  return (PENSALIR_PIECES[jobType] ?? []).map((p) => toEquip(jobType, p));
}
