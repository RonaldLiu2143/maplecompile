import cubeRates from "./cubeRates.json";
import type { ProbabilityInput, RateLine } from "./types";

export const emptyInputObject: ProbabilityInput = {
  percStat: 0,
  lineStat: 0,
  percAllStat: 0,
  lineAllStat: 0,
  percHp: 0,
  lineHp: 0,
  percAtt: 0,
  lineAtt: 0,
  percBoss: 0,
  lineBoss: 0,
  lineIed: 0,
  lineCritDamage: 0,
  lineMeso: 0,
  lineDrop: 0,
  lineMesoOrDrop: 0,
  secCooldown: 0,
  lineAutoSteal: 0,
  lineAttOrBoss: 0,
  lineAttOrBossOrIed: 0,
  lineBossOrIed: 0,
};

const CATEGORY = {
  STR_PERC: "STR %",
  DEX_PERC: "DEX %",
  INT_PERC: "INT %",
  LUK_PERC: "LUK %",
  MAXHP_PERC: "Max HP %",
  MAXMP_PERC: "Max MP %",
  ALLSTATS_PERC: "All Stats %",
  ATT_PERC: "ATT %",
  MATT_PERC: "MATT %",
  BOSSDMG_PERC: "Boss Damage",
  IED_PERC: "Ignore Enemy Defense %",
  MESO_PERC: "Meso Amount %",
  DROP_PERC: "Item Drop Rate %",
  AUTOSTEAL_PERC: "Chance to auto steal %",
  CRITDMG_PERC: "Critical Damage %",
  CDR_TIME: "Skill Cooldown Reduction",
  JUNK: "Junk",
  DECENT_SKILL: "Decent Skill",
  INVINCIBLE_PERC: "Chance of being invincible for seconds when hit",
  INVINCIBLE_TIME: "Increase invincibility time after being hit",
  IGNOREDMG_PERC: "Chance to ignore % damage when hit",
} as const;

const INPUT_CATEGORY_MAP: Record<keyof ProbabilityInput, string[]> = {
  percStat: [CATEGORY.STR_PERC, CATEGORY.ALLSTATS_PERC],
  lineStat: [CATEGORY.STR_PERC, CATEGORY.ALLSTATS_PERC],
  percAllStat: [
    CATEGORY.ALLSTATS_PERC,
    CATEGORY.STR_PERC,
    CATEGORY.DEX_PERC,
    CATEGORY.LUK_PERC,
  ],
  lineAllStat: [CATEGORY.ALLSTATS_PERC],
  percHp: [CATEGORY.MAXHP_PERC],
  lineHp: [CATEGORY.MAXHP_PERC],
  percAtt: [CATEGORY.ATT_PERC],
  lineAtt: [CATEGORY.ATT_PERC],
  percBoss: [CATEGORY.BOSSDMG_PERC],
  lineBoss: [CATEGORY.BOSSDMG_PERC],
  lineIed: [CATEGORY.IED_PERC],
  lineCritDamage: [CATEGORY.CRITDMG_PERC],
  lineMeso: [CATEGORY.MESO_PERC],
  lineDrop: [CATEGORY.DROP_PERC],
  lineMesoOrDrop: [CATEGORY.DROP_PERC, CATEGORY.MESO_PERC],
  secCooldown: [CATEGORY.CDR_TIME],
  lineAutoSteal: [CATEGORY.AUTOSTEAL_PERC],
  lineAttOrBoss: [CATEGORY.ATT_PERC, CATEGORY.BOSSDMG_PERC],
  lineAttOrBossOrIed: [
    CATEGORY.ATT_PERC,
    CATEGORY.BOSSDMG_PERC,
    CATEGORY.IED_PERC,
  ],
  lineBossOrIed: [CATEGORY.BOSSDMG_PERC, CATEGORY.IED_PERC],
};

const CALC_TYPE = { LINE: 0, VAL: 1 } as const;

function checkPercAllStat(outcome: RateLine[], requiredVal: number): boolean {
  let actualVal = 0;
  for (const [category, val] of outcome) {
    if (category === CATEGORY.ALLSTATS_PERC) {
      actualVal += Number(val);
    } else if (
      category === CATEGORY.STR_PERC ||
      category === CATEGORY.DEX_PERC ||
      category === CATEGORY.LUK_PERC
    ) {
      actualVal += Number(val) / 3;
    }
  }
  return actualVal >= requiredVal;
}

function calculateTotal(
  outcome: RateLine[],
  desiredCategory: string,
  calcType: number = CALC_TYPE.LINE,
): number {
  let actualVal = 0;
  for (const [category, val] of outcome) {
    if (category !== desiredCategory) continue;
    actualVal += calcType === CALC_TYPE.VAL ? Number(val) : 1;
  }
  return actualVal;
}

const OUTCOME_MATCH: Record<
  keyof ProbabilityInput,
  (outcome: RateLine[], requiredVal: number) => boolean
