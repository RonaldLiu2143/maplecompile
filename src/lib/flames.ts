import type {
  Equip,
  FlameChanceResult,
  FlameLine,
  FlameTypeId,
  JobType,
  StatEquiv,
} from "./types";

const TIERS = [1, 2, 3, 4, 5, 6, 7];
const NORMAL_ATT_MULT = [1, 2.2, 3.63, 5.324, 7.3205, 8.7846, 10.2487];

export const NON_FLAMMABLE_TYPES = [
  "ring",
  "android",
  "heart",
  "emblem",
  "badge",
  "secondary",
];

export type FlameStatType = {
  id: string;
  name: string;
  values: number[];
  displaySections: string[];
  displayOrder?: number;
  mixedStats?: string[];
  section?: string;
};

export type FlameTable = {
  general: { category: string; statTypes: FlameStatType[] };
  weapon: { category: string; statTypes: FlameStatType[] };
  armor: { category: string; statTypes: FlameStatType[] };
};

export function isFlammable(equip: Equip): boolean {
  if (NON_FLAMMABLE_TYPES.includes(equip.equipType)) return false;
  if (
    equip.equipType === "shoulder" &&
    equip.name !== "Scarlet Shoulderpads"
  ) {
    return false;
  }
  if (equip.equipType === "medal" && equip.name !== "Immortal Legacy") {
    return false;
  }
  if (
    equip.equipType === "pendant" &&
    (equip.name.includes("Prepared Pendant") ||
      equip.name.includes("Fairy Pendant"))
  ) {
    return false;
  }
  return true;
}

export function getPrimarySecondary(
  jobType: JobType | string,
  charType: string,
): { pri: string[]; sec: string[] } {
  switch (jobType) {
    case "magician":
      return { pri: ["int"], sec: ["luk"] };
    case "archer":
      return { pri: ["dex"], sec: ["str"] };
    case "warrior":
      if (charType === "da") return { pri: ["hp"], sec: ["att"] };
      return { pri: ["str"], sec: ["dex"] };
    case "thief":
      if (charType === "xenon") return { pri: ["str", "dex", "luk"], sec: ["-"] };
      if (charType === "sdw" || charType === "db" || charType === "cadena") {
        return { pri: ["luk"], sec: ["str", "dex"] };
      }
      return { pri: ["luk"], sec: ["dex"] };
    case "pirate":
      if (
        charType === "ab" ||
        charType === "captain" ||
        charType === "mech" ||
        charType === "mx"
      ) {
        return { pri: ["dex"], sec: ["str"] };
      }
      return { pri: ["str"], sec: ["dex"] };
    default:
      return { pri: ["-"], sec: ["-"] };
  }
}

export function defaultStatEquiv(
  jobType: JobType | string,
  charType: string,
): StatEquiv {
  const { pri, sec } = getPrimarySecondary(jobType, charType);
  return {
    priStat: pri,
    secStat: sec,
    values: { sec: 0.125, att: 4, allStats: 10, boss: 12 },
  };
}

