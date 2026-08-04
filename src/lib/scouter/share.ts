import { Redis } from "@upstash/redis";
import { clampHexaForGms } from "./buffs";
import type { BuffState, LinkState } from "./buffs";
import type { ScouterInput } from "./types";

/** Max JSON body size for share payloads (~64 KB). */
export const SHARE_MAX_BYTES = 64 * 1024;

const SHARE_KEY_PREFIX = "scouter:share:";
export const SHARE_PUBLIC_SET = "scouter:share:public";
/** NX keys: scouter:share:public:name:{normalized} → id (unique public names). */
const SHARE_PUBLIC_NAME_PREFIX = "scouter:share:public:name:";
/** Delete tokens kept separate from the share payload so GET can't leak them. */
const SHARE_DELETE_PREFIX = "scouter:share:delete:";

const ID_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export type ScouterShareState = {
  input: ScouterInput;
  buffs: BuffState;
  links: LinkState;
  hexa: number[];
};

export type ScouterShareRecord = {
  id: string;
  name: string;
  createdAt: number;
  public: boolean;
  /** Short gallery blurb (achievement / explanation). */
  achievement?: string;
  state: ScouterShareState;
};

/** Max length for public gallery achievement text. */
export const SHARE_ACHIEVEMENT_MAX = 120;

export function normalizeAchievement(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ").slice(0, SHARE_ACHIEVEMENT_MAX);
}

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Sharing is not configured (missing Upstash Redis env)");
  }
  return new Redis({ url, token });
}

export function shareKey(id: string): string {
  return `${SHARE_KEY_PREFIX}${id}`;
}

export function newShareId(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = "";
  for (let i = 0; i < length; i++) {
    id += ID_ALPHABET[bytes[i]! % ID_ALPHABET.length]!;
  }
  return id;
}

export function normalizeShareState(state: ScouterShareState): ScouterShareState {
  return {
    input: state.input,
    buffs: state.buffs,
    links: state.links,
    hexa: clampHexaForGms(
      Array.isArray(state.hexa) ? state.hexa.map((n) => Number(n) || 0) : [],
    ),
  };
}

export function estimateJsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export function normalizePublicShareName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function publicNameKey(normalizedName: string): string {
  return `${SHARE_PUBLIC_NAME_PREFIX}${normalizedName}`;
}

function deleteTokenKey(id: string): string {
  return `${SHARE_DELETE_PREFIX}${id}`;
}

export type CreateShareResult = {
  record: ScouterShareRecord;
  deleteToken: string;
};

export async function createShare(args: {
  name: string;
  state: ScouterShareState;
  public?: boolean;
  achievement?: string;
}): Promise<CreateShareResult> {
  if (!args?.state?.input) {
    throw new Error("Missing state.input");
  }

  const name = (args.name ?? "").trim() || "Untitled";
  // Opt-in: only listed in the public set when explicitly true.
  const isPublic = args.public === true;
  const achievement = normalizeAchievement(args.achievement);
  const state = normalizeShareState(args.state);
  const recordDraft = { name, public: isPublic, achievement, state };
  const bytes = estimateJsonBytes(recordDraft);
  if (bytes > SHARE_MAX_BYTES) {
    throw new Error(
      `Loadout too large to share (${bytes} bytes; max ${SHARE_MAX_BYTES})`,
    );
  }

  const redis = getRedis();
  let id = newShareId();
  for (let attempt = 0; attempt < 5; attempt++) {
    const key = shareKey(id);
    const exists = await redis.exists(key);
    if (!exists) break;
    id = newShareId();
  }

  const normalizedName = normalizePublicShareName(name);
  if (isPublic) {
    if (!normalizedName || normalizedName === "untitled") {
      throw new Error("Choose a unique name before sharing to the gallery");
    }
    // Atomic reserve so two public shares can't claim the same name.
    const reserved = await redis.set(publicNameKey(normalizedName), id, {
      nx: true,
    });
    if (!reserved) {
      throw new Error(
        `A public loadout named “${name}” already exists. Pick another name.`,
      );
    }
  }

  const record: ScouterShareRecord = {
    id,
    name,
    createdAt: Date.now(),
    public: isPublic,
    ...(achievement ? { achievement } : {}),
    state,
  };
  const deleteToken = newShareId(24);

  try {
    await redis.set(shareKey(id), record);
    await redis.set(deleteTokenKey(id), deleteToken);
  } catch (err) {
    if (isPublic) {
      await redis.del(publicNameKey(normalizedName)).catch(() => undefined);
    }
    await redis.del(shareKey(id), deleteTokenKey(id)).catch(() => undefined);
    throw err;
  }

  if (isPublic) {
    // Listing is best-effort; share link still works if SADD fails.
    try {
      await redis.sadd(SHARE_PUBLIC_SET, id);
    } catch {
      // ignore
    }
  }
  return { record, deleteToken };
}

