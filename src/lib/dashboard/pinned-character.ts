import type { NexonRegion } from "@/lib/character/lookup";

/** @deprecated Prefer maplecompile-roster; kept for migration / sync. */
export const PINNED_CHARACTER_KEY = "maplecompile-dashboard-pinned";

export type PinnedCharacter = {
  name: string;
  region: NexonRegion;
  pinnedAt: number;
};
