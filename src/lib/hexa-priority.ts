/**
 * HEXA upgrade priority from MapleHub Fragment Calculator.
 *
 * MapleHub stores per-class leveling `order` bands keyed by HEXA Converted
 * score (boss380), default band target **85000**. Each order entry is
 * `[skillPosition, targetLevel]`. Priority "score" for a skill is
 * `1000 - index` of its next unfinished step (higher = sooner in the FD path).
 * The stored/entered score stays as-entered; nearest-band matching is only
 * used when resolving which `order` band to rank against.
 *
 * Skill positions (MapleHub) → our tracker nodes:
 *   1 Origin (slot 8), 2–Mastery1 (0), 3–6 Boost (4–7), 7–9 Mastery2–4 (1–3),
 *   10 Ascent (slot 9), 11 Hexa Stat, 13 Sol Hecate (slot 13).
 * Position 12 (Sol Janus) is excluded from FD ranking.
 */

import bandsData from "./data/hexa-priority-bands.json";
import {
  nextLevelCost,
  type HexaProgressNode,
  type HexaUpgradePathStep,
} from "./hexa-costs";

export const DEFAULT_BOSS_CONVERTED_STAT = 85_000;
/** Max HEXA Converted score digits / value (6 numeric digits). */
export const MAX_BOSS_CONVERTED_STAT = 999_999;

type BandRow = { target: number; order: number[][] };
type ClassBands = { name: string; bands: BandRow[] };

const BY_ID = bandsData.byId as Record<string, ClassBands>;

/** Scouter / roster `charType` → MapleHub `classId`. */
export const CHAR_TYPE_TO_PRIORITY_CLASS_ID: Record<string, string> = {
  adele: "adele",
  aran: "aran",
  blaster: "blaster",
  dk: "dark_knight",
  da: "demon_avenger",
  ds: "demon_slayer",
  hayato: "hayato",
  hero: "hero",
  len: "ren",
  mihile: "mihile",
  kaiser: "kaiser",
  paladin: "paladin",
  sm: "dawn_warrior",
  zero: "zero",
  bam: "battle_mage",
  bs: "bishop",
  evan: "evan",
  fp: "arch_mage_f_p",
  fw: "blaze_wizard",
  il: "arch_mage_i_l",
  illium: "illium",
  kanna: "kanna",
  kinesis: "kinesis",
  lara: "lara",
  lumi: "luminous",
  lynn: "lynn",
  sia: "sia",
  bm: "bow_master",
  xbm: "marksman",
  kain: "kain",
  merc: "mercedes",
  pf: "pathfinder",
  wh: "wild_hunter",
  wb: "wind_archer",
  cadena: "cadena",
  db: "blade_master",
  hy: "hoyoung",
  khali: "khali",
  nl: "night_lord",
  nw: "night_walker",
  phantom: "phantom",
  sdw: "shadower",
  xenon: "xenon",
  ab: "angelic_buster",
  ark: "ark",
  cm: "cannon_master",
  captain: "corsair",
  eunwol: "shade",
  mech: "mechanic",
  mx: "mo_xuan",
  striker: "thunder_breaker",
  viper: "buccaneer",
};

/** MapleHub skill position → tracker node id (`slot-N` or `hexa-stat`). */
export function nodeIdForPriorityPosition(pos: number): string | null {
  switch (pos) {
    case 1:
      return "slot-8";
    case 2:
      return "slot-0";
    case 3:
      return "slot-4";
    case 4:
      return "slot-5";
    case 5:
      return "slot-6";
    case 6:
      return "slot-7";
    case 7:
      return "slot-1";
    case 8:
      return "slot-2";
    case 9:
      return "slot-3";
    case 10:
      return "slot-9";
    case 11:
      return "hexa-stat";
    case 13:
      return "slot-13";
    default:
      return null;
  }
}

export function priorityClassIdForCharType(charType: string): string | null {
  return CHAR_TYPE_TO_PRIORITY_CLASS_ID[charType] ?? null;
}

export function availableBossStatTargets(charType: string): number[] {
  const id = priorityClassIdForCharType(charType);
  if (!id) return [DEFAULT_BOSS_CONVERTED_STAT];
  const row = BY_ID[id];
  if (!row?.bands?.length) return [DEFAULT_BOSS_CONVERTED_STAT];
  return row.bands.map((b) => b.target);
}

/**
 * Nearest published MapleHub band target for a class.
 * For priority ranking only — do not write this back into the HEXA Converted
 * input / stored score.
 */
export function snapBossConvertedStat(
  charType: string,
  raw: number,
): number {
  const targets = availableBossStatTargets(charType);
  if (!targets.length) return DEFAULT_BOSS_CONVERTED_STAT;
  if (!Number.isFinite(raw)) return targets[0] ?? DEFAULT_BOSS_CONVERTED_STAT;
  return targets.reduce((best, t) =>
    Math.abs(t - raw) < Math.abs(best - raw) ? t : best,
  );
}

