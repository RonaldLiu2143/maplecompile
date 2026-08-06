"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { RosterDragProps } from "@/components/dashboard/RosterCharacterCard";
import type { RosterWeeklyBossProgress } from "@/components/dashboard/RosterListRow";
import { RosterReorderList } from "@/components/dashboard/RosterReorderList";
import type { RosterSlotState } from "@/hooks/useRoster";
import {
  findBoss,
  getCharacterBossState,
  readBossIncomeStore,
  type BossClearSelection,
} from "@/lib/bosses";
import { entryKey, type RosterEntry, type RosterPrimary } from "@/lib/dashboard/roster";
import {
  readRosterStatusByKey,
  type RosterStatusSnapshot,
} from "@/lib/dashboard/roster-status";
import { subscribeMapleDataReload } from "@/lib/maple-events";

function weeklyProgress(selections: BossClearSelection[]): RosterWeeklyBossProgress {
  let enabled = 0;
  let cleared = 0;
  for (const sel of selections) {
    if (!sel.enabled) continue;
    const boss = findBoss(sel.bossId);
    if (!boss || boss.frequency !== "weekly") continue;
    enabled += 1;
    if (sel.cleared) cleared += 1;
  }
  return { enabled, cleared };
}

function readWeeklyByKey(
  roster: RosterEntry[],
): Record<string, RosterWeeklyBossProgress> {
  const store = readBossIncomeStore();
  const out: Record<string, RosterWeeklyBossProgress> = {};
  for (const entry of roster) {
    const key = entryKey(entry);
    const state = getCharacterBossState(store, key);
    out[key] = weeklyProgress(state.selections);
  }
  return out;
}

function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "accent";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
      : tone === "warn"
        ? "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200"
        : tone === "accent"
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border/50 bg-surface-muted/40 opacity-90";
  return (
    <span
        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

/** Combined roster list + weekly boss clears for the dashboard. */
export function DashboardRosterWeeklySection({
  roster,
  slots,
  primary,
  hydrated,
  managing,
  onManageToggle,
  makeDragProps,
  onMoveUp,
  onMoveDown,
  onSetPrimary,
  onRemove,
  onRetry,
}: {
  roster: RosterEntry[];
  slots: Record<string, RosterSlotState>;
  primary: RosterPrimary | null;
  hydrated: boolean;
  managing: boolean;
  onManageToggle: () => void;
  makeDragProps: (index: number) => RosterDragProps | undefined;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onSetPrimary: (entry: RosterEntry) => void;
  onRemove: (entry: RosterEntry) => void;
  onRetry: (entry: RosterEntry) => void;
}) {
  const [weeklyByKey, setWeeklyByKey] = useState<
    Record<string, RosterWeeklyBossProgress>
  >({});
  const [statusByKey, setStatusByKey] = useState<
    Record<string, RosterStatusSnapshot>
  >({});

  useEffect(() => {
    if (!hydrated) return;
    const reload = () => {
      setWeeklyByKey(readWeeklyByKey(roster));
      setStatusByKey(readRosterStatusByKey(roster));
    };
    reload();
    return subscribeMapleDataReload(reload);
  }, [hydrated, roster, slots]);

  const totals = useMemo(() => {
    let enabled = 0;
    let cleared = 0;
    for (const row of Object.values(weeklyByKey)) {
      enabled += row.enabled;
      cleared += row.cleared;
    }
    return { enabled, cleared };
  }, [weeklyByKey]);

  if (!hydrated) {
    return (
      <section className="flex min-h-0 flex-col rounded-lg border border-border/40 bg-surface/70 p-2.5 text-sm opacity-70">
        Loading roster…
      </section>
    );
  }

  const overallTone =
    totals.enabled === 0
      ? "neutral"
      : totals.cleared >= totals.enabled
        ? "good"
        : totals.cleared > 0
          ? "accent"
          : "warn";

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-border/40 bg-surface/70 p-3 sm:p-3.5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold tracking-tight sm:text-lg">
            Roster
            {roster.length > 0 ? (
              <span className="ml-1.5 text-xs font-semibold opacity-55">
                ({roster.length})
              </span>
            ) : null}
          </h2>
          {managing ? (
            <p className="mt-0.5 text-xs opacity-60">
              Drag rows or use ↑↓ to reorder. Tap the star to set primary.
            </p>
          ) : roster.length === 0 ? (
            <p className="mt-0.5 text-xs opacity-60">
              Add characters, then track weekly clears in Boss Income.
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {roster.length > 0 ? (
            <Chip tone={overallTone}>
              {totals.enabled > 0
                ? `${totals.cleared}/${totals.enabled}`
                : "No bosses"}
            </Chip>
          ) : null}
          <button
            type="button"
            onClick={onManageToggle}
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

      <div className="mt-2 min-h-0 flex-1">
        {roster.length === 0 ? (
          <p className="text-[0.7rem] opacity-70">
            No characters yet. Search a GMS character above, then tap Add to
            roster — or{" "}
            <Link
              href="/roster"
              className="font-semibold text-accent underline-offset-2 hover:underline"
            >
              open Roster
            </Link>{" "}
            for the full page. Configure weekly clears in{" "}
            <Link
              href="/calc/bosses"
              className="font-semibold text-accent underline-offset-2 hover:underline"
            >
              Boss Income
            </Link>
            .
          </p>
        ) : (
          <div className="maple-scroll max-h-[14rem] rounded-md border border-border/30 bg-surface-muted/20 p-1 lg:max-h-[16rem]">
            <RosterReorderList
              roster={roster}
              primary={primary}
              slots={slots}
              reorderable
              managing={managing}
              compact
              weeklyByKey={weeklyByKey}
              statusByKey={statusByKey}
              makeDragProps={(index) => makeDragProps(index)}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onSetPrimary={managing ? onSetPrimary : undefined}
              onRemove={managing ? onRemove : undefined}
              onRetry={onRetry}
            />
          </div>
        )}
      </div>
    </section>
  );
}
