"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LogDropModal,
  type DiaryWizardChar,
} from "@/components/diary/LogDropModal";
import type { CharacterLookupResult } from "@/lib/character/lookup";
import {
  DIARY_KEY,
  dropLogCharacterLabel,
  dropLogDateTimeLabel,
  loadDiary,
  saveDiary,
  type DiaryState,
  type PitchDropLog,
} from "@/lib/diary";
import { entryKey, type RosterEntry } from "@/lib/dashboard/roster";
import type { RosterSlotState } from "@/hooks/useRoster";

function CompactCounter({
  title,
  value,
  onBump,
  onDrop,
}: {
  title: string;
  value: number;
  onBump: () => void;
  onDrop: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/45 bg-surface-muted/30 px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider opacity-55">
          {title}
        </p>
        <p className="font-mono text-lg font-bold tabular-nums leading-tight">
          {value}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          aria-label={`Decrease ${title}`}
          onClick={onDrop}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm font-bold transition hover:bg-surface-muted"
        >
          −
        </button>
        <button
          type="button"
          aria-label={`Increase ${title}`}
          onClick={onBump}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-accent/40 bg-accent/10 text-sm font-bold text-accent transition hover:bg-accent/20"
        >
          +
        </button>
      </div>
    </div>
  );
}

function wizardCharsFromRoster(
  roster: RosterEntry[],
  slots: Record<string, RosterSlotState>,
): DiaryWizardChar[] {
  return roster.map((entry) => {
    const slot = slots[entryKey(entry)];
    const character: CharacterLookupResult | null =
      slot?.status === "ready" ? slot.character : null;
    return {
      name: character?.name ?? entry.name,
      region: entry.region,
      jobName: character?.jobName ?? "…",
      avatar: character?.characterImgURL,
    };
  });
}

export function DashboardDiarySection({
  roster,
  slots,
  hydrated,
}: {
  roster: RosterEntry[];
  slots: Record<string, RosterSlotState>;
  hydrated: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<DiaryState>(() => ({
    pitchLogs: [],
    grindstone: 0,
    familiar: 0,
  }));
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    setState(loadDiary());
    setReady(true);
  }, []);

  // Stay in sync if the dedicated Diary page updates localStorage.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === DIARY_KEY) {
        setState(loadDiary());
      }
    }
    function onFocus() {
      setState(loadDiary());
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  function persist(next: DiaryState) {
    setState(next);
    saveDiary(next);
  }

  const characters =
    hydrated && ready ? wizardCharsFromRoster(roster, slots) : [];
  const recent = [...state.pitchLogs].reverse();

  if (!ready) {
    return (
      <section className="flex min-h-0 flex-col rounded-xl border border-border/50 bg-surface/80 p-3 sm:p-3.5">
        <p className="text-xs opacity-60">Loading diary…</p>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-border/50 bg-surface/80 p-3 sm:p-3.5">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h2 className="font-display text-base font-bold tracking-tight">
            Diary
          </h2>
          <p className="text-xs opacity-60">
            Quick +/− for counters, or log a drop in a few taps.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Link
            href="/calc/diary"
            className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
          >
            Open diary
          </Link>
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
          >
            + Log Drop
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex shrink-0 flex-col gap-2 sm:flex-row">
        <CompactCounter
          title="Grindstones"
          value={state.grindstone}
          onBump={() =>
            persist({ ...state, grindstone: state.grindstone + 1 })
          }
          onDrop={() =>
            persist({
              ...state,
              grindstone: Math.max(0, state.grindstone - 1),
            })
          }
        />
        <CompactCounter
          title="Familiars"
          value={state.familiar}
          onBump={() => persist({ ...state, familiar: state.familiar + 1 })}
          onDrop={() =>
            persist({
              ...state,
              familiar: Math.max(0, state.familiar - 1),
            })
          }
        />
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <p className="mb-1.5 shrink-0 text-[0.65rem] font-semibold uppercase tracking-wider opacity-55">
          Recent drops
          {recent.length > 0 ? (
            <span className="ml-1 opacity-70">({recent.length})</span>
          ) : null}
        </p>
        {recent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/45 bg-surface-muted/20 px-3 py-4 text-center text-xs opacity-60">
            No drops yet — tap + Log Drop to add one.
          </p>
        ) : (
          <ul className="maple-scroll max-h-[14rem] divide-y divide-border/35 rounded-lg border border-border/35 bg-surface-muted/25 lg:max-h-[18rem]">
            {recent.map((log: PitchDropLog) => (
              <li
                key={log.id}
                className="flex items-start justify-between gap-2 px-2.5 py-1.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{log.item}</p>
                  <p className="truncate opacity-60">
                    {dropLogCharacterLabel(log)}
                    <span className="mx-1 opacity-30">·</span>
                    {dropLogDateTimeLabel(log)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    persist({
                      ...state,
                      pitchLogs: state.pitchLogs.filter((l) => l.id !== log.id),
                    })
                  }
                  className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[0.65rem] font-semibold opacity-70 hover:bg-surface-muted hover:opacity-100"
                  title="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <LogDropModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        characters={characters}
        onLog={(log, bumpGrindstone) =>
          persist({
            ...state,
            pitchLogs: [...state.pitchLogs, log],
            grindstone: bumpGrindstone
              ? state.grindstone + 1
              : state.grindstone,
          })
        }
      />
    </section>
  );
}
