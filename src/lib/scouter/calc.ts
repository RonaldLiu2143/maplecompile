import { getPrimarySecondary } from "@/lib/flames";
import type { ScouterInput, ScouterResult, StatKey, StatTriple } from "./types";

function applyTriple(t: StatTriple): number {
  return t.base * (1 + t.percent / 100) + t.flat;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/** Expected crit multiplier: non-crit 1.0, crit 1.35 + CD% */
export function critExpectedMultiplier(
  critRatePercent: number,
  critDamagePercent: number,
): number {
  const cr = clamp01(critRatePercent / 100);
  const critHit = 1.35 + critDamagePercent / 100;
  return (1 - cr) * 1 + cr * critHit;
}

/** IED vs boss PDR: 1 - PDR*(1-IED), floored at ~0 */
export function iedDamageMultiplier(
  iedPercent: number,
  bossPdrPercent: number,
): number {
  const ied = clamp01(iedPercent / 100);
  const pdr = Math.max(0, bossPdrPercent / 100);
  return Math.max(0, 1 - pdr * (1 - ied));
}

export function resolveMainSecondary(input: ScouterInput): {
  mainKeys: StatKey[];
  secondaryKeys: StatKey[];
  isXenon: boolean;
  isDa: boolean;
} {
  const { pri, sec } = getPrimarySecondary(input.jobType, input.charType);
  const isXenon = input.charType === "xenon";
  const isDa = input.charType === "da";

  const toKey = (s: string): StatKey | null => {
    if (s === "str" || s === "dex" || s === "int" || s === "luk" || s === "hp") {
      return s;
    }
    return null;
  };

  const mainKeys = pri.map(toKey).filter((k): k is StatKey => k != null);
  const secondaryKeys = sec
    .map(toKey)
    .filter((k): k is StatKey => k != null && !mainKeys.includes(k));

  return { mainKeys, secondaryKeys, isXenon, isDa };
}

/**
 * MapleStory damage model (simplified community / wiki form):
 * range = (4*main + sec) * ATT / 100
 * expected = range * crit * (1+dmg+bd) * (1+fd) * iedFactor * masteryAvg
 *
 * Converted main ≈ expected / (∂expected/∂main) so BD/CD/FD/IED fold into one main-stat number.
 */
export function calculateScouter(input: ScouterInput): ScouterResult {
  const { mainKeys, secondaryKeys, isXenon, isDa } = resolveMainSecondary(input);

  let totalMain = 0;
  if (isDa) {
    // DA uses HP as primary; approximate with HP/3.5 contribution common in tools
    totalMain = applyTriple(input.stats.hp) / 3.5;
  } else if (isXenon) {
    totalMain =
      applyTriple(input.stats.str) +
      applyTriple(input.stats.dex) +
      applyTriple(input.stats.luk);
  } else {
    for (const key of mainKeys) totalMain += applyTriple(input.stats[key]);
  }

  let totalSecondary = 0;
  if (!isXenon && !isDa) {
    for (const key of secondaryKeys) {
      totalSecondary += applyTriple(input.stats[key]);
    }
  }

  const attackSource = input.useMagicAttack ? input.magicAttack : input.attack;
  const attackFinal = applyTriple(attackSource);

  // Xenon: all three primaries count as main (×4 each already via summing mains)
  const statValue = isXenon
    ? 4 * totalMain
    : 4 * totalMain + totalSecondary;

  const displayedMax = (statValue * attackFinal) / 100;
  const mastery = clamp01(input.masteryPercent / 100);
  const displayedMin = displayedMax * mastery;

  const critMultiplier = critExpectedMultiplier(
    input.criticalRatePercent,
    input.criticalDamagePercent,
  );
  const bossMultiplier =
    1 + input.damagePercent / 100 + input.bossDamagePercent / 100;
  const normalMultiplier =
    1 +
    input.damagePercent / 100 +
    input.normalEnemyDamagePercent / 100;
  const finalMultiplier = 1 + input.finalDamagePercent / 100;
  const iedMultiplier = iedDamageMultiplier(
    input.ignoreDefensePercent,
    input.bossPdrPercent,
  );
  const masteryAvg = (1 + mastery) / 2;

  const expectedBoss =
    displayedMax *
    critMultiplier *
    bossMultiplier *
    finalMultiplier *
    iedMultiplier *
    masteryAvg;
  const expectedNormal =
    displayedMax *
    critMultiplier *
    normalMultiplier *
    finalMultiplier *
    masteryAvg;

  // ∂expected/∂main ≈ 4 * ATT/100 * multipliers
  const perMain =
    (4 * attackFinal) /
    100 *
    critMultiplier *
    bossMultiplier *
    finalMultiplier *
    iedMultiplier *
    masteryAvg;

  const convertedMain = perMain > 0 ? expectedBoss / perMain : 0;

  // Equivalence: how much main equals +1 of each option at current stats
  const equivAttack =
    attackFinal > 0 ? convertedMain * (1 / attackFinal) : 0;
  const equivBoss =
    bossMultiplier > 0 ? convertedMain * (0.01 / bossMultiplier) : 0;
  const cr = clamp01(input.criticalRatePercent / 100);
  const equivCd =
    critMultiplier > 0 ? convertedMain * ((cr * 0.01) / critMultiplier) : 0;
  const equivFd =
    finalMultiplier > 0 ? convertedMain * (0.01 / finalMultiplier) : 0;
  // +1% IED effect on multiplier
  const pdr = Math.max(0, input.bossPdrPercent / 100);
  const dIedMult = pdr * 0.01;
  const equivIed =
    iedMultiplier > 0 ? convertedMain * (dIedMult / iedMultiplier) : 0;

  return {
    totalMain,
    totalSecondary,
    statValue,
    attackFinal,
    displayedMax,
    displayedMin,
    critMultiplier,
    bossMultiplier,
    normalMultiplier,
    finalMultiplier,
    iedMultiplier,
    expectedBoss,
    expectedNormal,
    convertedMain,
    equiv: {
      oneAttack: equivAttack,
      oneBossPercent: equivBoss,
      oneCritDamage: equivCd,
      oneFinalDamage: equivFd,
      oneIedPercent: equivIed,
    },
  };
}

export const BOSS_PDR_PRESETS = [
  { id: "normal", label: "Normal boss (300%)", value: 300 },
  { id: "hard", label: "Hard boss (350%)", value: 350 },
  { id: "extreme", label: "Extreme (380%)", value: 380 },
  { id: "custom", label: "Custom", value: -1 },
] as const;
