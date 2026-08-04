import type { Equip } from "./types";

const IMG =
  "https://media.maplestorywiki.net/yetidb/Eqp_Chaos_Vellum_Crusher.png";

/**
 * GMS Root Abyss medal — missing from the WhackyBeanz catalog.
 * Normal medal rules: no Star Force / flames / potential.
 * Source: MapleStory Wiki (Boss Damage +5%).
 */
export function getChaosVellumMedal(): Equip {
  return {
    id: "chaos-vellum-crusher",
    name: "Chaos Vellum Crusher",
    jobType: "common",
    charType: [],
    setType: "none",
    equipType: "medal",
    level: 0,
    imgUrl: IMG,
    height: 32,
    width: 32,
    stats: {
      bossPercent: 5,
      slots: 0,
    },
    tags: ["gms", "root-abyss"],
  };
}
