/**
 * Equip tooltip stat breakdown: base (catalog) + Star Force + flames.
 *
 * Star Force class-stat / ATT / Max HP gains follow MapleStory Wiki
 * Star Force Enhancement/Stat Tables (armor & accessories). DEF uses a
 * compounded +5%/star approximation (wiki omits exact DEF totals).
 * Weapon early-star ATT uses ⌊base×0.02⌋+1 per star (wiki); late-star
 * ATT uses the published armor-band ATT table as a documented approx for
 * ranking-adjacent display (weapon-specific late ATT can differ by 1–2).
 */

import { getPrimarySecondary } from "@/lib/flames";
import { SET_DISPLAY_NAMES } from "@/lib/set-effects";
import type { Equip, FlameLine, JobType } from "@/lib/types";

export type StatPart = {
  /** Catalog / scrolled base on the item. */
  base: number;
  /** Gains from current Star Force. */
  starForce: number;
  /** Gains from saved flame lines. */
  flame: number;
};

export type TooltipStatLine = StatPart & {
  id: string;
  label: string;
  total: number;
  /** Percent stats (All Stats %, Boss %, etc.). */
  percent?: boolean;
};

export type EquipTooltipModel = {
  name: string;
  imgUrl: string;
  level: number;
  stars: number;
  jobLabel: string;
  equipTypeLabel: string;
  setName: string | null;
  lines: TooltipStatLine[];
};

const JOB_LABELS: Record<string, string> = {
  warrior: "Warrior",
  magician: "Magician",
  archer: "Archer",
  thief: "Thief",
  pirate: "Pirate",
};

const EQUIP_TYPE_LABELS: Record<string, string> = {
  hat: "Hat",
  top: "Top",
  bottom: "Bottom",
  overall: "Overall",
  gloves: "Gloves",
  shoes: "Shoes",
  cape: "Cape",
  shoulder: "Shoulder",
  belt: "Belt",
  ring: "Ring",
  pendant: "Pendant",
  earring: "Earrings",
  face: "Face Acc.",
  eye: "Eye Acc.",
  weapon: "Weapon",
  secondary: "Secondary",
  emblem: "Emblem",
  badge: "Badge",
  medal: "Medal",
  pocket: "Pocket",
  heart: "Heart",
  android: "Android",
};

const STAT_ORDER = [
  "str",
  "dex",
  "int",
  "luk",
  "allStatsPercent",
  "maxHp",
  "maxMp",
  "att",
  "matt",
  "def",
  "bossPercent",
  "damagePercent",
  "iedPercent",
  "speed",
  "jump",
] as const;

const STAT_LABELS: Record<string, string> = {
  str: "STR",
  dex: "DEX",
  int: "INT",
  luk: "LUK",
  allStatsPercent: "All Stats",
  maxHp: "Max HP",
  maxMp: "Max MP",
  att: "Attack Power",
  matt: "Magic ATT",
  def: "Defense",
  bossPercent: "Boss Damage",
  damagePercent: "Damage",
  iedPercent: "Enemy DEF Ignored",
  speed: "Speed",
  jump: "Jump",
};

const PERCENT_IDS = new Set([
  "allStatsPercent",
  "bossPercent",
  "damagePercent",
  "iedPercent",
]);

/** Level bands used by wiki SF tables. */
export type SfLevelBand = 130 | 140 | 150 | 160 | 200 | 250;

export function sfLevelBand(level: number): SfLevelBand {
  if (level >= 250) return 250;
  if (level >= 200) return 200;
  if (level >= 160) return 160;
  if (level >= 150) return 150;
  if (level >= 138) return 140;
  return 130;
}

/**
 * Cumulative class-stat gain for armor/accessories at `stars` (0–30).
 * Source: maplestorywiki.net Star Force Enhancement/Stat Tables.
 */
const ARMOR_CLASS_CUM: Record<SfLevelBand, number[]> = (() => {
  const low = (extra16: number): number[] => {
    // 0★…15★ shared: 0,2,4,6,8,10,13,16,19,22,25,28,31,34,37,40
    const base = [0, 2, 4, 6, 8, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 40];
    const out = [...base];
    let v = 40;
    // 16★–22★: +extra16 each; 23★+ flat
    for (let s = 16; s <= 30; s++) {
      if (s <= 22) v += extra16;
      out.push(v);
    }
    return out;
  };
  return {
    130: low(7),
    140: low(9),
    150: low(11),
    160: low(13),
    200: low(15),
    250: low(17),
  };
})();

/**
 * Cumulative ATT/MATT from SF on armor/accessories (starts at 16★).
 * Gloves also get +1 ATT/MATT on odd stars 5–15 (cum +7) — applied separately.
 */
