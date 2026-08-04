"use client";

import type { RosterDragProps } from "@/components/dashboard/RosterCharacterCard";
import { RosterListRow } from "@/components/dashboard/RosterListRow";
import {
  entryKey,
  isPrimary,
  type RosterEntry,
  type RosterPrimary,
} from "@/lib/dashboard/roster";
import type { RosterSlotState } from "@/hooks/useRoster";

export function RosterReorderList({
  roster,
  primary,
  slots,
  reorderable = true,
  managing = false,
  emptyTitle,
  emptyBody,
  makeDragProps,
  onMoveUp,
  onMoveDown,
  onSetPrimary,
  onRemove,
  onRetry,
}: {
  roster: RosterEntry[];
  primary: RosterPrimary | null;
  slots: Record<string, RosterSlotState>;
  reorderable?: boolean;
  managing?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  makeDragProps?: (index: number) => RosterDragProps | undefined;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onSetPrimary?: (entry: RosterEntry) => void;
  onRemove?: (entry: RosterEntry) => void;
  onRetry?: (entry: RosterEntry) => void;
}) {
  if (roster.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-surface/70 px-5 py-8 text-center">
        <h3 className="font-display text-lg font-bold tracking-tight">
          {emptyTitle ?? "No characters yet"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm opacity-70">
          {emptyBody ??
            "Search a GMS character above, then tap Add to roster."}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {roster.map((entry, index) => {
        const key = entryKey(entry);
        const slot = slots[key];
        const loading = !slot || slot.status === "loading";
        const error = slot?.status === "error" ? slot.error : null;
        const character = slot?.status === "ready" ? slot.character : null;

        return (
          <RosterListRow
            key={key}
            entry={entry}
            index={index}
            total={roster.length}
            character={character}
            loading={loading}
            error={error}
            isPrimary={isPrimary(entry, primary)}
            reorderable={reorderable}
            managing={managing}
            drag={makeDragProps?.(index)}
            onMoveUp={() => onMoveUp(index)}
            onMoveDown={() => onMoveDown(index)}
            onSetPrimary={
              onSetPrimary ? () => onSetPrimary(entry) : undefined
            }
            onRemove={onRemove ? () => onRemove(entry) : undefined}
            onRetry={onRetry ? () => onRetry(entry) : undefined}
          />
        );
      })}
    </ul>
  );
}
