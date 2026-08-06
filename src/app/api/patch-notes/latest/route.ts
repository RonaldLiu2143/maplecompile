import { NextResponse } from "next/server";

export const revalidate = 300;

const CMS_NEWS_URL = "https://g.nexonstatic.com/maplestory/cms/v1/news";
const SOURCE_PAGE = "https://www.nexon.com/maplestory/news/update?page=1";

type CmsNewsItem = {
  id?: number | string;
  name?: string;
  category?: string;
  liveDate?: string;
  summary?: string;
};

function cacheHeaders() {
  return {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function newsUrl(item: CmsNewsItem): string {
  const id = String(item.id ?? "");
  const category = (item.category ?? "update").toLowerCase();
  const seo = slugify(item.name ?? "patch-notes") || "patch-notes";
  return `https://www.nexon.com/maplestory/news/${category}/${id}/${seo}`;
}

export async function GET() {
  try {
    const res = await fetch(CMS_NEWS_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MapleCompile (patch-notes)",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false as const,
          reason: "upstream" as const,
          message: "Could not load patch notes right now.",
          source: SOURCE_PAGE,
        },
        { status: 200, headers: cacheHeaders() },
      );
    }

    const raw = (await res.json()) as CmsNewsItem[] | Record<string, CmsNewsItem>;
    const list = Array.isArray(raw) ? raw : Object.values(raw);

    const updates = list
      .filter(
        (item) =>
          item &&
          typeof item === "object" &&
          String(item.category ?? "").toLowerCase() === "update",
      )
      .sort((a, b) => {
        const ta = Date.parse(a.liveDate ?? "") || 0;
        const tb = Date.parse(b.liveDate ?? "") || 0;
        return tb - ta;
      });

    const latest = updates[0];
    if (!latest?.id || !latest.name) {
      return NextResponse.json(
        {
          ok: false as const,
          reason: "empty" as const,
          message: "No UPDATE patch notes found.",
          source: SOURCE_PAGE,
        },
        { status: 200, headers: cacheHeaders() },
      );
    }

    return NextResponse.json(
      {
        ok: true as const,
        source: SOURCE_PAGE,
        item: {
          id: String(latest.id),
          title: latest.name,
          date: latest.liveDate ?? null,
          summary: latest.summary ?? null,
          url: newsUrl(latest),
          category: "UPDATE",
        },
        recent: updates.slice(0, 3).map((item) => ({
          id: String(item.id),
          title: item.name ?? "Patch notes",
          date: item.liveDate ?? null,
          url: newsUrl(item),
        })),
      },
      { headers: cacheHeaders() },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false as const,
        reason: "fetch_failed" as const,
        message: "Could not load patch notes right now.",
        source: SOURCE_PAGE,
      },
      { status: 200, headers: cacheHeaders() },
    );
  }
}
