"use client";

import { CharacterSearchBar } from "@/components/dashboard/CharacterSearchBar";
import { RosterGrid } from "@/components/dashboard/RosterGrid";
import { useRoster } from "@/hooks/useRoster";

export default function RosterPage() {
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-4">
      <header className="min-w-0 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent opacity-80">
          MapleCompile
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Roster
        </h1>
        <p className="mt-2 text-sm opacity-80">
          Tap a card to open the character profile, drag it to reorder. Use the
          star to set primary and the trash to remove.
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
          <div className="min-w-0 space-y-1">
            <h2 className="font-display text-lg font-bold tracking-tight">
              Characters
              {roster.length > 0 ? (
                <span className="ml-2 text-sm font-semibold opacity-55">
                  ({roster.length})
                </span>
              ) : null}
            </h2>
            {roster.length > 0 ? (
              <p className="text-xs opacity-55">
                Tip: drag a card to reorder, star = primary, trash = remove.
              </p>
            ) : null}
          </div>

          <RosterGrid
            roster={roster}
            primary={primary}
            slots={slots}
            managing={false}
            makeDragProps={(index) => makeDragProps(index, true)}
            onRemove={handleRemove}
            onSetPrimary={handleSetPrimary}
            onRetry={handleRetry}
          />
        </section>
      ) : null}
    </div>
  );
}
