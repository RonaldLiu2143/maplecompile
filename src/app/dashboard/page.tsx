"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CharacterSearchBar } from "@/components/dashboard/CharacterSearchBar";
import { RosterGrid } from "@/components/dashboard/RosterGrid";
import { useRoster } from "@/hooks/useRoster";

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const manageFromUrl = searchParams.get("manage") === "1";

  const {
    hydrated,
    roster,
    primary,
    slots,
    handleRemove,
    handleSetPrimary,
    handleRetry,
    handleRosterAdded,
    makeDragProps,
  } = useRoster();

  // Legacy /dashboard?manage=1 → dedicated roster page
  useEffect(() => {
    if (manageFromUrl) {
      router.replace("/roster");
    }
  }, [manageFromUrl, router]);

  const overviewLimit = 4;
  const overviewRoster = roster.slice(0, overviewLimit);
  const hasMore = roster.length > overviewLimit;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-4">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent opacity-80">
          MapleCompile
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm opacity-80">
          Search characters and preview your roster. Full manage (reorder,
          primary, remove) lives on the Roster page.
        </p>
      </header>

      {hydrated ? (
        <CharacterSearchBar roster={roster} onAdded={handleRosterAdded} />
      ) : (
        <div className="rounded-2xl border border-border/50 bg-surface/80 px-4 py-8 text-center text-sm opacity-70">
          Loading…
        </div>
      )}

      {hydrated ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className="font-display text-lg font-bold tracking-tight">
                Roster overview ({roster.length})
              </h2>
              {roster.length > 0 ? (
                <p className="text-xs opacity-55">
                  Showing {overviewRoster.length}
                  {hasMore ? ` of ${roster.length}` : ""} — open Roster to
                  manage.
                </p>
              ) : null}
            </div>
            <Link
              href="/roster"
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
            >
              Open roster
            </Link>
          </div>

          <RosterGrid
            roster={overviewRoster}
            primary={primary}
            slots={slots}
            managing={false}
            emptyTitle="No characters yet"
            emptyBody="Search a GMS character above, then tap Add to roster — or open Roster to manage your list."
            makeDragProps={(index) => makeDragProps(index, false)}
            onRemove={handleRemove}
            onSetPrimary={handleSetPrimary}
            onRetry={handleRetry}
          />

          {hasMore ? (
            <p className="text-center text-sm opacity-70">
              <Link
                href="/roster"
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                View all {roster.length} on Roster →
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl py-16 text-center text-sm opacity-70">
          Loading…
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
