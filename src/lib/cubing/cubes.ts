import type { CubeType, CubeQuantiles } from "./types";
import { geoDistrQuantile } from "./statistics";

export function getCubeCost(cubeType: CubeType): number {
  switch (cubeType) {
    case "red":
      return 12_000_000;
    case "black":
      return 22_000_000;
    case "master":
      return 7_500_000;
    default:
      return 0;
  }
}

export function getRevealCostConstant(itemLevel: number): number {
  if (itemLevel < 30) return 0;
  if (itemLevel <= 70) return 0.5;
  if (itemLevel <= 120) return 2.5;
  return 20;
}

export function cubingCost(
  cubeType: CubeType,
  itemLevel: number,
  totalCubeCount: number,
): number {
  const cubeCost = getCubeCost(cubeType);
  const revealCostConst = getRevealCostConstant(itemLevel);
  const revealPotentialCost = revealCostConst * itemLevel ** 2;
  return cubeCost * totalCubeCount + totalCubeCount * revealPotentialCost;
}

/** Nexon / community tier-up rates */
export const tierRates: Record<CubeType, Partial<Record<number, number>>> = {
  occult: { 0: 0.009901 },
  master: { 0: 0.1184, 1: 0.0381 },
  meister: { 0: 0.1163, 1: 0.0879, 2: 0.0459 },
  red: { 0: 0.14, 1: 0.06, 2: 0.025 },
  black: { 0: 0.17, 1: 0.11, 2: 0.05 },
};

export const tierRatesDmt: Record<CubeType, Partial<Record<number, number>>> = {
  ...tierRates,
  red: { 0: 0.14 * 2, 1: 0.06 * 2, 2: 0.025 * 2 },
  black: { 0: 0.17 * 2, 1: 0.11 * 2, 2: 0.05 * 2 },
};

export const maxCubeTier: Record<CubeType, number> = {
  occult: 1,
  master: 2,
  meister: 3,
  red: 3,
  black: 3,
};

export function getTierCosts(
  currentTier: number,
  desiredTier: number,
  cubeType: CubeType,
  dmt: boolean,
): CubeQuantiles {
  const rates = dmt ? tierRatesDmt : tierRates;
  let mean = 0;
  let median = 0;
  let seventy_fifth = 0;
  let eighty_fifth = 0;
  let nintey_fifth = 0;
  for (let i = currentTier; i < desiredTier; i++) {
    const p = rates[cubeType][i];
    if (!p) continue;
    const stats = geoDistrQuantile(p);
    mean += Math.round(stats.mean);
    median += Math.round(stats.median);
    seventy_fifth += Math.round(stats.seventy_fifth);
    eighty_fifth += Math.round(stats.eighty_fifth);
    nintey_fifth += Math.round(stats.nintey_fifth);
  }
  return { mean, median, seventy_fifth, eighty_fifth, nintey_fifth };
}

export function suggestCubeType(
  desiredTier: number,
  currentTier: number,
  currentCube: CubeType,
): CubeType {
  const tieringUp = currentTier !== desiredTier;
  if (tieringUp) {
    if (maxCubeTier[currentCube] >= desiredTier) return currentCube;
    return desiredTier === 1 ? "master" : "black";
  }
  if (desiredTier === 1) return "occult";
  if (desiredTier === 2) return "master";
  return "red";
}
