/**
 * Heroic / GMS Star Force meso costs + expected EV (non-Superior).
 *
 * Source of truth for attempt costs, Mode-1 rates, safeguard, and boom
 * recovery: https://starforce.tadeucci.dev/ (`rates.js` / `simulator.js`,
 * GMS v269 Enhancement Modes — Mode 1 = classic baseline).
 *
 * Post-v264 GMS: fail maintains the current star (no star drop). Outcomes are
 * success / maintain / destroy. Destroy recovery follows Core Restoration
 * (15–19→12, 20→15, 21–22→17, …).
 *
 * Planner defaults (Heroic-first):
 * - Mode 1 only (Enhancement Modes 2–4 are not selected by the planner).
 * - Safeguard on for 15★–17★ (safeguard to 18★; 3× meso, boom → maintain).
 * - No MVP / event / star-catching discounts.
 * - Boom spare / restoration meso = 0 (Heroic cores/points not modeled).
 * - Stat gains are community approximations for relative FD ranking.
 */

export type SfRates = {
  success: number;
  /** Fail that keeps current star (post-v264: all non-destroy fails). */
  stay: number;
  /**
   * Fail that drops 1 star. Always 0 for normal GMS gear after v264;
   * kept for API compatibility / Superior stubs.
   */
  drop: number;
  destroy: number;
};

/**
 * GMS Mode-1 rates for enhancing FROM `star` → star+1.
 * Triple is [success, maintain, boom] and sums to 1 (from starforce.tadeucci.dev).
 */
export function starForceRates(star: number): SfRates {
  // success, maintain, boom
  const table: Array<[number, number, number]> = [
    [0.95, 0.05, 0],
    [0.9, 0.1, 0],
    [0.85, 0.15, 0],
    [0.85, 0.15, 0],
    [0.8, 0.2, 0],
    [0.75, 0.25, 0],
    [0.7, 0.3, 0],
    [0.65, 0.35, 0],
    [0.6, 0.4, 0],
    [0.55, 0.45, 0],
    [0.5, 0.5, 0],
    [0.45, 0.55, 0],
    [0.4, 0.6, 0],
    [0.35, 0.65, 0],
    [0.3, 0.7, 0],
    [0.3, 0.679, 0.021],
    [0.3, 0.679, 0.021],
    [0.15, 0.782, 0.068],
    [0.15, 0.782, 0.068],
    [0.15, 0.765, 0.085],
    [0.3, 0.595, 0.105],
    [0.15, 0.7225, 0.1275],
    [0.15, 0.68, 0.17],
    [0.1, 0.72, 0.18],
    [0.1, 0.72, 0.18],
    [0.1, 0.72, 0.18],
    [0.07, 0.744, 0.186],
    [0.05, 0.76, 0.19],
    [0.03, 0.776, 0.194],
    [0.01, 0.792, 0.198],
  ];
  const row = table[Math.max(0, Math.min(star, table.length - 1))]!;
  const [success, stay, destroy] = row;
  return { success, stay, drop: 0, destroy };
}

/**
 * Cost coefficients from starforce.tadeucci.dev `rates.js` COST_COEFS.
 * Formula: 100 * round(mult * levelTier³ * (star+1)^expo / divisor + 10)
 * where levelTier = floor(itemLevel / 10) * 10.
 */
const COST_COEFS: Record<number, { divisor: number; expo: number; mult: number }> =
  (() => {
    const c: Record<number, { divisor: number; expo: number; mult: number }> =
      {};
    for (let s = 0; s <= 9; s++) c[s] = { divisor: 2500, expo: 1, mult: 1 };
    c[10] = { divisor: 40000, expo: 2.7, mult: 1 };
    c[11] = { divisor: 22000, expo: 2.7, mult: 1 };
    c[12] = { divisor: 15000, expo: 2.7, mult: 1 };
    c[13] = { divisor: 11000, expo: 2.7, mult: 1 };
    c[14] = { divisor: 7500, expo: 2.7, mult: 1 };
    c[15] = { divisor: 20000, expo: 2.7, mult: 1 };
    c[16] = { divisor: 20000, expo: 2.7, mult: 1 };
    c[17] = { divisor: 20000, expo: 2.7, mult: 4 / 3 };
    c[18] = { divisor: 20000, expo: 2.7, mult: 20 / 7 };
    c[19] = { divisor: 20000, expo: 2.7, mult: 40 / 9 };
    c[20] = { divisor: 20000, expo: 2.7, mult: 1 };
    c[21] = { divisor: 20000, expo: 2.7, mult: 8 / 5 };
    for (let s = 22; s <= 29; s++) c[s] = { divisor: 20000, expo: 2.7, mult: 1 };
    return c;
  })();

