"use client";

import Link from "next/link";
import { BrandWordmark } from "@/components/BrandMark";
import { CharacterSearchBar } from "@/components/dashboard/CharacterSearchBar";
import { DashboardPrimaryHero } from "@/components/dashboard/DashboardCommandCenter";
import { Button } from "@/components/ui/button";
import { StackedToolLinks } from "@/components/StackedToolLinks";
import { useRoster } from "@/hooks/useRoster";
import { entryKey } from "@/lib/dashboard/roster";

const SECONDARY_TOOLS = [
  { href: "/guide", title: "Guide", body: "Five steps from IGN to scouter" },
  { href: "/dashboard", title: "Dashboard", body: "Primary, dailies, weeklies" },
  { href: "/calc/scouter", title: "Scouter", body: "Combat power and gear" },
  { href: "/calc/equips/setup", title: "Equipment", body: "Slots and set effects" },
  { href: "/calc/equips/flames", title: "Flames", body: "Flame score helper" },
  { href: "/calc/cubing", title: "Cubing", body: "Potential odds" },
  { href: "/roster", title: "Roster", body: "Mules and alts" },
  { href: "/calc/bosses", title: "Boss Income", body: "Weekly crystal meso" },
  { href: "/calc/liberation", title: "Liberation", body: "Genesis / Destiny" },
  { href: "/calc/scouter/gallery", title: "Gallery", body: "Shared builds" },
] as const;

export function HomeHero() {
  const {
    hydrated,
    roster,
    primary,
    slots,
    handleRetry,
    handleRosterAdded,
  } = useRoster();

  const primarySlot = primary ? slots[entryKey(primary)] : undefined;
  const primaryEntry = primary
    ? roster.find((e) => entryKey(e) === entryKey(primary))
    : undefined;

  return (
    <div className="flex flex-col gap-10">
      <section className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <BrandWordmark
          as="h1"
          markSize={36}
          textClassName="text-4xl sm:text-5xl"
        />
        <p className="sr-only">
          MapleStory GMS calculators, character search, and combat power
          scouter
        </p>
        <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
          Look up a GMS character, pin a primary, then jump into scouter and
          gear tools. Free, no account required.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button asChild className="h-11 px-4">
            <a href="#character-search">Look up a character</a>
          </Button>
          <Button asChild variant="outline" className="h-11 px-4">
            <Link href="/guide">Read the Guide</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-4">
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

      <div className="mx-auto w-full max-w-2xl">
        {hydrated ? (
          <DashboardPrimaryHero
            primary={primary}
            slot={primarySlot}
            compactTools
            onRetry={
              primaryEntry ? () => handleRetry(primaryEntry) : undefined
            }
          />
        ) : null}
      </div>

      <nav aria-label="Tools" className="mx-auto w-full max-w-3xl">
        <StackedToolLinks items={SECONDARY_TOOLS} columns={2} compact />
      </nav>
    </div>
  );
}
