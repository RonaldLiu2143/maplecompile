import {
  DESTINY_MILESTONES,
  DESTINY_TARGET,
  GENESIS_MILESTONES,
  GENESIS_TARGET,
  TRACE_BANK_CAP,
  TRACE_BOSSES,
  type LiberationMilestone,
  type LiberationType,
} from "./data";

export type TraceSelection = {
  bossName: string;
  difficulty: string;
  included: boolean;
  partySize: number;
};

export type LiberationInputs = {
  type: LiberationType;
  /** Traces currently held in the bank (0–3000). */
  tracesHeld: number;
  /** Cumulative traces already spent / milestone reached. */
  milestoneTraces: number;
  useGenesisPass: boolean;
  startDate: string;
  selections: TraceSelection[];
};

export type LiberationResult = {
  target: number;
  progress: number;
  remaining: number;
  weeklyTraces: number;
  monthlyTraces: number;
  weeksNeeded: number | null;
  etaISO: string | null;
  nextMilestone: LiberationMilestone | null;
  tracesToNextMilestone: number | null;
};

export function milestonesFor(type: LiberationType): LiberationMilestone[] {
  return type === "destiny" ? DESTINY_MILESTONES : GENESIS_MILESTONES;
}

export function targetFor(type: LiberationType): number {
  return type === "destiny" ? DESTINY_TARGET : GENESIS_TARGET;
}

export function defaultTraceSelections(): TraceSelection[] {
  return TRACE_BOSSES.map((boss) => {
    const top = boss.difficulties[boss.difficulties.length - 1];
    return {
      bossName: boss.name,
      difficulty: top.label,
      included: false,
      partySize: 1,
    };
  });
}

export function baseTracesFor(bossName: string, difficulty: string): number {
  const boss = TRACE_BOSSES.find((b) => b.name === bossName);
  const diff = boss?.difficulties.find((d) => d.label === difficulty);
  return diff?.baseTraces ?? 0;
}

/** MapleHub formula: floor(base / party) * (pass ? 3 : 1) */
export function tracesFromClear(
  bossName: string,
  difficulty: string,
  partySize: number,
  useGenesisPass: boolean,
): number {
  const base = baseTracesFor(bossName, difficulty);
  const share = Math.floor(base / Math.max(1, Math.floor(partySize)));
  return share * (useGenesisPass ? 3 : 1);
}

function addDays(d: Date, days: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Approximate weeks until goal using MapleHub-style Thursday weekly reset
 * and 1st-of-month monthly Black Mage traces.
 */
export function calculateLiberation(input: LiberationInputs): LiberationResult {
  const target = targetFor(input.type);
  const progress = Math.min(
    target,
    Math.max(0, input.milestoneTraces) +
      Math.min(TRACE_BANK_CAP, Math.max(0, input.tracesHeld)),
  );
  const remaining = Math.max(0, target - progress);

  let weeklyTraces = 0;
  let monthlyTraces = 0;
  for (const sel of input.selections) {
    if (!sel.included) continue;
    const gained = tracesFromClear(
      sel.bossName,
      sel.difficulty,
      sel.partySize,
      input.useGenesisPass,
    );
    if (sel.bossName === "Black Mage") monthlyTraces += gained;
    else weeklyTraces += gained;
  }

  const ms = milestonesFor(input.type);
  const nextMilestone =
    ms.find((m) => m.requiredTraces > input.milestoneTraces) ?? null;
  const tracesToNextMilestone = nextMilestone
    ? Math.max(0, nextMilestone.requiredTraces - progress)
    : null;

  if (remaining <= 0) {
    return {
      target,
      progress,
      remaining: 0,
      weeklyTraces,
      monthlyTraces,
      weeksNeeded: 0,
      etaISO: input.startDate,
      nextMilestone,
      tracesToNextMilestone,
    };
  }

  if (weeklyTraces <= 0 && monthlyTraces <= 0) {
    return {
      target,
      progress,
      remaining,
      weeklyTraces,
      monthlyTraces,
      weeksNeeded: null,
      etaISO: null,
      nextMilestone,
      tracesToNextMilestone,
    };
  }

  // Thursday = 4 (MapleHub weeklyResetDay)
  const weeklyResetDay = 4;
  let total = progress;
  const start = new Date(`${input.startDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) {
    return {
      target,
      progress,
      remaining,
      weeklyTraces,
      monthlyTraces,
      weeksNeeded: null,
      etaISO: null,
      nextMilestone,
      tracesToNextMilestone,
    };
  }

  let cursor = new Date(start);
  const hardStop = addDays(start, 365 * 5);
  while (total < target && cursor < hardStop) {
    cursor = addDays(cursor, 1);
    if (cursor.getDay() === weeklyResetDay) total += weeklyTraces;
    if (cursor.getDate() === 1) total += monthlyTraces;
  }

  const weeksNeeded =
    Math.round(((cursor.getTime() - start.getTime()) / 86400000 / 7) * 10) / 10;

  return {
    target,
    progress,
    remaining,
    weeklyTraces,
    monthlyTraces,
    weeksNeeded,
    etaISO: toISODate(cursor),
    nextMilestone,
    tracesToNextMilestone,
  };
}
