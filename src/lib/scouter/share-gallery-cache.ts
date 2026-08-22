import { revalidateTag, unstable_cache } from "next/cache";
import { listPublicShares, type ScouterGalleryItem } from "@/lib/scouter/share";

/**
 * Gallery list cache tag for on-demand invalidation after publish/unlist.
 */
export const GALLERY_CACHE_TAG = "scouter-gallery";

/**
 * Short TTL for the public gallery list (SMEMBERS + 2× MGET).
 *
 * 60s chosen as a middle of the 30–120s audit band: enough to collapse burst
 * traffic / refreshes into one Redis scan, while publish/unlist lag stays
 * acceptable even if tag invalidation is missed. Pair with
 * `invalidatePublicGalleryCache()` on membership changes.
 */
export const GALLERY_CACHE_REVALIDATE_SEC = 60;

const listPublicSharesDataCache = unstable_cache(
  async () => listPublicShares(),
  ["scouter-public-gallery"],
  {
    revalidate: GALLERY_CACHE_REVALIDATE_SEC,
    tags: [GALLERY_CACHE_TAG],
  },
);

/** Dev-only in-memory cache — `unstable_cache` often misses in local dev. */
let devGalleryCache: { expiresAt: number; items: ScouterGalleryItem[] } | null =
  null;

/**
 * Cached gallery listing — Next Data Cache via `unstable_cache` in production;
 * lightweight in-memory cache in development.
 */
export async function listPublicSharesCached(): Promise<ScouterGalleryItem[]> {
  if (process.env.NODE_ENV === "development") {
    const now = Date.now();
    if (devGalleryCache && now < devGalleryCache.expiresAt) {
      return devGalleryCache.items;
    }
    const items = await listPublicShares();
    devGalleryCache = {
      expiresAt: now + GALLERY_CACHE_REVALIDATE_SEC * 1000,
      items,
    };
    return items;
  }
  return listPublicSharesDataCache();
}

/** Mark gallery cache stale after public set membership changes. */
export function invalidatePublicGalleryCache(): void {
  devGalleryCache = null;
  revalidateTag(GALLERY_CACHE_TAG, "max");
}
