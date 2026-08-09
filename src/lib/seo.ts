import type { Metadata } from "next";

/** Canonical production origin (no custom domain configured yet). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://maplecompile.vercel.app";

export const SITE_NAME = "MapleCompile";

export const SITE_DESCRIPTION =
  "Free MapleStory GMS tools — character lookup, combat power scouter, equipment setup, flame & cubing calculators, boss income, liberation, and HEXA fragment tracking.";

export const SITE_KEYWORDS = [
  "MapleStory",
  "GMS",
  "MapleCompile",
  "scouter",
  "combat power",
  "character lookup",
  "equipment setup",
  "flame calculator",
  "cubing calculator",
  "boss crystal",
  "HEXA",
  "liberation",
  "roster",
] as const;

export type PublicRoute = {
  path: string;
  title: string;
  description: string;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
};

/** Indexable tool landings (no share IDs, no query-param profiles). */
export const PUBLIC_ROUTES: PublicRoute[] = [
  {
    path: "/",
    title: "MapleStory Calculators & Character Tools",
    description: SITE_DESCRIPTION,
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/dashboard",
    title: "Dashboard",
    description:
      "Track your MapleStory roster, dailies, weekly bosses, and jump into scouter and gear tools.",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/calc/character",
    title: "Character Search",
    description:
      "Look up MapleStory GMS characters by IGN — level, job, world, and gear context for your tools.",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/calc/scouter",
    title: "Combat Power Scouter",
    description:
      "MapleStory combat power scouter with buffs, links, HEXA, and equipment pairing for GMS.",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/calc/scouter/gallery",
    title: "Scouter Gallery",
    description:
      "Browse shared MapleStory scouter builds from the MapleCompile community gallery.",
    changeFrequency: "daily",
    priority: 0.7,
  },
  {
    path: "/calc/equips/setup",
    title: "Equipment Setup",
    description:
      "Plan MapleStory equipment stars, potentials, and flames in one setup — pair with Scouter.",
    changeFrequency: "weekly",
    priority: 0.85,
  },
  {
    path: "/calc/equips/flames",
    title: "Flame Calculator",
    description:
      "Estimate MapleStory flame odds and expected costs for gear upgrades.",
    changeFrequency: "monthly",
    priority: 0.75,
  },
  {
    path: "/calc/cubing",
    title: "Cubing Calculator",
    description:
      "MapleStory cubing calculator for potential lines, cube costs, and odds.",
    changeFrequency: "monthly",
    priority: 0.75,
  },
  {
    path: "/calc/planner",
    title: "Upgrade Planner",
    description:
      "Plan MapleStory upgrade order across equipment, flames, and potentials.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/roster",
    title: "Roster Manager",
    description:
      "Manage your MapleStory character roster and sync tools around a primary character.",
    changeFrequency: "weekly",
    priority: 0.75,
  },
  {
    path: "/calc/bosses",
    title: "Boss Income",
    description:
      "Track MapleStory weekly boss clears and crystal meso income for your roster.",
    changeFrequency: "weekly",
    priority: 0.85,
  },
  {
    path: "/calc/liberation",
    title: "Liberation Tracker",
    description:
      "Track Genesis and Destiny weapon liberation quest progress for MapleStory GMS.",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    path: "/calc/hexa-tracker",
    title: "HEXA / Fragment Tracker",
    description:
      "Track HEXA matrix levels and Sol Erda fragment progress for MapleStory.",
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    path: "/calc/diary",
    title: "Diary",
    description:
      "Log MapleStory daily and weekly progress notes alongside your roster tools.",
    changeFrequency: "monthly",
    priority: 0.55,
  },
];

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized === "/" ? "" : normalized}` || SITE_URL;
}

export function buildPageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

export function routeMetadata(path: string, noIndex = false): Metadata {
  const route = PUBLIC_ROUTES.find((r) => r.path === path);
  if (!route) {
    return buildPageMetadata({
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      path,
      noIndex,
    });
  }
  return buildPageMetadata({
    title: route.title,
    description: route.description,
    path: route.path,
    noIndex,
  });
}
