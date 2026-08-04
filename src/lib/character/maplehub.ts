/**
 * MapleHub public character JSON (no API key).
 *
 * Used by maplehub.app roster pages:
 *   GET https://maplehub.app/api/character/?characterName=…&region=na|eu
 *   Header: X-MapleHub-Request: true
 *
 * Returns legion, class/world ranks, and optional EXP history graphs.
 * Prefer Nexon rankings for the live avatar URL (MapleHub sometimes mangles CDN URLs).
 */

import type { NexonRegion } from "./lookup";

const MAPLEHUB_CHARACTER =
  "https://maplehub.app/api/character/";

const UPSTREAM_TIMEOUT_MS = 12_000;

export type MapleHubRankingDetail = {
  jobRank: number | null;
  worldRank: number | null;
  jobGlobalRank: number | null;
  globalRank: number | null;
  legionRank: number | null;
};

export type MapleHubExpAverages = {
  avg7d: string | null;
  avg14d: string | null;
  avg30d: string | null;
  avg90d: string | null;
  todayExp: number | null;
};

export type MapleHubGraphData = {
  dailyExp: number[];
  levels: number[];
  cumulativeExp: number[];
  labels: string[];
};

export type MapleHubCharacter = {
  name: string;
  region: NexonRegion;
  jobName: string;
  level: number;
  exp: number;
  rank: number | null;
  worldId: number | null;
  worldName: string | null;
  characterImgURL: string | null;
  isMain: boolean | null;
  legionLevel: number | null;
  raidPower: number | null;
  classRank: number | null;
  ranking: MapleHubRankingDetail | null;
  expAverages: MapleHubExpAverages | null;
  graph: MapleHubGraphData | null;
};

type RawMapleHub = {
  region?: string;
  name?: string;
  jobName?: string;
  level?: number;
  exp?: number;
  rank?: number;
  worldID?: number;
  worldName?: string;
  characterImgURL?: string;
  isMain?: boolean;
  legionLevel?: number;
  raidPower?: number;
  classRank?: number;
  additionalData?: {
    expData?: Record<string, string | number>;
    graphData?: {
      expData?: number[];
      levelData?: number[];
      expValues?: number[];
      labels?: string[];
    };
    ranking?: {
      jobRank?: number;
      worldRank?: number;
      jobGlobalRank?: number;
      globalRank?: number;
      legionRank?: number;
    };
  };
};

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Fix broken concatenations like `https://cdn.maplebot.iohttps://…`. */
export function sanitizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let a = url.trim();
  const cors = a.indexOf("corsproxy.io/?url=");
  if (cors >= 0) a = a.slice(cors + "corsproxy.io/?url=".length);
  const httpsIdx = a.indexOf("https://", 8);
  if (httpsIdx >= 0) a = a.slice(httpsIdx);
  else {
    const httpIdx = a.indexOf("http://", 8);
    if (httpIdx >= 0) a = a.slice(httpIdx);
  }
  if (a.startsWith("http://") && a.includes("msavatar1.nexon.net")) {
    a = a.replace("http://", "https://");
  }
  if (!/^https?:\/\//i.test(a)) return null;
  return a;
}

function parseExpAverages(
  expData: Record<string, string | number> | undefined,
): MapleHubExpAverages | null {
  if (!expData) return null;
  return {
    avg7d: typeof expData["7d Average Daily Exp"] === "string"
      ? expData["7d Average Daily Exp"]
      : null,
    avg14d: typeof expData["14d Average Daily Exp"] === "string"
      ? expData["14d Average Daily Exp"]
      : null,
    avg30d: typeof expData["30d Average Daily Exp"] === "string"
      ? expData["30d Average Daily Exp"]
      : null,
    avg90d: typeof expData["90d Average Daily Exp"] === "string"
      ? expData["90d Average Daily Exp"]
      : null,
    todayExp: numOrNull(expData.todayExp),
  };
}

function parseGraph(
  graph:
    | {
        expData?: number[];
        levelData?: number[];
        expValues?: number[];
        labels?: string[];
      }
    | undefined,
): MapleHubGraphData | null {
  if (!graph) return null;
  const dailyExp = Array.isArray(graph.expData) ? graph.expData : [];
  const levels = Array.isArray(graph.levelData) ? graph.levelData : [];
  const cumulativeExp = Array.isArray(graph.expValues) ? graph.expValues : [];
  const labels = Array.isArray(graph.labels) ? graph.labels : [];
  if (!dailyExp.length && !cumulativeExp.length) return null;
  return { dailyExp, levels, cumulativeExp, labels };
}

function normalize(raw: RawMapleHub, fallbackRegion: NexonRegion): MapleHubCharacter | null {
  if (!raw.name || typeof raw.level !== "number") return null;
  const region =
    raw.region === "eu" || raw.region === "na" ? raw.region : fallbackRegion;
  const rankingRaw = raw.additionalData?.ranking;
  return {
    name: raw.name,
    region,
    jobName: raw.jobName ?? "Unknown",
    level: raw.level,
    exp: typeof raw.exp === "number" ? raw.exp : 0,
    rank: numOrNull(raw.rank),
    worldId: numOrNull(raw.worldID),
    worldName: raw.worldName ?? null,
    characterImgURL: sanitizeAvatarUrl(raw.characterImgURL),
    isMain: typeof raw.isMain === "boolean" ? raw.isMain : null,
    legionLevel: numOrNull(raw.legionLevel),
    raidPower: numOrNull(raw.raidPower),
    classRank: numOrNull(raw.classRank),
    ranking: rankingRaw
      ? {
          jobRank: numOrNull(rankingRaw.jobRank),
          worldRank: numOrNull(rankingRaw.worldRank),
          jobGlobalRank: numOrNull(rankingRaw.jobGlobalRank),
          globalRank: numOrNull(rankingRaw.globalRank),
          legionRank: numOrNull(rankingRaw.legionRank),
        }
      : null,
    expAverages: parseExpAverages(raw.additionalData?.expData),
    graph: parseGraph(raw.additionalData?.graphData),
  };
}

export async function fetchMapleHubCharacter(
  characterName: string,
  region: NexonRegion,
): Promise<MapleHubCharacter | null> {
  const params = new URLSearchParams({
    characterName,
    region,
    _t: String(Date.now()),
  });
  const url = `${MAPLEHUB_CHARACTER}?${params.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "MapleCompile/1.0 (+https://maplecompile.vercel.app; character-lookup)",
        "X-MapleHub-Request": "true",
        Referer: "https://maplehub.app/",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as RawMapleHub;
    return normalize(raw, region);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
