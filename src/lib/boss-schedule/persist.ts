import {
  emptyScheduleState,
  type BossScheduleState,
} from "./types";
import { normalizeScheduleState } from "./normalize";

export const BOSS_SCHEDULE_STORAGE_KEY = "maplecompile.boss-schedule.v1";
export const BOSS_SCHEDULE_SHARE_META_KEY =
  "maplecompile.boss-schedule.share-meta.v1";

export type LocalShareMeta = {
  shareId: string;
  editToken: string;
  viewUrl?: string;
  editUrl?: string;
  updatedAt: number;
};

export function readLocalSchedule(): BossScheduleState {
  if (typeof window === "undefined") return emptyScheduleState();
  try {
    const raw = localStorage.getItem(BOSS_SCHEDULE_STORAGE_KEY);
    if (!raw) return emptyScheduleState();
    return normalizeScheduleState(JSON.parse(raw));
  } catch {
    return emptyScheduleState();
  }
}

export function writeLocalSchedule(state: BossScheduleState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      BOSS_SCHEDULE_STORAGE_KEY,
      JSON.stringify(normalizeScheduleState(state)),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function readLocalShareMeta(): LocalShareMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BOSS_SCHEDULE_SHARE_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalShareMeta>;
    if (
      typeof parsed.shareId !== "string" ||
      typeof parsed.editToken !== "string"
    ) {
      return null;
    }
    return {
      shareId: parsed.shareId,
      editToken: parsed.editToken,
      viewUrl:
        typeof parsed.viewUrl === "string" ? parsed.viewUrl : undefined,
      editUrl:
        typeof parsed.editUrl === "string" ? parsed.editUrl : undefined,
      updatedAt: Number(parsed.updatedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeLocalShareMeta(meta: LocalShareMeta | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!meta) {
      localStorage.removeItem(BOSS_SCHEDULE_SHARE_META_KEY);
      return;
    }
    localStorage.setItem(BOSS_SCHEDULE_SHARE_META_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}
