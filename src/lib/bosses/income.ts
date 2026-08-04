import {
  BOSS_CRYSTALS,
  WEEKLY_CRYSTAL_LIMIT,
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
  weeklyCrystalsUsed: number;
  weeklyCrystalLimit: number;
  weeklyMesos: number;
  monthlyMesos: number;
  /** Monthly crystal converted to weekly-equivalent for display only. */
  monthlyAsWeeklyMesos: number;
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

export function personalCrystal(
  base: number,
  partySize: number,
  world: WorldType,
): number {
  const sized = Math.floor(crystalMesos(base, world) / Math.max(1, partySize));
  return sized;
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
    const personal = personalCrystal(diff.crystal, sel.partySize, world);
    const line: IncomeLine = {
      bossId: boss.id,
      bossName: boss.name,
      difficulty: sel.difficulty,
      frequency: boss.frequency,
      partySize: Math.max(1, sel.partySize),
      crystalBase: crystalMesos(diff.crystal, world),
      crystalPersonal: personal,
      sells: false,
    };
    if (boss.frequency === "monthly") monthlyLines.push(line);
    else weeklyCandidates.push(line);
  }

  weeklyCandidates.sort((a, b) => b.crystalPersonal - a.crystalPersonal);
  let used = 0;
  let weeklyMesos = 0;
  for (const line of weeklyCandidates) {
    if (used < crystalLimit) {
      line.sells = true;
      used += 1;
      weeklyMesos += line.crystalPersonal;
    }
  }

  const monthlyMesos = monthlyLines.reduce(
    (sum, line) => sum + line.crystalPersonal,
    0,
  );
  for (const line of monthlyLines) line.sells = true;

  return {
    lines: [...weeklyCandidates, ...monthlyLines],
    weeklyCrystalsUsed: used,
    weeklyCrystalLimit: crystalLimit,
    weeklyMesos,
    monthlyMesos,
    monthlyAsWeeklyMesos: Math.floor(monthlyMesos / 4),
  };
}

export function formatMesos(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
