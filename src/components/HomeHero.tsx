"use client";

import Link from "next/link";
import { BrandWordmark } from "@/components/BrandMark";
import { CharacterSearchBar } from "@/components/dashboard/CharacterSearchBar";
import { DashboardPrimaryHero } from "@/components/dashboard/DashboardCommandCenter";
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
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface/85 px-5 py-8 sm:px-10 sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,var(--accent-soft),transparent_55%)] opacity-80"
        />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
          <BrandWordmark
            as="h1"
            markSize={36}
            textClassName="text-4xl sm:text-5xl"
          />
          <p className="sr-only">
            MapleStory GMS calculators, character search, and combat power
            scouter
          </p>
          <p className="mt-3 max-w-md text-sm opacity-75 sm:text-base">
            Look up a GMS character, pin a primary, then jump into scouter and
            gear tools. Free, no account required.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <a
              href="#character-search"
              className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
            >
              Look up a character
            </a>
            <Link
              href="/guide"
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-accent-soft"
            >
              Read the Guide
            </Link>
            <Link
              href="/calc/scouter"
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-accent-soft"
            >
              Open Scouter
            </Link>
          </div>
        </div>

        <div
          id="character-search"
          className="relative mx-auto mt-6 max-w-2xl scroll-mt-24 text-left"
        >
          {hydrated ? (
            <CharacterSearchBar roster={roster} onAdded={handleRosterAdded} />
          ) : (
            <div className="rounded-xl border border-border/50 bg-surface/80 px-4 py-6 text-center text-sm opacity-70">
              Loading search…
            </div>
          )}
        </div>

        <div className="relative mx-auto mt-5 max-w-2xl">
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
      </section>

      <nav aria-label="Tools" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {SECONDARY_TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="flex min-h-11 flex-col justify-center rounded-xl border border-border/50 bg-surface/70 px-3 py-3 transition duration-200 hover:border-accent/40 hover:bg-accent-soft/25"
          >
            <p className="font-display text-sm font-bold">{tool.label}</p>
            <p className="mt-0.5 text-xs text-muted">{tool.body}</p>
          </Link>
        ))}
      </nav>
    </div>
  );
}
