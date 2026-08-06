"use client";

import Link from "next/link";
import { CharacterProfile } from "@/components/character/CharacterProfile";
import { characterProfileHref } from "@/lib/character/client";
import type { RosterPrimary } from "@/lib/dashboard/roster";
import type { RosterSlotState } from "@/hooks/useRoster";

const TOOL_LINKS = [
  { href: "/calc/scouter", label: "Scouter" },
  { href: "/calc/equips/setup", label: "Equipment" },
  { href: "/calc/planner", label: "Upgrade Planner" },
  { href: "/calc/bosses", label: "Boss Income" },
  { href: "/calc/liberation", label: "Liberation" },
  { href: "/calc/scouter/gallery", label: "Gallery" },
  { href: "/calc/hexa-tracker", label: "HEXA / Fragments" },
] as const;

export function DashboardToolShortcuts({
  quiet = false,
}: {
  /** Text-link strip for filled dashboards / home secondary chrome. */
  quiet?: boolean;
}) {
  return (
    <nav
      aria-label="Quick tools"
      className={
        quiet
          ? "flex flex-wrap gap-x-1 gap-y-0.5"
          : "flex flex-wrap gap-1.5"
      }
    >
      {TOOL_LINKS.map((tool) => (
        <Link
          key={tool.href}
          href={tool.href}
          className={
            quiet
              ? "rounded-md px-2 py-1 text-[11px] font-medium text-muted transition hover:bg-accent-soft/40 hover:text-accent"
              : "rounded-md border border-border/50 bg-surface/90 px-2.5 py-1.5 text-xs font-semibold transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
          }
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
  compactTools = false,
}: {
  primary: RosterPrimary | null;
  slot: RosterSlotState | undefined;
  onRetry?: () => void;
  /** Quieter tool strip (home / filled dashboard). */
  compactTools?: boolean;
}) {
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
          Search a GMS character and add them to your roster. Star one as
          primary to pin their profile here.
        </p>
        <div className="mt-3">
          <DashboardToolShortcuts quiet={compactTools} />
        </div>
      </section>
    );
  }

  const character = slot?.status === "ready" ? slot.character : null;
  const loading = slot?.status === "loading" || !slot;
  const errored = slot?.status === "error";

  return (
    <section className="overflow-hidden rounded-xl border border-border/50 bg-surface/95">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent/25 bg-accent-soft/15 px-3 py-1.5 sm:px-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
            Primary
            <span className="text-amber-400 normal-case tracking-normal">
              ★
            </span>
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
            className="rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-semibold transition hover:bg-surface-muted"
          >
            Full profile
          </Link>
        ) : null}
      </div>

      <div className="p-2 sm:p-2.5">
        {character ? (
          <div className="[&>article]:border-0 [&>article]:bg-transparent [&>article]:p-0">
            <CharacterProfile character={character} dense />
          </div>
        ) : loading ? (
          <div className="rounded-lg bg-surface-muted/30 px-3 py-5 text-center text-sm opacity-70">
            Looking up {primary.name}…
          </div>
        ) : errored && slot?.status === "error" ? (
          <div
            role="alert"
            className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm"
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

      {compactTools ? (
        <div className="border-t border-border/30 px-3 py-2">
          <DashboardToolShortcuts quiet />
        </div>
      ) : null}
    </section>
  );
}
