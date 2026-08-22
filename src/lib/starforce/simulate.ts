/**
 * Monte Carlo Star Force simulation (GMS v269).
 * Port of https://starforce.tadeucci.dev/simulator.js
 */

import {
  applyRateModifiers,
  attemptCost,
  costMultiplier,
  destroyRecoverStar,
  starForceAttemptCost,
  type SimOpts,
} from "./rates";

export type TrialResult = {
  totalCost: number;
  attempts: number;
  booms: number;
};

export type StarTables = {
  cost: Float64Array;
  succ: Float64Array;
  succMaint: Float64Array;
  boomTo: Int32Array;
  guaranteed: Uint8Array;
};

export function buildStarTables(
  targetStar: number,
  itemLevel: number,
  opts: SimOpts,
): StarTables {
  const cost = new Float64Array(targetStar);
  const succ = new Float64Array(targetStar);
  const succMaint = new Float64Array(targetStar);
  const boomTo = new Int32Array(targetStar);
  const guaranteed = new Uint8Array(targetStar);
  const ff = opts.event === "fivetenfifteen";

  for (let star = 0; star < targetStar; star++) {
    cost[star] = attemptCost(itemLevel, star, opts);
    const [s, m] = applyRateModifiers(star, opts);
    succ[star] = s;
    succMaint[star] = s + m;
    boomTo[star] = destroyRecoverStar(star);
    guaranteed[star] =
      ff && (star === 5 || star === 10 || star === 15) ? 1 : 0;
  }
  return { cost, succ, succMaint, boomTo, guaranteed };
}

export function simulateOnceFast(
  currentStar: number,
  targetStar: number,
  t: StarTables,
): TrialResult {
  const { cost, succ, succMaint, boomTo, guaranteed } = t;
  let star = currentStar;
  let totalCost = 0;
  let attempts = 0;
  let booms = 0;

  while (star < targetStar) {
    totalCost += cost[star]!;
    attempts++;
    if (guaranteed[star]) {
      star++;
      continue;
    }
    const r = Math.random();
    if (r < succ[star]!) {
      star++;
    } else if (r < succMaint[star]!) {
      // maintain
    } else {
      star = boomTo[star]!;
      booms++;
    }
  }
  return { totalCost, attempts, booms };
}

function percentile(sortedAsc: Float64Array | Int32Array, p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.floor(p * sortedAsc.length),
  );
  return sortedAsc[idx]!;
}

export type SimSummary = {
  trials: number;
  avgCost: number;
  medianCost: number;
  p25: number;
  p75: number;
  p95: number;
  avgBooms: number;
  medianBooms: number;
  avgAttempts: number;
  medianAttempts: number;
};

export type RunTrialsInput = {
  currentStar: number;
  targetStar: number;
  itemLevel: number;
  trials: number;
} & SimOpts;

export type RunTrialsOptions = {
  sliceMs?: number;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
};

export function runTrials(
  input: RunTrialsInput,
  options: RunTrialsOptions = {},
): Promise<SimSummary> {
  const sliceMs = options.sliceMs ?? 12;
  const onProgress = options.onProgress;

  return new Promise((resolve, reject) => {
    const {
      currentStar,
      targetStar,
      itemLevel,
      trials,
      starCatching,
      safeguard,
      mvp,
      event,
      enhanceMode,
      starPlan,
    } = input;

    if (targetStar <= currentStar || trials < 1) {
      resolve({
        trials: 0,
        avgCost: 0,
        medianCost: 0,
        p25: 0,
        p75: 0,
        p95: 0,
        avgBooms: 0,
        medianBooms: 0,
        avgAttempts: 0,
        medianAttempts: 0,
      });
      return;
    }

    const opts: SimOpts = {
      starCatching: !!starCatching,
      safeguard: !!safeguard,
      mvp: mvp ?? "none",
      event: event ?? "none",
      enhanceMode: enhanceMode ?? 1,
      starPlan: starPlan ?? null,
    };

    const costs = new Float64Array(trials);
    const booms = new Int32Array(trials);
    const attempts = new Int32Array(trials);
    let sumCost = 0;
    let sumBooms = 0;
    let sumAttempts = 0;
    let i = 0;
    const tables = buildStarTables(targetStar, itemLevel, opts);

    function runChunk() {
      if (options.signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      const sliceStart = Date.now();
      while (i < trials) {
        const t = simulateOnceFast(currentStar, targetStar, tables);
        costs[i] = t.totalCost;
        booms[i] = t.booms;
        attempts[i] = t.attempts;
        sumCost += t.totalCost;
        sumBooms += t.booms;
        sumAttempts += t.attempts;
        i++;
        if ((i & 31) === 0 && Date.now() - sliceStart >= sliceMs) break;
      }

      onProgress?.(i, trials);

      if (i < trials) {
        setTimeout(runChunk, 0);
        return;
      }

      costs.sort();
      booms.sort();
      attempts.sort();

      resolve({
        trials,
        avgCost: sumCost / trials,
        medianCost: percentile(costs, 0.5),
        p25: percentile(costs, 0.25),
        p75: percentile(costs, 0.75),
        p95: percentile(costs, 0.95),
        avgBooms: sumBooms / trials,
        medianBooms: percentile(booms, 0.5),
        avgAttempts: sumAttempts / trials,
        medianAttempts: percentile(attempts, 0.5),
      });
    }

    runChunk();
  });
}

/** One-star attempt cost helper for UI (base × mult). */
export function paidAttemptCost(
  level: number,
  star: number,
  opts: SimOpts,
): number {
  return Math.round(
    starForceAttemptCost(level, star) * costMultiplier(star, opts),
  );
}
