import { NextResponse } from "next/server";
import {
  getShare,
  incrementShareViews,
  isRedisConfigured,
  purgeShare,
  removeFromPublicGallery,
  SHARE_MAX_BYTES,
  SHARE_VIEW_DEBOUNCE_SEC,
  updateShare,
  type ScouterShareState,
  type ShareCharacterRef,
  type ShareEquipmentPayload,
  type ShareIdentity,
} from "@/lib/scouter/share";
import { invalidatePublicGalleryCache } from "@/lib/scouter/share-gallery-cache";

type Params = { params: Promise<{ id: string }> };

/**
 * Localhost-only gallery admin delete.
 * Never true on production Vercel (NODE_ENV=production and Host ≠ localhost).
 */
function allowAdminGalleryDelete(req: Request): boolean {
  const envOk =
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_GALLERY_ADMIN_DELETE === "1";
  if (!envOk) return false;
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
    .split(",")[0]
    ?.trim()
    .toLowerCase() ?? "";
  const hostname = host.split(":")[0] ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function shareViewCookieName(id: string): string {
  return `scouter_v_${id}`;
}

function hasShareViewCookie(cookieHeader: string, id: string): boolean {
  const prefix = `${shareViewCookieName(id)}=`;
  return cookieHeader.split(";").some((part) => part.trim().startsWith(prefix));
}

export async function GET(req: Request, { params }: Params) {
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

    // Count a view when the public share page loads (?view=1), debounced per
    // browser via HttpOnly cookie so refresh spam doesn't INCR every time.
    const url = new URL(req.url);
    const countView = url.searchParams.get("view") === "1";
    const cookieHeader = req.headers.get("cookie") ?? "";
    const alreadyCounted = hasShareViewCookie(cookieHeader, id);
    let views = record.views ?? 0;
    let setViewCookie = false;
    if (countView && !alreadyCounted) {
      const next = await incrementShareViews(id);
      if (next != null) {
        views = next;
        setViewCookie = true;
      }
    }

    const res = NextResponse.json({ ...record, views });
    if (setViewCookie) {
      res.cookies.set(shareViewCookieName(id), "1", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: SHARE_VIEW_DEBOUNCE_SEC,
      });
    }
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
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

    const { id } = await params;
    const body = (await req.json()) as {
      editToken?: string;
      deleteToken?: string;
      state?: ScouterShareState;
      name?: string;
      ign?: string;
      identity?: ShareIdentity;
      achievement?: string;
      public?: boolean;
      boss300HexaStat?: number;
      boss380HexaStat?: number;
      character?: ShareCharacterRef | null;
      equipment?: ShareEquipmentPayload | null;
    };

    const editToken = (body.editToken ?? body.deleteToken ?? "").trim();
    if (!editToken) {
      return NextResponse.json(
        { error: "Missing editToken" },
        { status: 400 },
      );
    }

    const bodyBytes = new TextEncoder().encode(JSON.stringify(body)).length;
    if (bodyBytes > SHARE_MAX_BYTES) {
      return NextResponse.json(
        { error: `Payload too large (max ${SHARE_MAX_BYTES} bytes)` },
        { status: 413 },
      );
    }

    const record = await updateShare({
      id,
      editToken,
      state: body.state,
      name: body.name,
      ign: body.ign,
      identity: body.identity,
      achievement: body.achievement,
      public: body.public,
      boss300HexaStat: body.boss300HexaStat,
      boss380HexaStat: body.boss380HexaStat,
      character: body.character,
      equipment: body.equipment,
    });

    // Public flag / name / BCS fields affect gallery rows.
    invalidatePublicGalleryCache();

    const origin = new URL(req.url).origin;
    const url = `${origin}/calc/character/share/${record.id}`;

    return NextResponse.json({
      ...record,
      url,
      editToken,
      deleteToken: editToken,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("too large")
      ? 413
      : message.includes("already exists")
        ? 409
        : message.includes("Not allowed")
          ? 403
          : message.includes("Invalid") ||
              message.includes("Enter your IGN") ||
              message.includes("Share not found")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request, { params }: Params) {
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
    const body = (await req.json().catch(() => ({}))) as {
      deleteToken?: string;
      editToken?: string;
      /** When true, permanently delete (404). Used for gallery replace. */
      hard?: boolean;
      /** Localhost/dev admin override — unlist any post without edit token. */
      admin?: boolean;
    };
    const token = (body.editToken ?? body.deleteToken ?? "").trim();
    const admin = body.admin === true && allowAdminGalleryDelete(req);
    if (!admin && !token) {
      return NextResponse.json(
        { error: "Missing deleteToken" },
        { status: 400 },
      );
    }
    if (body.hard === true) {
      await purgeShare({
        id,
        deleteToken: token,
        admin,
      });
    } else {
      await removeFromPublicGallery({
        id,
        deleteToken: token,
        admin,
      });
    }
    invalidatePublicGalleryCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("Not allowed")
      ? 403
      : message.includes("Invalid")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
