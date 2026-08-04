/**
 * Heroic / GMS Star Force meso costs + expected EV (non-Superior).
 *
 * Attempt cost formulas: MapleStory Wiki “Star Force Enhancement” (GMS column).
 * Rounded to nearest 100 mesos. Success / fail / destroy rates: same page
 * (pre–Enhancement-Mode / Mode 1 rates). Destroy recovery stars follow GMS
 * Core Restoration table (15–19→12, 20→15, 21–22→17, …).
 *
 * Assumptions for MVP:
 * - Non-Superior only (Superior Gollux etc. use a different fixed cost — stubbed).
 * - No MVP / Sunny Sunday / 5-10-15 / Shining discounts.
 * - Safeguard on by default for 15→16 and 16→17 (Heroic common practice).
 * - Boom spare / restoration meso = 0 (Heroic uses cores/points; not modeled).
 * - Stat gains are community approximations for relative FD ranking, not pixel-perfect.
 */

export type SfRates = {
  success: number;
  /** Fail that keeps current star (0–10). */
  stay: number;
  /** Fail that drops 1 star. */
  drop: number;
  destroy: number;
};

/** GMS Mode-1 rates for enhancing FROM `star` → star+1. */
export function starForceRates(star: number): SfRates {
  const table: Array<[number, number, number]> = [
    // success, failTotal, destroy  (failTotal includes destroy)
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
  ];
  const row = table[Math.max(0, Math.min(star, table.length - 1))]!;
  const [success, failTotal, destroy] = row;
  const failNoBoom = Math.max(0, failTotal - destroy);
  // 0–10: stay on fail; 11+: drop on fail (wiki / modern SF).
  if (star < 10) {
    return { success, stay: failNoBoom, drop: 0, destroy };
  }
  return { success, stay: 0, drop: failNoBoom, destroy };
}

function round100(n: number): number {
  return Math.round(n / 100) * 100;
}

/**
 * Base meso cost for one attempt at `star` → star+1 on a level-`level` item.
 * GMS wiki formulas (non-Superior).
 */
export function starForceAttemptCost(level: number, star: number): number {
  const L = Math.max(0, Math.floor(level));
  const S = Math.max(0, Math.floor(star));
  const L3 = L * L * L;
  let raw: number;
  if (S < 10) {
    raw = 1000 + Math.floor((L3 * (S + 1)) / 25);
  } else if (S === 10) {
    raw = 1000 + Math.floor((L3 * Math.pow(11, 2.7)) / 400);
  } else if (S === 11) {
    raw = 1000 + Math.floor((L3 * Math.pow(12, 2.7)) / 220);
  } else if (S === 12) {
    raw = 1000 + Math.floor((L3 * Math.pow(13, 2.7)) / 150);
  } else if (S === 13) {
    raw = 1000 + Math.floor((L3 * Math.pow(14, 2.7)) / 110);
  } else if (S === 14) {
    raw = 1000 + Math.floor((L3 * Math.pow(15, 2.7)) / 75);
  } else if (S === 15) {
    raw = 1000 + Math.floor((L3 * Math.pow(16, 2.7)) / 200);
  } else if (S === 16) {
    raw = 1000 + Math.floor((L3 * Math.pow(17, 2.7)) / 200);
  } else if (S === 17) {
    raw = 1000 + Math.floor((L3 * Math.pow(18, 2.7)) / 150);
  } else if (S === 18) {
    raw = 1000 + Math.floor((L3 * Math.pow(19, 2.7)) / 70);
  } else if (S === 19) {
    raw = 1000 + Math.floor((L3 * Math.pow(20, 2.7)) / 45);
  } else if (S === 20) {
    raw = 1000 + Math.floor((L3 * Math.pow(21, 2.7)) / 200);
  } else if (S === 21) {
    raw = 1000 + Math.floor((L3 * Math.pow(22, 2.7)) / 125);
  } else {
    // 22★ → 30★
    raw = 1000 + Math.floor((L3 * Math.pow(S + 1, 2.7)) / 200);
  }
  return round100(raw);
}

