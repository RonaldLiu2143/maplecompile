/**
 * Gallery bot / spam protection (server-side).
 *
 * Layers:
 * 1. Content filter on IGN / achievement (profanity + spammy junk).
 * 2. Required scouter combat fields for public shares (`getMissingRequiredScouterFields`).
 * 3. Honeypot field (`website`) — bots that fill it are rejected.
 * 4. Per-IP rate limit via Redis (creates per minute / hour).
 * 5. Fingerprint of public loadout — identical re-posts in a short window are rejected.
 * 6. Failed validation never lists the share (createShare throws before SADD).
 *
 * Clients should leave the honeypot empty and send `clientHint` only for UX.
 */

import { createHash } from "crypto";
import type { Redis } from "@upstash/redis";
import { filterDisplayText } from "@/lib/content-filter";
import { getMissingRequiredScouterFields } from "./validate";
import type { ScouterShareState } from "./share";

const RATE_PREFIX = "scouter:share:rate:";
const FINGERPRINT_PREFIX = "scouter:share:fp:";

/** Soft caps — generous for humans, harsh for scrapers. */
export const SHARE_RATE_LIMIT = {
  perMinute: 5,
  perHour: 30,
} as const;

/** Identical public payload blocked for this many seconds. */
export const SHARE_FINGERPRINT_TTL_SEC = 15 * 60;

export type ShareAbuseCheckArgs = {
  redis: Redis;
  ip: string;
  isPublic: boolean;
  state: ScouterShareState;
  name?: string;
  ign?: string;
  achievement?: string;
  identity?: "anonymous" | "ign";
  /** Hidden form field — must be empty. */
  honeypot?: string;
};

export type ShareAbuseOk = { ok: true };
export type ShareAbuseFail = { ok: false; error: string; status: number };

function rateKey(ip: string, window: "m" | "h"): string {
  const safe = ip.replace(/[^a-zA-Z0-9:._-]/g, "_").slice(0, 64) || "unknown";
  return `${RATE_PREFIX}${window}:${safe}`;
}

export function publicShareFingerprint(state: ScouterShareState): string {
  const payload = JSON.stringify({
    jobType: state.input.jobType,
    charType: state.input.charType,
    level: state.input.level,
    stats: state.input.stats,
    attack: state.input.attack,
    magicAttack: state.input.magicAttack,
    damagePercent: state.input.damagePercent,
    bossDamagePercent: state.input.bossDamagePercent,
    ignoreDefensePercent: state.input.ignoreDefensePercent,
    criticalRatePercent: state.input.criticalRatePercent,
    criticalDamagePercent: state.input.criticalDamagePercent,
    hexa: state.hexa,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

async function bumpRate(
  redis: Redis,
  ip: string,
): Promise<{ minute: number; hour: number }> {
  const mKey = rateKey(ip, "m");
  const hKey = rateKey(ip, "h");
  const minute = Number(await redis.incr(mKey)) || 0;
  if (minute === 1) await redis.expire(mKey, 60);
  const hour = Number(await redis.incr(hKey)) || 0;
  if (hour === 1) await redis.expire(hKey, 3600);
  return { minute, hour };
}

/**
 * Validate public share content + rate limits before createShare.
 * Private (link-only) shares skip fingerprint / required-field gates but still
 * honor honeypot + rate limits.
 */
export async function assertShareNotAbusive(
  args: ShareAbuseCheckArgs,
): Promise<ShareAbuseOk | ShareAbuseFail> {
  const honeypot = (args.honeypot ?? "").trim();
  if (honeypot) {
    return {
      ok: false,
      error: "Share rejected.",
      status: 400,
    };
  }

  const { minute, hour } = await bumpRate(args.redis, args.ip);
  if (
    minute > SHARE_RATE_LIMIT.perMinute ||
    hour > SHARE_RATE_LIMIT.perHour
  ) {
    return {
      ok: false,
      error: "Too many shares from this network. Try again later.",
      status: 429,
    };
  }

  if (!args.isPublic) return { ok: true };

  const missing = getMissingRequiredScouterFields(args.state.input, "full");
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Public shares need complete scouter stats (missing: ${missing
        .map((m) => m.label)
        .join(", ")}).`,
      status: 400,
    };
  }

  if (args.identity === "ign") {
    const nameCheck = filterDisplayText(args.ign ?? args.name ?? "", {
      fieldLabel: "IGN",
      maxLength: 20,
    });
    if (!nameCheck.ok) {
      return { ok: false, error: nameCheck.error, status: 400 };
    }
  }

  const achievementCheck = filterDisplayText(args.achievement ?? "", {
    fieldLabel: "Achievement",
    maxLength: 120,
    allowEmpty: true,
  });
  if (!achievementCheck.ok) {
    return { ok: false, error: achievementCheck.error, status: 400 };
  }

  const fp = publicShareFingerprint(args.state);
  const fpKey = `${FINGERPRINT_PREFIX}${fp}`;
  const reserved = await args.redis.set(fpKey, "1", {
    nx: true,
    ex: SHARE_FINGERPRINT_TTL_SEC,
  });
  if (!reserved) {
    return {
      ok: false,
      error:
        "An identical public loadout was just shared. Change stats or wait a bit.",
      status: 409,
    };
  }

  return { ok: true };
}

/** Client IP from common proxy headers (Vercel / reverse proxy). */
export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}
