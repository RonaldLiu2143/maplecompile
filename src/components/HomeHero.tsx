"use client";

import Link from "next/link";
import { BrandWordmark } from "@/components/BrandMark";
import { CharacterSearchBar } from "@/components/dashboard/CharacterSearchBar";
import { DashboardPrimaryHero } from "@/components/dashboard/DashboardCommandCenter";
import { Button } from "@/components/ui/button";
import { useRoster } from "@/hooks/useRoster";
import { entryKey } from "@/lib/dashboard/roster";

const SECONDARY_TOOLS = [
  { href: "/guide", label: "Guide", body: "Five steps from IGN to scouter" },
  { href: "/dashboard", label: "Dashboard", body: "Primary, dailies, weeklies" },
  { href: "/calc/scouter", label: "Scouter", body: "Combat power and gear" },
  { href: "/calc/equips/setup", label: "Equipment", body: "Slots and set effects" },
  { href: "/calc/equips/flames", label: "Flames", body: "Flame score helper" },
  { href: "/calc/cubing", label: "Cubing", body: "Potential odds" },
  { href: "/roster", label: "Roster", body: "Mules and alts" },
  { href: "/calc/bosses", label: "Boss Income", body: "Weekly crystal meso" },
  { href: "/calc/liberation", label: "Liberation", body: "Genesis / Destiny" },
  { href: "/calc/scouter/gallery", label: "Gallery", body: "Shared builds" },
] as const;

/** Character-first home: brand + IGN search + primary as optical center. */
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
              primary
                ? () => {
                    const entry = roster.find(
                      (e) => entryKey(e) === entryKey(primary),
                    );
                    if (entry) handleRetry(entry);
                  }
                : undefined
            }
          />
        ) : null}
      </div>

      <nav aria-label="Tools" className="mx-auto w-full max-w-3xl">
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {SECONDARY_TOOLS.map((tool) => (
            <li key={tool.href} className="border-b border-border">
              <Link
                href={tool.href}
                className="flex min-h-11 flex-col justify-center py-3 transition-colors hover:text-primary"
              >
                <span className="font-display text-sm font-bold">
                  {tool.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {tool.body}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
