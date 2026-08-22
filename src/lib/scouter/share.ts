import { Redis } from "@upstash/redis";
import { assertCleanDisplayText } from "@/lib/content-filter";
import { getCharName } from "@/lib/jobs";
import type { EquipSetup } from "@/lib/types";
import { clampHexaForGms } from "./buffs";
import type { BuffState, LinkState } from "./buffs";
import {
  fetchBossConvertedHexaStats,
  normalizeBossConvertedHexaStat,
} from "./maple-dmg";
import type { ScouterInput } from "./types";
import { getMissingRequiredScouterFields } from "./validate";

/** Max JSON body size for share payloads (equipment snapshots need headroom). */
export const SHARE_MAX_BYTES = 256 * 1024;

const SHARE_KEY_PREFIX = "scouter:share:";
export const SHARE_PUBLIC_SET = "scouter:share:public";
/** NX keys: scouter:share:public:name:{normalized} → id (unique public IGN names). */
const SHARE_PUBLIC_NAME_PREFIX = "scouter:share:public:name:";
/** Edit/delete tokens kept separate from the share payload so GET can't leak them. */
const SHARE_DELETE_PREFIX = "scouter:share:delete:";
/** Atomic view counters: scouter:share:views:{id} → number. */
const SHARE_VIEWS_PREFIX = "scouter:share:views:";
/** Lightweight gallery list rows — avoids MGET of full share payloads on browse. */
const SHARE_GALLERY_ROW_PREFIX = "scouter:share:gallery-row:";

/** Upstash MGET batch size for gallery list reads. */
const GALLERY_MGET_CHUNK = 100;

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

/** Optional roster identity attached to a published build. */
export type ShareCharacterRef = {
  region: "na" | "eu";
  name: string;
};

/** Equipment snapshot published with a scouter loadout. */
export type ShareEquipmentPayload = {
  jobType: string;
  charType: string;
  setup: EquipSetup;
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
  /** Last in-place update (PATCH). */
  updatedAt?: number;
  public: boolean;
  /** Short gallery blurb (achievement / explanation). */
  achievement?: string;
  /**
   * Boss Converted Stat HEXA (20 min / KMS default) for gallery display.
   * Optional on legacy shares created before this field existed.
   */
  boss300HexaStat?: number;
  boss380HexaStat?: number;
  /**
   * Cached view count (may lag the Redis INCR key). Prefer `views` from
   * gallery/list helpers which merge the live counter.
   */
  views?: number;
  state: ScouterShareState;
  /** Roster identity when published from a known character. */
  character?: ShareCharacterRef;
  /** Equipment snapshot (optional on legacy shares). */
  equipment?: ShareEquipmentPayload;
  /** Cheap gallery flag — true when equipment setup has at least one piece. */
  hasEquipment?: boolean;
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

function galleryRowKey(id: string): string {
  return `${SHARE_GALLERY_ROW_PREFIX}${id}`;
}

async function mgetChunked<T>(
  redis: Redis,
  keys: string[],
): Promise<(T | null)[]> {
  if (!keys.length) return [];
  const out: (T | null)[] = [];
  for (let i = 0; i < keys.length; i += GALLERY_MGET_CHUNK) {
    const chunk = keys.slice(i, i + GALLERY_MGET_CHUNK);
    const part = (await redis.mget(...chunk)) as (T | null)[];
    out.push(...part);
  }
  return out;
}

/** Gallery list payload without live view count (merged from views key on read). */
type ScouterGalleryRow = Omit<ScouterGalleryItem, "views">;

function recordToGalleryRow(
  raw: ScouterShareRecord,
  id: string,
): ScouterGalleryRow | null {
  if (
    !raw ||
    typeof raw !== "object" ||
    !raw.state?.input ||
    raw.public === false
  ) {
    return null;
  }
  const input = raw.state.input;
  const equipment = normalizeShareEquipment(raw.equipment);
  const identity = resolveShareIdentity(raw);
  const character =
    identity === "anonymous"
      ? undefined
      : normalizeShareCharacter(raw.character);
  const hasEquipment = raw.hasEquipment === true || Boolean(equipment);
  return {
    id: raw.id || id,
    name: (raw.name || "Untitled").trim() || "Untitled",
    identity,
    createdAt: Number(raw.createdAt) || 0,
    level: Number(input.level) || 0,
    jobType: String(input.jobType || ""),
    charType: String(input.charType || ""),
    achievement: normalizeAchievement(raw.achievement),
    boss300HexaStat: normalizeBossConvertedHexaStat(raw.boss300HexaStat),
    boss380HexaStat: normalizeBossConvertedHexaStat(raw.boss380HexaStat),
    hasEquipment,
    equipCount: equipment ? countEquipPieces(equipment.setup) : 0,
    ...(character
      ? {
          characterName: character.name,
          characterRegion: character.region,
        }
      : {}),
  };
}

function mergeGalleryRowWithViews(
  row: ScouterGalleryRow,
  viewsRaw: number | string | null | undefined,
  fallbackViews = 0,
): ScouterGalleryItem {
  const viewsFromKey = Number(viewsRaw ?? NaN);
  const views = Number.isFinite(viewsFromKey)
    ? Math.max(0, viewsFromKey)
    : Math.max(0, fallbackViews);
  return { ...row, views };
}

async function writeGalleryRow(
  redis: Redis,
  record: ScouterShareRecord,
  id: string,
): Promise<void> {
  const row = recordToGalleryRow(record, id);
  if (!row) return;
  await redis.set(galleryRowKey(id), row);
}

async function deleteGalleryRow(redis: Redis, id: string): Promise<void> {
  if (!id) return;
  await redis.del(galleryRowKey(id));
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

export function countEquipPieces(setup: EquipSetup | null | undefined): number {
  if (!setup || typeof setup !== "object") return 0;
  let n = 0;
  for (const list of Object.values(setup)) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item) n += 1;
    }
  }
  return n;
}

