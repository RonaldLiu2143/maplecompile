import type { CharacterLookupResult, NexonRegion } from "@/lib/character/lookup";

export type CharacterLookupApiOk = {
  ok: true;
  character: CharacterLookupResult;
};

export type CharacterLookupApiErr = {
  ok: false;
  error: string;
  code?: string;
};

export type CharacterLookupApiResponse =
  | CharacterLookupApiOk
  | CharacterLookupApiErr;

export type CharacterBatchApiResponse =
  | {
      ok: true;
      results: Record<
        string,
        | { ok: true; character: CharacterLookupResult }
        | { ok: false; error: string; code?: string }
      >;
    }
  | { ok: false; error: string; code?: string };

export const CHARACTER_LOOKUP_NETWORK_ERROR =
  "Network error — check your connection and try again.";

const SESSION_PREFIX = "maplecompile-char:";

export function characterProfileHref(
  character: Pick<CharacterLookupResult, "name" | "region">,
): string {
  const qs = new URLSearchParams({
    name: character.name,
    region: character.region,
  });
  return `/calc/character?${qs.toString()}`;
}

/** Same key shape as server cache / roster entryKey: region:lowercaseName */
function lookupKey(region: NexonRegion, name: string): string {
  return `${region}:${name.trim().toLowerCase()}`;
}

function sessionStorageKey(region: NexonRegion, name: string): string {
  return SESSION_PREFIX + lookupKey(region, name);
}

/** Last-good character snapshot for stale-while-revalidate UX. */
export function readSessionCharacter(
  name: string,
  region: NexonRegion,
): CharacterLookupResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(sessionStorageKey(region, name));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CharacterLookupResult;
    if (
      !parsed ||
      typeof parsed.name !== "string" ||
      typeof parsed.level !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSessionCharacter(character: CharacterLookupResult): void {
  if (typeof window === "undefined") return;
  try {
    // Prefer freshest payload, but never drop EXP history if a lean response
    // omits it (keeps Daily EXP graphs after Full profile → back).
    const prev = readSessionCharacter(character.name, character.region);
    const merged: CharacterLookupResult = {
      ...character,
      graph: character.graph ?? prev?.graph ?? null,
      expAverages: character.expAverages ?? prev?.expAverages ?? null,
    };
    sessionStorage.setItem(
      sessionStorageKey(character.region, character.name),
      JSON.stringify(merged),
    );
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Client fetch for `/api/character`. Lets the browser honor API `s-maxage`. */
export async function fetchCharacterLookup(
  name: string,
  region: NexonRegion,
  opts?: { fields?: "card" | "full" },
): Promise<CharacterLookupResult> {
  const qs = new URLSearchParams({ name, region });
  if (opts?.fields === "card") qs.set("fields", "card");
  const res = await fetch(`/api/character?${qs.toString()}`);
  const body = (await res.json()) as CharacterLookupApiResponse;
  if (!res.ok || !body.ok) {
    throw new Error(!body.ok ? body.error : `Lookup failed (${res.status}).`);
  }
  writeSessionCharacter(body.character);
  return body.character;
}

export type CharacterBatchRequest = {
  name: string;
  region: NexonRegion;
};

export type CharacterBatchEntry =
  | { ok: true; character: CharacterLookupResult }
  | { ok: false; error: string; code?: string };

/**
 * Batch lookup via POST `/api/character/batch`.
 * Returns a map keyed by `region:name` (lowercase name).
 */
export async function fetchCharacterLookupBatch(
  characters: CharacterBatchRequest[],
  opts?: { fields?: "card" | "full" },
): Promise<Record<string, CharacterBatchEntry>> {
  if (characters.length === 0) return {};

  const res = await fetch("/api/character/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      characters: characters.map((c) => ({
        name: c.name,
        region: c.region,
      })),
      fields: opts?.fields === "card" ? "card" : undefined,
    }),
  });

  const body = (await res.json()) as CharacterBatchApiResponse;
  if (!res.ok || !body.ok) {
    throw new Error(
      !body.ok ? body.error : `Batch lookup failed (${res.status}).`,
    );
  }

  for (const entry of Object.values(body.results)) {
    if (entry.ok) writeSessionCharacter(entry.character);
  }

  return body.results;
}
