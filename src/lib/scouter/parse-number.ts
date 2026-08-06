/**
 * Normalize leading-dot decimals so JS Number/parse agree with user intent:
 * `.5` → `0.5`, `-.5` → `-0.5`.
 */
export function normalizeLeadingDotDecimal(raw: string): string {
  return raw.replace(/^([+-]?)\./, "$10.");
}

/**
 * Parse a user-typed number token.
 * Accepts leading-dot decimals (`.5`) and comma thousands (`1,234.5`).
 * Returns null for empty / incomplete intermediates (`.`, `-`, `-.`).
 */
export function parseUserNumber(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .replace(/^\+/, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return null;
  }
  const n = Number(normalizeLeadingDotDecimal(cleaned));
  return Number.isFinite(n) ? n : null;
}

/** Match integers/decimals including leading-dot forms like `.5` / `-.5`. */
export const USER_NUMBER_RE = /[+\-]?(?:\d[\d,]*(?:\.\d+)?|\.\d+)/g;
