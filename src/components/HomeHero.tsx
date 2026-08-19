"use client";

import Link from "next/link";
import { BrandWordmark } from "@/components/BrandMark";
import { CharacterSearchBar } from "@/components/dashboard/CharacterSearchBar";
import { DashboardPrimaryHero } from "@/components/dashboard/DashboardCommandCenter";
import { Button } from "@/components/ui/button";
import { StackedToolLinks } from "@/components/StackedToolLinks";
import { useRoster } from "@/hooks/useRoster";
import { entryKey } from "@/lib/dashboard/roster";
import { HOME_TOOL_LINKS } from "@/lib/tool-links";

export function HomeHero() {
  const {
    hydrated,
    roster,
    primary,
    slots,
    handleRetry,
    handleRosterAdded,
  } = useRoster({ load: "primary" });

  const primarySlot = primary ? slots[entryKey(primary)] : undefined;
  const primaryEntry = primary
    ? roster.find((e) => entryKey(e) === entryKey(primary))
    : undefined;

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      <section className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <BrandWordmark
          as="h1"
          markSize={28}
          textClassName="text-3xl sm:text-5xl"
        />
        <p className="sr-only">
          MapleStory GMS calculators, character search, and combat power
          scouter
        </p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground sm:mt-3 sm:text-base">
          Look up a GMS character, pin a primary, then jump into scouter and
          gear tools. Free, no account required.
        </p>
        <div className="mt-4 hidden flex-wrap items-center justify-center gap-2 sm:mt-8 sm:flex">
          <Button asChild variant="ghost" className="h-11 px-4">
            <Link href="/guide">Read the Guide</Link>
          </Button>
          <Button asChild variant="ghost" className="h-11 px-4">
            <Link href="/calc/scouter">Open Scouter</Link>
          </Button>
        </div>
      </section>

      <div
        id="character-search"
        className="mx-auto w-full max-w-2xl scroll-mt-24 text-left"
      >
        {hydrated ? (
          <CharacterSearchBar roster={roster} onAdded={handleRosterAdded} />
        ) : (
          <div className="rounded-lg bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
            Loading search…
          </div>
        )}
      </div>

      {hydrated && primary ? (
        <div className="mx-auto w-full max-w-2xl">
          <DashboardPrimaryHero
            primary={primary}
            slot={primarySlot}
            onRetry={
              primaryEntry ? () => handleRetry(primaryEntry) : undefined
            }
          />
        </div>
      ) : null}

      <nav aria-label="Tools" className="mx-auto w-full max-w-3xl">
        <StackedToolLinks items={HOME_TOOL_LINKS} columns={2} compact />
      </nav>
    </div>
  );
}
