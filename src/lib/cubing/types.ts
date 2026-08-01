export type CubeType = "occult" | "master" | "meister" | "red" | "black";
export type ItemCategory =
  | "accessory"
  | "badge"
  | "belt"
  | "bottom"
  | "cape"
  | "emblem"
  | "gloves"
  | "hat"
  | "heart"
  | "overall"
  | "top"
  | "secondary"
  | "shoes"
  | "shoulder"
  | "weapon";
export type StatType = "normal" | "hp" | "allStat";
export type Tier = 0 | 1 | 2 | 3;

export type ProbabilityInput = {
  percStat: number;
  lineStat: number;
  percAllStat: number;
  lineAllStat: number;
  percHp: number;
  lineHp: number;
  percAtt: number;
  lineAtt: number;
  percBoss: number;
  lineBoss: number;
  lineIed: number;
  lineCritDamage: number;
  lineMeso: number;
  lineDrop: number;
  lineMesoOrDrop: number;
  secCooldown: number;
  lineAutoSteal: number;
  lineAttOrBoss: number;
  lineAttOrBossOrIed: number;
  lineBossOrIed: number;
};

export type RateLine = [string, number | string[], number];

export type DesiredStatOption = {
  value: string;
  label: string;
};

export type DesiredStatGroup = {
  id: string;
  label: string;
  options: DesiredStatOption[];
};

export type CubeQuantiles = {
  mean: number;
  median: number;
  seventy_fifth: number;
  eighty_fifth: number;
  nintey_fifth: number;
};

export type CubingResult = {
  cubes: CubeQuantiles;
  mesos: CubeQuantiles;
  probability: number;
};
