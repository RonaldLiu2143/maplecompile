"use client";

import type { RosterDragProps } from "@/components/dashboard/RosterCharacterCard";
import {
  RosterListRow,
  type RosterWeeklyBossProgress,
} from "@/components/dashboard/RosterListRow";
import {
  entryKey,
  isPrimary,
  type RosterEntry,
  type RosterPrimary,
} from "@/lib/dashboard/roster";
import type { RosterStatusSnapshot } from "@/lib/dashboard/roster-status";
import type { RosterSlotState } from "@/hooks/useRoster";

export function RosterReorderList({
  roster,
  primary,
  slots,
  reorderable = true,
  managing = false,
  compact = false,
  weeklyByKey,
  statusByKey,
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
  /** Denser rows for dashboard embed; full /roster stays default */
  compact?: boolean;
  /** Weekly boss clears keyed by entryKey — shown inline on each row */
  weeklyByKey?: Record<string, RosterWeeklyBossProgress>;
  /** HEXA / Liberation / gear / scouter keyed by entryKey */
  statusByKey?: Record<string, RosterStatusSnapshot>;
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
      <div
        className={[
          "rounded-xl border border-dashed border-border/60 bg-surface/70 text-center",
          compact ? "px-4 py-5" : "px-5 py-8",
        ].join(" ")}
      >
        <h3
          className={[
            "font-display font-bold tracking-tight",
            compact ? "text-base" : "text-lg",
          ].join(" ")}
        >
          {emptyTitle ?? "No characters yet"}
        </h3>
        <p
          className={[
            "mx-auto max-w-md opacity-70",
            compact ? "mt-1.5 text-xs" : "mt-2 text-sm",
          ].join(" ")}
        >
          {emptyBody ??
            "Search a GMS character above, then tap Add to roster."}
        </p>
      </div>
    );
  }

  return (
    <ul className={compact ? "flex flex-col gap-1" : "flex flex-col gap-2"}>
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
            compact={compact}
            weeklyBoss={
              weeklyByKey
                ? (weeklyByKey[key] ?? { cleared: 0, enabled: 0 })
                : null
            }
            status={statusByKey ? (statusByKey[key] ?? null) : null}
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