export function normalizeShareCharacter(
  raw: ShareCharacterRef | null | undefined,
): ShareCharacterRef | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const region = raw.region === "eu" ? "eu" : raw.region === "na" ? "na" : null;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!region || !name) return undefined;
  return { region, name };
}

export function normalizeShareEquipment(
  raw: ShareEquipmentPayload | null | undefined,
): ShareEquipmentPayload | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const jobType = typeof raw.jobType === "string" ? raw.jobType : "";
  const charType = typeof raw.charType === "string" ? raw.charType : "";
  const setup =
    raw.setup && typeof raw.setup === "object" && !Array.isArray(raw.setup)
      ? (raw.setup as EquipSetup)
      : null;
  if (!setup || countEquipPieces(setup) === 0) return undefined;
  return { jobType, charType, setup };
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
  /** Same secret as deleteToken — used for in-place edits and removal. */
  deleteToken: string;
  /** Alias for clients that prefer editToken naming. */
  editToken: string;
};

export async function createShare(args: {
  name?: string;
  state: ScouterShareState;
  public?: boolean;
  achievement?: string;
  /** Gallery attribution. Defaults to `ign` when public + name given; private links ignore. */
  identity?: ShareIdentity;
  ign?: string;
  /** Precomputed BCS HEXA (20 min / KMS). Computed server-side when public and missing. */
  boss300HexaStat?: number;
  boss380HexaStat?: number;
  character?: ShareCharacterRef;
  equipment?: ShareEquipmentPayload;
}): Promise<CreateShareResult> {
  if (!args?.state?.input) {
    throw new Error("Missing state.input");
  }

  const isPublic = args.public === true;
  const achievement = assertCleanDisplayText(
    normalizeAchievement(args.achievement),
    { fieldLabel: "Achievement", maxLength: SHARE_ACHIEVEMENT_MAX, allowEmpty: true },
  );
  const state = normalizeShareState(args.state);
  const character = normalizeShareCharacter(args.character);
  const equipment = normalizeShareEquipment(args.equipment);
  const hasEquipment = Boolean(equipment);

  if (isPublic) {
    const missing = getMissingRequiredScouterFields(state.input, "full");
    if (missing.length > 0) {
      throw new Error(
        `Public shares need complete scouter stats (missing: ${missing
          .map((m) => m.label)
          .join(", ")}).`,
      );
    }
  }

  let boss300HexaStat = normalizeBossConvertedHexaStat(args.boss300HexaStat);
  let boss380HexaStat = normalizeBossConvertedHexaStat(args.boss380HexaStat);
  if (
    isPublic &&
    (boss300HexaStat == null || boss380HexaStat == null)
  ) {
    try {
      const bcs = await fetchBossConvertedHexaStats({
        ...state,
        is30min: false,
      });
      boss300HexaStat ??= normalizeBossConvertedHexaStat(bcs.boss300HexaStat);
      boss380HexaStat ??= normalizeBossConvertedHexaStat(bcs.boss380HexaStat);
    } catch {
      // Gallery can still list the share; getShare backfills BCS on detail view.
    }
  }

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
    ign = assertCleanDisplayText(normalizeIgn(args.ign ?? args.name ?? ""), {
      fieldLabel: "IGN",
      maxLength: SHARE_IGN_MAX,
    });
    if (!ign || ign.toLowerCase() === "untitled") {
      throw new Error("Enter your IGN before sharing to the gallery");
    }
    name = ign;
  } else {
    name = (args.name ?? "").trim() || "Untitled";
  }

  // Anonymous gallery posts must not attach roster identity (no character sprite).
  const characterForRecord =
    isPublic && identity === "anonymous" ? undefined : character;

  const recordDraft = {
    name,
    public: isPublic,
    identity,
    ...(ign ? { ign } : {}),
    achievement,
    ...(boss300HexaStat != null ? { boss300HexaStat } : {}),
    ...(boss380HexaStat != null ? { boss380HexaStat } : {}),
    views: 0,
    state,
    ...(characterForRecord ? { character: characterForRecord } : {}),
    ...(equipment ? { equipment } : {}),
    hasEquipment,
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

  const now = Date.now();
  const record: ScouterShareRecord = {
    id,
    name,
    identity,
    ...(ign ? { ign } : {}),
    createdAt: now,
    updatedAt: now,
    public: isPublic,
    ...(achievement ? { achievement } : {}),
    ...(boss300HexaStat != null ? { boss300HexaStat } : {}),
    ...(boss380HexaStat != null ? { boss380HexaStat } : {}),
    views: 0,
    state,
    ...(characterForRecord ? { character: characterForRecord } : {}),
    ...(equipment ? { equipment } : {}),
    hasEquipment,
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
      void writeGalleryRow(redis, record, id).catch(() => undefined);
    } catch {
      // ignore
    }
  }
  return { record, deleteToken, editToken: deleteToken };
}

