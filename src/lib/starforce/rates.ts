/**
 * GMS v269 Star Force rates — Enhancement Modes 2–4 + shared Mode-1 tables.
 * Source: https://starforce.tadeucci.dev/ (rates.js).
 */

import {
  destroyRecoverStar,
  starForceAttemptCost,
  starForceRates,
  type SfRates,
} from "@/lib/planner/starforce";

export { destroyRecoverStar, starForceAttemptCost, starForceRates };
export type { SfRates };

export type EnhanceMode = 1 | 2 | 3 | 4;

export type EnhanceEntry = {
  mult: number;
  success: number;
  boom: number;
};

/** Mode entries for stars 15–21. Index 0 = Mode 1 … index 3 = Mode 4. */
export const ENHANCE_MODE: Record<number, EnhanceEntry[]> = {
  15: [
    { mult: 1, success: 0.3, boom: 0.021 },
    { mult: 1.5, success: 0.3, boom: 0.014 },
    { mult: 2.5, success: 0.3, boom: 0.007 },
    { mult: 3, success: 0.3, boom: 0 },
  ],
  16: [
    { mult: 1, success: 0.3, boom: 0.021 },
    { mult: 1.5, success: 0.3, boom: 0.014 },
    { mult: 2.5, success: 0.3, boom: 0.007 },
    { mult: 3, success: 0.3, boom: 0 },
  ],
  17: [
    { mult: 1, success: 0.15, boom: 0.068 },
    { mult: 1.5, success: 0.15, boom: 0.0425 },
    { mult: 2.5, success: 0.15, boom: 0.017 },
    { mult: 3, success: 0.15, boom: 0 },
  ],
  18: [
    { mult: 1, success: 0.15, boom: 0.068 },
    { mult: 2, success: 0.12, boom: 0.044 },
    { mult: 3.5, success: 0.1, boom: 0.018 },
    { mult: 6.5, success: 0.08, boom: 0 },
  ],
  19: [
    { mult: 1, success: 0.15, boom: 0.085 },
    { mult: 2, success: 0.12, boom: 0.0616 },
    { mult: 3.5, success: 0.1, boom: 0.036 },
    { mult: 6.5, success: 0.08, boom: 0 },
  ],
  20: [
    { mult: 1, success: 0.3, boom: 0.105 },
    { mult: 2, success: 0.25, boom: 0.075 },
    { mult: 3.5, success: 0.2, boom: 0.04 },
    { mult: 6.5, success: 0.15, boom: 0 },
  ],
  21: [
    { mult: 1, success: 0.15, boom: 0.1275 },
    { mult: 2, success: 0.12, boom: 0.088 },
    { mult: 3.5, success: 0.1, boom: 0.045 },
    { mult: 6.5, success: 0.08, boom: 0 },
  ],
};

/** Stars where Enhancement Modes apply. */
export const MODE_STARS = [15, 16, 17, 18, 19, 20, 21] as const;

export type MvpTier = "none" | "silver" | "gold" | "diamond";

export type SfEvent =
  | "none"
  | "fivetenfifteen"
  | "thirtyOff"
  | "boomReduction"
  | "shiningStarForce";

export type StarPlanEntry = { mode: EnhanceMode; safeguard: boolean };

/** Per-star plan keyed by star (15–21). */
export type StarPlan = Partial<Record<number, StarPlanEntry>>;

export type SimOpts = {
  starCatching?: boolean;
  /** Global safeguard (Simple tab). Per-star plan overrides when present. */
  safeguard?: boolean;
  mvp?: MvpTier;
  event?: SfEvent;
  /** Global enhance mode 1–4 (Simple tab). */
  enhanceMode?: EnhanceMode;
  starPlan?: StarPlan | null;
};

const MVP_DISCOUNT: Record<Exclude<MvpTier, "none">, number> = {
  silver: 0.03,
  gold: 0.05,
  diamond: 0.1,
};
/** MVP covers taps whose current star is ≤ 16 (16→17 discounted). */
const MVP_MAX_STAR = 16;

