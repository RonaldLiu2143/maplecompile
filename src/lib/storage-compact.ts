/**
 * Persist only rows that differ from defaults (or that have no default).
 * Read paths re-expand via merge/normalize.
 */
export function compactAgainstDefaults<T>(
  items: T[],
  defaults: T[],
  keyOf: (item: T) => string,
  isUnchanged: (item: T, def: T) => boolean,
): T[] {
  const byKey = new Map(defaults.map((d) => [keyOf(d), d]));
  return items.filter((item) => {
    const d = byKey.get(keyOf(item));
    if (!d) return true;
    return !isUnchanged(item, d);
  });
}
