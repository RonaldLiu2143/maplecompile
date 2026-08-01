export type StatKey = "str" | "dex" | "int" | "luk" | "hp";

export type StatTriple = {
  /** Flat value that receives % */
  base: number;
  /** Percent applied to base (e.g. 200 = +200%) */
  percent: number;
  /** Flat value that ignores % */
  flat: number;
};

export type ScouterInput = {
  level: number;
  jobType: string;
  charType: string;
  /** Primary stats — for Xenon, STR/DEX/LUK are all primary */
  stats: Record<StatKey, StatTriple>;
  attack: StatTriple;
  magicAttack: StatTriple;
  /** Damage % (non-boss) */
  damagePercent: number;
  bossDamagePercent: number;
  finalDamagePercent: number;
  ignoreDefensePercent: number;
  normalEnemyDamagePercent: number;
  criticalRatePercent: number;
  criticalDamagePercent: number;
  /** Weapon mastery % (affects min range); default 60 */
  masteryPercent: number;
  /** Boss PDR as percent (300 = 300%) */
  bossPdrPercent: number;
  useMagicAttack: boolean;
};

export type ScouterResult = {
  totalMain: number;
  totalSecondary: number;
  statValue: number;
  attackFinal: number;
  displayedMax: number;
  displayedMin: number;
  critMultiplier: number;
  bossMultiplier: number;
  normalMultiplier: number;
  finalMultiplier: number;
  iedMultiplier: number;
  expectedBoss: number;
  expectedNormal: number;
  /** Converted main stat (환산 주스탯) vs boss PDR */
  convertedMain: number;
  /** Rough main-stat equivalents */
  equiv: {
    oneAttack: number;
    oneBossPercent: number;
    oneCritDamage: number;
    oneFinalDamage: number;
    oneIedPercent: number;
  };
};

export const EMPTY_TRIPLE: StatTriple = { base: 0, percent: 0, flat: 0 };

export function defaultScouterInput(
  jobType: string,
  charType: string,
): ScouterInput {
  return {
    level: 275,
    jobType,
    charType,
    stats: {
      str: { ...EMPTY_TRIPLE },
      dex: { ...EMPTY_TRIPLE },
      int: { ...EMPTY_TRIPLE },
      luk: { ...EMPTY_TRIPLE },
      hp: { ...EMPTY_TRIPLE },
    },
    attack: { ...EMPTY_TRIPLE },
    magicAttack: { ...EMPTY_TRIPLE },
    damagePercent: 0,
    bossDamagePercent: 0,
    finalDamagePercent: 0,
    ignoreDefensePercent: 0,
    normalEnemyDamagePercent: 0,
    criticalRatePercent: 100,
    criticalDamagePercent: 0,
    masteryPercent: 60,
    bossPdrPercent: 300,
    useMagicAttack: jobType === "magician",
  };
}
