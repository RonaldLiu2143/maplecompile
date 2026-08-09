import type { Metadata } from "next";
import { Suspense } from "react";
import { CharacterSearchPage } from "@/components/character/CharacterSearchPage";
import { buildPageMetadata, routeMetadata } from "@/lib/seo";

type SearchParams = Promise<{
  name?: string | string[];
  region?: string | string[];
}>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Index the character search landing. Query-param profiles (`?name=`) are
 * noindex — thin/dynamic personal pages shouldn't compete with tool landings.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const name = firstParam(sp.name)?.trim();
  if (name) {
    return buildPageMetadata({
      title: `${name} — Character`,
      description: `MapleStory character lookup for ${name} on MapleCompile.`,
      path: "/calc/character",
      noIndex: true,
    });
  }
  return routeMetadata("/calc/character");
}

export default function CharacterLookupPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm opacity-70">Loading…</div>
      }
    >
      <CharacterSearchPage />
    </Suspense>
  );
}
