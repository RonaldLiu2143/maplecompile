/** Rank display: null / non-positive → em dash, else `#1,234`. */
export function formatRank(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return `#${n.toLocaleString()}`;
}

/** Optional integer display: null → em dash, else locale string. */
export function formatOptionalInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString();
}
