"use client";

import Link from "next/link";
import { BrandWordmark } from "@/components/BrandMark";
import { CharacterSearchBar } from "@/components/dashboard/CharacterSearchBar";
import { DashboardPrimaryHero } from "@/components/dashboard/DashboardCommandCenter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
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
    <div className="flex flex-col gap-8">
      <Card className="relative overflow-hidden py-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,var(--accent-soft),transparent_55%)] opacity-80"
        />
        <CardHeader className="relative items-center px-5 py-8 text-center sm:px-10 sm:py-10">
          <BrandWordmark
            as="h1"
            markSize={36}
            textClassName="text-4xl sm:text-5xl"
          />
          <p className="sr-only">
            MapleStory GMS calculators, character search, and combat power
            scouter
          </p>
          <CardDescription className="mt-3 max-w-md text-sm sm:text-base">
            Look up a GMS character, pin a primary, then jump into scouter and
            gear tools. Free, no account required.
          </CardDescription>
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
        </CardHeader>

        <CardContent className="relative mx-auto max-w-2xl pb-8">
          <div id="character-search" className="scroll-mt-24 text-left">
            {hydrated ? (
              <CharacterSearchBar roster={roster} onAdded={handleRosterAdded} />
            ) : (
              <div className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                Loading search…
              </div>
            )}
          </div>

          <div className="mt-5">
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
        </CardContent>
      </Card>

      <nav
        aria-label="Tools"
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
      >
        {SECONDARY_TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group">
            <Card
              size="sm"
              className="h-full transition-colors group-hover:bg-muted/80"
            >
              <CardContent>
                <p className="font-display text-sm font-bold">{tool.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {tool.body}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </nav>
    </div>
  );
}