const ARMOR_ATT_CUM: Record<SfLevelBand, number[]> = {
  // index = stars; values from wiki cumulative table
  130: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 15, 24, 34, 45, 45, 45,
    62, 81, 102, 124, 147, 171, 196, 222,
  ],
  140: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 17, 27, 38, 50, 63, 78,
    95, 114, 135, 157, 180, 204, 229, 255,
  ],
  150: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 19, 30, 42, 55, 69, 85,
    103, 123, 145, 168, 192, 217, 243, 270,
  ],
  160: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 21, 33, 46, 60, 75, 92,
    111, 132, 155, 179, 204, 230, 257, 285,
  ],
  200: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 25, 39, 54, 70, 87, 106,
    127, 150, 175, 201, 228, 256, 285, 315,
  ],
  250: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 29, 45, 62, 80, 99, 120,
    143, 168, 195, 223, 252, 282, 313, 345,
  ],
};

/** Max HP from SF on armor (not gloves/shoes/face/eye). Caps at 255 from 15★. */
const ARMOR_HP_CUM = [
  0, 5, 10, 15, 25, 35, 50, 65, 85, 105, 130, 155, 180, 205, 230, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
];

/** Gloves: +1 ATT/MATT on stars 5,7,9,11,13,14,15 → cum by star. */
const GLOVE_ATT_CUM = [
  0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
  7, 7, 7, 7, 7,
];

const NO_SF_HP = new Set(["gloves", "shoes", "face", "eye"]);

function clampStars(n: number): number {
  return Math.max(0, Math.min(30, Math.floor(n)));
}

function atCum(table: number[], stars: number): number {
  return table[clampStars(stars)] ?? 0;
}

/** Stats that receive "class stat" SF bumps for this equip's job. */
export function classStatKeys(equip: Equip): Array<"str" | "dex" | "int" | "luk"> {
  if (equip.equipType === "badge") {
    return ["str", "dex", "int", "luk"];
  }
  const job = (equip.jobType || "warrior") as JobType | string;
  // Use a neutral char so dual-blade / xenon item job still maps sensibly.
  const char =
    job === "thief" ? "nl" : job === "pirate" ? "bucc" : job === "warrior" ? "hero" : "default";
  const { pri, sec } = getPrimarySecondary(job, char);
  const keys = new Set<"str" | "dex" | "int" | "luk">();
  for (const s of [...pri, ...sec]) {
    if (s === "str" || s === "dex" || s === "int" || s === "luk") keys.add(s);
  }
  // Fallback: any flat main stats present on the item
  if (keys.size === 0) {
    for (const k of ["str", "dex", "int", "luk"] as const) {
      if ((equip.stats?.[k] ?? 0) > 0) keys.add(k);
    }
  }
  return [...keys];
}

/**
 * Approximate DEF after `stars` of +5% compounding.
 * Wiki notes DEF bonuses are omitted from published tables; this mirrors
 * common community calculators (floor after each star). Overalls get an
 * extra +5%/star (wiki "Overalls' DEF +5%").
 */
export function approxDefenseAfterStars(
  baseDef: number,
  stars: number,
  isOverall: boolean,
): number {
  let d = Math.max(0, baseDef);
  const n = clampStars(stars);
  for (let i = 0; i < n; i++) {
    d = Math.floor(d * 1.05);
    if (isOverall) d = Math.floor(d * 1.05);
  }
  return d;
}

/**
 * Early weapon ATT/MATT SF (1★–15★): each success adds ⌊current×0.02⌋+1
 * starting from catalog base. Approximation — can be ±1 vs client.
 */
function weaponEarlyAttGain(baseAtt: number, stars: number): number {
  if (baseAtt <= 0) return 0;
  let cur = baseAtt;
  const n = Math.min(15, clampStars(stars));
  for (let i = 0; i < n; i++) {
    cur += Math.floor(cur * 0.02) + 1;
  }
  return cur - baseAtt;
}

export type StarForceGains = {
  classStat: number;
  att: number;
  matt: number;
  maxHp: number;
  defBonus: number;
};

export function computeStarForceGains(
  equip: Equip,
  stars: number,
): StarForceGains {
  const s = clampStars(stars);
  const band = sfLevelBand(equip.level);
  const isWeapon = equip.equipType === "weapon";
  const isOverall =
    equip.equipType === "overall" ||
    (equip.equipType === "top" && /overall|mail|robe|suit/i.test(equip.name));

  const classStat = atCum(ARMOR_CLASS_CUM[band], s);
  let att = atCum(ARMOR_ATT_CUM[band], s);
  let matt = att;

  if (equip.equipType === "gloves") {
    const g = atCum(GLOVE_ATT_CUM, s);
    att += g;
    matt += g;
  }

  let maxHp = 0;
  if (!isWeapon && !NO_SF_HP.has(equip.equipType)) {
    maxHp = atCum(ARMOR_HP_CUM, s);
  }

  // Weapons: class stats same table; ATT uses early % formula + late flat from armor band
  if (isWeapon) {
    const baseAtt = equip.stats?.att ?? equip.stats?.weaponAtt ?? 0;
    const baseMatt = equip.stats?.matt ?? equip.stats?.weaponMatt ?? 0;
    const earlyAtt = weaponEarlyAttGain(baseAtt, s);
    const earlyMatt = weaponEarlyAttGain(baseMatt, s);
    const lateFlat = s > 15 ? atCum(ARMOR_ATT_CUM[band], s) : 0;
    // Armor ATT table is for non-weapon; weapon late values are close (±few).
    att = earlyAtt + lateFlat;
    matt = earlyMatt + (baseMatt > 0 ? lateFlat : 0);
    if (baseAtt <= 0) att = 0;
    if (baseMatt <= 0) matt = 0;
    maxHp = atCum(ARMOR_HP_CUM, Math.min(s, 15)); // weapons also get HP to 15★
  }

  // Emblems / medals / android: typically no SF — caller gates via canStarForce
  const baseDef = equip.stats?.def ?? equip.stats?.defense ?? 0;
  const defAfter = approxDefenseAfterStars(baseDef, s, isOverall);
  const defBonus = Math.max(0, defAfter - baseDef);

  return { classStat, att, matt, maxHp, defBonus };
}