export async function getShare(
  id: string,
): Promise<ScouterShareRecord | null> {
  if (!id || !/^[A-Za-z0-9_-]{4,32}$/.test(id)) return null;
  const redis = getRedis();
  // One MGET instead of two GETs for the hot share detail path.
  const [raw, viewsRaw] = (await redis.mget(
    shareKey(id),
    viewsKey(id),
  )) as [ScouterShareRecord | null, number | string | null];
  if (!raw || typeof raw !== "object" || !raw.state?.input) return null;
  const views = Math.max(
    0,
    Number(viewsRaw ?? raw.views ?? 0) || 0,
  );
  const equipment = normalizeShareEquipment(raw.equipment);
  const identity = resolveShareIdentity(raw);
  const character =
    identity === "anonymous" && raw.public !== false
      ? undefined
      : normalizeShareCharacter(raw.character);
  const hasEquipment =
    raw.hasEquipment === true || Boolean(equipment);

  let boss300HexaStat = normalizeBossConvertedHexaStat(raw.boss300HexaStat);
  let boss380HexaStat = normalizeBossConvertedHexaStat(raw.boss380HexaStat);
  // Backfill BCS on detail GET only — never on the gallery list hot path.
  if (boss300HexaStat == null || boss380HexaStat == null) {
    const bcs = await resolveBossConvertedHexaStats(
      { ...raw, id: raw.id || id },
      { backfill: true, redis },
    );
    boss300HexaStat = bcs.boss300HexaStat;
    boss380HexaStat = bcs.boss380HexaStat;
  }

  return {
    ...raw,
    id: raw.id || id,
    identity,
    views,
    state: normalizeShareState(raw.state),
    ...(boss300HexaStat != null ? { boss300HexaStat } : {}),
    ...(boss380HexaStat != null ? { boss380HexaStat } : {}),
    ...(character ? { character } : { character: undefined }),
    ...(equipment ? { equipment } : { equipment: undefined }),
    hasEquipment,
  };
}

