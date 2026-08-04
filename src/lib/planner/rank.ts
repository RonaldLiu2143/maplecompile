import {
  buildCubeCandidates,
  buildFlameCandidates,
  buildStarForceCandidates,
} from "./candidates";
import { fdPerBillionMeso, measureFdGain } from "./fd";
import { flattenEquips } from "./pieces";
import { DEFAULT_FLAME_PRICES } from "./types";
import type {
  PlannerInputs,
  RankedUpgrade,
  UpgradeCandidate,
  UpgradeKind,
} from "./types";

export type RankOptions = {
  kinds?: UpgradeKind[];
  /** Limit candidates before ranking (per kind soft cap happens in builders). */
  topN?: number;
};

/**
 * Build SF + flame + cube upgrade candidates from saved setup / scouter, then
 * rank by FD% per billion meso.
 *
 * Ranking formula:
 *   base = calculateScouter(input).expectedBoss
 *   next = calculateScouter(applyStatDelta(input, delta)).expectedBoss
 *   fdPercent = (next / base - 1) * 100
 *   efficiency = fdPercent / (mesoCost / 1e9)
 */
export function rankUpgrades(
  inputs: PlannerInputs,
  opts: RankOptions = {},
): RankedUpgrade[] {
  const kinds = new Set<UpgradeKind>(
    opts.kinds ?? ["starforce", "flame", "cube"],
  );
  const prices = inputs.flamePrices ?? DEFAULT_FLAME_PRICES;
  const pieces = flattenEquips(inputs.setup, inputs.flames, inputs.overrides);

  const candidates: UpgradeCandidate[] = [];
  for (const piece of pieces) {
    if (kinds.has("starforce")) {
      candidates.push(...buildStarForceCandidates(piece));
    }
    if (kinds.has("flame")) {
      candidates.push(
        ...buildFlameCandidates(
          piece,
          inputs.jobType,
          inputs.charType,
          prices,
        ),
      );
    }
    if (kinds.has("cube")) {
      candidates.push(...buildCubeCandidates(piece));
    }
  }

  const ranked: RankedUpgrade[] = [];
  for (const c of candidates) {
    if (!Number.isFinite(c.mesoCost) || c.mesoCost <= 0) continue;
    const { fdPercent, fdAbsolute } = measureFdGain(inputs.scouter, c.delta);
    if (fdPercent <= 0) continue;
    ranked.push({
      ...c,
      fdPercent,
      fdAbsolute,
      fdPerBillionMeso: fdPerBillionMeso(fdPercent, c.mesoCost),
    });
  }

  ranked.sort((a, b) => b.fdPerBillionMeso - a.fdPerBillionMeso);
  const topN = opts.topN ?? inputs.topN ?? 40;
  return ranked.slice(0, topN);
}
