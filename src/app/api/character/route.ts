import { NextResponse } from "next/server";
import {
  lookupGmsCharacterCached,
  toCardCharacter,
} from "@/lib/character/cache";
import {
  CHARACTER_NAME_REGEX,
  normalizeRegion,
  type CharacterLookupErrorCode,
} from "@/lib/character/lookup";

export const dynamic = "force-dynamic";

function errorJson(
  error: string,
  code: CharacterLookupErrorCode,
  status: number,
) {
  return NextResponse.json(
    { ok: false as const, error, code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = (searchParams.get("name") ?? searchParams.get("character_name") ?? "")
    .trim();
  const regionRaw = searchParams.get("region") ?? searchParams.get("world") ?? "na";
  const fields = (searchParams.get("fields") ?? "").trim().toLowerCase();
  const lean = fields === "card";

  if (!name) {
    return errorJson("Character name is required.", "missing_name", 400);
  }
  if (!CHARACTER_NAME_REGEX.test(name)) {
    return errorJson(
      "Invalid name. Use 2–13 letters or numbers (GMS IGN).",
      "invalid_name",
      400,
    );
  }

  const region = normalizeRegion(regionRaw);
  if (!region) {
    return errorJson('Region must be "na" or "eu".', "invalid_region", 400);
  }

  try {
    const character = await lookupGmsCharacterCached(name, region);
    if (!character) {
      return errorJson(
        `No ranked character named “${name}” on GMS ${region.toUpperCase()}. Low-level or unranked characters may not appear.`,
        "not_found",
        404,
      );
    }

    return NextResponse.json(
      {
        ok: true as const,
        character: lean ? toCardCharacter(character) : character,
      },
      {
        headers: {
          // Rankings refresh periodically; short CDN cache is fine.
          // Server also keeps a ~60s in-memory TTL shared with batch.
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "UPSTREAM_TIMEOUT") {
      return errorJson(
        "Character lookup timed out. Try again in a moment.",
        "upstream_timeout",
        504,
      );
    }
    console.error("[api/character]", err);
    return errorJson(
      "Could not reach character data sources. Try again later.",
      "upstream_error",
      502,
    );
  }
}
