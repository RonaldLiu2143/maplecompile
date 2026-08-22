/**
 * Per-star mode optimizer. Port of https://starforce.tadeucci.dev/optimizer.js
 */

import {
  applyRateModifiers,
  attemptCost,
  destroyRecoverStar,
  type EnhanceMode,
  type SimOpts,
  type StarPlan,
  type StarPlanEntry,
} from "./rates";
import { buildStarTables, simulateOnceFast } from "./simulate";

export const PLAN_STARS = [15, 16, 17, 18, 19, 20, 21] as const;

export function starOptions(star: number): StarPlanEntry[] {
  const opts: StarPlanEntry[] = [
    { mode: 1, safeguard: false },
    { mode: 2, safeguard: false },
    { mode: 3, safeguard: false },
  ];
  if (star <= 17) opts.splice(1, 0, { mode: 1, safeguard: true });
  else opts.push({ mode: 4, safeguard: false });
  return opts;
}

export function optimizableStars(targetStar: number): number[] {
  return PLAN_STARS.filter((s) => s < targetStar);
}

type Tables = {
  cost: Float64Array;
  succ: Float64Array;
  boom: Float64Array;
  dropTo: Int32Array;
};

function buildTables(
  targetStar: number,
  itemLevel: number,
  opts: SimOpts,
): Tables {
  const cost = new Float64Array(targetStar);
  const succ = new Float64Array(targetStar);
  const boom = new Float64Array(targetStar);
  const dropTo = new Int32Array(targetStar);
  const ff = opts.event === "fivetenfifteen";

  for (let s = 0; s < targetStar; s++) {
    cost[s] = attemptCost(itemLevel, s, opts);
    if (ff && (s === 5 || s === 10 || s === 15)) {
      succ[s] = 1;
      boom[s] = 0;
    } else {
      const [sc, , bm] = applyRateModifiers(s, opts);
      succ[s] = sc;
      boom[s] = bm;
    }
    dropTo[s] = destroyRecoverStar(s);
  }
  return { cost, succ, boom, dropTo };
}

function metrics(
  currentStar: number,
  targetStar: number,
  t: Tables,
  prefG: Float64Array,
  prefB: Float64Array,
): { expCost: number; expBooms: number } {
  const { cost, succ, boom, dropTo } = t;
  prefG[0] = 0;
  prefB[0] = 0;
  for (let i = 0; i < targetStar; i++) {
    const s = succ[i]!;
    const b = boom[i]!;
    const d = dropTo[i]!;
    const R = prefG[i]! - prefG[d]!;
    const RB = prefB[i]! - prefB[d]!;
    const G = (cost[i]! + b * R) / s;
    const GB = (b * (1 + RB)) / s;
    prefG[i + 1] = prefG[i]! + G;
    prefB[i + 1] = prefB[i]! + GB;
  }
  return {
    expCost: prefG[targetStar]! - prefG[currentStar]!,
    expBooms: prefB[targetStar]! - prefB[currentStar]!,
  };
}

export function planMetrics(
  currentStar: number,
  targetStar: number,
  itemLevel: number,
  opts: SimOpts,
): { expCost: number; expBooms: number } {
  const tables = buildTables(targetStar, itemLevel, opts);
  const prefG = new Float64Array(targetStar + 1);
  const prefB = new Float64Array(targetStar + 1);
  return metrics(currentStar, targetStar, tables, prefG, prefB);
}

type OptionTriple = {
  choice: StarPlanEntry;
  cost: number;
  succ: number;
  boom: number;
};

function optionTriples(
  stars: number[],
  itemLevel: number,
  baseOpts: SimOpts,
): OptionTriple[][] {
  const ff = baseOpts.event === "fivetenfifteen";
  return stars.map((star) => {
    const guaranteed = ff && star === 15;
    return starOptions(star).map((choice) => {
      const opts: SimOpts = {
        ...baseOpts,
        starPlan: { [star]: choice },
      };
      const cost = attemptCost(itemLevel, star, opts);
      let succ: number;
      let boom: number;
      if (guaranteed) {
        succ = 1;
        boom = 0;
      } else {
        const [s, , b] = applyRateModifiers(star, opts);
        succ = s;
        boom = b;
      }
      return { choice, cost, succ, boom };
    });
  });
}