/** Build flame value tables for an item level / WA / flame type. */
export function buildFlameTable(
  flameKind: "normal" | "special",
  equipLevel: number,
  weaponAtt: number,
): FlameTable {
  let level = 10 * Math.floor(equipLevel / 10);
  let wa = weaponAtt;
  if (level > 300) level = 300;
  if (wa > 1000) wa = 1000;
  if (isNaN(level) || level < 0) level = 200;
  if (isNaN(wa) || wa < 0) wa = 0;

  let pureMult: number;
  let hpBase: number;
  if (level >= 250) {
    pureMult = 12;
    hpBase = 233.333333;
  } else {
    pureMult = Math.floor(level / 20) + 1;
    hpBase = (level / 10) * 10;
  }
  const mixedMult = Math.floor(level / 40) + 1;

  const attValues: number[] = [];
  for (let a = 1; a <= 7; a++) {
    if (flameKind === "normal") {
      attValues.push(
        Math.ceil((wa / 100) * (Math.floor(level / 40) + 1) * NORMAL_ATT_MULT[a - 1]),
      );
    } else {
      attValues.push(
        Math.ceil(
          (wa / 100) * (Math.floor(level / 40) + 1) * a * Math.pow(1.1, a - 3),
        ),
      );
    }
  }

  return {
    general: {
      category: "Common Flame Stats",
      statTypes: [
        {
          id: "pureStats",
          name: "Pure Stats",
          values: TIERS.map((e) => e * pureMult),
          displaySections: ["table"],
        },
        {
          id: "mixedStats",
          name: "Mixed Stats",
          values: TIERS.map((e) => e * mixedMult),
          displaySections: ["table"],
        },
        {
          id: "str",
          name: "STR",
          values: TIERS.map((e) => e * pureMult),
          displaySections: ["selection"],
          displayOrder: 1,
        },
        {
          id: "dex",
          name: "DEX",
          values: TIERS.map((e) => e * pureMult),
          displaySections: ["selection"],
          displayOrder: 2,
        },
        {
          id: "int",
          name: "INT",
          values: TIERS.map((e) => e * pureMult),
          displaySections: ["selection"],
          displayOrder: 3,
        },
        {
          id: "luk",
          name: "LUK",
          values: TIERS.map((e) => e * pureMult),
          displaySections: ["selection"],
          displayOrder: 4,
        },
        {
          id: "strDex",
          name: "STR+DEX",
          values: TIERS.map((e) => e * mixedMult),
          displaySections: ["selection"],
          mixedStats: ["str", "dex"],
          displayOrder: 5,
        },
        {
          id: "strInt",
          name: "STR+INT",
          values: TIERS.map((e) => e * mixedMult),
          displaySections: ["selection"],
          mixedStats: ["str", "int"],
          displayOrder: 6,
        },
        {
          id: "strLuk",
          name: "STR+LUK",
          values: TIERS.map((e) => e * mixedMult),
          displaySections: ["selection"],
          mixedStats: ["str", "luk"],
          displayOrder: 7,
        },
        {
          id: "dexInt",
          name: "DEX+INT",
          values: TIERS.map((e) => e * mixedMult),
          displaySections: ["selection"],
          mixedStats: ["dex", "int"],
          displayOrder: 8,
        },
        {
          id: "dexLuk",
          name: "DEX+LUK",
          values: TIERS.map((e) => e * mixedMult),
          displaySections: ["selection"],
          mixedStats: ["dex", "luk"],
          displayOrder: 9,
        },
        {
          id: "intLuk",
          name: "INT+LUK",
          values: TIERS.map((e) => e * mixedMult),
          displaySections: ["selection"],
          mixedStats: ["int", "luk"],
          displayOrder: 10,
        },
        {
          id: "maxHpMp",
          name: "Max HP/MP",
          values: TIERS.map((e) => Math.round(e * hpBase * 3)),
          displaySections: ["table"],
        },
        {
          id: "maxHp",
          name: "Max HP",
          values: TIERS.map((e) => Math.round(e * hpBase * 3)),
          displaySections: ["selection"],
          displayOrder: 11,
        },
        {
          id: "maxMp",
          name: "Max MP",
          values: TIERS.map((e) => Math.round(e * hpBase * 3)),
          displaySections: ["selection"],
          displayOrder: 12,
        },
        {
          id: "defense",
          name: "Defense",
          values: TIERS.map((e) => e * pureMult),
          displaySections: ["table", "selection"],
          displayOrder: 15,
        },
        {
          id: "allStatsPercent",
          name: "All Stats%",
          values: [...TIERS],
          displaySections: ["table", "selection"],
          displayOrder: 20,
        },
        {
          id: "levelReduce",
          name: "Equip Level Reduction",
          values: TIERS.map((e) => -5 * e),
          displaySections: ["table", "selection"],
          displayOrder: 21,
        },
      ],
    },
    weapon: {
      category: "Weapon-only Flame Stats",
      statTypes: [
        {
          section: "weapon",
          id: "weaponAttMatt",
          name: "Weapon WA/MA",
          values: attValues,
          displaySections: ["table"],
        },
        {
          section: "weapon",
          id: "weaponAtt",
          name: "Weapon ATT",
          values: attValues,
          displaySections: ["selection"],
          displayOrder: 13,
        },
        {
          section: "weapon",
          id: "weaponMatt",
          name: "Weapon MATT",
          values: attValues,
          displaySections: ["selection"],
          displayOrder: 14,
        },
        {
          section: "weapon",
          id: "bossPercent",
          name: "Boss%",
          values: TIERS.map((e) => 2 * e),
          displaySections: ["table", "selection"],
          displayOrder: 18,
        },
        {
          section: "weapon",
          id: "damagePercent",
          name: "Damage%",
          values: [...TIERS],
          displaySections: ["table", "selection"],
          displayOrder: 19,
        },
      ],
    },
    armor: {
      category: "Armor-only Flame Stats",
      statTypes: [
        {
          section: "armor",
          id: "armorAttMatt",
          name: "Armor WA/MA",
          values: [...TIERS],
          displaySections: ["table"],
        },
        {
          section: "armor",
          id: "armorAtt",
          name: "Armor ATT",
          values: [...TIERS],
          displaySections: ["selection"],
          displayOrder: 13,
        },
        {
          section: "armor",
          id: "armorMatt",
          name: "Armor MATT",
          values: [...TIERS],
          displaySections: ["selection"],
          displayOrder: 14,
        },
        {
          section: "armor",
          id: "speed",
          name: "Speed",
          values: [...TIERS],
          displaySections: ["table", "selection"],
          displayOrder: 16,
        },
        {
          section: "armor",
          id: "jump",
          name: "Jump",
          values: [...TIERS],
          displaySections: ["table", "selection"],
          displayOrder: 17,
        },
      ],
    },
  };
}

