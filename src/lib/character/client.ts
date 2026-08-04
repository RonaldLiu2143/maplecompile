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

export const CHARACTER_LOOKUP_NETWORK_ERROR =
  "Network error — check your connection and try again.";

export function characterProfileHref(
  character: Pick<CharacterLookupResult, "name" | "region">,
): string {
  return `/calc/character/${encodeURIComponent(character.name)}?region=${character.region}`;
}

/** Client fetch for `/api/character`. Lets the browser honor API `s-maxage`. */
export async function fetchCharacterLookup(
  name: string,
  region: NexonRegion,
): Promise<CharacterLookupResult> {
  const qs = new URLSearchParams({ name, region });
  const res = await fetch(`/api/character?${qs.toString()}`);
  const body = (await res.json()) as CharacterLookupApiResponse;
  if (!res.ok || !body.ok) {
    throw new Error(!body.ok ? body.error : `Lookup failed (${res.status}).`);
  }
  return body.character;
}
