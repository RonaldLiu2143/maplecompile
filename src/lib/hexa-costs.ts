/** Sol Erda / fragment cost tables for HEXA cores (incremental per level). */

export type HexaSkillType =
  | "Origin"
  | "Ascent"
  | "Mastery"
  | "Boost"
  | "Common"
  | "Hexa Stat";

/** Cost to go from level i → i+1 (index 0 = 0→1). Length 30. */
export const HEXA_FRAGMENT_COSTS: Record<HexaSkillType, readonly number[]> = {
  Origin: [
    0, 30, 35, 40, 45, 50, 55, 60, 65, 200, 80, 90, 100, 110, 120, 130, 140,
    150, 160, 350, 170, 180, 190, 200, 210, 220, 230, 240, 250, 500,
  ],
  Ascent: [
    100, 30, 35, 40, 45, 50, 55, 60, 65, 200, 80, 90, 100, 110, 120, 130, 140,
    150, 160, 350, 170, 180, 190, 200, 210, 220, 230, 240, 250, 500,
  ],
  Mastery: [
    50, 15, 18, 20, 23, 25, 28, 30, 33, 100, 40, 45, 50, 55, 60, 65, 70, 75,
    80, 175, 85, 90, 95, 100, 105, 110, 115, 120, 125, 250,
  ],
  Boost: [
    75, 23, 27, 30, 34, 38, 42, 45, 49, 150, 60, 68, 75, 83, 90, 98, 105, 113,
    120, 263, 128, 135, 143, 150, 158, 165, 173, 180, 188, 375,
  ],
  Common: [
    125, 38, 44, 50, 57, 63, 69, 75, 82, 300, 110, 124, 138, 152, 165, 179,
    193, 207, 220, 525, 234, 248, 262, 275, 289, 303, 317, 330, 344, 750,
  ],
  "Hexa Stat": [
    300, 500, 600, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0,
  ],
};

export const HEXA_ERDA_COSTS: Record<HexaSkillType, readonly number[]> = {
  Origin: [
    0, 1, 1, 1, 2, 2, 2, 3, 3, 10, 3, 3, 4, 4, 4, 4, 4, 4, 5, 15, 5, 5, 5, 5, 5,
    6, 6, 6, 7, 20,
  ],
  Ascent: [
    5, 1, 1, 1, 2, 2, 2, 3, 3, 10, 3, 3, 4, 4, 4, 4, 4, 4, 5, 15, 5, 5, 5, 5, 5,
    6, 6, 6, 7, 20,
  ],
  Mastery: [
    3, 1, 1, 1, 1, 1, 1, 2, 2, 5, 2, 2, 2, 2, 2, 2, 2, 2, 3, 8, 3, 3, 3, 3, 3, 3,
    3, 3, 4, 10,
  ],
  Boost: [
    4, 1, 1, 1, 2, 2, 2, 3, 3, 8, 3, 3, 3, 3, 3, 3, 3, 3, 4, 12, 4, 4, 4, 4, 4,
    5, 5, 5, 6, 15,
  ],
  Common: [
    7, 2, 2, 2, 3, 3, 3, 5, 5, 14, 5, 5, 6, 6, 6, 6, 6, 6, 7, 17, 7, 7, 7, 7, 7,
    9, 9, 9, 10, 20,
  ],
  "Hexa Stat": [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0,
  ],
};

export const HEXA_STAT_MAX_LEVEL = 3;
export const HEXA_CORE_MAX_LEVEL = 30;

export const WEEKLY_QUEST_FRAGMENTS = 90;

export const WEEKLY_DUNGEON_FRAGMENTS = {
  none: 0,
  "high-mountain": 40,
  "angler-company": 55,
  "nightmare-paradise": 70,
} as const;

export type WeeklyDungeonId = keyof typeof WEEKLY_DUNGEON_FRAGMENTS;

export const WEEKLY_DUNGEON_OPTIONS: {
  id: WeeklyDungeonId;
  label: string;
}[] = [
  { id: "none", label: "None (0)" },
  { id: "high-mountain", label: "High Mountain (40)" },
  { id: "angler-company", label: "Angler Company (55)" },
  { id: "nightmare-paradise", label: "Nightmare Paradise (70)" },
];

export type FragmentRateSettings = {
  fragPerWap: number;
  wapsPerDay: number;
  weeklyQuestEnabled: boolean;
  weeklyDungeon: WeeklyDungeonId;
};