/**
 * In-place update authenticated by edit/delete token.
 * Keeps the same share id and view counter.
 */
export async function updateShare(args: {
  id: string;
  editToken: string;
  state?: ScouterShareState;
  name?: string;
  ign?: string;
  identity?: ShareIdentity;
  achievement?: string;
  public?: boolean;
  boss300HexaStat?: number;
  boss380HexaStat?: number;
  character?: ShareCharacterRef | null;
  equipment?: ShareEquipmentPayload | null;
}): Promise<ScouterShareRecord> {
  const id = args.id?.trim();
  const editToken = (args.editToken ?? "").trim();
  const { redis, raw } = await assertDeleteToken(id, editToken);
  if (!raw?.state?.input) {
    throw new Error("Share not found");
  }

  const prevIdentity = resolveShareIdentity(raw);
  const nextState = args.state
    ? normalizeShareState(args.state)
    : normalizeShareState(raw.state);

  let identity: ShareIdentity =
    args.identity === "anonymous" || args.identity === "ign"
      ? args.identity
      : prevIdentity;
  const isPublic =
    typeof args.public === "boolean" ? args.public : raw.public === true;
  if (!isPublic) {
    identity = "ign";
  }

  const achievement =
    args.achievement !== undefined
      ? assertCleanDisplayText(normalizeAchievement(args.achievement), {
          fieldLabel: "Achievement",
          maxLength: SHARE_ACHIEVEMENT_MAX,
          allowEmpty: true,
        })
      : assertCleanDisplayText(normalizeAchievement(raw.achievement), {
          fieldLabel: "Achievement",
          maxLength: SHARE_ACHIEVEMENT_MAX,
          allowEmpty: true,
        });

  if (isPublic) {
    const missing = getMissingRequiredScouterFields(nextState.input, "full");
    if (missing.length > 0) {
      throw new Error(
        `Public shares need complete scouter stats (missing: ${missing
          .map((m) => m.label)
          .join(", ")}).`,
      );
    }
  }

  let character: ShareCharacterRef | undefined;
  if (args.character === null) {
    character = undefined;
  } else if (args.character !== undefined) {
    character = normalizeShareCharacter(args.character);
  } else {
    character = normalizeShareCharacter(raw.character);
  }
  // Anonymous public posts never keep a roster character (sprite / IGN leak).
  if (isPublic && identity === "anonymous") {
    character = undefined;
  }

  let equipment: ShareEquipmentPayload | undefined;
  if (args.equipment === null) {
    equipment = undefined;
  } else if (args.equipment !== undefined) {
    equipment = normalizeShareEquipment(args.equipment);
  } else {
    equipment = normalizeShareEquipment(raw.equipment);
  }
  const hasEquipment = Boolean(equipment);

  let boss300HexaStat =
    args.boss300HexaStat !== undefined
      ? normalizeBossConvertedHexaStat(args.boss300HexaStat)
      : normalizeBossConvertedHexaStat(raw.boss300HexaStat);
  let boss380HexaStat =
    args.boss380HexaStat !== undefined
      ? normalizeBossConvertedHexaStat(args.boss380HexaStat)
      : normalizeBossConvertedHexaStat(raw.boss380HexaStat);

  if (
    isPublic &&
    args.state &&
    (boss300HexaStat == null || boss380HexaStat == null)
  ) {
    try {
      const bcs = await fetchBossConvertedHexaStats({
        ...nextState,
        is30min: false,
      });
      boss300HexaStat ??= normalizeBossConvertedHexaStat(bcs.boss300HexaStat);
      boss380HexaStat ??= normalizeBossConvertedHexaStat(bcs.boss380HexaStat);
    } catch {
      // keep prior / null
    }
  }

  let name = (raw.name || "Untitled").trim() || "Untitled";
  let ign = raw.ign;

  if (isPublic && identity === "anonymous") {
    name = buildAnonymousDisplayName({
      jobType: nextState.input.jobType,
      charType: nextState.input.charType,
      id,
    });
    ign = undefined;
  } else if (isPublic && identity === "ign") {
    const nextIgn = assertCleanDisplayText(
      normalizeIgn(args.ign ?? args.name ?? raw.ign ?? raw.name ?? ""),
      { fieldLabel: "IGN", maxLength: SHARE_IGN_MAX },
    );
    if (!nextIgn || nextIgn.toLowerCase() === "untitled") {
      throw new Error("Enter your IGN before sharing to the gallery");
    }
    name = nextIgn;
    ign = nextIgn;
  } else if (args.name !== undefined || args.ign !== undefined) {
    name = (args.name ?? args.ign ?? name).trim() || "Untitled";
    if (args.ign !== undefined) ign = normalizeIgn(args.ign) || undefined;
  }

  const draft: ScouterShareRecord = {
    ...raw,
    id,
    name,
    identity,
    ...(ign ? { ign } : {}),
    public: isPublic,
    ...(achievement ? { achievement } : {}),
    ...(boss300HexaStat != null ? { boss300HexaStat } : {}),
    ...(boss380HexaStat != null ? { boss380HexaStat } : {}),
    state: nextState,
    ...(character ? { character } : {}),
    ...(equipment ? { equipment } : {}),
    hasEquipment,
    updatedAt: Date.now(),
  };
  // Drop cleared optional fields explicitly so Redis doesn't keep stale gear.
  if (!character) delete draft.character;
  if (!equipment) delete draft.equipment;
  if (!achievement) delete draft.achievement;
  if (!ign) delete draft.ign;
  if (boss300HexaStat == null) delete draft.boss300HexaStat;
  if (boss380HexaStat == null) delete draft.boss380HexaStat;

  const bytes = estimateJsonBytes(draft);
  if (bytes > SHARE_MAX_BYTES) {
    throw new Error(
      `Loadout too large to share (${bytes} bytes; max ${SHARE_MAX_BYTES})`,
    );
  }

  const prevNameLock =
    prevIdentity === "ign" && raw.public
      ? normalizePublicShareName(raw.name || raw.ign || "")
      : "";
  const nextNameLock =
    isPublic && identity === "ign"
      ? normalizePublicShareName(name)
      : "";

  if (nextNameLock && nextNameLock !== prevNameLock) {
    const reserved = await redis.set(publicNameKey(nextNameLock), id, {
      nx: true,
    });
    if (!reserved) {
      throw new Error(
        `A public loadout named “${name}” already exists. Pick another IGN.`,
      );
    }
  }

  try {
    await redis.set(shareKey(id), draft);
  } catch (err) {
    if (nextNameLock && nextNameLock !== prevNameLock) {
      await redis.del(publicNameKey(nextNameLock)).catch(() => undefined);
    }
    throw err;
  }

  if (prevNameLock && prevNameLock !== nextNameLock) {
    const owned = await redis.get<string>(publicNameKey(prevNameLock));
    if (owned === id) {
      await redis.del(publicNameKey(prevNameLock)).catch(() => undefined);
    }
  }

  if (isPublic) {
    try {
      await redis.sadd(SHARE_PUBLIC_SET, id);
      void writeGalleryRow(redis, draft, id).catch(() => undefined);
    } catch {
      // ignore
    }
  } else if (raw.public) {
    await releasePublicNameLock(redis, id, draft);
    await redis.srem(SHARE_PUBLIC_SET, id).catch(() => undefined);
    void deleteGalleryRow(redis, id).catch(() => undefined);
  }

  const viewsRaw = await redis.get<number | string>(viewsKey(id));
  const views = Math.max(
    0,
    Number(viewsRaw ?? raw.views ?? 0) || 0,
  );
  return { ...draft, views };
}

