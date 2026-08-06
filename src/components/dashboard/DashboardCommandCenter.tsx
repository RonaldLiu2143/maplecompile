"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CharacterProfile } from "@/components/character/CharacterProfile";
import { LiberationStatusTags } from "@/components/dashboard/LiberationStatusTags";
import { characterProfileHref } from "@/lib/character/client";
import { entryKey, type RosterPrimary } from "@/lib/dashboard/roster";
import { readLiberationFlags } from "@/lib/dashboard/roster-status";
import type { RosterSlotState } from "@/hooks/useRoster";
import { subscribeMapleDataReload } from "@/lib/maple-events";

const TOOL_LINKS = [
  { href: "/calc/scouter", label: "Scouter" },
  { href: "/calc/equips/setup", label: "Equipment" },
  { href: "/calc/planner", label: "Upgrade Planner" },
  { href: "/calc/bosses", label: "Boss Income" },
  { href: "/calc/liberation", label: "Liberation" },
  { href: "/calc/scouter/gallery", label: "Gallery" },
  { href: "/calc/hexa-tracker", label: "HEXA / Fragments" },
] as const;

export function DashboardToolShortcuts() {
  return (
    <nav aria-label="Quick tools" className="flex flex-wrap gap-1.5">
      {TOOL_LINKS.map((tool) => (
        <Link
          key={tool.href}
          href={tool.href}
          className="rounded-md border border-border/50 bg-surface/90 px-2.5 py-1.5 text-xs font-semibold transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
        >
          {tool.label}
        </Link>
      ))}
    </nav>
  );
}

export function DashboardPrimaryHero({
  primary,
  slot,
  onRetry,
}: {
  primary: RosterPrimary | null;
  slot: RosterSlotState | undefined;
  onRetry?: () => void;
}) {
  const [liberation, setLiberation] = useState<{
    genesis: boolean;
    destiny: boolean;
  }>({ genesis: false, destiny: false });

  useEffect(() => {
    if (!primary) {
      setLiberation({ genesis: false, destiny: false });
      return;
    }
    const key = entryKey(primary);
    const reload = () => setLiberation(readLiberationFlags(key));
    reload();
    return subscribeMapleDataReload(reload);
  }, [primary]);

  if (!primary) {
    return (
      <section className="rounded-2xl border border-dashed border-border/60 bg-surface/60 px-4 py-5 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent opacity-80">
          Primary character
        </p>
        <h2 className="font-display mt-1 text-xl font-bold tracking-tight">
          No primary yet
        </h2>
        <p className="mt-1 max-w-xl text-sm opacity-75">
          Search a GMS character below and add them to your roster. Star one as
          primary to pin their profile here.
        </p>
        <div className="mt-3">
          <DashboardToolShortcuts />
        </div>
      </section>
    );
  }

  const character = slot?.status === "ready" ? slot.character : null;
  const loading = slot?.status === "loading" || !slot;
  const errored = slot?.status === "error";
  // When dense profile is showing, tags live next to the name there.
  const showHeaderTags = !character;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-2 sm:px-5">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-accent opacity-80">
            Primary character
            <span className="text-amber-400 normal-case tracking-normal">
              ★ Primary
            </span>
            {showHeaderTags ? (
              <LiberationStatusTags
                genesis={liberation.genesis}
                destiny={liberation.destiny}
                compact
              />
            ) : null}
          </p>
          {!character ? (
            <p className="truncate font-display text-base font-bold tracking-tight">
              {primary.name}
            </p>
          ) : null}
        </div>
        {character ? (
          <Link
            href={characterProfileHref(character)}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted"
          >
            Full profile
          </Link>
        ) : null}
      </div>

      <div className="p-3 sm:p-3.5">
        {character ? (
          <div className="[&>article]:border-0 [&>article]:bg-transparent">
            <CharacterProfile character={character} dense />
          </div>
        ) : loading ? (
          <div className="rounded-xl border border-border/50 bg-surface-muted/30 px-4 py-8 text-center text-sm opacity-70">
            Looking up {primary.name}…
          </div>
        ) : errored && slot?.status === "error" ? (
          <div
            role="alert"
            className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
          >
            <p>{slot.error}</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
