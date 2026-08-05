/**
 * In-memory TTL cache for GMS character lookups.
 * Shared by single GET and batch POST so roster hydration hits upstream once per key.
 */

import {
  lookupGmsCharacter,
  type CharacterLookupResult,
  type NexonRegion,
} from "./lookup";

const TTL_MS = 60_000;

type CacheEntry = {
  expiresAt: number;
  value: CharacterLookupResult;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CharacterLookupResult | null>>();

export function characterCacheKey(
  region: NexonRegion,
  name: string,
): string {
  return `${region}:${name.trim().toLowerCase()}`;
}

export function getCachedCharacter(
  key: string,
): CharacterLookupResult | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

export function setCachedCharacter(
  key: string,
  value: CharacterLookupResult,
): void {
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

/** Drop heavy EXP history fields for roster/card surfaces. */
export function toCardCharacter(
  character: CharacterLookupResult,
): CharacterLookupResult {
  if (character.graph == null && character.expAverages == null) {
    return character;
  }
  return { ...character, graph: null, expAverages: null };
}

/**
 * Lookup with TTL cache + in-flight dedupe for the same region:name key.
 */
export async function lookupGmsCharacterCached(
  name: string,
  region: NexonRegion,
): Promise<CharacterLookupResult | null> {
  const key = characterCacheKey(region, name);
  const cached = getCachedCharacter(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = lookupGmsCharacter(name, region)
    .then((result) => {
      if (result) setCachedCharacter(key, result);
      return result;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Run async work over items with a fixed concurrency cap. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!, i);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
