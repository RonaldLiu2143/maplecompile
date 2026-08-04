import type { ScouterInput } from "@/lib/scouter/types";
import type { Equip, FlameLine, FlameSetup, EquipSetup } from "@/lib/types";

export type UpgradeKind = "starforce" | "flame" | "cube";

/** Flat / % deltas applied to a ScouterInput for FD ranking. */
export type StatDelta = {
  mainStat?: number;
  subStat?: number;
  allStatPercent?: number;
  att?: number;
  attPercent?: number;
  bossPercent?: number;
  critDamage?: number;
  iedPercent?: number;
  finalDamage?: number;
};

export type UpgradeCandidate = {
  id: string;
  kind: UpgradeKind;
  /** Short action label, e.g. "Hat 17★ → 18★" */
  label: string;
  detail: string;
  slotKey: string;
  equipId: string;
  equipName: string;
  equipImg?: string;
  /** Expected meso cost (Heroic / GMS approximations). */
  mesoCost: number;
  /** Stat deltas used for scouter FD. */
  delta: StatDelta;
  /** Optional notes (safeguard, approximations, etc.). */
  notes?: string;
};

export type RankedUpgrade = UpgradeCandidate & {
  /** (newExpectedBoss / baseExpectedBoss - 1) * 100 */
  fdPercent: number;
  /** Absolute expected-boss delta (scouter itemStat analogue). */
  fdAbsolute: number;
  /** FD% per billion mesos — primary sort key. */
  fdPerBillionMeso: number;
};

export type PlannerPieceOverride = {
  starForce: number;
  potentialTier: 0 | 1 | 2 | 3;
};

/** slotKey → override (slot keys match EquipSetup: hat, ring-1, …). */
export type PlannerOverrides = Record<string, PlannerPieceOverride>;

export type PlannerInputs = {
  scouter: ScouterInput;
  setup: EquipSetup;
  flames: FlameSetup;
  overrides: PlannerOverrides;
  jobType: string;
  charType: string;
  /** Heroic flame meso prices (defaults provided). */
  flamePrices?: { crf: number; rrf: number; arf: number };
  /** Prefer RRF for special flames; CRF for normal. */
  topN?: number;
};

export type FlatEquip = {
  slotKey: string;
  equip: Equip;
  flames: FlameLine[];
  starForce: number;
  potentialTier: 0 | 1 | 2 | 3;
};

/** Default Heroic auction / drop-value guesses for flame meso EV. */
export const DEFAULT_FLAME_PRICES = {
  crf: 8_000_000,
  rrf: 45_000_000,
  arf: 120_000_000,
} as const;
