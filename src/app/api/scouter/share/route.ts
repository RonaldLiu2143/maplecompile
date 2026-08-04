import { NextResponse } from "next/server";
import {
  createShare,
  isRedisConfigured,
  SHARE_MAX_BYTES,
  type ScouterShareState,
} from "@/lib/scouter/share";

export async function POST(req: Request) {
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

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > SHARE_MAX_BYTES) {
      return NextResponse.json(
        { error: `Payload too large (max ${SHARE_MAX_BYTES} bytes)` },
        { status: 413 },
      );
    }

    const body = (await req.json()) as {
      name?: string;
      state?: ScouterShareState;
      public?: boolean;
    };

    if (!body?.state?.input) {
      return NextResponse.json({ error: "Missing state.input" }, { status: 400 });
    }

    const record = await createShare({
      name: body.name ?? "Untitled",
      state: body.state,
      public: body.public === true,
    });

    const origin = new URL(req.url).origin;
    const url = `${origin}/calc/scouter/s/${record.id}`;

    return NextResponse.json({
      id: record.id,
      url,
      public: record.public,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("too large") ? 413 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
