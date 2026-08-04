import { resolveMainSecondary, calculateScouter } from "@/lib/scouter/calc";
import type { ScouterInput, StatKey } from "@/lib/scouter/types";
import type { StatDelta } from "./types";

function stackIed(current: number, add: number): number {
  if (add <= 0) return current;
  const a = Math.min(100, Math.max(0, current)) / 100;
  const b = Math.min(100, Math.max(0, add)) / 100;
  return (1 - (1 - a) * (1 - b)) * 100;
}

/** Apply flat / % deltas onto a scouter input (mirrors Additional Spec Sim). */
export function applyStatDelta(
  base: ScouterInput,
  delta: StatDelta,
): ScouterInput {
  const next: ScouterInput = structuredClone(base);
  const { mainKeys, secondaryKeys } = resolveMainSecondary(next);

  if (delta.finalDamage) next.finalDamagePercent += delta.finalDamage;
  if (delta.bossPercent) next.bossDamagePercent += delta.bossPercent;
  if (delta.critDamage) next.criticalDamagePercent += delta.critDamage;
  if (delta.iedPercent) {
    next.ignoreDefensePercent = stackIed(
      next.ignoreDefensePercent,
      delta.iedPercent,
    );
  }

  if (delta.att || delta.attPercent) {
    const atkKey = next.useMagicAttack ? "magicAttack" : "attack";
    next[atkKey] = {
      ...next[atkKey],
      base: next[atkKey].base + (delta.att ?? 0),
      percent: next[atkKey].percent + (delta.attPercent ?? 0),
    };
  }

  const allPer = delta.allStatPercent ?? 0;
  const mainAdd = delta.mainStat ?? 0;
  for (const key of mainKeys) {
    next.stats[key] = {
      ...next.stats[key],
      base: next.stats[key].base + mainAdd,
      percent: next.stats[key].percent + allPer,
    };
  }
  const subAdd = delta.subStat ?? 0;
  for (const key of secondaryKeys) {
    next.stats[key] = {
      ...next.stats[key],
      base: next.stats[key].base + subAdd,
      percent: next.stats[key].percent + allPer,
    };
  }
  if (allPer) {
    for (const key of ["str", "dex", "int", "luk"] as StatKey[]) {
      if (mainKeys.includes(key) || secondaryKeys.includes(key)) continue;
      next.stats[key] = {
        ...next.stats[key],
        percent: next.stats[key].percent + allPer,
      };
    }
  }

  return next;
}

export function measureFdGain(
  base: ScouterInput,
  delta: StatDelta,
): { fdPercent: number; fdAbsolute: number; baseExpected: number; nextExpected: number } {
  const baseResult = calculateScouter(base);
  const nextResult = calculateScouter(applyStatDelta(base, delta));
  const baseExpected = baseResult.expectedBoss;
  const nextExpected = nextResult.expectedBoss;
  const fdAbsolute = nextExpected - baseExpected;
  const fdPercent =
    baseExpected > 0 ? (nextExpected / baseExpected - 1) * 100 : 0;
  return { fdPercent, fdAbsolute, baseExpected, nextExpected };
}

export function fdPerBillionMeso(fdPercent: number, mesoCost: number): number {
  if (!Number.isFinite(fdPercent) || fdPercent <= 0) return 0;
  if (!Number.isFinite(mesoCost) || mesoCost <= 0) return Infinity;
  return fdPercent / (mesoCost / 1e9);
}
