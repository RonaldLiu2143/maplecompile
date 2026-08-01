import { cubingCost, getTierCosts } from "./cubes";
import { geoDistrQuantile } from "./statistics";
import { getProbability, translateInputToObject } from "./probability";
import type {
  CubeQuantiles,
  CubingResult,
  CubeType,
  ItemCategory,
  Tier,
} from "./types";

const QUANTILE_KEYS = [
  "mean",
  "median",
  "seventy_fifth",
  "eighty_fifth",
  "nintey_fifth",
] as const satisfies readonly (keyof CubeQuantiles)[];

function mapQuantiles(
  stats: CubeQuantiles,
  tierUp: CubeQuantiles,
): CubeQuantiles {
  const out = { ...stats };
  for (const key of QUANTILE_KEYS) {
    out[key] = Math.round(stats[key]) + tierUp[key];
  }
  return out;
}

function zeroQuantiles(): CubeQuantiles {
  return {
    mean: 0,
    median: 0,
    seventy_fifth: 0,
    eighty_fifth: 0,
    nintey_fifth: 0,
  };
}

export function runCubingCalc(input: {
  itemType: ItemCategory;
  cubeType: CubeType;
  currentTier: Tier;
  desiredTier: Tier;
  itemLevel: number;
  desiredStat: string;
  dmt: boolean;
}): CubingResult {
  const tierUp = getTierCosts(
    input.currentTier,
    input.desiredTier,
    input.cubeType,
    input.dmt,
  );

  const anyStats = input.desiredStat === "any";
  const probability = anyStats
    ? 1
    : getProbability(
        input.desiredTier,
        translateInputToObject(input.desiredStat),
        input.itemType,
        input.cubeType,
        input.itemLevel,
      );

  const lineStats = anyStats ? zeroQuantiles() : geoDistrQuantile(probability);
  const cubes = mapQuantiles(lineStats, tierUp);
  const mesos = { ...cubes };
  for (const key of QUANTILE_KEYS) {
    mesos[key] = cubingCost(input.cubeType, input.itemLevel, cubes[key]);
  }

  return { cubes, mesos, probability };
}