export const DEFAULT_FRAGMENT_RATE: FragmentRateSettings = {
  fragPerWap: 40,
  wapsPerDay: 2,
  weeklyQuestEnabled: true,
  weeklyDungeon: "none",
};

function clampLevel(level: number, max: number): number {
  return Math.max(0, Math.min(max, Math.floor(Number(level) || 0)));
}

/** Cumulative cost to reach `level` (sum of increments for 0→1 … (level-1)→level). */
export function costToReach(
  type: HexaSkillType,
  level: number,
  kind: "fragments" | "solErda" = "fragments",
): number {
  const table =
    kind === "fragments" ? HEXA_FRAGMENT_COSTS[type] : HEXA_ERDA_COSTS[type];
  const max = type === "Hexa Stat" ? HEXA_STAT_MAX_LEVEL : HEXA_CORE_MAX_LEVEL;
  const lv = clampLevel(level, max);
  if (lv <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < lv; i++) sum += table[i] ?? 0;
  return sum;
}

export function costBetween(
  type: HexaSkillType,
  from: number,
  to: number,
): { fragments: number; solErda: number } {
  const max = type === "Hexa Stat" ? HEXA_STAT_MAX_LEVEL : HEXA_CORE_MAX_LEVEL;
  const a = clampLevel(from, max);
  const b = clampLevel(to, max);
  if (b <= a) return { fragments: 0, solErda: 0 };
  return {
    fragments:
      costToReach(type, b, "fragments") - costToReach(type, a, "fragments"),
    solErda: costToReach(type, b, "solErda") - costToReach(type, a, "solErda"),
  };
}

/** Cost of the next single level (current → current+1). */
export function nextLevelCost(
  type: HexaSkillType,
  current: number,
): { fragments: number; solErda: number } {
  const max = type === "Hexa Stat" ? HEXA_STAT_MAX_LEVEL : HEXA_CORE_MAX_LEVEL;
  const cur = clampLevel(current, max);
  if (cur >= max) return { fragments: 0, solErda: 0 };
  return costBetween(type, cur, cur + 1);
}

/**
 * MapleScouter / tracker slot index → cost table type.
 * 0–3 Mastery, 4–7 Boost, 8 Origin, 9 Ascent, 10–11 GMS-unavailable,
 * 12–13 Common (Janus / Hecate).
 */
export function skillTypeForSlot(index: number): HexaSkillType | null {
  if (index >= 0 && index <= 3) return "Mastery";
  if (index >= 4 && index <= 7) return "Boost";
  if (index === 8) return "Origin";
  if (index === 9) return "Ascent";
  if (index === 12 || index === 13) return "Common";
  return null;
}

export type HexaProgressNode = {
  id: string;
  label: string;
  skillType: HexaSkillType;
  current: number;
  target: number;
  maxLevel: number;
  slotIndex: number | null;
  fragmentsNeeded: number;
  solErdaNeeded: number;
  fragmentsSpent: number;
  solErdaSpent: number;
};

export type HexaProgressSummary = {
  fragmentsSpent: number;
  fragmentsTotal: number;
  fragmentsLeft: number;
  solErdaSpent: number;
  solErdaTotal: number;
  solErdaLeft: number;
  fragmentsRemainingAfterInventory: number;
  solErdaRemainingAfterInventory: number;
  completionPct: number;
  nodes: HexaProgressNode[];
};

