"use client";

import Link from "next/link";
import { BrandWordmark } from "@/components/BrandMark";
import { CharacterSearchBar } from "@/components/dashboard/CharacterSearchBar";
import { DashboardPrimaryHero } from "@/components/dashboard/DashboardCommandCenter";
import { useRoster } from "@/hooks/useRoster";
import { entryKey } from "@/lib/dashboard/roster";

const SECONDARY_TOOLS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calc/scouter", label: "Scouter" },
  { href: "/calc/equips/setup", label: "Equipment" },
  { href: "/calc/equips/flames", label: "Flames" },
  { href: "/calc/cubing", label: "Cubing" },
  { href: "/roster", label: "Roster" },
  { href: "/calc/bosses", label: "Boss Income" },
  { href: "/calc/liberation", label: "Liberation" },
  { href: "/calc/scouter/gallery", label: "Gallery" },
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
          <BrandWordmark markSize={36} textClassName="text-4xl sm:text-5xl" />
          <p className="mt-3 max-w-md text-sm opacity-75 sm:text-base">
            Look up a GMS character, pin a primary, then jump into scouter and
            gear tools.
          </p>
        </div>

        <div className="relative mx-auto mt-6 max-w-2xl text-left">
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

      <nav
        aria-label="Tools"
        className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 border-t border-border/30 pt-6"
      >
        <span className="mr-2 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-soft">
          Tools
        </span>
        {SECONDARY_TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-accent-soft/40 hover:text-accent"
          >
            {tool.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