export async function getShare(
  id: string,
): Promise<ScouterShareRecord | null> {
  if (!id || !/^[A-Za-z0-9_-]{4,32}$/.test(id)) return null;
  const redis = getRedis();
  const raw = await redis.get<ScouterShareRecord>(shareKey(id));
  if (!raw || typeof raw !== "object" || !raw.state?.input) return null;
  return {
    ...raw,
    state: normalizeShareState(raw.state),
  };
}

/** Lightweight row for the public gallery (no full buff/link/hexa payload). */
export type ScouterGalleryItem = {
  id: string;
  name: string;
  createdAt: number;
  level: number;
  jobType: string;
  charType: string;
  achievement: string;
};

/** Cap gallery responses so unbounded public sets stay usable. */
const GALLERY_LIST_LIMIT = 500;

export async function listPublicShares(): Promise<ScouterGalleryItem[]> {
  const redis = getRedis();
  const ids = await redis.smembers(SHARE_PUBLIC_SET);
  if (!ids.length) return [];

  const rawList = (await redis.mget(
    ...ids.map((id) => shareKey(id)),
  )) as (ScouterShareRecord | null)[];

  const stale: string[] = [];
  const items: ScouterGalleryItem[] = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    const raw = rawList[i];
    if (
      !raw ||
      typeof raw !== "object" ||
      !raw.state?.input ||
      raw.public === false
    ) {
      stale.push(id);
      continue;
    }
    const input = raw.state.input;
    items.push({
      id: raw.id || id,
      name: (raw.name || "Untitled").trim() || "Untitled",
      createdAt: Number(raw.createdAt) || 0,
      level: Number(input.level) || 0,
      jobType: String(input.jobType || ""),
      charType: String(input.charType || ""),
      achievement: normalizeAchievement(raw.achievement),
    });
  }

  if (stale.length) {
    // Don't block the gallery response on index cleanup.
    void redis.srem(SHARE_PUBLIC_SET, ...stale).catch(() => undefined);
  }

  items.sort((a, b) => b.createdAt - a.createdAt);
  return items.slice(0, GALLERY_LIST_LIMIT);
}

/**
 * Remove a loadout from the public gallery (frees the name).
 * Requires the delete token returned at create time.
 * The share remains openable by direct link as private.
 */
export async function removeFromPublicGallery(args: {
  id: string;
  deleteToken: string;
}): Promise<void> {
  const id = args.id?.trim();
  const deleteToken = args.deleteToken?.trim();
  if (!id || !/^[A-Za-z0-9_-]{4,32}$/.test(id) || !deleteToken) {
    throw new Error("Invalid share id or delete token");
  }

  const redis = getRedis();
  const storedToken = await redis.get<string>(deleteTokenKey(id));
  if (!storedToken || storedToken !== deleteToken) {
    throw new Error("Not allowed to remove this share");
  }

  const raw = await redis.get<ScouterShareRecord>(shareKey(id));
  if (raw && typeof raw === "object") {
    const name = normalizePublicShareName(raw.name || "");
    if (name) {
      const owned = await redis.get<string>(publicNameKey(name));
      if (owned === id) {
        await redis.del(publicNameKey(name));
      }
    }
    if (raw.public) {
      await redis.set(shareKey(id), { ...raw, public: false });
    }
  }

  await redis.srem(SHARE_PUBLIC_SET, id);
}
