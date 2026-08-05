"use client";

import Link from "next/link";
import { useState } from "react";
import { CharacterSearchBar } from "@/components/dashboard/CharacterSearchBar";
import { RosterGrid } from "@/components/dashboard/RosterGrid";
import { RosterReorderList } from "@/components/dashboard/RosterReorderList";
import { useRoster } from "@/hooks/useRoster";

export default function RosterPage() {
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent opacity-80">
            MapleCompile
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Roster
          </h1>
          <p className="mt-2 text-sm opacity-80">
            Tap a card to open the character profile. Use Manage to reorder, set
            primary, or remove.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-semibold transition hover:bg-surface-muted"
          aria-label="Back to dashboard"
          title="Close"
        >
          ✕
        </Link>
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
                {managing ? "Reorder Characters" : "Characters"}
                {roster.length > 0 ? (
                  <span className="ml-2 text-sm font-semibold opacity-55">
                    ({roster.length})
                  </span>
                ) : null}
              </h2>
              {managing ? (
                <p className="text-sm opacity-60">
                  Drag rows or use ↑↓ to reorder. Tap the star to set primary.
                </p>
              ) : roster.length > 0 ? (
                <p className="text-xs opacity-55">
                  Tip: open Manage to reorder, set primary, or remove.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setManageMode(!managing)}
              className={[
                "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition",
                managing
                  ? "border border-border hover:bg-surface-muted"
                  : "bg-accent text-white hover:opacity-90 dark:text-zinc-900",
              ].join(" ")}
            >
              {managing ? "Done" : "Manage"}
            </button>
          </div>

          {managing ? (
            <RosterReorderList
              roster={roster}
              primary={primary}
              slots={slots}
              reorderable
              managing
              makeDragProps={(index) => makeDragProps(index, true)}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onSetPrimary={handleSetPrimary}
              onRemove={handleRemove}
              onRetry={handleRetry}
            />
          ) : (
            <RosterGrid
              roster={roster}
              primary={primary}
              slots={slots}
              managing={false}
              makeDragProps={(index) => makeDragProps(index, false)}
              onRemove={handleRemove}
              onSetPrimary={handleSetPrimary}
              onRetry={handleRetry}
            />
          )}
        </section>
      ) : null}
    </div>
  );
}