/**
 * Debounce window for share view counting (cookie / client localStorage).
 * Same browser refreshing within this window should not INCR again.
 */
export const SHARE_VIEW_DEBOUNCE_SEC = 30 * 60;

/**
 * Increment the public share page view counter.
 * Callers must already confirm the share exists (e.g. after getShare) —
 * no EXISTS probe (saves 1 Redis cmd per counted view).
 */
export async function incrementShareViews(
  id: string,
): Promise<number | null> {
  if (!id || !/^[A-Za-z0-9_-]{4,32}$/.test(id)) return null;
  const redis = getRedis();
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
  /** Boss Converted Stat HEXA @ 300% PDR (20 min / KMS). Null if unknown. */
  boss300HexaStat: number | null;
  /** Boss Converted Stat HEXA @ 380% PDR (20 min / KMS). Null if unknown. */
  boss380HexaStat: number | null;
  views: number;
  /** True when the share includes an equipment snapshot. */
  hasEquipment: boolean;
  /** Equipped piece count when hasEquipment (0 if unknown / none). */
  equipCount: number;
  /** Roster character name when published with one. */
  characterName?: string;
  characterRegion?: "na" | "eu";
};

/** Cap gallery responses so unbounded public sets stay usable. */
const GALLERY_LIST_LIMIT = 500;

