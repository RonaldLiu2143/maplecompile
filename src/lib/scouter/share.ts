import { Redis } from "@upstash/redis";
import { getCharName } from "@/lib/jobs";
import { clampHexaForGms } from "./buffs";
import type { BuffState, LinkState } from "./buffs";
import type { ScouterInput } from "./types";

/** Max JSON body size for share payloads (~64 KB). */
export const SHARE_MAX_BYTES = 64 * 1024;

const SHARE_KEY_PREFIX = "scouter:share:";
export const SHARE_PUBLIC_SET = "scouter:share:public";
/** NX keys: scouter:share:public:name:{normalized} → id (unique public IGN names). */
const SHARE_PUBLIC_NAME_PREFIX = "scouter:share:public:name:";
/** Delete tokens kept separate from the share payload so GET can't leak them. */
const SHARE_DELETE_PREFIX = "scouter:share:delete:";
/** Atomic view counters: scouter:share:views:{id} → number. */
const SHARE_VIEWS_PREFIX = "scouter:share:views:";

const ID_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** How many trailing id chars to append for anonymous display names. */
export const ANON_ID_SUFFIX_LEN = 5;

export type ShareIdentity = "anonymous" | "ign";

export type ScouterShareState = {
  input: ScouterInput;
  buffs: BuffState;
  links: LinkState;
  hexa: number[];
};

export type ScouterShareRecord = {
  id: string;
  /** Gallery / link display name (IGN or Class·suffix). */
  name: string;
  /**
   * How the share is attributed in the gallery.
   * Legacy shares without this field are treated as `ign`.
   */
  identity?: ShareIdentity;
  /** Character IGN when identity is `ign`. */
  ign?: string;
  createdAt: number;
  public: boolean;
  /** Short gallery blurb (achievement / explanation). */
  achievement?: string;
  /**
   * Cached view count (may lag the Redis INCR key). Prefer `views` from
   * gallery/list helpers which merge the live counter.
   */
  views?: number;
  state: ScouterShareState;
};

/** Max length for public gallery achievement text. */
export const SHARE_ACHIEVEMENT_MAX = 120;

/** Max length for IGN display names. */
export const SHARE_IGN_MAX = 20;

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

function viewsKey(id: string): string {
  return `${SHARE_VIEWS_PREFIX}${id}`;
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

export function normalizeIgn(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, SHARE_IGN_MAX);
}

export function resolveShareIdentity(
  record: Pick<ScouterShareRecord, "identity">,
): ShareIdentity {
  return record.identity === "anonymous" ? "anonymous" : "ign";
}

/**
 * Anonymous gallery name: `{Class}·{idSuffix}` — unique via share id, no name lock.
 * Example: `Adele·a7K2x`
 */
export function buildAnonymousDisplayName(args: {
  jobType: string;
  charType: string;
  id: string;
}): string {
  const className =
    getCharName(args.jobType, args.charType).trim() ||
    args.charType.trim() ||
    "Anon";
  const suffix = args.id.slice(-ANON_ID_SUFFIX_LEN) || args.id;
  return `${className}·${suffix}`;
}

