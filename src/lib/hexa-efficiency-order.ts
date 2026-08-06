/**
 * Hexa Efficiency upgrade order from our MapleHub FD-band priority path
 * (same ranking as HEXA tracker / Boss Converted Stat), not MapleScouter.
 */

import {
  GMS_HEXA_SLOT_INDICES,
  HEXA_STAT_ICON_URL,
  costBetween,
  groupConsecutiveUpgradeRuns,
  summarizeHexaProgress,
  type HexaUpgradePathStep,
} from "./hexa-costs";
import {
  DEFAULT_BOSS_CONVERTED_STAT,
  buildScoreUpgradePath,
  normalizeBossConvertedStat,
  priorityClassIdForCharType,
  snapBossConvertedStat,
} from "./hexa-priority";
import { hexaSlotLabels } from "./hexa-skill-labels";
import { getHexaSlots } from "./scouter/buffs";

/** Same tuple shape the Hexa Efficiency grid historically expected. */
export type HexaOrderStep = [
  name: string,
  level: number,
  icon: string,
  pieceCost: number,
  erdaCost: number,
  cumPiece: number,
  cumErda: number,
  efficiency: number,
  cumRatio: number,
  coreKey: string,
  levelRange: string | null,
];

function coreKeyForStep(step: HexaUpgradePathStep): string {
  if (step.nodeId === "hexa-stat") return "hexaStat";
  const i = step.slotIndex;
  if (i == null) return "generalCore";
  if (i >= 0 && i <= 3) return `masteryCore${i + 1}`;
  if (i >= 4 && i <= 7) return `reinCore${i - 3}`;
  if (i === 8) return "skillCore1";
  if (i === 9) return "skillCore2";
  if (i === 12) return "generalCore1";
  if (i === 13) return "generalCore2";
  return "generalCore";
}

function iconForStep(charType: string, step: HexaUpgradePathStep): string {
  if (step.nodeId === "hexa-stat") {
    return HEXA_STAT_ICON_URL;
  }
  const slots = getHexaSlots(charType);
  const suffix =
    step.slotIndex != null ? slots[step.slotIndex]?.iconSuffix : null;
  return suffix ?? "";
}

/**
 * Build Hexa Efficiency steps using MapleHub class FD bands for the nearest
 * Boss Converted Stat target.
 */
export function buildLocalHexaEfficiencyOrder(args: {
  charType: string;
  levels: number[];
  /** Raw HEXA Converted / Boss Converted Stat (not snapped into storage). */
  bossConvertedStat?: number;
  /** When false, rank from all cores at 0 (after reset). */
  fromCurrent?: boolean;
  hexaStatLevel?: number;
  includeHexaStat?: boolean;
}): {
  steps: HexaOrderStep[];
  bossConvertedStat: number;
  bandTarget: number;
  classId: string | null;
} {
  const fromCurrent = args.fromCurrent !== false;
  const includeHexaStat = args.includeHexaStat !== false;
  const bossConvertedStat = normalizeBossConvertedStat(
    args.bossConvertedStat ?? DEFAULT_BOSS_CONVERTED_STAT,
  );
  const bandTarget = snapBossConvertedStat(args.charType, bossConvertedStat);
  const classId = priorityClassIdForCharType(args.charType);
  const labels = hexaSlotLabels(args.charType);
  const levels = fromCurrent ? args.levels.slice() : args.levels.map(() => 0);
  const hexaStatLevel = fromCurrent ? (args.hexaStatLevel ?? 0) : 0;

  const progress = summarizeHexaProgress({
    levels,
    targets: levels.map(() => 30),
    hexaStatLevel,
    hexaStatTarget: includeHexaStat ? 3 : 0,
    fragmentsHeld: 0,
    erdaHeld: 0,
    activeSlotIndices: [...GMS_HEXA_SLOT_INDICES],
    labels,
    includeHexaStat,
  });

  const path = groupConsecutiveUpgradeRuns(
    buildScoreUpgradePath(progress.nodes, args.charType, bossConvertedStat),
  );

  let cumPiece = 0;
  let cumErda = 0;
  const steps: HexaOrderStep[] = path.map((step, orderIndex) => {
    const cost = costBetween(step.skillType, step.fromLevel, step.toLevel);
    cumPiece += cost.fragments;
    cumErda += cost.solErda;
    const levelRange =
      step.toLevel - step.fromLevel > 1
        ? `${step.fromLevel + 1}→${step.toLevel}`
        : null;
    return [
      step.label,
      step.toLevel,
      iconForStep(args.charType, step),
      cost.fragments,
      cost.solErda,
      cumPiece,
      cumErda,
      Math.max(0, 1000 - orderIndex),
      cumErda > 0 ? cumPiece / cumErda : cumPiece,
      coreKeyForStep(step),
      levelRange,
    ];
  });

  return {
    steps,
    bossConvertedStat,
    bandTarget,
    classId,
  };
}
