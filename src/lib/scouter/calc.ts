import { getPrimarySecondary } from "@/lib/flames";
import { bowConvertAttackBase } from "./bow-att";
import { computeClassFinalDamage } from "./class-fd";
import { computeCombatPower } from "./combat-power";
import { getWeaponConstant } from "./weapon-constant";
import type { ScouterInput, ScouterResult, StatKey, StatTriple } from "./types";

function applyTriple(t: StatTriple): number {
  return t.base * (1 + t.percent / 100) + t.flat;
}

/** MapleScouter / in-game floor: floor(Number((base*(1+%)+flat).toFixed(10))) */
function tripleFloor(t: StatTriple): number {
  return Math.floor(Number(applyTriple(t).toFixed(10)));
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
  const weaponConstant = getWeaponConstant(
    input.charType,
    input.oneHandSword,
  );

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
  const attackFinal = tripleFloor(attackSource);

  // Floored mains/subs for General Range (MapleScouter)
  const mainFloored = isXenon
    ? tripleFloor(input.stats.str) +
      tripleFloor(input.stats.dex) +
      tripleFloor(input.stats.luk)
    : isDa
      ? tripleFloor(input.stats.hp)
      : mainKeys.reduce((sum, key) => sum + tripleFloor(input.stats[key]), 0);
  const secFloored = isXenon
    ? 0
    : isDa
      ? tripleFloor(input.stats.str)
      : secondaryKeys.reduce(
          (sum, key) => sum + tripleFloor(input.stats[key]),
          0,
        );

  /**
   * Stat numerator from MapleScouter (before /100):
   * DA: ⌊baseHP/3.5⌋ + 0.8×⌊(HP-baseHP)/3.5⌋ + STR
   * Xenon: (STR+DEX+LUK)×4
   * else: 4×main + sub [+ sub2]
   */
  let statNumerator: number;
  if (isDa) {
    const baseHp = 90 * input.level + 545;
    const hp = mainFloored;
    statNumerator =
      Math.floor(baseHp / 3.5) +
      0.8 * Math.floor((hp - baseHp) / 3.5) +
      secFloored;
  } else if (isXenon) {
    statNumerator = mainFloored * 4;
  } else {
    statNumerator = 4 * mainFloored + secFloored;
  }
  const statTerm = statNumerator / 100;

  const statValue = isXenon
    ? 4 * totalMain
    : isDa
      ? statNumerator
      : 4 * totalMain + totalSecondary;

  const mastery = clamp01(input.masteryPercent / 100);
  // Kanna adds +31 Damage% into General Range (+32 with Passive Skills +1)
  const kannaBonus =
    input.charType === "kanna"
      ? input.specialInnerAbility === "passivePlus1"
        ? 32
        : 31
      : 0;
  const rangeDamagePercent = input.damagePercent + kannaBonus;
  const rangeDamageMultiplier = 1 + rangeDamagePercent / 100;
  // Recompute FD at full precision (avoid rounded input.finalDamagePercent drift)
  const rangeFinalDamage = computeClassFinalDamage(input.charType, {
    level: input.level,
    reboot: input.reboot,
    liberation: input.liberation,
    passiveSkillPlus1: input.specialInnerAbility === "passivePlus1",
  });
  const finalMultiplier = 1 + rangeFinalDamage / 100;

  /**
   * MapleScouter General Range (스공):
   * floor( round(⌊ATT⌋ × WC × statNum/100) × (1+DMG%) × (1+FD%) )
   */
  const upperRange = Math.round(
    attackFinal * weaponConstant * (statNumerator / 100),
  );
  const displayedMax = Math.floor(
    upperRange * rangeDamageMultiplier * finalMultiplier,
  );
  const displayedMin = Math.floor(displayedMax * mastery);

  // Upper range before Damage%/FD (for expected damage; includes WC)
  const baseMax = attackFinal * weaponConstant * (statNumerator / 100);

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

  // ∂expected/∂main ≈ 4 * ATT * WC / 100 * multipliers (at current PDR)
  const perMainAt = (pdrPercent: number) => {
    const ied = iedDamageMultiplier(input.ignoreDefensePercent, pdrPercent);
    return (
      ((4 * attackFinal * weaponConstant) / 100) *
      critMultiplier *
      bossMultiplier *
      finalMultiplier *
      ied *
      masteryAvg
    );
  };
  const expectedBossAt = (pdrPercent: number) => {
    const ied = iedDamageMultiplier(input.ignoreDefensePercent, pdrPercent);
    return (
      baseMax *
      critMultiplier *
      bossMultiplier *
      finalMultiplier *
      ied *
      masteryAvg
    );
  };
  const convertedAt = (pdrPercent: number) => {
    const per = perMainAt(pdrPercent);
    return per > 0 ? expectedBossAt(pdrPercent) / per : 0;
  };

  const perMain = perMainAt(input.bossPdrPercent);
  const convertedMain = perMain > 0 ? expectedBoss / perMain : 0;
  const boss300Stat = convertedAt(300);
  const boss380Stat = convertedAt(380);

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
   * In-game Combat Power (전투력) — community formula, not MapleScouter.
   * ATT is bow-normalized when Oz weapon total is filled; FD is skill-excluded
   * from the Final Damage field (Reboot / Liberation / gear).
   */
  const combatAttBase = bowConvertAttackBase(
    input.charType,
    attackSource.base,
    input.ozWeaponTotalAtt,
  );
  const combatAttackFloor = Math.floor(
    Number(
      (combatAttBase * (1 + attackSource.percent / 100) + attackSource.flat).toFixed(
        10,
      ),
    ),
  );
  const combatPower = computeCombatPower({
    statNumerator,
    attackFloor: combatAttackFloor,
    damagePercent: input.damagePercent,
    bossDamagePercent: input.bossDamagePercent,
    finalDamagePercent: input.finalDamagePercent,
    criticalDamagePercent: input.criticalDamagePercent,
  });

  /**
   * MapleScouter Result popup fields (local analogues of CALC_DMG):
   * - ITEM STAT / 환산  → expected boss damage index
   * - HEXA STAT        → same until hexa skill DPM is modeled
   * - Dojo / 무릉      → expected normal-enemy damage
   * - Boss 300 / 380   → converted main at that PDR
   */
  const itemStat = expectedBoss;
  const hexaStat = expectedBoss;
  const dojoStat = expectedNormal;

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
    boss300Stat,
    boss380Stat,
    itemStat,
    hexaStat,
    dojoStat,
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