function readBase(equip: Equip, id: string): number {
  const st = equip.stats ?? {};
  switch (id) {
    case "att":
      return st.att ?? st.weaponAtt ?? 0;
    case "matt":
      return st.matt ?? st.weaponMatt ?? 0;
    case "def":
      return st.def ?? st.defense ?? 0;
    case "maxHp":
      return st.maxHp ?? 0;
    case "maxMp":
      return st.maxMp ?? 0;
    case "iedPercent":
      return st.iedPercent ?? st.ied ?? 0;
    case "allStatsPercent":
      return st.allStatsPercent ?? st.allStats ?? 0;
    default:
      return st[id] ?? 0;
  }
}

/** Map flame line ids onto tooltip stat buckets. */
export function flameStatParts(flames: FlameLine[]): Record<string, number> {
  const out: Record<string, number> = {};
  const add = (id: string, n: number) => {
    out[id] = (out[id] ?? 0) + n;
  };
  for (const line of flames) {
    const id = line.id;
    const v = line.value;
    if (line.mixedStats?.length) {
      for (const m of line.mixedStats) add(m, v);
      continue;
    }
    switch (id) {
      case "str":
      case "dex":
      case "int":
      case "luk":
      case "maxHp":
      case "maxMp":
      case "speed":
      case "jump":
      case "bossPercent":
      case "damagePercent":
        add(id, v);
        break;
      case "allStatsPercent":
        add("allStatsPercent", v);
        break;
      case "defense":
        add("def", v);
        break;
      case "weaponAtt":
      case "armorAtt":
        add("att", v);
        break;
      case "weaponMatt":
      case "armorMatt":
        add("matt", v);
        break;
      case "weaponAttMatt":
      case "armorAttMatt":
        add("att", v);
        add("matt", v);
        break;
      case "maxHpMp":
        add("maxHp", v);
        add("maxMp", v);
        break;
      default:
        break;
    }
  }
  return out;
}

function emptyPart(): StatPart {
  return { base: 0, starForce: 0, flame: 0 };
}

/**
 * Build MS-style total + (base + SF + flame) rows for an equipped item.
 */
export function buildEquipTooltipModel(
  equip: Equip,
  opts: { stars: number; flames: FlameLine[] },
): EquipTooltipModel {
  const stars = clampStars(opts.stars);
  const sf = computeStarForceGains(equip, stars);
  const flame = flameStatParts(opts.flames);
  const classKeys = new Set(classStatKeys(equip));

  const parts: Record<string, StatPart> = {};
  const ensure = (id: string) => {
    if (!parts[id]) parts[id] = emptyPart();
    return parts[id]!;
  };

  for (const id of STAT_ORDER) {
    const base = readBase(equip, id);
    if (base) ensure(id).base = base;
  }

  for (const k of classKeys) {
    ensure(k).starForce += sf.classStat;
  }
  if (sf.att) ensure("att").starForce += sf.att;
  if (sf.matt) ensure("matt").starForce += sf.matt;
  if (sf.maxHp) ensure("maxHp").starForce += sf.maxHp;
  if (sf.defBonus) ensure("def").starForce += sf.defBonus;

  for (const [id, v] of Object.entries(flame)) {
    if (v) ensure(id).flame += v;
  }

  // Zero-base class stats still show when SF/flame present (MS shows `0 + …`)
  const lines: TooltipStatLine[] = [];
  for (const id of STAT_ORDER) {
    const p = parts[id];
    if (!p) continue;
    const total = p.base + p.starForce + p.flame;
    if (total === 0 && p.base === 0 && p.starForce === 0 && p.flame === 0) {
      continue;
    }
    if (total === 0) continue;
    lines.push({
      id,
      label: STAT_LABELS[id] ?? id,
      base: p.base,
      starForce: p.starForce,
      flame: p.flame,
      total,
      percent: PERCENT_IDS.has(id),
    });
  }

  const setKey = equip.setType;
  const setName =
    (setKey && SET_DISPLAY_NAMES[setKey]) ||
    (setKey && setKey !== "none" ? setKey : null);

  return {
    name: equip.name,
    imgUrl: equip.imgUrl,
    level: equip.level,
    stars,
    jobLabel: JOB_LABELS[equip.jobType] ?? equip.jobType,
    equipTypeLabel: EQUIP_TYPE_LABELS[equip.equipType] ?? equip.equipType,
    setName,
    lines,
  };
}
