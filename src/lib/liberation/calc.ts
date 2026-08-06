import {
  TRACE_INPUT_MAX,
  bossesFor,
  milestonesForType,
  missionCapFor,
  targetForType,
  type LiberationMilestone,
  type LiberationType,
  type TraceBoss,
} from "./data";

export { missionCapFor } from "./data";

export const NOT_DOING = "Not doing";

export type TraceSelection = {
  bossName: string;
  /** Difficulty label, or {@link NOT_DOING} when excluded. */
  difficulty: string;
  partySize: number;
  /** Cleared this week — MapleHub `isClearing` / `alreadyCleared`. */
  cleared: boolean;
};

export type LiberationInputs = {
  type: LiberationType;
  /** Banked currency currently held (clamped to current mission cap). */
  tracesHeld: number;
  /** Milestone select value `${required}|${bossName}`. */
  liberationQuest: string;
  useGenesisPass: boolean;
  startDate: string;
  selections: TraceSelection[];
  /** Thursday weekly reset — MapleHub default. */
  weeklyResetDay?: number;
};

export type LiberationResult = {
  target: number;
  /** Quest milestone + held (display progress). */
  progress: number;
  remaining: number;
  questTraces: number;
  weeklyTraces: number;
  monthlyTraces: number;
  /** 4× weekly (+ BM monthly on Genesis only). */
  fourWeekTotal: number;
  weeksNeeded: number | null;
  etaISO: string | null;
  /** Includes uncleared included bosses (ETA start total). */
  startTotal: number;
  nextMilestone: LiberationMilestone | null;
  /** Progress-to-next: held toward gap between current and next quest. */
  stepProgress: {
    nextBossName: string;
    needed: number;
    held: number;
  } | null;
  completionRate: number;
  /** Cap for traces held on the current mission. */
  missionCap: number;
};

export function milestonesFor(type: LiberationType): LiberationMilestone[] {
  return milestonesForType(type);
}

export function targetFor(type: LiberationType): number {
  return targetForType(type);
}

export function defaultTraceSelections(
  type: LiberationType = "genesis",
): TraceSelection[] {
  return bossesFor(type).map((boss) => ({
    bossName: boss.name,
    difficulty: highestDifficulty(boss),
    partySize: 1,
    cleared: false,
  }));
}

export function defaultLiberationQuest(type: LiberationType): string {
  return type === "destiny" ? "0|Seren" : "0|Von Leon";
}

export function parseQuestTraces(liberationQuest: string): number {
  if (!liberationQuest || liberationQuest === "none") return 0;
  const n = parseInt(liberationQuest.split("|")[0] ?? "0", 10);
  return Number.isFinite(n) ? n : 0;
}

export function highestDifficulty(boss: TraceBoss): string {
  return boss.difficulties[boss.difficulties.length - 1]?.label ?? NOT_DOING;
}

export function clampTracesHeld(
  n: number,
  type?: LiberationType,
  liberationQuest?: string,
): number {
  const max =
    type && liberationQuest
      ? missionCapFor(type, liberationQuest)
      : TRACE_INPUT_MAX;
  return Math.min(max, Math.max(0, Math.floor(n) || 0));
}

export function clampPartySize(n: number): number {
  return Math.max(1, Math.min(6, Math.floor(n) || 1));
}

export function findBoss(
  type: LiberationType,
  bossName: string,
): TraceBoss | undefined {
  return bossesFor(type).find((b) => b.name === bossName);
}

export function baseTracesFor(
  type: LiberationType,
  bossName: string,
  difficulty: string,
): number {
  if (!difficulty || difficulty === NOT_DOING) return 0;
  const boss = findBoss(type, bossName);
  const diff = boss?.difficulties.find((d) => d.label === difficulty);
  return diff?.baseTraces ?? 0;
}