/** Preview helper for the share modal (not the final server-assigned code). */
export function previewAnonymousDisplayName(
  jobType: string,
  charType: string,
  sampleSuffix?: string,
): string {
  const className =
    getCharName(jobType, charType).trim() || charType.trim() || "Anon";
  const suffix =
    sampleSuffix && /^[A-Za-z0-9]+$/.test(sampleSuffix)
      ? sampleSuffix.slice(0, ANON_ID_SUFFIX_LEN)
      : "a7K2x";
  return `${className}·${suffix}`;
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
  name?: string;
  state: ScouterShareState;
  public?: boolean;
  achievement?: string;
  /** Gallery attribution. Defaults to `ign` when public + name given; private links ignore. */
  identity?: ShareIdentity;
  ign?: string;
}): Promise<CreateShareResult> {
  if (!args?.state?.input) {
    throw new Error("Missing state.input");
  }

  const isPublic = args.public === true;
  const achievement = normalizeAchievement(args.achievement);
  const state = normalizeShareState(args.state);

  let identity: ShareIdentity = args.identity === "anonymous" ? "anonymous" : "ign";
  if (!isPublic) {
    // Link-only shares keep a freeform label; no gallery identity rules.
    identity = "ign";
  }

  let name: string;
  let ign: string | undefined;

  if (isPublic && identity === "anonymous") {
    // Name assigned after id is reserved — placeholder until then.
    name = "Anonymous";
  } else if (isPublic && identity === "ign") {
    ign = normalizeIgn(args.ign ?? args.name ?? "");
    if (!ign || ign.toLowerCase() === "untitled") {
      throw new Error("Enter your IGN before sharing to the gallery");
    }
    name = ign;
  } else {
    name = (args.name ?? "").trim() || "Untitled";
  }

  const recordDraft = {
    name,
    public: isPublic,
    identity,
    ...(ign ? { ign } : {}),
    achievement,
    views: 0,
    state,
  };
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

  if (isPublic && identity === "anonymous") {
    name = buildAnonymousDisplayName({
      jobType: state.input.jobType,
      charType: state.input.charType,
      id,
    });
  }

  const normalizedName = normalizePublicShareName(name);
  if (isPublic && identity === "ign") {
    if (!normalizedName || normalizedName === "untitled") {
      throw new Error("Enter your IGN before sharing to the gallery");
    }
    // Atomic reserve so two public IGN shares can't claim the same name.
    const reserved = await redis.set(publicNameKey(normalizedName), id, {
      nx: true,
    });
    if (!reserved) {
      throw new Error(
        `A public loadout named “${name}” already exists. Pick another IGN.`,
      );
    }
  }

  const record: ScouterShareRecord = {
    id,
    name,
    identity,
    ...(ign ? { ign } : {}),
    createdAt: Date.now(),
    public: isPublic,
    ...(achievement ? { achievement } : {}),
    views: 0,
    state,
  };
  const deleteToken = newShareId(24);

  try {
    await redis.set(shareKey(id), record);
    await redis.set(deleteTokenKey(id), deleteToken);
    await redis.set(viewsKey(id), 0);
  } catch (err) {
    if (isPublic && identity === "ign") {
      await redis.del(publicNameKey(normalizedName)).catch(() => undefined);
    }
    await redis
      .del(shareKey(id), deleteTokenKey(id), viewsKey(id))
      .catch(() => undefined);
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
  const viewsRaw = await redis.get<number | string>(viewsKey(id));
  const views = Math.max(
    0,
    Number(viewsRaw ?? raw.views ?? 0) || 0,
  );
  return {
    ...raw,
    identity: resolveShareIdentity(raw),
    views,
    state: normalizeShareState(raw.state),
  };
}

/**
 * Increment the public share page view counter (MVP: once per page load).
 * Returns the new count, or null if the share does not exist.
 */
export async function incrementShareViews(
  id: string,
): Promise<number | null> {
  if (!id || !/^[A-Za-z0-9_-]{4,32}$/.test(id)) return null;
  const redis = getRedis();
  const exists = await redis.exists(shareKey(id));
  if (!exists) return null;
  const next = await redis.incr(viewsKey(id));
  return Number(next) || 0;
}

/** Lightweight row for the public gallery (no full buff/link/hexa payload). */
export type ScouterGalleryItem = {
  id: string;
  name: string;
  identity: ShareIdentity;
  createdAt: number;
  level: number;
  jobType: string;
  charType: string;
  achievement: string;
  hexa: number[];
  views: number;
};

/** Cap gallery responses so unbounded public sets stay usable. */
const GALLERY_LIST_LIMIT = 500;

/** Top-N for the views leaderboard. */
export const GALLERY_LEADERBOARD_LIMIT = 50;

export async function listPublicShares(): Promise<ScouterGalleryItem[]> {
  const redis = getRedis();
  const ids = await redis.smembers(SHARE_PUBLIC_SET);
  if (!ids.length) return [];

  const rawList = (await redis.mget(
    ...ids.map((id) => shareKey(id)),
  )) as (ScouterShareRecord | null)[];

  const viewsList = (await redis.mget(
    ...ids.map((id) => viewsKey(id)),
  )) as (number | string | null)[];

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
    const hexa = clampHexaForGms(
      Array.isArray(raw.state.hexa)
        ? raw.state.hexa.map((n) => Number(n) || 0)
        : [],
    );
    const viewsFromKey = Number(viewsList[i] ?? NaN);
    const views = Number.isFinite(viewsFromKey)
      ? Math.max(0, viewsFromKey)
      : Math.max(0, Number(raw.views) || 0);
    items.push({
      id: raw.id || id,
      name: (raw.name || "Untitled").trim() || "Untitled",
      identity: resolveShareIdentity(raw),
      createdAt: Number(raw.createdAt) || 0,
      level: Number(input.level) || 0,
      jobType: String(input.jobType || ""),
      charType: String(input.charType || ""),
      achievement: normalizeAchievement(raw.achievement),
      hexa,
      views,
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
 * Remove a loadout from the public gallery (frees the IGN name lock when applicable).
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
    const identity = resolveShareIdentity(raw);
    // Only IGN (and legacy named) shares hold a unique-name lock.
    if (identity === "ign") {
      const name = normalizePublicShareName(raw.name || raw.ign || "");
      if (name) {
        const owned = await redis.get<string>(publicNameKey(name));
        if (owned === id) {
          await redis.del(publicNameKey(name));
        }
      }
    }
    if (raw.public) {
      await redis.set(shareKey(id), { ...raw, public: false });
    }
  }

  await redis.srem(SHARE_PUBLIC_SET, id);
}
