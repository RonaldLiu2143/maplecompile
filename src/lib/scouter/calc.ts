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

const OZ_PRIMARY_STATS: StatKey[] = ["str", "dex", "int", "luk"];

/**
 * Oz Ring asks for the primary stats not used as main/sub on the left
 * (e.g. STR main + DEX sub → INT + LUK), plus weapon ATT/MATT separately.
 */
export function resolveOzRingStats(input: ScouterInput): {
  keys: StatKey[];
  weaponLabel: "ATT" | "MATT";
} {
  const { mainKeys, secondaryKeys, isXenon, isDa } = resolveMainSecondary(input);
  const weaponLabel: "ATT" | "MATT" =
    input.useMagicAttack || input.jobType === "magician" ? "MATT" : "ATT";

  const used = new Set<StatKey>();
  for (const k of mainKeys) {
    if (k !== "hp") used.add(k);
  }
  for (const k of secondaryKeys) used.add(k);
  // DA left column also enters STR alongside Max HP
  if (isDa) used.add("str");
  if (isXenon) {
    used.add("str");
    used.add("dex");
    used.add("luk");
  }

  return {
    keys: OZ_PRIMARY_STATS.filter((k) => !used.has(k)),
    weaponLabel,
  };
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

  // Base range before Damage% / FD (used for expected / converted main)
  const baseMax = (statValue * attackFinal) / 100;
  const mastery = clamp01(input.masteryPercent / 100);
  const damageMultiplier = 1 + input.damagePercent / 100;
  const finalMultiplier = 1 + input.finalDamagePercent / 100;

  // Character-window General Range includes Damage% + Final Damage (not Boss Damage)
  const displayedMax = Math.floor(baseMax * damageMultiplier * finalMultiplier);
  const displayedMin = Math.floor(displayedMax * mastery);

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
  const iedMultiplier = iedDamageMultiplier(
    input.ignoreDefensePercent,
    input.bossPdrPercent,
  );
  const masteryAvg = (1 + mastery) / 2;

  const expectedBoss =
    baseMax *
    critMultiplier *
    bossMultiplier *
    finalMultiplier *
    iedMultiplier *
    masteryAvg;
  const expectedNormal =
    baseMax *
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

  /**
   * In-game Combat Power (전투력):
   * floor( (4*main+sec)*0.01 * floor(ATT*(1+ATT%)) * (1+DMG+BD) * (1+FD) * (1.35+CD) )
   * Excludes IED, crit rate, mastery. Weapon→bow ATT conversion omitted (needs weapon base).
   * DA / Xenon use their special main-stat terms.
   */
  let combatStatTerm: number;
  if (isDa) {
    const hpTerm = Math.floor(applyTriple(input.stats.hp) / 3.5);
    const strTerm = Math.floor(applyTriple(input.stats.str));
    combatStatTerm = (hpTerm + strTerm) * 0.01;
  } else if (isXenon) {
    combatStatTerm =
      (Math.floor(applyTriple(input.stats.str)) +
        Math.floor(applyTriple(input.stats.dex)) +
        Math.floor(applyTriple(input.stats.luk))) *
      4 *
      0.01;
  } else {
    combatStatTerm =
      (4 * Math.floor(totalMain) + Math.floor(totalSecondary)) * 0.01;
  }
  const combatAtt = Math.floor(attackFinal);
  const combatCd = 1.35 + input.criticalDamagePercent / 100;
  const combatPower = Math.floor(
    combatStatTerm *
      combatAtt *
      bossMultiplier *
      finalMultiplier *
      combatCd,
  );

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
    combatPower,
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
