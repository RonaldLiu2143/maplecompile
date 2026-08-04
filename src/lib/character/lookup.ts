/**
 * GMS character lookup via Nexon's public rankings API (no API key),
 * optionally enriched with MapleHub's public character JSON.
 *
 * Nexon:
 *   GET https://www.nexon.com/api/maplestory/no-auth/ranking/v2/{region}
 *     ?type=overall|fame&id=legendary&reboot_index={0|1}&page_index=1&character_name=…
 *
 * MapleHub (server-side proxy, header X-MapleHub-Request):
 *   GET https://maplehub.app/api/character/?characterName=…&region=na|eu
 */

import { expPercent, expToNext } from "./exp";
import {
  fetchMapleHubCharacter,
  sanitizeAvatarUrl,
  type MapleHubCharacter,
  type MapleHubExpAverages,
  type MapleHubGraphData,
  type MapleHubRankingDetail,
} from "./maplehub";

export type NexonRegion = "na" | "eu";

export type CharacterRankingDetail = MapleHubRankingDetail;

export type CharacterLookupResult = {
  name: string;
  region: NexonRegion;
  level: number;
  exp: number;
  expToNext: number | null;
  expPercent: number | null;
  jobName: string;
  worldId: number;
  worldName: string;
  characterImgURL: string | null;
  overallRank: number | null;
  fame: number | null;
  /** Rank gap vs previous entry on the Nexon board (informational). */
  gap: number | null;
  isHeroic: boolean;
  legionLevel: number | null;
  raidPower: number | null;
  /** Achievement tier/score from Nexon overall row when present (often 0). */
  achievementTiercore: number | null;
  achievementTierId: number | null;
  isMain: boolean | null;
  classRank: number | null;
  ranking: CharacterRankingDetail | null;
  expAverages: MapleHubExpAverages | null;
  graph: MapleHubGraphData | null;
  fetchedAt: string;
  sources: Array<"nexon-ranking" | "maplehub">;
  note: string;
  stubs: {
    gear: string;
    fashion: string;
    achievementHistory: string;
    combatPower: string;
  };
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
  gap?: number;
  worldID?: number;
  characterImgURL?: string;
  jobName?: string;
  isSearchTarget?: boolean;
  legionLevel?: number;
  raidPower?: number;
  tierID?: number;
  score?: number;
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

const HEROIC_WORLD_IDS = new Set([45, 46, 70]);

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

export function isHeroicWorld(worldId: number): boolean {
  return HEROIC_WORLD_IDS.has(worldId);
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

async function fetchRanking(url: string): Promise<NexonRankingResponse> {
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
  return (
    ranks.find(
      (r) =>
        r.isSearchTarget === true &&
        (r.characterName ?? "").toLowerCase() === lower,
    ) ??
    ranks.find((r) => (r.characterName ?? "").toLowerCase() === lower) ??
    null
  );
}

async function fetchOverallRow(
  region: NexonRegion,
  characterName: string,
): Promise<{ row: NexonRankRow; rebootIndex: 0 | 1 } | null> {
  // Both reboot pools in parallel so Heroic worlds get the Heroic overall rank.
  const tries: Array<0 | 1> = [1, 0];
  const settled = await Promise.all(
    tries.map(async (reboot) => {
      try {
        const data = await fetchRanking(
          rankingUrl(region, "overall", characterName, reboot),
        );
        const row = pickExactRow(data, characterName);
        return {
          reboot,
          row,
          error: null as Error | null,
        };
      } catch (err) {
        return {
          reboot,
          row: null as NexonRankRow | null,
          error: err instanceof Error ? err : new Error(String(err)),
        };
      }
    }),
  );

  const found = settled
    .filter(
      (s): s is { reboot: 0 | 1; row: NexonRankRow; error: null } =>
        s.row != null,
    )
    .map((s) => ({ row: s.row, rebootIndex: s.reboot }));

  if (!found.length) {
    // Match prior sequential semantics: only throw if the last reboot attempt failed.
    const last = settled[settled.length - 1];
    if (last?.error) throw last.error;
    return null;
  }

  const heroicHit = found.find((f) =>
    isHeroicWorld(typeof f.row.worldID === "number" ? f.row.worldID : -1),
  );
  if (heroicHit) {
    // Prefer reboot_index=1 rank for Heroic worlds.
    return found.find((f) => f.rebootIndex === 1) ?? heroicHit;
  }
  return found.find((f) => f.rebootIndex === 0) ?? found[0];
}

async function fetchFame(
  region: NexonRegion,
  characterName: string,
  preferredReboot: 0 | 1,
): Promise<number | null> {
  try {
    const reboots = [
      preferredReboot,
      preferredReboot === 0 ? 1 : 0,
    ] as const;
    const results = await Promise.all(
      reboots.map(async (reboot) => {
        try {
          const data = await fetchRanking(
            rankingUrl(region, "fame", characterName, reboot),
          );
          const row = pickExactRow(data, characterName);
          // Fame ranking stores fame in the `exp` field.
          if (row && typeof row.exp === "number") return row.exp;
        } catch {
          /* optional enrichment — ignore */
        }
        return null;
      }),
    );
    return results.find((v) => v != null) ?? null;
  } catch {
    /* optional enrichment — ignore */
  }
  return null;
}

function mergeWithMapleHub(
  base: CharacterLookupResult,
  hub: MapleHubCharacter | null,
): CharacterLookupResult {
  if (!hub) return base;

  const sources = Array.from(
    new Set([...base.sources, "maplehub" as const]),
  ) as CharacterLookupResult["sources"];

  return {
    ...base,
    // Keep Nexon avatar when present — MapleHub CDN URLs are often broken.
    characterImgURL:
      base.characterImgURL ?? sanitizeAvatarUrl(hub.characterImgURL),
    legionLevel:
      hub.legionLevel != null && hub.legionLevel > 0
        ? hub.legionLevel
        : base.legionLevel,
    raidPower:
      hub.raidPower != null && hub.raidPower > 0
        ? hub.raidPower
        : base.raidPower,
    isMain: hub.isMain ?? base.isMain,
    classRank: hub.classRank ?? base.classRank,
    ranking: hub.ranking ?? base.ranking,
    // Prefer MapleHub world/job ranks' overall when present (their tracked board).
    overallRank: hub.ranking?.globalRank ?? base.overallRank,
    expAverages: hub.expAverages,
    graph: hub.graph,
    sources,
    note:
      "Live snapshot from Nexon public rankings, enriched with MapleHub’s public character API (legion / ranks / EXP history). Not live online status.",
  };
}

const STUBS = {
  gear: "Equipment / set details need Nexon Open API (API key) — not available on public rankings.",
  fashion:
    "Fashion history is tracked by MapleHub for roster characters; not exposed as a stable public feed.",
  achievementHistory:
    "Achievement tier/score history is MapleRanks-only historical data; Nexon overall rows rarely include live tier.",
  combatPower:
    "Combat power / range are Open API fields — stubbed without a Nexon API key.",
} as const;

export async function lookupGmsCharacter(
  characterName: string,
  region: NexonRegion,
): Promise<CharacterLookupResult | null> {
  // MapleHub is independent of Nexon — overlap the round trips.
  const hubPromise = fetchMapleHubCharacter(characterName, region);
  const overall = await fetchOverallRow(region, characterName);
  if (!overall || typeof overall.row.level !== "number") {
    // Nexon miss — still try MapleHub alone (covers some edge cases).
    const hubOnly = await hubPromise;
    if (!hubOnly) return null;
    const level = hubOnly.level;
    const exp = hubOnly.exp;
    return {
      name: hubOnly.name,
      region,
      level,
      exp,
      expToNext: expToNext(level),
      expPercent: expPercent(level, exp),
      jobName: hubOnly.jobName,
      worldId: hubOnly.worldId ?? -1,
      worldName: hubOnly.worldName ?? "Unknown",
      characterImgURL: sanitizeAvatarUrl(hubOnly.characterImgURL),
      overallRank: hubOnly.ranking?.globalRank ?? hubOnly.rank,
      fame: null,
      gap: null,
      isHeroic: isHeroicWorld(hubOnly.worldId ?? -1),
      legionLevel: hubOnly.legionLevel,
      raidPower: hubOnly.raidPower,
      achievementTiercore: null,
      achievementTierId: null,
      isMain: hubOnly.isMain,
      classRank: hubOnly.classRank,
      ranking: hubOnly.ranking,
      expAverages: hubOnly.expAverages,
      graph: hubOnly.graph,
      fetchedAt: new Date().toISOString(),
      sources: ["maplehub"],
      note: "Character found via MapleHub public API (Nexon rankings miss). Not live online status.",
      stubs: { ...STUBS },
    };
  }

  const row = overall.row;
  const worldId = typeof row.worldID === "number" ? row.worldID : -1;
  const heroic = isHeroicWorld(worldId);
  const resolvedName = row.characterName ?? characterName;

  const [fame, hub] = await Promise.all([
    fetchFame(region, resolvedName, overall.rebootIndex),
    hubPromise,
  ]);

  const level = row.level as number;
  const exp = typeof row.exp === "number" ? row.exp : 0;

  const base: CharacterLookupResult = {
    name: resolvedName,
    region,
    level,
    exp,
    expToNext: expToNext(level),
    expPercent: expPercent(level, exp),
    jobName: row.jobName ?? "Unknown",
    worldId,
    worldName: worldNameForId(worldId),
    characterImgURL: row.characterImgURL || null,
    overallRank: typeof row.rank === "number" ? row.rank : null,
    fame,
    gap: typeof row.gap === "number" ? row.gap : null,
    isHeroic: heroic,
    legionLevel:
      typeof row.legionLevel === "number" && row.legionLevel > 0
        ? row.legionLevel
        : null,
    raidPower:
      typeof row.raidPower === "number" && row.raidPower > 0
        ? row.raidPower
        : null,
    achievementTiercore:
      typeof row.score === "number" && row.score > 0 ? row.score : null,
    achievementTierId:
      typeof row.tierID === "number" && row.tierID > 0 ? row.tierID : null,
    isMain: null,
    classRank: null,
    ranking: null,
    expAverages: null,
    graph: null,
    fetchedAt: new Date().toISOString(),
    sources: ["nexon-ranking"],
    note: "Data from Nexon’s public GMS rankings. Not live online status — no last-login field is published.",
    stubs: { ...STUBS },
  };

  return mergeWithMapleHub(base, hub);
}
