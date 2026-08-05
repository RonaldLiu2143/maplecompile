"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { RosterSlotState } from "@/hooks/useRoster";
import {
  findBoss,
  formatMesosCompact,
  formatResetCountdown,
  getCharacterBossState,
  readBossIncomeStore,
  summarizeIncome,
  worldTypeFromCharacter,
  type BossClearSelection,
} from "@/lib/bosses";
import { entryKey, type RosterEntry, type RosterPrimary } from "@/lib/dashboard/roster";
import { subscribeMapleDataReload } from "@/lib/maple-events";

type CharWeekRow = {
  key: string;
  name: string;
  avatar: string | null;
  enabled: number;
  cleared: number;
  mesos: number;
  isPrimary: boolean;
};

function weeklyProgress(selections: BossClearSelection[]) {
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

function readRows(
  roster: RosterEntry[],
  slots: Record<string, RosterSlotState>,
  primary: RosterPrimary | null,
): CharWeekRow[] {
  const store = readBossIncomeStore();
  const primaryKey = primary ? entryKey(primary) : null;
  return roster.map((entry) => {
    const key = entryKey(entry);
    const slot = slots[key];
    const character = slot?.status === "ready" ? slot.character : null;
    const state = getCharacterBossState(store, key);
    const progress = weeklyProgress(state.selections);
    const world = worldTypeFromCharacter(character);
    const summary = summarizeIncome(state.selections, world);
    return {
      key,
      name: character?.name ?? entry.name,
      avatar: character?.characterImgURL ?? null,
      enabled: progress.enabled,
      cleared: progress.cleared,
      mesos: summary.weeklyMesos,
      isPrimary: primaryKey === key,
    };
  });
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
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[0.7rem] font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function DashboardWeeklyChecklist({
  roster,
  slots,
  primary,
  hydrated,
}: {
  roster: RosterEntry[];
  slots: Record<string, RosterSlotState>;
  primary: RosterPrimary | null;
  hydrated: boolean;
}) {
  const [rows, setRows] = useState<CharWeekRow[]>([]);
  const [countdown, setCountdown] = useState(() => formatResetCountdown());

  useEffect(() => {
    if (!hydrated) return;
    const reload = () => setRows(readRows(roster, slots, primary));
    reload();
    return subscribeMapleDataReload(reload);
  }, [hydrated, roster, slots, primary]);

  useEffect(() => {
    const tick = () => setCountdown(formatResetCountdown());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const totals = useMemo(() => {
    let enabled = 0;
    let cleared = 0;
    let withBosses = 0;
    for (const row of rows) {
      if (row.enabled > 0) withBosses += 1;
      enabled += row.enabled;
      cleared += row.cleared;
    }
    return { enabled, cleared, withBosses };
  }, [rows]);

  if (!hydrated) {
    return (
      <section className="flex min-h-0 flex-col rounded-xl border border-border/50 bg-surface/80 p-3 sm:p-3.5 text-sm opacity-70">
        Loading weekly checklist…
      </section>
    );
  }

  if (roster.length === 0) {
    return (
      <section className="flex min-h-0 flex-col rounded-xl border border-dashed border-border/60 bg-surface/60 p-3 sm:p-3.5">
        <h2 className="font-display text-base font-bold tracking-tight">
          Weekly bosses
        </h2>
        <p className="mt-1 text-xs opacity-70">
          Add roster characters, then configure clears in Boss Income. Resets
          Thursday 00:00 UTC.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/calc/bosses"
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
          >
            Boss Income
          </Link>
        </div>
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
    <section className="flex min-h-0 flex-col rounded-xl border border-border/50 bg-surface/80 p-3 sm:p-3.5">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h2 className="font-display text-base font-bold tracking-tight">
            Weekly bosses
          </h2>
          <p className="text-xs opacity-60">{countdown.label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone={overallTone}>
            {totals.enabled > 0
              ? `${totals.cleared}/${totals.enabled}`
              : "None set"}
          </Chip>
          <Link
            href="/calc/bosses"
            className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
          >
            Open tracker
          </Link>
        </div>
      </div>

      <div className="mt-2.5 min-h-0 flex-1">
        {totals.withBosses === 0 ? (
          <p className="rounded-lg border border-dashed border-border/50 px-3 py-4 text-center text-xs opacity-65">
            No weekly bosses enabled yet.{" "}
            <Link
              href="/calc/bosses"
              className="font-semibold text-accent hover:underline"
            >
              Add bosses
            </Link>{" "}
            on each character to track clears here.
          </p>
        ) : (
          <ul className="maple-scroll max-h-[22rem] space-y-1 rounded-lg border border-border/35 bg-surface-muted/25 p-1.5 lg:max-h-[26rem]">
            {rows.map((row) => {
              if (row.enabled === 0) return null;
              const done = row.cleared >= row.enabled;
              const tone = done
                ? "good"
                : row.cleared > 0
                  ? "accent"
                  : "warn";
              return (
                <li
                  key={row.key}
                  className={[
                    "flex items-center gap-1.5 rounded-md border px-1.5 py-1",
                    row.isPrimary
                      ? "border-accent/40 bg-accent-soft/25"
                      : "border-border/40 bg-background/40",
                  ].join(" ")}
                >
                  {row.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.avatar}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 shrink-0 object-contain"
                    />
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-surface-muted text-[10px] font-bold uppercase opacity-50">
                      {row.name.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">
                      {row.name}
                      {row.isPrimary ? (
                        <span className="ml-1 text-[10px] font-semibold text-accent">
                          ★
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[10px] opacity-55">
                      {row.mesos > 0
                        ? formatMesosCompact(row.mesos)
                        : "No crystal value"}
                    </p>
                  </div>
                  <Chip tone={tone}>
                    {row.cleared}/{row.enabled}
                  </Chip>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-2 shrink-0 text-[10px] opacity-50">
        Clears reset Thursday 00:00 UTC.
      </p>
    </section>
  );
}
