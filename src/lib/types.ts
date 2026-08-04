export type JobType = "warrior" | "magician" | "archer" | "thief" | "pirate";

export type EquipStats = {
  str?: number;
  dex?: number;
  int?: number;
  luk?: number;
  maxHp?: number;
  maxMp?: number;
  att?: number;
  matt?: number;
  weaponAtt?: number;
  weaponMatt?: number;
  slots?: number;
  [key: string]: number | undefined;
};

export type Equip = {
  _id?: string;
  id: string;
  name: string;
  jobType: string;
  charType: string[];
  setType: string;
  equipType: string;
  level: number;
  imgUrl: string;
  height?: number;
  width?: number;
  isLuckyItem?: boolean;
  itemPriority?: number;
  stats?: EquipStats;
  tags?: string[];
  isNormalFlame?: boolean;
  flames?: FlameLine[];
  /** Current Star Force (planner / progression). Optional — defaults applied in planner. */
  starForce?: number;
  /** Potential tier: 0 Rare … 3 Legendary (planner). */
  potentialTier?: 0 | 1 | 2 | 3;
};

export type EquipTypeBucket = {
  name: string;
  equips: Equip[];
};

export type EquipsResponse = {
  equipByType: Record<string, EquipTypeBucket>;
  equipBySetName: Record<string, Equip[]>;
};

export type SetEffectStat = {
  statId: string;
  val: number;
  _id?: string;
};

export type SetEffectTier = {
  numEquipped: number;
  list: SetEffectStat[];
  _id?: string;
};

export type SetEffect = {
  _id?: string;
  jobType: string;
  setType: string;
  level?: number;
  effects: SetEffectTier[];
  items?: Equip[];
  __v?: number;
};

export type SetEffectsResponse = {
  list: SetEffect[];
};

/** Slot key -> selected equips (rings/pendants are arrays) */
export type EquipSetup = Record<string, Equip[]>;

export type FlameLine = {
  id: string;
  tierNum: number;
  value: number;
  mixedStats?: string[];
};

export type FlameSetup = Record<string, FlameLine[]>;

export type StatEquiv = {
  priStat: string[];
  secStat: string[];
  values: {
    sec: number;
    att: number;
    allStats: number;
    boss: number;
  };
};

export type FlameTypeId = "crf" | "rrf" | "arf";

export type FlameChanceResult = {
  flameType: FlameTypeId;
  chance: number;
};

export type CharOption = {
  id: string;
  name: string;
};

export type JobOption = {
  id: JobType;
  name: string;
  chars: CharOption[];
};
