"use client";

import Link from "next/link";
import { CharacterProfile } from "@/components/character/CharacterProfile";
import { characterProfileHref } from "@/lib/character/client";
import type { RosterPrimary } from "@/lib/dashboard/roster";
import type { RosterSlotState } from "@/hooks/useRoster";
import { DASHBOARD_QUICK_TOOLS } from "@/lib/tool-links";

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
      {DASHBOARD_QUICK_TOOLS.map((tool) => (
        <Link
          key={tool.href}
          href={tool.href}
          className={
            quiet
              ? "rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent-soft/40 hover:text-accent"
              : "rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 hover:bg-muted hover:text-foreground"
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
}: {
  primary: RosterPrimary | null;
  slot: RosterSlotState | undefined;
  onRetry?: () => void;
}) {
  if (!primary) {
    return (
      <section className="rounded-xl border border-border bg-surface px-4 py-5 shadow-[var(--shadow-elevated)] sm:px-5">
        <h2 className="font-display text-xl font-bold tracking-tight">
          No primary yet
        </h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Search a GMS character and add them to your roster. Star one as
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

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-elevated)]">
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
    </section>
  );
}
