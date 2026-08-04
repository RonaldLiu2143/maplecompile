"use client";

import {
  RosterCardError,
  RosterCardSkeleton,
  RosterCharacterCard,
  type RosterDragProps,
} from "@/components/dashboard/RosterCharacterCard";
import { entryKey, isPrimary, type RosterEntry, type RosterPrimary } from "@/lib/dashboard/roster";
import type { RosterSlotState } from "@/hooks/useRoster";

export function RosterGrid({
  roster,
  primary,
  slots,
  managing,
  emptyTitle,
  emptyBody,
  makeDragProps,
  onRemove,
  onSetPrimary,
  onRetry,
}: {
  roster: RosterEntry[];
  primary: RosterPrimary | null;
  slots: Record<string, RosterSlotState>;
  managing?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  makeDragProps: (index: number) => RosterDragProps | undefined;
  onRemove: (entry: RosterEntry) => void;
  onSetPrimary: (entry: RosterEntry) => void;
  onRetry: (entry: RosterEntry) => void;
}) {
  if (roster.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-surface/70 px-5 py-10 text-center">
        <h3 className="font-display text-xl font-bold tracking-tight">
          {emptyTitle ?? "No characters yet"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm opacity-75">
          {emptyBody ??
            "Search a GMS character above, then tap Add to roster."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {roster.map((entry, index) => {
        const key = entryKey(entry);
        const slot = slots[key];
        const drag = makeDragProps(index);
        if (!slot || slot.status === "loading") {
          return (
            <RosterCardSkeleton key={key} name={entry.name} drag={drag} />
          );
        }
        if (slot.status === "error") {
          return (
            <RosterCardError
              key={key}
              name={entry.name}
              region={entry.region}
              error={slot.error}
              managing={managing}
              onRemove={() => onRemove(entry)}
              onRetry={() => onRetry(entry)}
              drag={drag}
            />
          );
        }
        return (
          <RosterCharacterCard
            key={key}
            character={slot.character}
            isPrimary={isPrimary(entry, primary)}
            managing={managing}
            onRemove={() => onRemove(entry)}
            onSetPrimary={() => onSetPrimary(entry)}
            drag={drag}
          />
        );
      })}
    </div>
  );
}
