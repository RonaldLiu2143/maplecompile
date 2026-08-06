/**
 * Keep newest `limit` rows by a timestamp getter; invoke `onEvict` for dropped items.
 */
export function lruCapByTime<T>(
  list: T[],
  limit: number,
  getTime: (item: T) => number,
  onEvict?: (item: T) => void,
): T[] {
  if (list.length <= limit) return list;
  const sorted = [...list].sort((a, b) => getTime(b) - getTime(a));
  const kept = sorted.slice(0, limit);
  if (onEvict) {
    const keptSet = new Set(kept);
    for (const item of list) {
      if (!keptSet.has(item)) onEvict(item);
    }
  }
  return kept;
}

/** Convenience for `{ id, updatedAt }` preset rows. */
export function lruCapByUpdatedAt<T extends { id: string; updatedAt: number }>(
  list: T[],
  limit: number,
  onEvict?: (id: string) => void,
): T[] {
  return lruCapByTime(list, limit, (p) => p.updatedAt, (p) => onEvict?.(p.id));
}
