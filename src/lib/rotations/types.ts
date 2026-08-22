/** Per-class skill definitions (seeded from wiki / in-game tooltips). */

export type SkillCategory =
  | "class_buff"
  | "fifth"
  | "hexa"
  | "attack"
  | "summon"
  | "utility";

export type ClassSkillDef = {
  id: string;
  name: string;
  category: SkillCategory;
  iconSuffix?: string | null;
  hexaSlot?: number | null;
  cooldownSec?: number;
  durationSec?: number;
  delaySec?: number;
};

export type RotationClassData = {
  charType: string;
  patchNote?: string;
  skills: ClassSkillDef[];
};

export type CastOrderEntry = {
  slotId: string;
  skillId: string;
};

export type TimelineBlock = {
  blockId: string;
  skillId: string;
  startSec: number;
  durationSec: number;
};

export type SavedClassRotation = {
  version: 2;
  charType: string;
  jobType: string;
  name: string;
  notes: string;
  castOrder: CastOrderEntry[];
  timeline: TimelineBlock[];
  updatedAt: string;
};

export type ClassRotationsStore = {
  version: 2;
  byCharType: Record<string, SavedClassRotation>;
};

/** @deprecated v1 shape — migrated on read */
export type SavedClassRotationV1 = {
  version: 1;
  charType: string;
  jobType: string;
  name: string;
  mode?: string;
  notes: string;
  slots: { slotId: string; skillId: string; when?: string }[];
  updatedAt: string;
};

export const TIMELINE_MAX_SEC = 1800;

export const BUFF_CATEGORIES: ReadonlySet<SkillCategory> = new Set([
  "class_buff",
  "fifth",
  "hexa",
]);