/**
 * Base meso cost for one Mode-1 attempt at `star` → star+1 on a level-`level` item.
 * Matches starforce.tadeucci.dev `SF.baseCost`.
 */
export function starForceAttemptCost(level: number, star: number): number {
  const S = Math.max(0, Math.min(29, Math.floor(star)));
  const c = COST_COEFS[S] ?? COST_COEFS[29]!;
  const levelTier = Math.floor(Math.max(0, level) / 10) * 10;
  const raw =
    (c.mult * Math.pow(levelTier, 3) * Math.pow(S + 1, c.expo)) / c.divisor +
    10;
  return 100 * Math.round(raw);
}

/** GMS recover-after-destroy star (Core Restoration / boomDropStar). */
export function destroyRecoverStar(destroyedAt: number): number {
  if (destroyedAt < 20) return 12;
  if (destroyedAt === 20) return 15;
  if (destroyedAt < 23) return 17;
  if (destroyedAt < 26) return 19;
  return 20;
}

export type ExpectedSfCostOpts = {
  /**
   * Safeguard to 18★ (stars 15–17): +2× cost multiplier (3× total), boom → maintain.
   * Default true.
   */
  safeguard?: boolean;
  /** Cap star for EV solve (default 30). */
  maxStar?: number;
};

/**
 * Paid meso for one attempt after Mode-1 cost multipliers (safeguard only here).
 * Mirrors starforce.tadeucci.dev `costMultiplier` for Mode 1 / no event / no MVP.
 */
function attemptCostPaid(
  level: number,
  star: number,
  safeguard: boolean,
): number {
  let mult = 1;
  if (safeguard && star >= 15 && star <= 17) mult += 2;
  return Math.round(starForceAttemptCost(level, star) * mult);
}

function ratesForAttempt(star: number, safeguard: boolean): SfRates {
  const rates = starForceRates(star);
  if (safeguard && star >= 15 && star <= 17) {
    return {
      success: rates.success,
      stay: rates.stay + rates.destroy,
      drop: 0,
      destroy: 0,
    };
  }
  return rates;
}

/**
 * Solve A E = b for expected remaining cost E[s] to reach `to` from each star s.
 * For each s < to:
 *   (1 - stay) E[s] - success E[s+1] - destroy E[recover] = cost
 * with E[to] = 0. Boom cycles need a direct linear solve (Gauss–Seidel under-
 * estimates badly within a few dozen iters at 22★+).
 */
function solveExpectedCosts(
  level: number,
  to: number,
  safeguard: boolean,
): Float64Array {
  const n = to; // unknowns E[0] .. E[to-1]
  const A: Float64Array[] = Array.from(
    { length: n },
    () => new Float64Array(n),
  );
  const b = new Float64Array(n);

  for (let s = 0; s < to; s++) {
    const { success, stay, destroy } = ratesForAttempt(s, safeguard);
    const cost = attemptCostPaid(level, s, safeguard);
    A[s]![s]! += 1 - stay;
    b[s]! = cost;
    if (s + 1 < to) A[s]![s + 1]! -= success;
    if (destroy > 0) {
      const recover = destroyRecoverStar(s);
      if (recover < to) A[s]![recover]! -= destroy;
    }
  }

  // Gaussian elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(A[r]![i]!) > Math.abs(A[piv]![i]!)) piv = r;
    }
    if (piv !== i) {
      const tmpRow = A[i]!;
      A[i] = A[piv]!;
      A[piv] = tmpRow;
      const tmpB = b[i]!;
      b[i] = b[piv]!;
      b[piv] = tmpB;
    }
    const div = A[i]![i]!;
    if (Math.abs(div) < 1e-18) continue;
    for (let c = i; c < n; c++) A[i]![c]! /= div;
    b[i]! /= div;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = A[r]![i]!;
      if (f === 0) continue;
      for (let c = i; c < n; c++) A[r]![c]! -= f * A[i]![c]!;
      b[r]! -= f * b[i]!;
    }
  }

  return b;
}