> = {
  percStat: (o, v) =>
    calculateTotal(o, CATEGORY.STR_PERC, CALC_TYPE.VAL) +
      calculateTotal(o, CATEGORY.ALLSTATS_PERC, CALC_TYPE.VAL) >=
    v,
  lineStat: (o, v) =>
    calculateTotal(o, CATEGORY.STR_PERC) +
      calculateTotal(o, CATEGORY.ALLSTATS_PERC) >=
    v,
  percAllStat: checkPercAllStat,
  lineAllStat: (o, v) => calculateTotal(o, CATEGORY.ALLSTATS_PERC) >= v,
  percHp: (o, v) =>
    calculateTotal(o, CATEGORY.MAXHP_PERC, CALC_TYPE.VAL) >= v,
  lineHp: (o, v) => calculateTotal(o, CATEGORY.MAXHP_PERC) >= v,
  percAtt: (o, v) => calculateTotal(o, CATEGORY.ATT_PERC, CALC_TYPE.VAL) >= v,
  lineAtt: (o, v) => calculateTotal(o, CATEGORY.ATT_PERC) >= v,
  percBoss: (o, v) =>
    calculateTotal(o, CATEGORY.BOSSDMG_PERC, CALC_TYPE.VAL) >= v,
  lineBoss: (o, v) => calculateTotal(o, CATEGORY.BOSSDMG_PERC) >= v,
  lineIed: (o, v) => calculateTotal(o, CATEGORY.IED_PERC) >= v,
  lineCritDamage: (o, v) => calculateTotal(o, CATEGORY.CRITDMG_PERC) >= v,
  lineMeso: (o, v) => calculateTotal(o, CATEGORY.MESO_PERC) >= v,
  lineDrop: (o, v) => calculateTotal(o, CATEGORY.DROP_PERC) >= v,
  lineMesoOrDrop: (o, v) =>
    calculateTotal(o, CATEGORY.MESO_PERC) +
      calculateTotal(o, CATEGORY.DROP_PERC) >=
    v,
  secCooldown: (o, v) =>
    calculateTotal(o, CATEGORY.CDR_TIME, CALC_TYPE.VAL) >= v,
  lineAutoSteal: (o, v) => calculateTotal(o, CATEGORY.AUTOSTEAL_PERC) >= v,
  lineAttOrBoss: (o, v) =>
    calculateTotal(o, CATEGORY.ATT_PERC) +
      calculateTotal(o, CATEGORY.BOSSDMG_PERC) >=
    v,
  lineAttOrBossOrIed: (o, v) =>
    calculateTotal(o, CATEGORY.ATT_PERC) +
      calculateTotal(o, CATEGORY.BOSSDMG_PERC) +
      calculateTotal(o, CATEGORY.IED_PERC) >=
    v,
  lineBossOrIed: (o, v) =>
    calculateTotal(o, CATEGORY.BOSSDMG_PERC) +
      calculateTotal(o, CATEGORY.IED_PERC) >=
    v,
};

function getUsefulCategories(input: ProbabilityInput): string[] {
  const cats: string[] = [];
  for (const field of Object.keys(INPUT_CATEGORY_MAP) as (keyof ProbabilityInput)[]) {
    if (input[field] > 0) cats.push(...INPUT_CATEGORY_MAP[field]);
  }
  return [...new Set(cats)];
}

const MAX_CATEGORY_COUNT: Record<string, number> = {
  [CATEGORY.DECENT_SKILL]: 1,
  [CATEGORY.INVINCIBLE_TIME]: 1,
  [CATEGORY.IED_PERC]: 3,
  [CATEGORY.BOSSDMG_PERC]: 3,
  [CATEGORY.DROP_PERC]: 3,
  [CATEGORY.IGNOREDMG_PERC]: 2,
  [CATEGORY.INVINCIBLE_PERC]: 2,
};

const isSpecialLine = (category: string) =>
  Object.prototype.hasOwnProperty.call(MAX_CATEGORY_COUNT, category);

function getConsolidatedRates(
  ratesList: RateLine[],
  usefulCategories: string[],
): RateLine[] {
  const consolidated: RateLine[] = [];
  let junkRate = 0;
  const junkCategories: string[] = [];

  for (const item of ratesList) {
    const [category, val, rate] = item;
    if (usefulCategories.includes(category) || isSpecialLine(category)) {
      consolidated.push(item);
    } else if (category === CATEGORY.JUNK) {
      junkRate += rate;
      if (Array.isArray(val)) junkCategories.push(...val.map(String));
    } else {
      junkRate += rate;
      junkCategories.push(`${category} (${val})`);
    }
  }
  consolidated.push([CATEGORY.JUNK, junkCategories, junkRate]);
  return consolidated;
}

function satisfiesInput(
  outcome: RateLine[],
  input: ProbabilityInput,
): boolean {
  for (const field of Object.keys(input) as (keyof ProbabilityInput)[]) {
    if (input[field] > 0 && !OUTCOME_MATCH[field](outcome, input[field])) {
      return false;
    }
  }
  return true;
}

