import { NextResponse } from "next/server";
import {
  estimateJsonBytes,
  getScheduleShare,
  isRedisConfigured,
  SCHEDULE_MAX_BYTES,
  updateScheduleShare,
  type BossScheduleState,
} from "@/lib/boss-schedule";

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
    const record = await getScheduleShare(id);
    if (!record) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: record.id,
      state: record.state,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
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
    const body = (await req.json()) as {
      editToken?: string;
      state?: BossScheduleState;
    };

    if (!body?.state) {
      return NextResponse.json({ error: "Missing state" }, { status: 400 });
    }
    if (!body.editToken) {
      return NextResponse.json({ error: "Missing editToken" }, { status: 400 });
    }

    const bodyBytes = estimateJsonBytes(body);
    if (bodyBytes > SCHEDULE_MAX_BYTES) {
      return NextResponse.json(
        { error: `Payload too large (max ${SCHEDULE_MAX_BYTES} bytes)` },
        { status: 413 },
      );
    }

    const record = await updateScheduleShare({
      id,
      editToken: body.editToken,
      state: body.state,
    });

    return NextResponse.json({
      id: record.id,
      state: record.state,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("Not allowed")
      ? 403
      : message.includes("Invalid")
        ? 400
        : message.includes("not found")
          ? 404
          : message.includes("too large")
            ? 413
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