/**
 * Expected meso to go from `fromStar` to `toStar` (inclusive target).
 * Exact Markov expectation under Mode-1 rates (matches long-run Monte Carlo
 * average on starforce.tadeucci.dev, not median).
 */
export function expectedStarForceCost(
  level: number,
  fromStar: number,
  toStar: number,
  opts: ExpectedSfCostOpts = {},
): number {
  const safeguard = opts.safeguard !== false;
  const maxStar = opts.maxStar ?? 30;
  const from = Math.max(0, Math.min(fromStar, maxStar));
  const to = Math.max(from, Math.min(toStar, maxStar));
  if (from === to) return 0;

  const E = solveExpectedCosts(level, to, safeguard);
  return Math.max(0, E[from] ?? 0);
}

/** Snap equip level to common progression bands used by the planner tables. */
export function snapEquipLevel(level: number): 140 | 150 | 160 | 200 | 250 {
  if (level >= 230) return 250;
  if (level >= 180) return 200;
  if (level >= 155) return 160;
  if (level >= 145) return 150;
  return 140;
}

/**
 * Approximate main-stat (one primary) + ATT gained for one successful star.
 * Tuned for relative FD ranking across common Heroic gear levels.
 */
export function starForceStatGain(opts: {
  level: number;
  fromStar: number;
  isWeapon: boolean;
}): { mainStat: number; att: number } {
  const star = opts.fromStar; // gain when completing star → star+1
  const band = snapEquipLevel(opts.level);

  // All-stat per star (applied to primary only for scouter delta).
  let mainStat = 2;
  if (star >= 5) mainStat = 3;
  if (star >= 15) mainStat = 3;
  if (star >= 20) mainStat = band >= 200 ? 4 : 3;
  if (star >= 22) mainStat = band >= 200 ? 5 : 4;

  // ATT / MATT — weapons get more earlier; armor/acc ramp mid/late.
  let att = 0;
  const attByBand: Record<number, number[]> = {
    // index = fromStar; value = ATT gained on success to next (0★…29★)
    140: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 8, 9, 10, 11, 12, 13, 15,
      16, 17, 18, 19, 20, 21, 22,
    ],
    150: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 9, 10, 11, 12, 13, 14, 16,
      17, 18, 19, 20, 21, 22, 23,
    ],
    160: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 12, 13, 14, 15, 17,
      18, 20, 21, 22, 24, 26, 28,
    ],
    200: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 12, 13, 14, 15, 17, 18, 20,
      22, 24, 26, 28, 30, 32, 34,
    ],
    250: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 14, 15, 16, 18, 20, 22, 24,
      26, 28, 30, 32, 34, 36, 38,
    ],
  };

  if (opts.isWeapon) {
    // Weapons also pick up small ATT earlier (rough).
    if (star < 15) att = star < 5 ? 1 : 2;
    else att = attByBand[band]![Math.min(star, 29)] ?? 10;
  } else {
    att = attByBand[band]![Math.min(star, 29)] ?? 0;
  }

  return { mainStat, att };
}

/** Default assumed SF for planner when unset (Heroic progression heuristics). */
export function defaultStarForce(level: number): number {
  if (level >= 200) return 17;
  if (level >= 150) return 17;
  if (level >= 140) return 12;
  return 10;
}

/** GMS / Heroic Star Force cap for normal gear. */
export const MAX_STAR_FORCE = 30;

/** Common Heroic SF breakpoints to suggest as upgrade targets. */
export function nextSfTargets(current: number): number[] {
  const breakpoints = [10, 12, 15, 17, 18, 20, 21, 22, 25, 30];
  const out: number[] = [];
  if (current < MAX_STAR_FORCE) out.push(current + 1);
  for (const b of breakpoints) {
    if (b > current && !out.includes(b)) out.push(b);
  }
  return out.filter((t) => t - current <= 5).slice(0, 3);
}