export function getWeaponAtt(equip: Equip): number {
  if (equip.jobType === "magician") {
    return equip.stats?.matt || equip.stats?.weaponMatt || 0;
  }
  return equip.stats?.att || equip.stats?.weaponAtt || 0;
}

export function getSelectableStats(equip: Equip): FlameStatType[] {
  const kind = equip.isNormalFlame ? "normal" : "special";
  const wa = getWeaponAtt(equip);
  const table = buildFlameTable(kind, equip.level, wa);
  return Object.values(table)
    .flatMap((c) => c.statTypes)
    .filter((s) => s.displaySections.includes("selection"))
    .filter(
      (s) =>
        !s.section ||
        (s.section === "armor" && equip.equipType !== "weapon") ||
        (s.section === "weapon" && equip.equipType === "weapon"),
    )
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

export function scoreStatLines(
  stats: FlameStatType[],
  jobType: string,
  charType: string,
  equiv: StatEquiv,
): number[][] {
  const preferMatt = jobType === "magician";
  return stats.map((stat) => {
    if (stat.mixedStats) {
      return stat.mixedStats
        .map((m) => {
          if (equiv.priStat.some((p) => p === m)) return stat.values;
          if (equiv.secStat.some((p) => p === m)) {
            return stat.values.map((v) => v * equiv.values.sec);
          }
          return stat.values.map(() => 0);
        })
        .reduce((acc, cur) => acc.map((v, i) => v + cur[i]));
    }
    if (equiv.priStat.some((p) => stat.id.toLowerCase().includes(p))) {
      return stat.values;
    }
    if (equiv.secStat.some((p) => p === stat.id)) {
      return stat.values.map((v) => v * equiv.values.sec);
    }
    if (stat.id === "allStatsPercent") {
      return stat.values.map((v) => v * equiv.values.allStats);
    }
    // Score the job's attack line only (ATT for most jobs, MATT for magicians)
    if (
      stat.id === "weaponAtt" ||
      stat.id === "weaponMatt" ||
      stat.id === "armorAtt" ||
      stat.id === "armorMatt"
    ) {
      const isMatt = /Matt$/i.test(stat.id);
      if (preferMatt === isMatt) {
        return stat.values.map((v) => v * equiv.values.att);
      }
      return stat.values.map(() => 0);
    }
    if (stat.id === "bossPercent" || stat.id === "damagePercent") {
      return stat.values.map(
        (v) => v * equiv.values.boss * (charType === "zero" ? 2 : 1),
      );
    }
    return stat.values.map(() => 0);
  });
}

type FlameTierConfig = {
  minTier: number;
  maxTier: number;
  chance: number[];
};

function flameConfigs(isNormal: boolean): Record<FlameTypeId, FlameTierConfig> {
  return {
    crf: {
      minTier: isNormal ? 1 : 3,
      maxTier: isNormal ? 4 : 6,
      chance: [0.2, 0.3, 0.36, 0.14],
    },
    rrf: {
      minTier: isNormal ? 2 : 4,
      maxTier: isNormal ? 5 : 7,
      chance: [0.29, 0.45, 0.25, 0.01],
    },
    arf: {
      minTier: isNormal ? 3 : 5,
      maxTier: isNormal ? 5 : 7,
      chance: [0.63, 0.34, 0.03],
    },
  };
}

/** Probability weight arrays for choosing N lines of tiers. */
const weightCache = new Map<string, number[]>();

function lineTierWeights(
  minTier: number,
  maxTier: number,
  chances: number[],
  lineCount: number,
  isNormal: boolean,
): number[] {
  const key = `${minTier}|${maxTier}|${chances.join(",")}|${lineCount}|${isNormal ? 1 : 0}`;
  const cached = weightCache.get(key);
  if (cached) return cached;

  const out: number[] = [];
  switch (lineCount) {
    case 1: {
      const l = 1 / 19;
      for (let s = minTier; s <= maxTier; s++) {
        out.push(chances[s - minTier] * l * 0.4);
      }
      break;
    }
    case 2: {
      const l = 1 / 171;
      for (let s = minTier; s <= maxTier; s++) {
        for (let r = minTier; r <= maxTier; r++) {
          out.push(chances[s - minTier] * chances[r - minTier] * l * 0.4);
        }
      }
      break;
    }
    case 3: {
      const l = 1 / 969;
      for (let s = minTier; s <= maxTier; s++) {
        for (let r = minTier; r <= maxTier; r++) {
          for (let n = minTier; n <= maxTier; n++) {
            out.push(
              chances[s - minTier] *
                chances[r - minTier] *
                chances[n - minTier] *
                l *
                0.16,
            );
          }
        }
      }
      break;
    }
    case 4: {
      const l = 1 / 3876;
      const n = isNormal ? 0.04 : 1;
      for (let s = minTier; s <= maxTier; s++) {
        for (let r = minTier; r <= maxTier; r++) {
          for (let d = minTier; d <= maxTier; d++) {
            for (let c = minTier; c <= maxTier; c++) {
              out.push(
                chances[s - minTier] *
                  chances[r - minTier] *
                  chances[d - minTier] *
                  chances[c - minTier] *
                  l *
                  n,
              );
            }
          }
        }
      }
      break;
    }
  }
  weightCache.set(key, out);
  return out;
}

/** Sum probability mass of tier combos whose score sum exceeds threshold (no combo allocation). */
function chanceAboveThreshold(
  scoreArrays: number[][],
  weights: number[],
  threshold: number,
): number {
  if (scoreArrays.length === 0 || !scoreArrays.every((a) => a.length > 0)) {
    return 0;
  }

  let total = 0;
  let weightIdx = 0;
  const n = scoreArrays.length;

  const dfs = (depth: number, sum: number) => {
    if (depth === n) {
      if (sum > threshold) total += weights[weightIdx] ?? 0;
      weightIdx += 1;
      return;
    }
    const row = scoreArrays[depth];
    for (let i = 0; i < row.length; i++) {
      dfs(depth + 1, sum + row[i]);
    }
  };
  dfs(0, 0);
  return total;
}

export function calcFlameProbability(
  equip: Equip,
  flames: FlameLine[],
  jobType: string,
  charType: string,
  equiv: StatEquiv,
): FlameChanceResult[] {
  const selectable = getSelectableStats(equip);
  const scored = scoreStatLines(selectable, jobType, charType, equiv);
  const isNormal = !!equip.isNormalFlame;
  const configs = flameConfigs(isNormal);

  // Match WhackyBeanz: score current lines by stored values × equiv weights
  // (not by re-indexing the tier table), so edited/manual values stay consistent.
  let currentScore = scoreCurrentFlames(flames, jobType, charType, equiv);

  const weightsFor = (cfg: FlameTierConfig) => {
    const map: Record<number, number[]> = {};
    if (isNormal) {
      for (let n = 1; n <= 4; n++) {
        map[n] = lineTierWeights(
          cfg.minTier,
          cfg.maxTier,
          cfg.chance,
          n,
          isNormal,
        );
      }
    } else {
      map[4] = lineTierWeights(cfg.minTier, cfg.maxTier, cfg.chance, 4, isNormal);
    }
    return map;
  };

  return (Object.entries(configs) as [FlameTypeId, FlameTierConfig][]).map(
    ([flameType, cfg]) => {
      // Keep ALL selectable stats (including 0-score junk lines). Dropping them
      // breaks odds — weights are built around C(19, k) over the full pool.
      const sliced = scored.map((row) =>
        row.slice(cfg.minTier - 1, cfg.maxTier),
      );
      const d = sliced.length;
      const weights = weightsFor(cfg);
      let chance = 0;

      if (isNormal) {
        const w1 = weights[1] ?? [];
        const w2 = weights[2] ?? [];
        const w3 = weights[3] ?? [];
        for (let e = 0; e < d; e++) {
          chance += chanceAboveThreshold([sliced[e]], w1, currentScore);
        }
        for (let e = 0; e < d - 1; e++) {
          for (let t = e + 1; t < d; t++) {
            chance += chanceAboveThreshold(
              [sliced[e], sliced[t]],
              w2,
              currentScore,
            );
          }
        }
        for (let e = 0; e < d - 2; e++) {
          for (let t = e + 1; t < d - 1; t++) {
            for (let s = t + 1; s < d; s++) {
              chance += chanceAboveThreshold(
                [sliced[e], sliced[t], sliced[s]],
                w3,
                currentScore,
              );
            }
          }
        }
      }

      const w4 = weights[4] ?? [];
      for (let e = 0; e < d - 3; e++) {
        for (let t = e + 1; t < d - 2; t++) {
          for (let s = t + 1; s < d - 1; s++) {
            for (let i = s + 1; i < d; i++) {
              chance += chanceAboveThreshold(
                [sliced[e], sliced[t], sliced[s], sliced[i]],
                w4,
                currentScore,
              );
            }
          }
        }
      }

      return { flameType, chance };
    },
  );
}

/** Score saved flame lines the same way WhackyBeanz does (value × equivalences). */
export function scoreCurrentFlames(
  flames: FlameLine[],
  jobType: string,
  charType: string,
  equiv: StatEquiv,
): number {
  const preferMatt = jobType === "magician";
  const attKey = preferMatt ? "Matt" : "Att";
  let score = 0;

  for (const line of flames) {
    if (line.mixedStats?.length) {
      for (const m of line.mixedStats) {
        if (equiv.priStat.some((p) => p === m)) score += line.value;
        else if (equiv.secStat.some((p) => p === m)) {
          score += line.value * equiv.values.sec;
        }
      }
      continue;
    }
    const id = line.id;
    if (equiv.priStat.some((p) => id.toLowerCase().includes(p))) {
      score += line.value;
    } else if (id.includes(attKey) || id.toLowerCase().includes(attKey.toLowerCase())) {
      // weaponAtt / armorAtt / weaponMatt / armorMatt
      const isMatt = /matt/i.test(id);
      if (preferMatt === isMatt) score += line.value * equiv.values.att;
    } else if (equiv.secStat.some((p) => id.toLowerCase().includes(p))) {
      score += line.value * equiv.values.sec;
    } else if (id.toLowerCase().includes("allstats")) {
      score += line.value * equiv.values.allStats;
    } else if (id === "bossPercent" || id === "damagePercent") {
      score += line.value * equiv.values.boss * (charType === "zero" ? 2 : 1);
    }
  }
  return score;
}

export function flamesNeededForChance(
  singleChance: number,
  targetChance: number,
): number {
  if (singleChance <= 0 || singleChance >= 1) return Infinity;
  if (targetChance <= 0) return 0;
  if (targetChance >= 1) return Infinity;
  return Math.ceil(Math.log(1 - targetChance) / Math.log(1 - singleChance));
}

/** Match WhackyBeanz: use API flag when present, else their name heuristic. */
export function inferNormalFlame(equip: Equip): boolean {
  if (typeof equip.isNormalFlame === "boolean") return equip.isNormalFlame;
  const name = equip.name;
  if (equip.equipType === "weapon" && name.includes("Lapis")) return true;
  const normalNameHints = [
    "Gollux",
    "Utgard",
    "Pensalir",
    "Fensalir",
    "Sweetwater",
    "Greed Pendant",
    "Half Earring",
    "Bear Pendant",
    "Owl Pendant",
    "Peacock Pendant",
    "Wolf Pendant",
    "Wings of Fate",
    "Mystic Eye",
    "Chaos Vellum",
    "Chaos Von Bon",
    "Chaos Pierre",
    "Chaos Queen",
    "Chaos Horntail",
    "Horned Tail",
    "Shiny Red",
    "Bunny Disguise",
    "SG Flag Sunglass",
    "Inverse Codex",
    "Reaper's Pendant",
  ];
  return normalNameHints.some((hint) => name.includes(hint));
}