function getAdjustedRate(
  currentLine: RateLine,
  previousLines: RateLine[],
  currentPool: RateLine[],
): number {
  const currentCategory = currentLine[0];
  const currentRate = currentLine[2];
  if (previousLines.length === 0) return currentRate;

  const prevSpecial: Record<string, number> = {};
  for (const [cat] of previousLines) {
    if (isSpecialLine(cat)) prevSpecial[cat] = (prevSpecial[cat] ?? 0) + 1;
  }

  const toRemove: string[] = [];
  for (const [spCat, count] of Object.entries(prevSpecial)) {
    if (
      count > MAX_CATEGORY_COUNT[spCat] ||
      (spCat === currentCategory && count + 1 > MAX_CATEGORY_COUNT[spCat])
    ) {
      return 0;
    }
    if (count === MAX_CATEGORY_COUNT[spCat]) toRemove.push(spCat);
  }

  let adjustedTotal = 100;
  let adjusted = false;
  for (const [cat, , rate] of currentPool) {
    if (toRemove.includes(cat)) {
      adjustedTotal -= rate;
      adjusted = true;
    }
  }
  return adjusted ? (currentRate / adjustedTotal) * 100 : currentRate;
}

function calculateRate(
  outcome: RateLine[],
  filteredRates: {
    first_line: RateLine[];
    second_line: RateLine[];
    third_line: RateLine[];
  },
): number {
  const adjusted = [
    getAdjustedRate(outcome[0], [], filteredRates.first_line),
    getAdjustedRate(outcome[1], [outcome[0]], filteredRates.second_line),
    getAdjustedRate(
      outcome[2],
      [outcome[0], outcome[1]],
      filteredRates.third_line,
    ),
  ];
  let chance = 100;
  for (const rate of adjusted) chance *= rate / 100;
  return chance;
}

const tierNumberToText: Record<number, string> = {
  3: "legendary",
  2: "unique",
  1: "epic",
  0: "rare",
};

function convertItemType(itemType: string): string {
  if (itemType === "accessory") return "ring";
  if (itemType === "badge") return "heart";
  return itemType;
}

function convertCubeDataForLevel(
  cubeData: {
    first_line: RateLine[];
    second_line: RateLine[];
    third_line: RateLine[];
  },
  itemLevel: number,
) {
  if (itemLevel < 160) return cubeData;
  const affected = new Set<string>([
    CATEGORY.STR_PERC,
    CATEGORY.LUK_PERC,
    CATEGORY.DEX_PERC,
    CATEGORY.INT_PERC,
    CATEGORY.ALLSTATS_PERC,
    CATEGORY.ATT_PERC,
    CATEGORY.MATT_PERC,
    CATEGORY.MAXHP_PERC,
  ]);
  const adjust = (lines: RateLine[]): RateLine[] =>
    lines.map(([cat, val, rate]) =>
      affected.has(cat) && typeof val === "number"
        ? [cat, val + 1, rate]
        : [cat, val, rate],
    );
  return {
    first_line: adjust(cubeData.first_line),
    second_line: adjust(cubeData.second_line),
    third_line: adjust(cubeData.third_line),
  };
}

type RatesRoot = {
  lvl120to200: Record<
    string,
    Record<string, Record<string, { first_line: RateLine[]; second_line: RateLine[]; third_line: RateLine[] }>>
  >;
};

export function translateInputToObject(webInput: string): ProbabilityInput {
  const output = { ...emptyInputObject };
  if (!webInput || webInput === "any") return output;
  for (const val of webInput.split("&")) {
    const [stat, amount] = val.split("+");
    if (stat in output) {
      (output as Record<string, number>)[stat] += parseInt(amount, 10) || 0;
    }
  }
  return output;
}

export function getProbability(
  desiredTier: number,
  probabilityInput: ProbabilityInput,
  itemType: string,
  cubeType: string,
  itemLevel: number,
): number {
  const tier = tierNumberToText[desiredTier];
  const itemLabel = convertItemType(itemType);
  const rates = cubeRates as unknown as RatesRoot;
  const tierData = rates.lvl120to200[itemLabel]?.[cubeType]?.[tier];
  if (!tierData) return 0;

  const raw = {
    first_line: tierData.first_line as RateLine[],
    second_line: tierData.second_line as RateLine[],
    third_line: tierData.third_line as RateLine[],
  };
  const cubeData = convertCubeDataForLevel(raw, itemLevel);
  const usefulCategories = getUsefulCategories(probabilityInput);
  const consolidated = {
    first_line: getConsolidatedRates(cubeData.first_line, usefulCategories),
    second_line: getConsolidatedRates(cubeData.second_line, usefulCategories),
    third_line: getConsolidatedRates(cubeData.third_line, usefulCategories),
  };

  let totalChance = 0;
  for (const line1 of consolidated.first_line) {
    for (const line2 of consolidated.second_line) {
      for (const line3 of consolidated.third_line) {
        const outcome = [line1, line2, line3];
        if (satisfiesInput(outcome, probabilityInput)) {
          totalChance += calculateRate(outcome, consolidated);
        }
      }
    }
  }
  return totalChance / 100;
}
