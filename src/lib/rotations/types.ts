/** Saved skill-rotation notes (local only — not a DPM sim). */

export type RotationWhen = "cd_ready" | "always" | "burst_only" | "hold";

export type RotationMode = "dummy" | "boss";

export type RotationSkill = {
  id: string;
  name: string;
  /** HEXA grid index when this skill maps to a core; null for custom. */
  hexaSlot: number | null;
  /** Relative icon under MapleScouter CDN, or null. */
  iconSuffix: string | null;
  cooldown?: number;
};

export type RotationSlot = {
  /** Unique instance id (skill may appear more than once). */
  slotId: string;
  skillId: string;
  when: RotationWhen;
};

export type SavedClassRotation = {
  version: 1;
  /** Scouter `charType` (e.g. nl, hero). */
  charType: string;
  jobType: string;
  name: string;
  mode: RotationMode;
  notes: string;
  slots: RotationSlot[];
  updatedAt: string;
};

export type ClassRotationsStore = {
  version: 1;
  /** One saved rotation per charType (latest wins). */
  byCharType: Record<string, SavedClassRotation>;
};