function orderForClass(
  charType: string,
  bossConvertedStat: number,
): number[][] | null {
  const id = priorityClassIdForCharType(charType);
  if (!id) return null;
  const row = BY_ID[id];
  if (!row?.bands?.length) return null;
  const band = row.bands.reduce((best, b) =>
    Math.abs(b.target - bossConvertedStat) <
    Math.abs(best.target - bossConvertedStat)
      ? b
      : best,
  );
  return band.order;
}

export type HexaScoreUpgrade = {
  node: HexaProgressNode;
  /** Level after applying this priority step (+1 only). */
  nextLevel: number;
  /** Cost for the single +1 level (not the full band stop). */
  fragments: number;
  solErda: number;
  /**
   * MapleHub priority score (`1000 - orderIndex`). Higher = earlier in the
   * class FD leveling path for the nearest HEXA Converted band.
   */
  score: number;
  /** 0-based index of this step in the class order (when score > 0). */
  orderIndex: number | null;
};

function scoreNodeAgainstOrder(
  node: HexaProgressNode,
  order: number[][] | null,
): HexaScoreUpgrade | null {
  if (node.current >= node.target) return null;

  const nextLevel = node.current + 1;
  const single = nextLevelCost(node.skillType, node.current);
  if (!order) {
    return {
      node,
      nextLevel,
      fragments: single.fragments,
      solErda: single.solErda,
      score: 0,
      orderIndex: null,
    };
  }

  const steps = order
    .map(([pos, targetLevel], index) => ({
      pos,
      targetLevel,
      index,
      nodeId: nodeIdForPriorityPosition(pos),
    }))
    .filter((s) => s.nodeId === node.id);

  // Rank by the unfinished FD band step, but always advance only +1 level
  // and price that single upgrade (e.g. 22→23), never jump to the band stop.
  const next = steps.find((s) => s.targetLevel > node.current);
  if (!next) {
    // Past published order — still incomplete vs user target; lowest priority.
    return {
      node,
      nextLevel,
      fragments: single.fragments,
      solErda: single.solErda,
      score: 0,
      orderIndex: null,
    };
  }

  return {
    node,
    nextLevel,
    fragments: single.fragments,
    solErda: single.solErda,
    score: 1000 - next.index,
    orderIndex: next.index,
  };
}

function compareScoreUpgrades(a: HexaScoreUpgrade, b: HexaScoreUpgrade): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.fragments !== b.fragments) return a.fragments - b.fragments;
  return a.solErda - b.solErda;
}

/** Rank incomplete nodes by highest MapleHub priority score. */
export function rankScoreUpgrades(
  nodes: HexaProgressNode[],
  charType: string,
  bossConvertedStat: number = DEFAULT_BOSS_CONVERTED_STAT,
): HexaScoreUpgrade[] {
  const order = orderForClass(charType, bossConvertedStat);
  return nodes
    .map((n) => scoreNodeAgainstOrder(n, order))
    .filter((u): u is HexaScoreUpgrade => u != null)
    .sort(compareScoreUpgrades);
}

/** Top next upgrade by score (falls back to cheapest when no class order). */
export function bestScoreNextUpgrade(
  nodes: HexaProgressNode[],
  charType: string,
  bossConvertedStat: number = DEFAULT_BOSS_CONVERTED_STAT,
): HexaScoreUpgrade | null {
  const ranked = rankScoreUpgrades(nodes, charType, bossConvertedStat);
  return ranked[0] ?? null;
}

/**
 * Simulate repeatedly taking the highest-score next +1 until all targets
 * are met. Each entry is one level; consecutive levels on the same node can
 * be grouped in the UI via groupConsecutiveUpgradeRuns.
 */
export function buildScoreUpgradePath(
  nodes: HexaProgressNode[],
  charType: string,
  bossConvertedStat: number = DEFAULT_BOSS_CONVERTED_STAT,
): HexaUpgradePathStep[] {
  const levels = new Map(nodes.map((n) => [n.id, n.current]));
  const steps: HexaUpgradePathStep[] = [];
  const maxSteps = nodes.reduce(
    (sum, n) => sum + Math.max(0, n.target - n.current),
    0,
  );

  for (let i = 0; i < maxSteps; i++) {
    const simulated = nodes.map((n) => ({
      ...n,
      current: levels.get(n.id) ?? n.current,
    }));
    const next = bestScoreNextUpgrade(
      simulated,
      charType,
      bossConvertedStat,
    );
    if (!next) break;
    const from = levels.get(next.node.id) ?? next.node.current;
    const to = next.nextLevel;
    if (to <= from) break;
    levels.set(next.node.id, to);
    steps.push({
      nodeId: next.node.id,
      label: next.node.label,
      skillType: next.node.skillType,
      slotIndex: next.node.slotIndex,
      fromLevel: from,
      toLevel: to,
    });
  }
  return steps;
}

export function normalizeBossConvertedStat(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0) return DEFAULT_BOSS_CONVERTED_STAT;
  return Math.min(n, MAX_BOSS_CONVERTED_STAT);
}

/** Keep only up to 6 numeric digits for the HEXA Converted draft input. */
export function clampBossConvertedStatDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}
