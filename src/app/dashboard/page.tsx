"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CharacterSearchBar } from "@/components/dashboard/CharacterSearchBar";
import { DashboardDiarySection } from "@/components/dashboard/DashboardDiarySection";
import { RosterReorderList } from "@/components/dashboard/RosterReorderList";
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
    handleMoveUp,
    handleMoveDown,
    handleRetry,
    handleRosterAdded,
    makeDragProps,
    resetDrag,
  } = useRoster();

  const [managing, setManaging] = useState(false);

  function setManageMode(next: boolean) {
    setManaging(next);
    if (!next) resetDrag();
  }

  // Legacy /dashboard?manage=1 → stay on dashboard in manage mode
  useEffect(() => {
    if (manageFromUrl) {
      setManaging(true);
      router.replace("/dashboard", { scroll: false });
    }
  }, [manageFromUrl, router]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 py-4">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent opacity-80">
          MapleCompile
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm opacity-80">
          Search characters, skim your roster, and log diary drops without
          leaving this page.
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
        <section className="rounded-xl border border-border/50 bg-surface/80 p-3 sm:p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <h2 className="font-display text-base font-bold tracking-tight">
                Roster
                {roster.length > 0 ? (
                  <span className="ml-1.5 text-xs font-semibold opacity-55">
                    ({roster.length})
                  </span>
                ) : null}
              </h2>
              {managing ? (
                <p className="text-xs opacity-60">
                  Drag rows or use ↑↓ to reorder. Tap the star to set primary.
                </p>
              ) : roster.length > 0 ? (
                <p className="text-xs opacity-60">
                  Compact list — scroll for more. Open Manage to edit.
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Link
                href="/roster"
                className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
              >
                Open roster
              </Link>
              <button
                type="button"
                onClick={() => setManageMode(!managing)}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                  managing
                    ? "border border-border hover:bg-surface-muted"
                    : "bg-accent text-white hover:opacity-90 dark:text-zinc-900",
                ].join(" ")}
              >
                {managing ? "Done" : "Manage"}
              </button>
            </div>
          </div>

          <div className="mt-2.5">
            {roster.length === 0 ? (
              <p className="text-xs opacity-70">
                No characters yet. Search a GMS character above, then tap Add to
                roster — or{" "}
                <Link
                  href="/roster"
                  className="font-semibold text-accent underline-offset-2 hover:underline"
                >
                  open Roster
                </Link>{" "}
                for the full page.
              </p>
            ) : (
              <div className="max-h-44 overflow-y-auto overscroll-contain rounded-lg border border-border/40 bg-background/30 p-1 sm:max-h-52">
                <RosterReorderList
                  roster={roster}
                  primary={primary}
                  slots={slots}
                  reorderable
                  managing={managing}
                  compact
                  makeDragProps={(index) => makeDragProps(index, true)}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onSetPrimary={managing ? handleSetPrimary : undefined}
                  onRemove={managing ? handleRemove : undefined}
                  onRetry={handleRetry}
                />
              </div>
            )}
          </div>
        </section>
      ) : null}

      {hydrated ? (
        <DashboardDiarySection
          roster={roster}
          slots={slots}
          hydrated={hydrated}
        />
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