export function summarizeHexaProgress(args: {
  levels: number[];
  targets: number[];
  hexaStatLevel: number;
  hexaStatTarget: number;
  fragmentsHeld: number;
  erdaHeld: number;
  activeSlotIndices: number[];
  labels: Record<number, string>;
  includeHexaStat?: boolean;
}): HexaProgressSummary {
  const nodes: HexaProgressNode[] = [];
  let fragmentsSpent = 0;
  let fragmentsTotal = 0;
  let solErdaSpent = 0;
  let solErdaTotal = 0;

  for (const i of args.activeSlotIndices) {
    const type = skillTypeForSlot(i);
    if (!type) continue;
    const current = clampLevel(args.levels[i] ?? 0, HEXA_CORE_MAX_LEVEL);
    const target = clampLevel(
      args.targets[i] ?? HEXA_CORE_MAX_LEVEL,
      HEXA_CORE_MAX_LEVEL,
    );
    const spent = costBetween(type, 0, current);
    const total = costBetween(type, 0, target);
    const needed = costBetween(type, current, target);
    fragmentsSpent += spent.fragments;
    fragmentsTotal += total.fragments;
    solErdaSpent += spent.solErda;
    solErdaTotal += total.solErda;
    nodes.push({
      id: `slot-${i}`,
      label: args.labels[i] ?? `Core ${i + 1}`,
      skillType: type,
      current,
      target,
      maxLevel: HEXA_CORE_MAX_LEVEL,
      slotIndex: i,
      fragmentsNeeded: needed.fragments,
      solErdaNeeded: needed.solErda,
      fragmentsSpent: spent.fragments,
      solErdaSpent: spent.solErda,
    });
  }

  if (args.includeHexaStat !== false) {
    const current = clampLevel(args.hexaStatLevel, HEXA_STAT_MAX_LEVEL);
    const target = clampLevel(args.hexaStatTarget, HEXA_STAT_MAX_LEVEL);
    const spent = costBetween("Hexa Stat", 0, current);
    const total = costBetween("Hexa Stat", 0, target);
    const needed = costBetween("Hexa Stat", current, target);
    fragmentsSpent += spent.fragments;
    fragmentsTotal += total.fragments;
    solErdaSpent += spent.solErda;
    solErdaTotal += total.solErda;
    nodes.push({
      id: "hexa-stat",
      label: "Hexa Stat",
      skillType: "Hexa Stat",
      current,
      target,
      maxLevel: HEXA_STAT_MAX_LEVEL,
      slotIndex: null,
      fragmentsNeeded: needed.fragments,
      solErdaNeeded: needed.solErda,
      fragmentsSpent: spent.fragments,
      solErdaSpent: spent.solErda,
    });
  }

  const fragmentsLeft = Math.max(0, fragmentsTotal - fragmentsSpent);
  const solErdaLeft = Math.max(0, solErdaTotal - solErdaSpent);
  const heldF = Math.max(0, Math.floor(args.fragmentsHeld || 0));
  const heldE = Math.max(0, Math.floor(args.erdaHeld || 0));

  return {
    fragmentsSpent,
    fragmentsTotal,
    fragmentsLeft,
    solErdaSpent,
    solErdaTotal,
    solErdaLeft,
    fragmentsRemainingAfterInventory: Math.max(0, fragmentsLeft - heldF),
    solErdaRemainingAfterInventory: Math.max(0, solErdaLeft - heldE),
    completionPct:
      fragmentsTotal > 0 ? (fragmentsSpent / fragmentsTotal) * 100 : 0,
    nodes,
  };
}

export function dailyFragmentRate(settings: FragmentRateSettings): number {
  const wap =
    Math.max(0, settings.fragPerWap) * Math.max(0, settings.wapsPerDay);
  const weeklyQuest = settings.weeklyQuestEnabled
    ? WEEKLY_QUEST_FRAGMENTS / 7
    : 0;
  const dungeon =
    (WEEKLY_DUNGEON_FRAGMENTS[settings.weeklyDungeon] ?? 0) / 7;
  return wap + weeklyQuest + dungeon;
}

export function estimateCompletion(args: {
  fragmentsRemaining: number;
  dailyRate: number;
  from?: Date;
}): { daysLeft: number; completionDate: Date | null } {
  const rate = args.dailyRate;
  if (rate <= 0) return { daysLeft: 0, completionDate: null };
  if (args.fragmentsRemaining <= 0) {
    return { daysLeft: 0, completionDate: args.from ?? new Date() };
  }
  const daysLeft = args.fragmentsRemaining / rate;
  const from = args.from ?? new Date();
  const completionDate = new Date(
    from.getTime() + daysLeft * 24 * 60 * 60 * 1000,
  );
  return { daysLeft, completionDate };
}

/** Cheapest single next-level upgrade among incomplete nodes. */
export function cheapestNextUpgrade(nodes: HexaProgressNode[]): {
  node: HexaProgressNode;
  nextLevel: number;
  fragments: number;
  solErda: number;
} | null {
  let best: {
    node: HexaProgressNode;
    nextLevel: number;
    fragments: number;
    solErda: number;
  } | null = null;
  for (const node of nodes) {
    if (node.current >= node.target) continue;
    const cost = nextLevelCost(node.skillType, node.current);
    if (
      !best ||
      cost.fragments < best.fragments ||
      (cost.fragments === best.fragments && cost.solErda < best.solErda)
    ) {
      best = {
        node,
        nextLevel: node.current + 1,
        fragments: cost.fragments,
        solErda: cost.solErda,
      };
    }
  }
  return best;
}

/** GMS-trackable slot indices (excludes unreleased skill3 / class common). */
export const GMS_HEXA_SLOT_INDICES = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13,
] as const;
