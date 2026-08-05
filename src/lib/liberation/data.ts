/** Genesis / Destiny liberation data aligned with MapleHub liberation calculator. */

export type LiberationType = "genesis" | "destiny";

export type TraceDifficulty = { label: string; baseTraces: number };

export type TraceBoss = {
  name: string;
  /** MapleHub CDN path under https://cdn.maplehub.app/ */
  image: string;
  difficulties: TraceDifficulty[];
  /** Black Mage is monthly; everyone else is weekly. */
  frequency: "weekly" | "monthly";
};

export type LiberationMilestone = {
  label: string;
  bossName: string;
  requiredTraces: number;
  /** MapleHub select value: `${requiredTraces}|${bossName}` */
  value: string;
};

/** Input clamp matches MapleHub (`Math.min(..., 3000)` for both types). */
export const TRACE_INPUT_MAX = 3000;
/** In-game carryover tip shown for Genesis (MapleHub copy). */
export const GENESIS_CARRYOVER_CAP = 1500;
/** In-game carryover tip / Destiny bank (MapleHub copy). */
export const DESTINY_CARRYOVER_CAP = 3000;

export const GENESIS_TARGET = 6500;
export const DESTINY_TARGET = 7500;

export const BOSS_ICON_CDN = "https://cdn.maplehub.app";

/** Genesis-tab weekly/monthly bosses (MapleHub `ue`). */
export const GENESIS_BOSSES: TraceBoss[] = [
  {
    name: "Lotus",
    image: "bosses/lotus.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Normal", baseTraces: 10 },
      { label: "Hard", baseTraces: 50 },
      { label: "Extreme", baseTraces: 50 },
    ],
  },
  {
    name: "Damien",
    image: "bosses/damien.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Normal", baseTraces: 10 },
      { label: "Hard", baseTraces: 50 },
    ],
  },
  {
    name: "Lucid",
    image: "bosses/lucid.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Easy", baseTraces: 15 },
      { label: "Normal", baseTraces: 20 },
      { label: "Hard", baseTraces: 65 },
    ],
  },
  {
    name: "Will",
    image: "bosses/will.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Easy", baseTraces: 15 },
      { label: "Normal", baseTraces: 25 },
      { label: "Hard", baseTraces: 75 },
    ],
  },
  {
    name: "Gloom",
    image: "bosses/gloom.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Normal", baseTraces: 20 },
      { label: "Chaos", baseTraces: 65 },
    ],
  },
  {
    name: "Darknell",
    image: "bosses/darknell.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Normal", baseTraces: 25 },
      { label: "Hard", baseTraces: 75 },
    ],
  },
  {
    name: "Verus Hilla",
    image: "bosses/verus-hilla.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Normal", baseTraces: 45 },
      { label: "Hard", baseTraces: 90 },
    ],
  },
  {
    name: "Black Mage",
    image: "bosses/black-mage.webp",
    frequency: "monthly",
    difficulties: [
      { label: "Hard", baseTraces: 600 },
      { label: "Extreme", baseTraces: 600 },
    ],
  },
];

/** Destiny-tab bosses (MapleHub `he`). */
export const DESTINY_BOSSES: TraceBoss[] = [
  {
    name: "Seren",
    image: "bosses/chosen-seren.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Hard", baseTraces: 6 },
      { label: "Extreme", baseTraces: 80 },
    ],
  },
  {
    name: "Kalos",
    image: "bosses/kalos-the-guardian.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Normal", baseTraces: 10 },
      { label: "Chaos", baseTraces: 70 },
      { label: "Extreme", baseTraces: 400 },
    ],
  },
  {
    name: "Adversary",
    image: "bosses/the-first-adversary.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Normal", baseTraces: 15 },
      { label: "Hard", baseTraces: 120 },
      { label: "Extreme", baseTraces: 500 },
    ],
  },
  {
    name: "Malefic Star",
    image: "bosses/malefic-star.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Normal", baseTraces: 20 },
      { label: "Hard", baseTraces: 380 },
    ],
  },
  {
    name: "Kaling",
    image: "bosses/kaling.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Normal", baseTraces: 20 },
      { label: "Hard", baseTraces: 160 },
      { label: "Extreme", baseTraces: 1200 },
    ],
  },
  {
    name: "Limbo",
    image: "bosses/limbo.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Normal", baseTraces: 120 },
      { label: "Hard", baseTraces: 360 },
    ],
  },
  {
    name: "Baldrix",
    image: "bosses/baldrix.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Normal", baseTraces: 150 },
      { label: "Hard", baseTraces: 450 },
    ],
  },
  {
    name: "Jupiter",
    image: "bosses/jupiter.webp",
    frequency: "weekly",
    difficulties: [
      { label: "Normal", baseTraces: 160 },
      { label: "Hard", baseTraces: 500 },
    ],
  },
];

/** Flat lookup table (MapleHub `oe`) — both tabs. */
export const TRACE_BOSSES: TraceBoss[] = [
  ...GENESIS_BOSSES,
  ...DESTINY_BOSSES,
];

export const GENESIS_MILESTONES: LiberationMilestone[] = [
  {
    label: "Von Leon — 0",
    bossName: "Von Leon",
    requiredTraces: 0,
    value: "0|Von Leon",
  },
  {
    label: "Arkarium — 500",
    bossName: "Arkarium",
    requiredTraces: 500,
    value: "500|Arkarium",
  },
  {
    label: "Magnus — 1,000",
    bossName: "Magnus",
    requiredTraces: 1000,
    value: "1000|Magnus",
  },
  {
    label: "Lotus — 1,500",
    bossName: "Lotus",
    requiredTraces: 1500,
    value: "1500|Lotus",
  },
  {
    label: "Damien — 2,500",
    bossName: "Damien",
    requiredTraces: 2500,
    value: "2500|Damien",
  },
  {
    label: "Will — 3,500",
    bossName: "Will",
    requiredTraces: 3500,
    value: "3500|Will",
  },
  {
    label: "Lucid — 4,500",
    bossName: "Lucid",
    requiredTraces: 4500,
    value: "4500|Lucid",
  },
  {
    label: "Verus Hilla — 5,500",
    bossName: "Verus Hilla",
    requiredTraces: 5500,
    value: "5500|Verus Hilla",
  },
];

export const DESTINY_MILESTONES: LiberationMilestone[] = [
  {
    label: "Seren — 0",
    bossName: "Seren",
    requiredTraces: 0,
    value: "0|Seren",
  },
  {
    label: "Kalos — 2,000",
    bossName: "Kalos",
    requiredTraces: 2000,
    value: "2000|Kalos",
  },
  {
    label: "Kaling — 4,500",
    bossName: "Kaling",
    requiredTraces: 4500,
    value: "4500|Kaling",
  },
];

export function bossesFor(type: LiberationType): TraceBoss[] {
  return type === "destiny" ? DESTINY_BOSSES : GENESIS_BOSSES;
}

export function milestonesForType(type: LiberationType): LiberationMilestone[] {
  return type === "destiny" ? DESTINY_MILESTONES : GENESIS_MILESTONES;
}

export function targetForType(type: LiberationType): number {
  return type === "destiny" ? DESTINY_TARGET : GENESIS_TARGET;
}

export function currencyLabel(type: LiberationType): string {
  return type === "destiny"
    ? "Adversary's Determination"
    : "Traces of Darkness";
}

export function bossIconSrc(boss: TraceBoss): string {
  return `${BOSS_ICON_CDN}/${boss.image}`;
}
