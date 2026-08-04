import { NextResponse } from "next/server";
import { getShare, isRedisConfigured } from "@/lib/scouter/share";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    if (!isRedisConfigured()) {
      return NextResponse.json(
        {
          error:
            "Sharing is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
        },
        { status: 503 },
      );
    }

    const { id } = await params;
    const record = await getShare(id);
    if (!record) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