export function planFor(
  star: number,
  opts: SimOpts,
): { mode: EnhanceMode; safeguard: boolean } {
  const plan = opts.starPlan?.[star];
  if (plan) return plan;
  return {
    mode: opts.enhanceMode ?? 1,
    safeguard: !!opts.safeguard,
  };
}

/**
 * Enhancement Mode entry for modes 2–4 at stars 15–21.
 * Mode 1 / outside range → null (classic path). Stars 15–17 clamp Mode 4 → 3.
 */
export function enhanceEntry(
  star: number,
  opts: SimOpts,
): EnhanceEntry | null {
  let mode = planFor(star, opts).mode;
  if (mode < 2 || mode > 4) return null;
  if (star <= 17 && mode > 3) mode = 3;
  const table = ENHANCE_MODE[star];
  return table ? (table[mode - 1] ?? null) : null;
}

/** [success, maintain, boom] after event / safeguard / star catching. */
export function applyRateModifiers(
  star: number,
  opts: SimOpts,
): [number, number, number] {
  const plan = planFor(star, opts);
  const sgOverride =
    plan.safeguard &&
    plan.mode >= 2 &&
    star >= 15 &&
    star <= 17;
  const em = sgOverride ? null : enhanceEntry(star, opts);

  let s: number;
  let m: number;
  let b: number;

  const boomReductionActive =
    opts.event === "boomReduction" || opts.event === "shiningStarForce";

  if (em) {
    s = em.success;
    b = em.boom;
    m = 1 - s - b;
    if (boomReductionActive && star <= 21) {
      m += b * 0.3;
      b *= 0.7;
    }
  } else {
    const base = starForceRates(star);
    s = base.success;
    m = base.stay;
    b = base.destroy;
    if (boomReductionActive && star <= 21) {
      m += b * 0.3;
      b *= 0.7;
    }
    const sgActive =
      plan.safeguard &&
      star >= 15 &&
      star <= 17 &&
      !(opts.event === "fivetenfifteen" && star === 15);
    if (sgActive) {
      m += b;
      b = 0;
    }
  }

  if (opts.starCatching) {
    s = Math.min(1, s * 1.05);
    const left = 1 - s;
    const denom = m + b;
    m = denom > 0 ? (m * left) / denom : left;
    b = left - m;
  }

  return [s, m, b];
}

function mvpDiscount(star: number, opts: SimOpts): number {
  if (star > MVP_MAX_STAR) return 0;
  const mvp = opts.mvp;
  if (!mvp || mvp === "none") return 0;
  return MVP_DISCOUNT[mvp] ?? 0;
}

/** Paid-cost multiplier vs base attempt cost. */
export function costMultiplier(star: number, opts: SimOpts): number {
  const plan = planFor(star, opts);
  const sgOverride =
    plan.safeguard &&
    plan.mode >= 2 &&
    star >= 15 &&
    star <= 17;
  const em = sgOverride ? null : enhanceEntry(star, opts);
  let mult = em ? em.mult : 1;

  const costEvent =
    opts.event === "thirtyOff" || opts.event === "shiningStarForce";
  if (costEvent) {
    if (em) mult *= 0.7;
    else mult -= 0.3;
  }

  const mvp = mvpDiscount(star, opts);
  if (mvp) mult *= 1 - mvp;

  if (!em) {
    const sgActive =
      plan.safeguard &&
      star >= 15 &&
      star <= 17 &&
      !(opts.event === "fivetenfifteen" && star === 15);
    if (sgActive) mult += 2;
  }

  return mult;
}

export function attemptCost(level: number, star: number, opts: SimOpts): number {
  return Math.round(starForceAttemptCost(level, star) * costMultiplier(star, opts));
}

/** Boom % for the reference mode matrix (no catching / events). */
export function boomPercent(star: number, mode: EnhanceMode): number {
  if (star < 15 || star > 21) return 0;
  if (mode === 1) return starForceRates(star).destroy * 100;
  const table = ENHANCE_MODE[star];
  let m = mode;
  if (star <= 17 && m > 3) m = 3;
  return (table?.[m - 1]?.boom ?? 0) * 100;
}