/** MapleHub `we`: floor(base / party) * (pass ? 3 : 1) when included. */
export function tracesFromClear(
  type: LiberationType,
  bossName: string,
  difficulty: string,
  partySize: number,
  useGenesisPass: boolean,
): number {
  if (difficulty === NOT_DOING) return 0;
  const base = baseTracesFor(type, bossName, difficulty);
  const share = Math.floor(base / Math.max(1, Math.floor(partySize)));
  return share * (useGenesisPass ? 3 : 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(d: Date, days: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

function addYears(d: Date, years: number): Date {
  const n = new Date(d);
  n.setFullYear(n.getFullYear() + years);
  return n;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function stepProgressFor(
  type: LiberationType,
  liberationQuest: string,
  tracesHeld: number,
): LiberationResult["stepProgress"] {
  const list = milestonesFor(type);
  const idx = list.findIndex((m) => m.value === liberationQuest);
  if (idx < 0) return null;
  const current = list[idx]!;
  const next = list[idx + 1];
  if (next) {
    return {
      nextBossName: next.bossName,
      needed: next.requiredTraces - current.requiredTraces,
      held: tracesHeld,
    };
  }
  const needed = targetFor(type) - current.requiredTraces;
  if (needed <= 0) return null;
  return {
    nextBossName: "Liberation",
    needed,
    held: tracesHeld,
  };
}

/**
 * MapleHub-style ETA: Thursday weekly reset, 1st-of-month monthly BM,
 * skip same-day as start, uncleared included bosses add to startTotal.
 */
export function calculateLiberation(input: LiberationInputs): LiberationResult {
  const target = targetFor(input.type);
  const questTraces = parseQuestTraces(input.liberationQuest);
  const missionCap = missionCapFor(input.type, input.liberationQuest);
  const tracesHeld = clampTracesHeld(
    input.tracesHeld,
    input.type,
    input.liberationQuest,
  );
  const progress = Math.min(target, questTraces + tracesHeld);
  const remaining = Math.max(0, target - progress);
  const weeklyResetDay = input.weeklyResetDay ?? 4;

  let weeklyTraces = 0;
  let monthlyTraces = 0;
  let immediateFromBosses = 0;

  for (const sel of input.selections) {
    if (sel.difficulty === NOT_DOING) continue;
    const gained = tracesFromClear(
      input.type,
      sel.bossName,
      sel.difficulty,
      sel.partySize,
      input.useGenesisPass,
    );
    if (sel.bossName === "Black Mage") monthlyTraces += gained;
    else weeklyTraces += gained;
    if (!sel.cleared) immediateFromBosses += gained;
  }

  const startTotal = questTraces + tracesHeld + immediateFromBosses;
  const fourWeekTotal =
    4 * weeklyTraces +
    (input.type === "genesis" ? monthlyTraces : 0);

  const ms = milestonesFor(input.type);
  const nextMilestone =
    ms.find((m) => m.requiredTraces > questTraces) ?? null;
  const stepProgress = stepProgressFor(
    input.type,
    input.liberationQuest,
    tracesHeld,
  );
  const completionRate =
    target > 0 ? Math.round((progress / target) * 100) : 0;

  if (progress >= target) {
    return {
      target,
      progress,
      remaining: 0,
      questTraces,
      weeklyTraces,
      monthlyTraces,
      fourWeekTotal,
      weeksNeeded: 0,
      etaISO: input.startDate,
      startTotal,
      nextMilestone,
      stepProgress,
      completionRate: 100,
      missionCap,
    };
  }

  if (weeklyTraces <= 0 && monthlyTraces <= 0 && startTotal >= target) {
    return {
      target,
      progress,
      remaining,
      questTraces,
      weeklyTraces,
      monthlyTraces,
      fourWeekTotal,
      weeksNeeded: 0,
      etaISO: input.startDate,
      startTotal,
      nextMilestone,
      stepProgress,
      completionRate,
      missionCap,
    };
  }

  if (weeklyTraces <= 0 && monthlyTraces <= 0) {
    return {
      target,
      progress,
      remaining,
      questTraces,
      weeklyTraces,
      monthlyTraces,
      fourWeekTotal,
      weeksNeeded: null,
      etaISO: null,
      startTotal,
      nextMilestone,
      stepProgress,
      completionRate,
      missionCap,
    };
  }

  const start = startOfDay(new Date(`${input.startDate}T12:00:00`));
  if (Number.isNaN(start.getTime())) {
    return {
      target,
      progress,
      remaining,
      questTraces,
      weeklyTraces,
      monthlyTraces,
      fourWeekTotal,
      weeksNeeded: null,
      etaISO: null,
      startTotal,
      nextMilestone,
      stepProgress,
      completionRate,
      missionCap,
    };
  }

  let total = startTotal;
  let cursor = startOfDay(start);
  const hardStop = addYears(start, 5);

  while (total < target && cursor < hardStop) {
    cursor = addDays(cursor, 1);
    if (cursor.getDay() === weeklyResetDay && !isSameDay(cursor, start)) {
      total += weeklyTraces;
    }
    if (cursor.getDate() === 1 && !isSameDay(cursor, start)) {
      total += monthlyTraces;
    }
  }

  const weeksNeeded =
    Math.floor((cursor.getTime() - start.getTime()) / 86400000) / 7;

  return {
    target,
    progress,
    remaining,
    questTraces,
    weeklyTraces,
    monthlyTraces,
    fourWeekTotal,
    weeksNeeded,
    etaISO: toISODate(cursor),
    startTotal,
    nextMilestone,
    stepProgress,
    completionRate,
    missionCap,
  };
}

/** Merge saved selections onto the boss list for a type. */
export function mergeSelections(
  type: LiberationType,
  saved: TraceSelection[] | undefined,
): TraceSelection[] {
  const defaults = defaultTraceSelections(type);
  if (!saved?.length) return defaults;
  const byName = new Map(saved.map((s) => [s.bossName, s]));
  return defaults.map((d) => {
    const s = byName.get(d.bossName);
    if (!s) return d;
    const boss = findBoss(type, d.bossName);
    const difficulty =
      typeof s.difficulty === "string" && s.difficulty.length > 0
        ? s.difficulty
        : null;
    const validDiff =
      difficulty != null &&
      (difficulty === NOT_DOING ||
        !!boss?.difficulties.some((x) => x.label === difficulty));
    return {
      bossName: d.bossName,
      // Keep persisted difficulties (incl. Not doing); fill gaps with highest+solo defaults.
      difficulty: validDiff ? difficulty : d.difficulty,
      partySize:
        s.partySize != null && Number.isFinite(Number(s.partySize))
          ? clampPartySize(s.partySize)
          : d.partySize,
      cleared: !!s.cleared,
    };
  });
}
