export type {
  CubeType,
  ItemCategory,
  StatType,
  Tier,
  CubingResult,
  DesiredStatGroup,
} from "./types";

export {
  getCubeCost,
  cubingCost,
  getTierCosts,
  maxCubeTier,
  suggestCubeType,
} from "./cubes";
export { geoDistrQuantile } from "./statistics";
export {
  getProbability,
  translateInputToObject,
  emptyInputObject,
} from "./probability";
export { buildDesiredStatGroups, canPickDesiredStat } from "./desiredStats";

import { cubingCost, getTierCosts } from "./cubes";
import { geoDistrQuantile } from "./statistics";
import { getProbability, translateInputToObject } from "./probability";
import type { CubeType, CubingResult } from "./types";

export function runCubingCalc(input: {
  itemType: string;
  cubeType: CubeType;
  currentTier: number;
  desiredTier: number;
  itemLevel: number;
  desiredStat: string;
  dmt: boolean;
}): CubingResult {
  const anyStats = input.desiredStat === "any";
  const probabilityInput = translateInputToObject(input.desiredStat);
  const p = anyStats
    ? 1
    : getProbability(
        input.desiredTier,
        probabilityInput,
        input.itemType,
        input.cubeType,
        input.itemLevel,
      );
  const tierUp = getTierCosts(
    input.currentTier,
    input.desiredTier,
    input.cubeType,
    input.dmt,
  );
  let stats = geoDistrQuantile(p);
  if (anyStats) {
    stats = {
      mean: 0,
      median: 0,
      seventy_fifth: 0,
      eighty_fifth: 0,
      nintey_fifth: 0,
    };
  }

  const cubes = {
    mean: Math.round(stats.mean) + tierUp.mean,
    median: Math.round(stats.median) + tierUp.median,
    seventy_fifth: Math.round(stats.seventy_fifth) + tierUp.seventy_fifth,
    eighty_fifth: Math.round(stats.eighty_fifth) + tierUp.eighty_fifth,
    nintey_fifth: Math.round(stats.nintey_fifth) + tierUp.nintey_fifth,
  };

  const mesos = {
    mean: cubingCost(input.cubeType, input.itemLevel, cubes.mean),
    median: cubingCost(input.cubeType, input.itemLevel, cubes.median),
    seventy_fifth: cubingCost(
      input.cubeType,
      input.itemLevel,
      cubes.seventy_fifth,
    ),
    eighty_fifth: cubingCost(
      input.cubeType,
      input.itemLevel,
      cubes.eighty_fifth,
    ),
    nintey_fifth: cubingCost(
      input.cubeType,
      input.itemLevel,
      cubes.nintey_fifth,
    ),
  };

  return { cubes, mesos, probability: p, cubeType: input.cubeType };
}
