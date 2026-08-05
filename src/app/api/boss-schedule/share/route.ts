import { NextResponse } from "next/server";
import {
  createScheduleShare,
  estimateJsonBytes,
  isRedisConfigured,
  SCHEDULE_MAX_BYTES,
  type BossScheduleState,
} from "@/lib/boss-schedule";

export async function GET() {
  return NextResponse.json({
    configured: isRedisConfigured(),
  });
}

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
    if (contentLength > SCHEDULE_MAX_BYTES) {
      return NextResponse.json(
        { error: `Payload too large (max ${SCHEDULE_MAX_BYTES} bytes)` },
        { status: 413 },
      );
    }

    const body = (await req.json()) as { state?: BossScheduleState };
    if (!body?.state) {
      return NextResponse.json({ error: "Missing state" }, { status: 400 });
    }

    const bodyBytes = estimateJsonBytes(body);
    if (bodyBytes > SCHEDULE_MAX_BYTES) {
      return NextResponse.json(
        { error: `Payload too large (max ${SCHEDULE_MAX_BYTES} bytes)` },
        { status: 413 },
      );
    }

    const created = await createScheduleShare(body.state);
    const origin = new URL(req.url).origin;
    const viewUrl = `${origin}/calc/boss-schedule/s/${created.record.id}`;
    const editUrl = `${viewUrl}?edit=${encodeURIComponent(created.editToken)}`;

    return NextResponse.json({
      id: created.record.id,
      viewUrl,
      editUrl,
      editToken: created.editToken,
      state: created.record.state,
      createdAt: created.record.createdAt,
      updatedAt: created.record.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("too large")
      ? 413
      : message.includes("not configured")
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
