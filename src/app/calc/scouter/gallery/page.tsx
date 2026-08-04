import {
  isRedisConfigured,
  listPublicShares,
} from "@/lib/scouter/share";
import { GalleryClient } from "./gallery-client";

export const dynamic = "force-dynamic";

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
    const items = await listPublicShares();
    return <GalleryClient items={items} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load gallery";
    return <GalleryClient items={[]} error={message} />;
  }
}