/**
 * Resolve BCS HEXA (20 min / KMS) for a share: prefer stored fields, else
 * derive from the saved loadout via MapleScouter and optionally persist.
 * Intended for detail GET / publish — not the gallery list hot path.
 */
export async function resolveBossConvertedHexaStats(
  record: ScouterShareRecord,
  opts?: { backfill?: boolean; redis?: Redis },
): Promise<{
  boss300HexaStat: number | null;
  boss380HexaStat: number | null;
}> {
  let boss300HexaStat = normalizeBossConvertedHexaStat(record.boss300HexaStat);
  let boss380HexaStat = normalizeBossConvertedHexaStat(record.boss380HexaStat);
  if (boss300HexaStat != null && boss380HexaStat != null) {
    return { boss300HexaStat, boss380HexaStat };
  }
  if (!record.state?.input) {
    return { boss300HexaStat, boss380HexaStat };
  }

  try {
    const state = normalizeShareState(record.state);
    const bcs = await fetchBossConvertedHexaStats({
      ...state,
      is30min: false,
    });
    boss300HexaStat ??= normalizeBossConvertedHexaStat(bcs.boss300HexaStat);
    boss380HexaStat ??= normalizeBossConvertedHexaStat(bcs.boss380HexaStat);
  } catch {
    return { boss300HexaStat, boss380HexaStat };
  }

  if (
    opts?.backfill &&
    opts.redis &&
    record.id &&
    (boss300HexaStat != null || boss380HexaStat != null)
  ) {
    const updated: ScouterShareRecord = {
      ...record,
      ...(boss300HexaStat != null ? { boss300HexaStat } : {}),
      ...(boss380HexaStat != null ? { boss380HexaStat } : {}),
    };
    void opts.redis
      .set(shareKey(record.id), updated)
      .catch(() => undefined);
  }

  return { boss300HexaStat, boss380HexaStat };
}

/**
 * Read-only public gallery list (SMEMBERS + lightweight row MGET). No BCS backfill.
 * Prefer `listPublicSharesCached` from share-gallery-cache for page/API reads.
 */
export async function listPublicShares(): Promise<ScouterGalleryItem[]> {
  const redis = getRedis();
  const ids = await redis.smembers(SHARE_PUBLIC_SET);
  if (!ids.length) return [];

  const rowKeys = ids.map((id) => galleryRowKey(id));
  const viewKeys = ids.map((id) => viewsKey(id));
  const [rowList, viewsList] = await Promise.all([
    mgetChunked<ScouterGalleryRow>(redis, rowKeys),
    mgetChunked<number | string>(redis, viewKeys),
  ]);

  const stale: string[] = [];
  const items: ScouterGalleryItem[] = [];
  const needFullFetch: string[] = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    const cached = rowList[i];
    if (cached && typeof cached === "object" && cached.id) {
      items.push(mergeGalleryRowWithViews(cached, viewsList[i]));
      continue;
    }
    needFullFetch.push(id);
  }

  if (needFullFetch.length) {
    const fullList = await mgetChunked<ScouterShareRecord>(
      redis,
      needFullFetch.map((id) => shareKey(id)),
    );
    const backfillWrites: Promise<unknown>[] = [];
    for (let i = 0; i < needFullFetch.length; i++) {
      const id = needFullFetch[i]!;
      const raw = fullList[i];
      const row = raw ? recordToGalleryRow(raw, id) : null;
      if (!row) {
        stale.push(id);
        continue;
      }
      items.push(
        mergeGalleryRowWithViews(row, viewsList[ids.indexOf(id)!]),
      );
      backfillWrites.push(
        redis.set(galleryRowKey(id), row).catch(() => undefined),
      );
    }
    if (backfillWrites.length) {
      void Promise.all(backfillWrites).catch(() => undefined);
    }
  }

  if (stale.length) {
    void redis.srem(SHARE_PUBLIC_SET, ...stale).catch(() => undefined);
    void Promise.all(stale.map((id) => deleteGalleryRow(redis, id))).catch(
      () => undefined,
    );
  }

  items.sort((a, b) => b.createdAt - a.createdAt);
  return items.slice(0, GALLERY_LIST_LIMIT);
}

