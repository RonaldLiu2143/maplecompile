import { computeClassFinalDamage } from "./class-fd";

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
  /** Character-window style extras (MapleScouter layout) */
  generalRange: number;
  displayedAttack: number;
  displayedMagicAttack: number;
  cooldownReductionSeconds: number;
  cooldownReductionPercent: number;
  buffDurationPercent: number;
  cooldownSkipPercent: number;
  ignoreElementalResistancePercent: number;
  additionalStatusDamagePercent: number;
  summonDurationPercent: number;
  arcaneForce: number;
  sacredForce: number;
  wildHunterLegion: number;
  reboot: boolean;
  liberation: boolean;
  mugongSoul: boolean;
  /** Legion Artifact / Inner Ability / Oz Ring (MapleScouter) */
  legionArtifactAdditionalExp: boolean;
  legionArtifactFinalAttack: number;
  specialInnerAbility: "none" | "passivePlus1" | "mobTargeted";
  ozContinuousStatus: "noUse" | "use";
  ozContinuousLevel: number;
  ozRestraintLevel: number;
  ozWeaponJumpLevel: number;
  ozRingOfSumLevel: number;
  ozWeaponTotalAtt: number;
  ozPrimaryStat: number;
  ozSecondaryStat: number;
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
    finalDamagePercent: computeClassFinalDamage(charType, {
      level: 275,
      reboot: false,
      liberation: false,
    }),
    ignoreDefensePercent: 0,
    normalEnemyDamagePercent: 0,
    criticalRatePercent: 100,
    criticalDamagePercent: 0,
    masteryPercent: 60,
    bossPdrPercent: 300,
    useMagicAttack: jobType === "magician",
    generalRange: 0,
    displayedAttack: 0,
    displayedMagicAttack: 0,
    cooldownReductionSeconds: 0,
    cooldownReductionPercent: 0,
    buffDurationPercent: 0,
    cooldownSkipPercent: 0,
    ignoreElementalResistancePercent: 0,
    additionalStatusDamagePercent: 0,
    summonDurationPercent: 0,
    arcaneForce: 0,
    sacredForce: 0,
    wildHunterLegion: 0,
    reboot: false,
    liberation: false,
    mugongSoul: false,
    legionArtifactAdditionalExp: true,
    legionArtifactFinalAttack: 0,
    specialInnerAbility: "none",
    ozContinuousStatus: "noUse",
    ozContinuousLevel: 0,
    ozRestraintLevel: 0,
    ozWeaponJumpLevel: 0,
    ozRingOfSumLevel: 0,
    ozWeaponTotalAtt: 0,
    ozPrimaryStat: 0,
    ozSecondaryStat: 0,
  };
}
