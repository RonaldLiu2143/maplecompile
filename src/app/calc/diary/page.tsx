"use client";

import { useState } from "react";
import { LogDropModal } from "@/components/diary/LogDropModal";
import { useDiary } from "@/hooks/useDiary";
import { useRoster } from "@/hooks/useRoster";
import {
  dropLogCharacterLabel,
  dropLogDateTimeLabel,
  wizardCharsFromRoster,
  type PitchDropLog,
} from "@/lib/diary";

const inputClass =
  "rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent";

function CounterCard({
  title,
  value,
  onChange,
}: {
  title: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-surface/80 p-3 sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-wider opacity-55">
        {title}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${title}`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="rounded-lg border border-border px-2.5 py-1.5 text-sm font-bold hover:bg-surface-muted"
        >
          −
        </button>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) =>
            onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))
          }
          className={`${inputClass} w-20 text-center text-lg font-semibold tabular-nums`}
        />
        <button
          type="button"
          aria-label={`Increase ${title}`}
          onClick={() => onChange(value + 1)}
          className="rounded-lg border border-border px-2.5 py-1.5 text-sm font-bold hover:bg-surface-muted"
        >
          +
        </button>
      </div>
    </div>
  );
}

function DropHistoryList({
  logs,
  onRemove,
}: {
  logs: PitchDropLog[];
  onRemove: (id: string) => void;
}) {
  if (logs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/50 bg-surface/50 px-4 py-8 text-center text-sm opacity-60">
        No drops logged yet. Tap + Log Drop to add one.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/40 bg-surface/80">
      {[...logs].reverse().map((log) => (
        <li
          key={log.id}
          className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-sm sm:px-4"
        >
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold">{log.item}</p>
            <p className="opacity-70">
              <span className="font-medium text-accent">
                {dropLogCharacterLabel(log)}
              </span>
              {log.characterClass ? (
                <>
                  <span className="mx-1.5 opacity-30">·</span>
                  <span>{log.characterClass}</span>
                </>
              ) : null}
            </p>
            <p className="text-xs opacity-55">
              {dropLogDateTimeLabel(log)}
              {log.notes ? (
                <>
                  <span className="mx-1.5 opacity-30">·</span>
                  <span>{log.notes}</span>
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(log.id)}
            className="shrink-0 rounded border border-border px-2 py-0.5 text-xs font-semibold hover:bg-surface-muted"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function DiaryPage() {
  const { hydrated, roster, slots } = useRoster();
  const { ready, state, persist } = useDiary();
  const [logOpen, setLogOpen] = useState(false);

  const characters =
    hydrated && ready ? wizardCharsFromRoster(roster, slots) : [];

  if (!ready) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight">Diary</h1>
        <p className="text-sm opacity-60">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Diary</h1>
        <p className="mt-1 text-sm opacity-70">
          Track grindstones, familiars, and drop history — stored locally in
          this browser.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CounterCard
          title="Grindstones"
          value={state.grindstone}
          onChange={(grindstone) => persist({ ...state, grindstone })}
        />
        <CounterCard
          title="Familiars"
          value={state.familiar}
          onChange={(familiar) => persist({ ...state, familiar })}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold tracking-tight">
            Drop History
          </h2>
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 dark:text-zinc-900"
          >
            + Log Drop
          </button>
        </div>

        <DropHistoryList
          logs={state.pitchLogs}
          onRemove={(id) =>
            persist({
              ...state,
              pitchLogs: state.pitchLogs.filter((l) => l.id !== id),
            })
          }
        />
      </section>

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
    </div>
  );
}
