/**
 * Fodder / star-transfer comparison.
 * Port of https://starforce.tadeucci.dev/fodder.js
 */

import { planMetrics } from "./optimizer";
import type { SimOpts, StarPlan } from "./rates";

export const STAR_LOSS = 1;
export const MAX_LEVEL_GAP = 10;

export function zeroBoomPlan(): StarPlan {
  const plan: StarPlan = {};
  for (const s of [15, 16, 17]) plan[s] = { mode: 1, safeguard: true };
  for (const s of [18, 19, 20, 21]) plan[s] = { mode: 4, safeguard: false };
  return plan;
}

export function fodderPlan(safeguard: boolean): StarPlan | null {
  if (!safeguard) return null;
  const plan: StarPlan = {};
  for (const s of [15, 16, 17]) plan[s] = { mode: 1, safeguard: true };
  return plan;
}

function metrics(
  currentStar: number,
  targetStar: number,
  itemLevel: number,
  baseOpts: SimOpts,
  plan: StarPlan | null,
) {
  return planMetrics(currentStar, targetStar, itemLevel, {
    ...baseOpts,
    enhanceMode: 1,
    safeguard: false,
    starPlan: plan,
  });
}

export type FodderStrategy = {
  transferAt: number;
  startStar: number;
  fodderMesos: number;
  finishMesos: number;
  copies: number;
  total: number;
};

export type FodderCompareResult = {
  rawCheap: { mesos: number; spares: number; total: number };
  rawZero: { mesos: number; spares: number; total: number };
  strategies: FodderStrategy[];
  best: FodderStrategy;
  levelGapOk: boolean;
};

export function compareFodder(params: {
  itemLevel: number;
  fodderLevel: number;
  goalStar: number;
  fodderPrice?: number;
  sparePrice?: number;
  fodderSafeguard?: boolean;
  baseOpts: SimOpts;
}): FodderCompareResult {
  const { itemLevel, fodderLevel, goalStar, baseOpts } = params;
  const fodderPrice = params.fodderPrice ?? 0;
  const sparePrice = params.sparePrice ?? 0;

  const cheap = metrics(0, goalStar, itemLevel, baseOpts, null);
  const zero = metrics(0, goalStar, itemLevel, baseOpts, zeroBoomPlan());
  const rawCheap = {
    mesos: cheap.expCost,
    spares: cheap.expBooms,
    total: cheap.expCost + cheap.expBooms * sparePrice,
  };
  const rawZero = { mesos: zero.expCost, spares: 0, total: zero.expCost };

  const strategies: FodderStrategy[] = [];
  const climb = fodderPlan(!!params.fodderSafeguard);
  for (let T = 16; T <= goalStar + STAR_LOSS; T++) {
    const fodder = metrics(0, T, fodderLevel, baseOpts, climb);
    const startStar = T - STAR_LOSS;
    const finish =
      startStar >= goalStar
        ? { expCost: 0, expBooms: 0 }
        : metrics(startStar, goalStar, itemLevel, baseOpts, zeroBoomPlan());
    const copies = 1 + fodder.expBooms;
    strategies.push({
      transferAt: T,
      startStar,
      fodderMesos: fodder.expCost,
      finishMesos: finish.expCost,
      copies,
      total: fodder.expCost + finish.expCost + fodderPrice * copies,
    });
  }

  const PRICE_TOL = 1.02;
  let cheapest = strategies[0]!;
  for (const s of strategies) if (s.total < cheapest.total) cheapest = s;
  let best = cheapest;
  for (const s of strategies) {
    if (s.total > cheapest.total * PRICE_TOL) continue;
    if (
      s.copies < best.copies ||
      (s.copies === best.copies && s.total < best.total)
    )
      best = s;
  }

  return {
    rawCheap,
    rawZero,
    strategies,
    best,
    levelGapOk:
      itemLevel - fodderLevel <= MAX_LEVEL_GAP && fodderLevel <= itemLevel,
  };
}
