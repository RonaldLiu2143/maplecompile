import {
  isRedisConfigured,
} from "@/lib/scouter/share";
import { listPublicSharesCached } from "@/lib/scouter/share-gallery-cache";
import { GalleryClient } from "./gallery-client";

/**
 * ISR revalidate — keep in sync with GALLERY_CACHE_REVALIDATE_SEC (60s).
 * Short TTL collapses gallery Redis scans; publish/unlist also call
 * invalidatePublicGalleryCache() for faster freshness.
 */
export const revalidate = 60;

export default async function ScouterGalleryPage() {
  if (!isRedisConfigured()) {
    return (
      <GalleryClient
        items={[]}
        error="Sharing is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
      />
    );
  }

  try {
    const items = await listPublicSharesCached();
    return <GalleryClient items={items} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load gallery";
    return <GalleryClient items={[]} error={message} />;
  }
}