/** GMS recover-after-destroy star (Core Restoration). */
export function destroyRecoverStar(destroyedAt: number): number {
  if (destroyedAt <= 19) return 12;
  if (destroyedAt === 20) return 15;
  if (destroyedAt <= 22) return 17;
  if (destroyedAt <= 25) return 19;
  return 20;
}

export type ExpectedSfCostOpts = {
  /** Safeguard 15–17 (triples attempt cost; destroy → drop). Default true. */
  safeguard?: boolean;
  /** Cap star for EV solve (default 25). */
  maxStar?: number;
};

/**
 * Expected meso to go from `fromStar` to `toStar` (inclusive target).
 * Solves a linear system over star states.
 */
export function expectedStarForceCost(
  level: number,
  fromStar: number,
  toStar: number,
  opts: ExpectedSfCostOpts = {},
): number {
  const safeguard = opts.safeguard !== false;
  const maxStar = opts.maxStar ?? 25;
  const from = Math.max(0, Math.min(fromStar, maxStar));
  const to = Math.max(from, Math.min(toStar, maxStar));
  if (from === to) return 0;

  // E[s] = expected remaining cost from star s to reach `to`
  const n = to + 1;
  const E = new Array<number>(n).fill(0);
  // Gauss-Seidel iterations (acyclic-ish with boom cycles — iterate to convergence)
  for (let iter = 0; iter < 80; iter++) {
    let maxDiff = 0;
    for (let s = to - 1; s >= 0; s--) {
      if (s < from && s !== destroyRecoverStar(s + 1)) {
        // Still needed as intermediate after drops / recovers
      }
      const rates = starForceRates(s);
      let cost = starForceAttemptCost(level, s);
      let { success, stay, drop, destroy } = rates;
      const useSg = safeguard && s >= 15 && s <= 16;
      if (useSg) {
        cost *= 3;
        drop += destroy;
        destroy = 0;
      }
      // Normalize tiny float drift
      const sum = success + stay + drop + destroy;
      if (sum > 0) {
        success /= sum;
        stay /= sum;
        drop /= sum;
        destroy /= sum;
      }

      const nextSuccess = s + 1 >= to ? 0 : E[s + 1]!;
      const nextDrop = s <= 0 ? E[0]! : E[Math.min(s - 1, to)]!;
      const recover = destroyRecoverStar(s);
      const nextBoom = recover >= to ? 0 : E[Math.min(recover, to)]!;

      // E = cost + p_s*E_next + p_stay*E + p_drop*E_drop + p_boom*E_rec
      // (1 - p_stay) E = cost + ...
      const rhs =
        cost +
        success * nextSuccess +
        drop * nextDrop +
        destroy * nextBoom;
      const denom = Math.max(1e-9, 1 - stay);
      const nextE = rhs / denom;
      maxDiff = Math.max(maxDiff, Math.abs(nextE - E[s]!));
      E[s] = nextE;
    }
    if (maxDiff < 1) break;
  }

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
    // index = fromStar; value = ATT gained on success to next
    140: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 8, 9, 10, 11, 12, 13, 15,
      16, 17,
    ],
    150: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 9, 10, 11, 12, 13, 14, 16,
      17, 18,
    ],
    160: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 12, 13, 14, 15, 17,
      18, 20,
    ],
    200: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 12, 13, 14, 15, 17, 18, 20,
      22, 24,
    ],
    250: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 14, 15, 16, 18, 20, 22, 24,
      26, 28,
    ],
  };

  if (opts.isWeapon) {
    // Weapons also pick up small ATT earlier (rough).
    if (star < 15) att = star < 5 ? 1 : 2;
    else att = attByBand[band]![Math.min(star, 24)] ?? 10;
  } else {
    att = attByBand[band]![Math.min(star, 24)] ?? 0;
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

/** Common Heroic SF breakpoints to suggest as upgrade targets. */
export function nextSfTargets(current: number): number[] {
  const breakpoints = [10, 12, 15, 17, 18, 20, 21, 22];
  const out: number[] = [];
  if (current < 25) out.push(current + 1);
  for (const b of breakpoints) {
    if (b > current && !out.includes(b)) out.push(b);
  }
  return out.filter((t) => t - current <= 5).slice(0, 3);
}
