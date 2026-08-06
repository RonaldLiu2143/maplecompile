import { revalidateTag, unstable_cache } from "next/cache";
import { listPublicShares } from "@/lib/scouter/share";

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

/**
 * Cached gallery listing — Next Data Cache via `unstable_cache`
 * (this app does not enable Cache Components / `"use cache"`).
 */
export const listPublicSharesCached = unstable_cache(
  async () => listPublicShares(),
  ["scouter-public-gallery"],
  {
    revalidate: GALLERY_CACHE_REVALIDATE_SEC,
    tags: [GALLERY_CACHE_TAG],
  },
);

/** Mark gallery cache stale after public set membership changes. */
export function invalidatePublicGalleryCache(): void {
  revalidateTag(GALLERY_CACHE_TAG, "max");
}
