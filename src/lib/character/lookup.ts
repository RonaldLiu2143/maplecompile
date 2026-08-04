/**
 * GMS character lookup via Nexon's public rankings API (no API key).
 *
 * Same upstream used by community tools such as the GMS Upgrade Tracker:
 *   GET https://www.nexon.com/api/maplestory/no-auth/ranking/v2/{region}
 *     ?type=overall&id=legendary&reboot_index={0|1}&page_index=1&character_name=…
 *
 * Rankings do not expose live online status or last-login dates.
 */

export type NexonRegion = "na" | "eu";

export type CharacterLookupResult = {
  name: string;
  region: NexonRegion;
  level: number;
  exp: number;
  jobName: string;
  worldId: number;
  worldName: string;
  characterImgURL: string | null;
  overallRank: number | null;
  fame: number | null;
  fetchedAt: string;
  source: "nexon-ranking";
  note: string;
};

export type CharacterLookupErrorCode =
  | "missing_name"
  | "invalid_name"
  | "invalid_region"
  | "not_found"
  | "upstream_error"
  | "upstream_timeout";

type NexonRankRow = {
  characterName?: string;
  exp?: number;
  level?: number;
  rank?: number;
  worldID?: number;
  characterImgURL?: string;
  jobName?: string;
  isSearchTarget?: boolean;
};

type NexonRankingResponse = {
  totalCount?: number;
  ranks?: NexonRankRow[];
};

/** Known GMS world IDs. Unknown IDs fall back to "World {id}". */
export const GMS_WORLD_NAMES: Record<number, string> = {
  0: "Scania",
  1: "Bera",
  17: "Elysium",
  18: "Aurora",
  19: "Scania",
  30: "Luna",
  45: "Kronos",
  46: "Solis",
  70: "Hyperion",
};

const NEXON_RANKING_BASE =
  "https://www.nexon.com/api/maplestory/no-auth/ranking/v2";

const UPSTREAM_TIMEOUT_MS = 10_000;

/** GMS IGN: letters + digits, typically 4–12 (allow 2–13 for edge cases). */
export const CHARACTER_NAME_REGEX = /^[A-Za-z0-9]{2,13}$/;

export function normalizeRegion(raw: string | null | undefined): NexonRegion | null {
  const v = (raw ?? "na").trim().toLowerCase();
  if (v === "na" || v === "eu") return v;
  return null;
}

export function worldNameForId(worldId: number): string {
  return GMS_WORLD_NAMES[worldId] ?? `World ${worldId}`;
}

function rankingUrl(
  region: NexonRegion,
  type: "overall" | "fame",
  characterName: string,
  rebootIndex: 0 | 1,
): string {
  const params = new URLSearchParams({
    type,
    id: "legendary",
    reboot_index: String(rebootIndex),
    page_index: "1",
    character_name: characterName,
  });
  return `${NEXON_RANKING_BASE}/${region}?${params.toString()}`;
}

async function fetchRanking(
  url: string,
): Promise<NexonRankingResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "MapleCompile/1.0 (+https://maplecompile.vercel.app; character-lookup)",
        Referer: "https://www.nexon.com/maplestory/rankings",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`UPSTREAM_${res.status}`);
    }
    return (await res.json()) as NexonRankingResponse;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("UPSTREAM_TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function pickExactRow(
  data: NexonRankingResponse,
  characterName: string,
): NexonRankRow | null {
  const ranks = data.ranks ?? [];
  if (!ranks.length) return null;
  const lower = characterName.toLowerCase();
  const exact =
    ranks.find(
      (r) =>
        r.isSearchTarget === true &&
        (r.characterName ?? "").toLowerCase() === lower,
    ) ??
    ranks.find((r) => (r.characterName ?? "").toLowerCase() === lower) ??
    null;
  return exact;
}

async function fetchOverallRow(
  region: NexonRegion,
  characterName: string,
): Promise<NexonRankRow | null> {
  // reboot_index 0 = Interactive, 1 = Heroic; name search usually works on either,
  // but try both if the first miss.
  for (const reboot of [0, 1] as const) {
    const data = await fetchRanking(
      rankingUrl(region, "overall", characterName, reboot),
    );
    const row = pickExactRow(data, characterName);
    if (row) return row;
  }
  return null;
}

async function fetchFame(
  region: NexonRegion,
  characterName: string,
  preferredReboot: 0 | 1,
): Promise<number | null> {
  try {
    for (const reboot of [preferredReboot, preferredReboot === 0 ? 1 : 0] as const) {
      const data = await fetchRanking(
        rankingUrl(region, "fame", characterName, reboot),
      );
      const row = pickExactRow(data, characterName);
      // Fame ranking stores fame in the `exp` field.
      if (row && typeof row.exp === "number") return row.exp;
    }
  } catch {
    /* optional enrichment — ignore */
  }
  return null;
}

export async function lookupGmsCharacter(
  characterName: string,
  region: NexonRegion,
): Promise<CharacterLookupResult | null> {
  const row = await fetchOverallRow(region, characterName);
  if (!row || typeof row.level !== "number") return null;

  const worldId = typeof row.worldID === "number" ? row.worldID : -1;
  // Heroic worlds: Kronos 45, Solis 46, Hyperion 70
  const heroic = worldId === 45 || worldId === 46 || worldId === 70;
  const fame = await fetchFame(region, row.characterName ?? characterName, heroic ? 1 : 0);

  return {
    name: row.characterName ?? characterName,
    region,
    level: row.level,
    exp: typeof row.exp === "number" ? row.exp : 0,
    jobName: row.jobName ?? "Unknown",
    worldId,
    worldName: worldNameForId(worldId),
    characterImgURL: row.characterImgURL || null,
    overallRank: typeof row.rank === "number" ? row.rank : null,
    fame,
    fetchedAt: new Date().toISOString(),
    source: "nexon-ranking",
    note:
      "Data from Nexon’s public GMS rankings. Not live online status — no last-login field is published.",
  };
}
