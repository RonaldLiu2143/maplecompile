/**
 * Lightweight display-name / title filter for presets and gallery posts.
 * Blocks common profanity and obvious spam junk (no external dependency).
 */

const BLOCKED_WORDS = [
  "anal",
  "anus",
  "arse",
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "boob",
  "cock",
  "crap",
  "cunt",
  "damn",
  "dick",
  "dildo",
  "dyke",
  "fag",
  "faggot",
  "fuck",
  "fucker",
  "fucking",
  "goddamn",
  "homo",
  "jizz",
  "idiot",
  "kill yourself",
  "kys",
  "motherfucker",
  "nazi",
  "nigga",
  "nigger",
  "nude",
  "penis",
  "piss",
  "porn",
  "pussy",
  "rape",
  "retard",
  "shit",
  "slut",
  "spam",
  "sucks dick",
  "tit",
  "tits",
  "twat",
  "vagina",
  "wank",
  "whore",
] as const;

/** Collapse leetspeak / separators so `f.u.c.k` / `f u c k` still match. */
function normalizeForMatch(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[@4]/g, "a")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/0/g, "o")
    .replace(/\$/g, "s")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactAlnum(raw: string): string {
  return normalizeForMatch(raw).replace(/\s+/g, "");
}

function hasBlockedWord(normalized: string, compact: string): boolean {
  for (const word of BLOCKED_WORDS) {
    const w = word.toLowerCase();
    if (w.includes(" ")) {
      if (normalized.includes(w)) return true;
      continue;
    }
    const re = new RegExp(`(^|\\s)${w}(s|es|er|ers|ing)?(\\s|$)`, "i");
    if (re.test(normalized)) return true;
    // Compact leetspeak match only for longer tokens to avoid “tit” in “titan”.
    if (w.length >= 4 && compact.includes(w)) return true;
  }
  return false;
}

function looksSpammy(raw: string, normalized: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/https?:\/\//i.test(trimmed) || /www\./i.test(trimmed)) {
    return "Links are not allowed in names or titles.";
  }
  if (/(.)\1{6,}/i.test(trimmed.replace(/\s/g, ""))) {
    return "Name looks spammy (too many repeated characters).";
  }
  if (/[^\p{L}\p{N}\s._·\-'"!?,]/gu.test(trimmed)) {
    // Allow common Maple IGN punctuation; block emoji / symbol spam.
    const symbolHeavy = (trimmed.match(/[^\p{L}\p{N}\s._·\-]/gu) ?? []).length;
    if (symbolHeavy >= 4) {
      return "Name looks spammy (too many symbols).";
    }
  }
  const words = normalized.split(" ").filter(Boolean);
  if (words.length >= 3 && new Set(words).size === 1) {
    return "Name looks spammy (repeated words).";
  }
  return null;
}

export type ContentFilterResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Validate a user-facing label (preset name, gallery IGN/title, achievement).
 * Returns a trimmed value or a clear rejection message.
 */
export function filterDisplayText(
  raw: string,
  opts?: { fieldLabel?: string; maxLength?: number; allowEmpty?: boolean },
): ContentFilterResult {
  const field = opts?.fieldLabel ?? "Name";
  const maxLength = opts?.maxLength ?? 80;
  const trimmed = (raw ?? "").trim().replace(/\s+/g, " ");

  if (!trimmed) {
    if (opts?.allowEmpty) return { ok: true, value: "" };
    return { ok: false, error: `${field} cannot be empty.` };
  }
  if (trimmed.length > maxLength) {
    return {
      ok: false,
      error: `${field} is too long (max ${maxLength} characters).`,
    };
  }

  const normalized = normalizeForMatch(trimmed);
  const compact = compactAlnum(trimmed);
  if (hasBlockedWord(normalized, compact)) {
    return {
      ok: false,
      error: `${field} contains language that isn’t allowed. Please choose another.`,
    };
  }

  const spam = looksSpammy(trimmed, normalized);
  if (spam) {
    return { ok: false, error: spam };
  }

  return { ok: true, value: trimmed };
}

/** Convenience: throw on reject (server create/update paths). */
export function assertCleanDisplayText(
  raw: string,
  opts?: { fieldLabel?: string; maxLength?: number; allowEmpty?: boolean },
): string {
  const result = filterDisplayText(raw, opts);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
