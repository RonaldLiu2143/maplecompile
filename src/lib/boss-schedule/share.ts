import {
  getRedis,
  isRedisConfigured,
  newShareId,
} from "@/lib/scouter/share";
import { estimateJsonBytes, normalizeScheduleState } from "./normalize";
import {
  emptyScheduleState,
  type BossScheduleShareRecord,
  type BossScheduleState,
} from "./types";

export { isRedisConfigured, normalizeScheduleState, estimateJsonBytes };

/** Max JSON body size for schedule payloads (~48 KB). */
export const SCHEDULE_MAX_BYTES = 48 * 1024;

const SHARE_KEY_PREFIX = "boss-schedule:share:";
const EDIT_TOKEN_PREFIX = "boss-schedule:edit:";

function shareKey(id: string): string {
  return `${SHARE_KEY_PREFIX}${id}`;
}

function editTokenKey(id: string): string {
  return `${EDIT_TOKEN_PREFIX}${id}`;
}

export type CreateScheduleShareResult = {
  record: BossScheduleShareRecord;
  editToken: string;
};

export async function createScheduleShare(
  state: BossScheduleState,
): Promise<CreateScheduleShareResult> {
  if (!isRedisConfigured()) {
    throw new Error("Sharing is not configured (missing Upstash Redis env)");
  }
  const normalized = normalizeScheduleState(state);
  const bytes = estimateJsonBytes(normalized);
  if (bytes > SCHEDULE_MAX_BYTES) {
    throw new Error(
      `Schedule too large to share (${bytes} bytes; max ${SCHEDULE_MAX_BYTES})`,
    );
  }

  const redis = getRedis();
  let id = newShareId();
  for (let i = 0; i < 8; i++) {
    const exists = await redis.exists(shareKey(id));
    if (!exists) break;
    id = newShareId();
  }

  const now = Date.now();
  const record: BossScheduleShareRecord = {
    id,
    createdAt: now,
    updatedAt: now,
    state: normalized,
  };
  const editToken = newShareId(24);

  await redis.set(shareKey(id), record);
  await redis.set(editTokenKey(id), editToken);

  return { record, editToken };
}

export async function getScheduleShare(
  id: string,
): Promise<BossScheduleShareRecord | null> {
  if (!id || !/^[A-Za-z0-9_-]{4,32}$/.test(id)) return null;
  const redis = getRedis();
  const raw = await redis.get<BossScheduleShareRecord>(shareKey(id));
  if (!raw || typeof raw !== "object") return null;
  return {
    id: raw.id || id,
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    state: normalizeScheduleState(raw.state ?? emptyScheduleState()),
  };
}

export async function assertEditToken(
  id: string,
  editToken: string,
): Promise<void> {
  if (!id || !/^[A-Za-z0-9_-]{4,32}$/.test(id) || !editToken) {
    throw new Error("Invalid share id or edit token");
  }
  const redis = getRedis();
  const stored = await redis.get<string>(editTokenKey(id));
  if (!stored || stored !== editToken) {
    throw new Error("Not allowed to edit this schedule");
  }
}

export async function updateScheduleShare(args: {
  id: string;
  editToken: string;
  state: BossScheduleState;
}): Promise<BossScheduleShareRecord> {
  await assertEditToken(args.id, args.editToken.trim());
  const normalized = normalizeScheduleState(args.state);
  const bytes = estimateJsonBytes(normalized);
  if (bytes > SCHEDULE_MAX_BYTES) {
    throw new Error(
      `Schedule too large to share (${bytes} bytes; max ${SCHEDULE_MAX_BYTES})`,
    );
  }

  const existing = await getScheduleShare(args.id);
  if (!existing) {
    throw new Error("Share not found");
  }

  const record: BossScheduleShareRecord = {
    ...existing,
    updatedAt: Date.now(),
    state: normalized,
  };
  const redis = getRedis();
  await redis.set(shareKey(args.id), record);
  return record;
}
