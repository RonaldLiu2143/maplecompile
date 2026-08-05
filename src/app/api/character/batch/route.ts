import { NextResponse } from "next/server";
import {
  characterCacheKey,
  lookupGmsCharacterCached,
  mapWithConcurrency,
  toCardCharacter,
} from "@/lib/character/cache";
import {
  CHARACTER_NAME_REGEX,
  normalizeRegion,
  type CharacterLookupErrorCode,
  type CharacterLookupResult,
  type NexonRegion,
} from "@/lib/character/lookup";

export const dynamic = "force-dynamic";

const MAX_BATCH = 30;
const CONCURRENCY = 3;

export type CharacterBatchItem = {
  name: string;
  region?: string;
};

export type CharacterBatchResultOk = {
  ok: true;
  character: CharacterLookupResult;
};

export type CharacterBatchResultErr = {
  ok: false;
  error: string;
  code: CharacterLookupErrorCode;
};

export type CharacterBatchResults = Record<
  string,
  CharacterBatchResultOk | CharacterBatchResultErr
>;

function errResult(
  error: string,
  code: CharacterLookupErrorCode,
): CharacterBatchResultErr {
  return { ok: false, error, code };
}

function notFoundMessage(name: string, region: NexonRegion): string {
  return `No ranked character named “${name}” on GMS ${region.toUpperCase()}. Low-level or unranked characters may not appear.`;
}

async function resolveOne(
  name: string,
  region: NexonRegion,
  lean: boolean,
): Promise<CharacterBatchResultOk | CharacterBatchResultErr> {
  try {
    const character = await lookupGmsCharacterCached(name, region);
    if (!character) {
      return errResult(notFoundMessage(name, region), "not_found");
    }
    return {
      ok: true,
      character: lean ? toCardCharacter(character) : character,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "UPSTREAM_TIMEOUT") {
      return errResult(
        "Character lookup timed out. Try again in a moment.",
        "upstream_timeout",
      );
    }
    console.error("[api/character/batch]", name, region, err);
    return errResult(
      "Could not reach character data sources. Try again later.",
      "upstream_error",
    );
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false as const, error: "Invalid JSON body.", code: "invalid_body" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const raw =
    body &&
    typeof body === "object" &&
    Array.isArray((body as { characters?: unknown }).characters)
      ? ((body as { characters: unknown[] }).characters as CharacterBatchItem[])
      : null;

  if (!raw) {
    return NextResponse.json(
      {
        ok: false as const,
        error: 'Body must be { characters: [{ name, region }] }.',
        code: "invalid_body",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (raw.length > MAX_BATCH) {
    return NextResponse.json(
      {
        ok: false as const,
        error: `Batch too large (max ${MAX_BATCH}).`,
        code: "batch_too_large",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const fields =
    body && typeof body === "object"
      ? String((body as { fields?: unknown }).fields ?? "")
          .trim()
          .toLowerCase()
      : "";
  const lean = fields === "card";

  // Dedupe by region:name (case-insensitive name).
  const unique = new Map<
    string,
    { name: string; region: NexonRegion; key: string }
  >();
  const results: CharacterBatchResults = {};

  for (const item of raw) {
    const name =
      item && typeof item === "object" && typeof item.name === "string"
        ? item.name.trim()
        : "";
    const regionRaw =
      item && typeof item === "object" && typeof item.region === "string"
        ? item.region
        : "na";

    if (!name) {
      // Skip empties without a stable key.
      continue;
    }

    const region = normalizeRegion(regionRaw);
    if (!region) {
      const key = `invalid:${name.toLowerCase()}`;
      results[key] = errResult('Region must be "na" or "eu".', "invalid_region");
      continue;
    }

    const key = characterCacheKey(region, name);
    if (!CHARACTER_NAME_REGEX.test(name)) {
      results[key] = errResult(
        "Invalid name. Use 2–13 letters or numbers (GMS IGN).",
        "invalid_name",
      );
      continue;
    }

    if (!unique.has(key)) {
      unique.set(key, { name, region, key });
    }
  }

  const jobs = [...unique.values()];
  await mapWithConcurrency(jobs, CONCURRENCY, async (job) => {
    results[job.key] = await resolveOne(job.name, job.region, lean);
  });

  return NextResponse.json(
    { ok: true as const, results },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
