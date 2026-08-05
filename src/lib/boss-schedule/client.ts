/** Browser-safe boss-schedule exports (no Redis / server imports). */
export {
  AVAILABILITY_LABELS,
  DAY_LABELS,
  DAY_LABELS_FULL,
  emptyScheduleState,
  clampDay,
  clampMinutes,
  clampDuration,
  formatTimeMinutes,
  parseTimeToMinutes,
  newLocalId,
  type AvailabilityStatus,
  type BossScheduleEvent,
  type BossScheduleMember,
  type BossScheduleState,
  type BossScheduleShareRecord,
} from "./types";

export { normalizeScheduleState } from "./normalize";

export {
  BOSS_SCHEDULE_STORAGE_KEY,
  BOSS_SCHEDULE_SHARE_META_KEY,
  readLocalSchedule,
  writeLocalSchedule,
  readLocalShareMeta,
  writeLocalShareMeta,
  type LocalShareMeta,
} from "./persist";
