import { NextResponse } from "next/server";
import {
  createShare,
  getRedis,
  isRedisConfigured,
  listPublicShares,
  SHARE_MAX_BYTES,
  type ScouterShareState,
  type ShareCharacterRef,
  type ShareEquipmentPayload,
  type ShareIdentity,
} from "@/lib/scouter/share";
import {
  assertShareNotAbusive,
  clientIpFromRequest,
} from "@/lib/scouter/share-abuse";

export async function GET() {
  try {
    if (!isRedisConfigured()) {
      return NextResponse.json(
        {
          error:
            "Sharing is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
          items: [],
        },
        { status: 503 },
      );
    }

    const items = await listPublicShares();
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
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
      achievement?: string;
      identity?: ShareIdentity;
      ign?: string;
      boss300HexaStat?: number;
      boss380HexaStat?: number;
      character?: ShareCharacterRef;
      equipment?: ShareEquipmentPayload;
      /** Honeypot — must remain empty (bots that autofill are rejected). */
      website?: string;
    };

    if (!body?.state?.input) {
      return NextResponse.json({ error: "Missing state.input" }, { status: 400 });
    }

    const bodyBytes = new TextEncoder().encode(JSON.stringify(body)).length;
    if (bodyBytes > SHARE_MAX_BYTES) {
      return NextResponse.json(
        { error: `Payload too large (max ${SHARE_MAX_BYTES} bytes)` },
        { status: 413 },
      );
    }

    const identity: ShareIdentity =
      body.identity === "anonymous" ? "anonymous" : "ign";
    const isPublic = body.public === true;

    const abuse = await assertShareNotAbusive({
      redis: getRedis(),
      ip: clientIpFromRequest(req),
      isPublic,
      state: body.state,
      name: body.name,
      ign: body.ign ?? body.name,
      achievement: body.achievement,
      identity,
      honeypot: body.website,
    });
    if (!abuse.ok) {
      return NextResponse.json(
        { error: abuse.error },
        { status: abuse.status },
      );
    }

    const created = await createShare({
      name: body.name ?? body.ign ?? "Untitled",
      state: body.state,
      public: isPublic,
      achievement: body.achievement,
      identity,
      ign: body.ign ?? body.name,
      boss300HexaStat: body.boss300HexaStat,
      boss380HexaStat: body.boss380HexaStat,
      character: body.character,
      equipment: body.equipment,
    });

    const origin = new URL(req.url).origin;
    const url = `${origin}/calc/character/share/${created.record.id}`;

    return NextResponse.json({
      id: created.record.id,
      url,
      public: created.record.public,
      name: created.record.name,
      identity: created.record.identity ?? identity,
      views: created.record.views ?? 0,
      hasEquipment: created.record.hasEquipment === true,
      deleteToken: created.deleteToken,
      editToken: created.editToken,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("too large")
      ? 413
      : message.includes("already exists") || message.includes("identical")
        ? 409
        : message.includes("Enter your IGN") ||
            message.includes("unique name") ||
            message.includes("not allowed") ||
            message.includes("complete scouter") ||
            message.includes("Achievement") ||
            message.includes("IGN") ||
            message.includes("spammy") ||
            message.includes("language")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
