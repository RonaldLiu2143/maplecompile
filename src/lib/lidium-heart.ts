import type { Equip } from "./types";

const IMG = "https://media.maplestorywiki.net/yetidb/Eqp_Lidium_Heart.png";

/**
 * GMS Lidium Heart (Android Heart slot) — missing from the WhackyBeanz catalog.
 * Source: MapleStory Wiki (Lv.30, All Stats +3, Max HP +50, Rank 5).
 */
export function getLidiumHeart(): Equip {
  return {
    id: "lidium-heart",
    name: "Lidium Heart",
    jobType: "common",
    charType: [],
    setType: "none",
    equipType: "heart",
    level: 30,
    imgUrl: IMG,
    height: 30,
    width: 27,
    stats: {
      str: 3,
      dex: 3,
      int: 3,
      luk: 3,
      maxHp: 50,
      slots: 9,
    },
    tags: ["gms", "android-heart"],
  };
}