async function assertDeleteToken(id: string, deleteToken: string): Promise<{
  redis: Redis;
  raw: ScouterShareRecord | null;
}> {
  if (!id || !/^[A-Za-z0-9_-]{4,32}$/.test(id) || !deleteToken) {
    throw new Error("Invalid share id or delete token");
  }
  const redis = getRedis();
  const storedToken = await redis.get<string>(deleteTokenKey(id));
  if (!storedToken || storedToken !== deleteToken) {
    throw new Error("Not allowed to remove this share");
  }
  const raw = await redis.get<ScouterShareRecord>(shareKey(id));
  return {
    redis,
    raw: raw && typeof raw === "object" ? raw : null,
  };
}

/** Load a share for admin/dev gallery remove (no delete-token check). */
async function loadShareForAdminRemove(id: string): Promise<{
  redis: Redis;
  raw: ScouterShareRecord | null;
}> {
  if (!id || !/^[A-Za-z0-9_-]{4,32}$/.test(id)) {
    throw new Error("Invalid share id");
  }
  const redis = getRedis();
  const raw = await redis.get<ScouterShareRecord>(shareKey(id));
  return {
    redis,
    raw: raw && typeof raw === "object" ? raw : null,
  };
}

/** Release the public IGN name lock when this share owns it. */
async function releasePublicNameLock(
  redis: Redis,
  id: string,
  raw: ScouterShareRecord | null,
): Promise<void> {
  if (!raw) return;
  const identity = resolveShareIdentity(raw);
  // Only IGN (and legacy named) shares hold a unique-name lock.
  if (identity !== "ign") return;
  const name = normalizePublicShareName(raw.name || raw.ign || "");
  if (!name) return;
  const owned = await redis.get<string>(publicNameKey(name));
  if (owned === id) {
    await redis.del(publicNameKey(name));
  }
}

/**
 * Remove a loadout from the public gallery (frees the IGN name lock when applicable).
 * Requires the delete token returned at create time, unless `admin` is set
 * (localhost / development override only — gated by the API route).
 * The share remains openable by direct link as private.
 */
export async function removeFromPublicGallery(args: {
  id: string;
  deleteToken?: string;
  /** Skip delete-token check (API must gate this to local/dev only). */
  admin?: boolean;
}): Promise<void> {
  const id = args.id?.trim();
  const { redis, raw } = args.admin
    ? await loadShareForAdminRemove(id ?? "")
    : await assertDeleteToken(id ?? "", args.deleteToken?.trim() ?? "");

  await releasePublicNameLock(redis, id ?? "", raw);
  if (raw?.public) {
    await redis.set(shareKey(id ?? ""), { ...raw, public: false });
  }

  await redis.srem(SHARE_PUBLIC_SET, id ?? "");
  void deleteGalleryRow(redis, id ?? "").catch(() => undefined);
}

/**
 * Permanently delete a share (gallery + direct link 404).
 * Used when replacing a gallery post with a fresh share id.
 */
export async function purgeShare(args: {
  id: string;
  deleteToken?: string;
  /** Skip delete-token check (API must gate this to local/dev only). */
  admin?: boolean;
}): Promise<void> {
  const id = args.id?.trim();
  const { redis, raw } = args.admin
    ? await loadShareForAdminRemove(id ?? "")
    : await assertDeleteToken(id ?? "", args.deleteToken?.trim() ?? "");

  await releasePublicNameLock(redis, id ?? "", raw);
  await redis.srem(SHARE_PUBLIC_SET, id ?? "");
  await redis.del(
    shareKey(id ?? ""),
    deleteTokenKey(id ?? ""),
    viewsKey(id ?? ""),
    galleryRowKey(id ?? ""),
  );
}