function planFromChoices(stars: number[], choices: StarPlanEntry[]): StarPlan {
  const plan: StarPlan = {};
  for (const s of PLAN_STARS) plan[s] = { mode: 1, safeguard: false };
  stars.forEach((s, j) => {
    plan[s] = {
      mode: choices[j]!.mode,
      safeguard: !!choices[j]!.safeguard,
    };
  });
  return plan;
}

export type FrontierCandidate = {
  plan: StarPlan;
  expCost: number;
  expBooms: number;
};

export function optimizeFrontier(params: {
  currentStar: number;
  targetStar: number;
  itemLevel: number;
  opts: SimOpts;
  maxCandidates?: number;
}): {
  empty?: boolean;
  candidates?: FrontierCandidate[];
  frontierSize?: number;
  evaluated?: number;
} {
  const { currentStar, targetStar, itemLevel, opts } = params;
  const stars = optimizableStars(targetStar);
  if (stars.length === 0) return { empty: true };
  const cap = params.maxCandidates ?? 24;

  const all: {
    choices: StarPlanEntry[];
    expCost: number;
    expBooms: number;
  }[] = [];

  const base: SimOpts = {
    ...opts,
    starPlan: null,
    enhanceMode: 1,
  };
  const tables = buildTables(targetStar, itemLevel, base);
  const { cost, succ, boom } = tables;
  const triples = optionTriples(stars, itemLevel, opts);
  const radices = triples.map((o) => o.length);
  let total = 1;
  for (const r of radices) total *= r;

  const prefG = new Float64Array(targetStar + 1);
  const prefB = new Float64Array(targetStar + 1);

  for (let idx = 0; idx < total; idx++) {
    let n = idx;
    const choices: StarPlanEntry[] = new Array(stars.length);
    for (let j = 0; j < stars.length; j++) {
      const r = radices[j]!;
      const o = triples[j]![n % r]!;
      n = (n - (n % r)) / r;
      const star = stars[j]!;
      cost[star] = o.cost;
      succ[star] = o.succ;
      boom[star] = o.boom;
      choices[j] = o.choice;
    }
    const m = metrics(currentStar, targetStar, tables, prefG, prefB);
    all.push({
      choices: choices.slice(),
      expCost: m.expCost,
      expBooms: m.expBooms,
    });
  }

  all.sort((a, b) => a.expCost - b.expCost || a.expBooms - b.expBooms);
  const frontier: typeof all = [];
  let minBooms = Infinity;
  for (const c of all) {
    if (c.expBooms < minBooms - 1e-9) {
      frontier.push(c);
      minBooms = c.expBooms;
    }
  }

  let picked = frontier;
  if (frontier.length > cap) {
    picked = [];
    const step = (frontier.length - 1) / (cap - 1);
    for (let i = 0; i < cap; i++)
      picked.push(frontier[Math.round(i * step)]!);
  }

  return {
    candidates: picked.map((c) => ({
      plan: planFromChoices(stars, c.choices),
      expCost: c.expCost,
      expBooms: c.expBooms,
    })),
    frontierSize: frontier.length,
    evaluated: all.length,
  };
}

export function successProb(
  input: {
    currentStar: number;
    targetStar: number;
    itemLevel: number;
  } & SimOpts,
  budgetMesos: number,
  spares: number,
  trials: number,
): number {
  const opts: SimOpts = {
    starCatching: !!input.starCatching,
    safeguard: !!input.safeguard,
    mvp: input.mvp ?? "none",
    event: input.event ?? "none",
    enhanceMode: (input.enhanceMode ?? 1) as EnhanceMode,
    starPlan: input.starPlan ?? null,
  };
  const tables = buildStarTables(input.targetStar, input.itemLevel, opts);
  let ok = 0;
  for (let i = 0; i < trials; i++) {
    const t = simulateOnceFast(input.currentStar, input.targetStar, tables);
    if (t.totalCost <= budgetMesos && t.booms <= spares) ok++;
  }
  return ok / trials;
}
