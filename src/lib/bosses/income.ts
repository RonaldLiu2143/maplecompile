import {
  ACCOUNT_WEEKLY_CRYSTAL_LIMIT,
  BOSS_CRYSTALS,
  DEFAULT_MAX_PARTY,
  WEEKLY_CRYSTAL_LIMIT,
  bossMaxParty,
  crystalMesos,
  type BossEntry,
} from "./crystals";

export type WorldType = "heroic" | "interactive";

export type BossClearSelection = {
  bossId: string;
  difficulty: string;
  enabled: boolean;
  partySize: number;
};

export type IncomeLine = {
  bossId: string;
  bossName: string;
  difficulty: string;
  frequency: "weekly" | "monthly";
  partySize: number;
  crystalBase: number;
  crystalPersonal: number;
  sells: boolean;
};

export type IncomeSummary = {
  lines: IncomeLine[];
  /** Weekly boss lines that count toward the 14-cap (sorted by value). */
  weeklyListed: IncomeLine[];
  weeklyCrystalsUsed: number;
  weeklyCrystalLimit: number;
  weeklyMesos: number;
  monthlyMesos: number;
  /** Monthly crystal converted to weekly-equivalent for display only. */
  monthlyAsWeeklyMesos: number;
  /** Alias of weeklyMesos — max sellable from this character's weekly clears. */
  maxPossibleMesos: number;
};

export type RosterIncomeSummary = {
  characters: Array<{
    key: string;
    summary: IncomeSummary;
  }>;
  /** Sum of each character's max possible weekly mesos. */
  maxPossibleMesos: number;
  /** Weekly boss crystals across roster (capped contribution per char at 14). */
  weeklyCrystalsUsed: number;
  accountCrystalLimit: number;
};

export function defaultSelections(): BossClearSelection[] {
  return BOSS_CRYSTALS.flatMap((boss) => {
    const top = boss.difficulties[boss.difficulties.length - 1];
    return [
      {
        bossId: boss.id,
        difficulty: top.name,
        enabled: false,
        partySize: 1,
      },
    ];
  });
}

export function findBoss(bossId: string): BossEntry | undefined {
  return BOSS_CRYSTALS.find((b) => b.id === bossId);
}

/** Clamp party size to 1…boss max (default {@link DEFAULT_MAX_PARTY}). */
export function clampPartySize(bossId: string, partySize: number): number {
  const boss = findBoss(bossId);
  const max = boss ? bossMaxParty(boss) : DEFAULT_MAX_PARTY;
  const n = Math.floor(Number(partySize) || 1);
  return Math.max(1, Math.min(max, n));
}

export function personalCrystal(
  base: number,
  partySize: number,
  world: WorldType,
): number {
  const sized = Math.floor(crystalMesos(base, world) / Math.max(1, partySize));
  return sized;
}

/** Count of enabled weekly (non-monthly) boss clears for a character. */
export function countEnabledWeekly(
  selections: BossClearSelection[],
): number {
  let n = 0;
  for (const sel of selections) {
    if (!sel.enabled) continue;
    const boss = findBoss(sel.bossId);
    if (boss && boss.frequency === "weekly") n += 1;
  }
  return n;
}

/**
 * Weekly crystals sell highest-value clears first up to WEEKLY_CRYSTAL_LIMIT.
 * Monthly bosses are tracked separately (do not consume the weekly 14).
 */
export function summarizeIncome(
  selections: BossClearSelection[],
  world: WorldType,
  crystalLimit = WEEKLY_CRYSTAL_LIMIT,
): IncomeSummary {
  const weeklyCandidates: IncomeLine[] = [];
  const monthlyLines: IncomeLine[] = [];

  for (const sel of selections) {
    if (!sel.enabled) continue;
    const boss = findBoss(sel.bossId);
    if (!boss) continue;
    const diff = boss.difficulties.find((d) => d.name === sel.difficulty);
    if (!diff) continue;
    const partySize = clampPartySize(boss.id, sel.partySize);
    const personal = personalCrystal(diff.crystal, partySize, world);
    const line: IncomeLine = {
      bossId: boss.id,
      bossName: boss.name,
      difficulty: sel.difficulty,
      frequency: boss.frequency,
      partySize,
      crystalBase: crystalMesos(diff.crystal, world),
      crystalPersonal: personal,
      sells: false,
    };
    if (boss.frequency === "monthly") monthlyLines.push(line);
    else weeklyCandidates.push(line);
  }

  // MapleHub: personal crystal value descending (hardest / highest value first).
  weeklyCandidates.sort(
    (a, b) =>
      b.crystalPersonal - a.crystalPersonal ||
      a.bossName.localeCompare(b.bossName),
  );
  let used = 0;
  let weeklyMesos = 0;
  for (const line of weeklyCandidates) {
    if (used < crystalLimit) {
      line.sells = true;
      used += 1;
      weeklyMesos += line.crystalPersonal;
    }
  }

  monthlyLines.sort(
    (a, b) =>
      b.crystalPersonal - a.crystalPersonal ||
      a.bossName.localeCompare(b.bossName),
  );
  const monthlyMesos = monthlyLines.reduce(
    (sum, line) => sum + line.crystalPersonal,
    0,
  );
  for (const line of monthlyLines) line.sells = true;

  const weeklyListed = weeklyCandidates.filter((l) => l.sells);

  return {
    lines: [...weeklyCandidates, ...monthlyLines],
    weeklyListed,
    weeklyCrystalsUsed: used,
    weeklyCrystalLimit: crystalLimit,
    weeklyMesos,
    monthlyMesos,
    monthlyAsWeeklyMesos: Math.floor(monthlyMesos / 4),
    maxPossibleMesos: weeklyMesos,
  };
}

/** Aggregate max possible mesos + account crystal usage across roster keys. */
export function summarizeRosterIncome(
  byCharacter: Record<string, BossClearSelection[]>,
  world: WorldType,
  keys: string[],
): RosterIncomeSummary {
  const characters = keys.map((key) => ({
    key,
    summary: summarizeIncome(byCharacter[key] ?? defaultSelections(), world),
  }));
  return {
    characters,
    maxPossibleMesos: characters.reduce(
      (sum, c) => sum + c.summary.maxPossibleMesos,
      0,
    ),
    weeklyCrystalsUsed: characters.reduce(
      (sum, c) => sum + c.summary.weeklyCrystalsUsed,
      0,
    ),
    accountCrystalLimit: ACCOUNT_WEEKLY_CRYSTAL_LIMIT,
  };
}

export function formatMesos(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
