"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TRACE_BANK_CAP,
  TRACE_BOSSES,
  calculateLiberation,
  defaultTraceSelections,
  milestonesFor,
  targetFor,
  tracesFromClear,
  type LiberationType,
  type TraceSelection,
} from "@/lib/liberation";

const STORAGE_KEY = "maplecompile.liberation.v1";
const inputClass =
  "rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent";

type Persisted = {
  type: LiberationType;
  tracesHeld: number;
  milestoneTraces: number;
  useGenesisPass: boolean;
  startDate: string;
  selections: TraceSelection[];
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        type: "genesis",
        tracesHeld: 0,
        milestoneTraces: 0,
        useGenesisPass: false,
        startDate: todayISO(),
        selections: defaultTraceSelections(),
      };
    }
    const parsed = JSON.parse(raw) as Persisted;
    const defaults = defaultTraceSelections();
    const byName = new Map(
      parsed.selections?.map((s) => [s.bossName, s]) ?? [],
    );
    return {
      type: parsed.type === "destiny" ? "destiny" : "genesis",
      tracesHeld: Number(parsed.tracesHeld) || 0,
      milestoneTraces: Number(parsed.milestoneTraces) || 0,
      useGenesisPass: !!parsed.useGenesisPass,
      startDate: parsed.startDate || todayISO(),
      selections: defaults.map((d) => byName.get(d.bossName) ?? d),
    };
  } catch {
    return {
      type: "genesis",
      tracesHeld: 0,
      milestoneTraces: 0,
      useGenesisPass: false,
      startDate: todayISO(),
      selections: defaultTraceSelections(),
    };
  }
}

export default function LiberationPage() {
  const [ready, setReady] = useState(false);
  const [type, setType] = useState<LiberationType>("genesis");
  const [tracesHeld, setTracesHeld] = useState(0);
  const [milestoneTraces, setMilestoneTraces] = useState(0);
  const [useGenesisPass, setUseGenesisPass] = useState(false);
  const [startDate, setStartDate] = useState(todayISO);
  const [selections, setSelections] = useState<TraceSelection[]>(
    defaultTraceSelections,
  );

  useEffect(() => {
    const loaded = loadState();
    setType(loaded.type);
    setTracesHeld(loaded.tracesHeld);
    setMilestoneTraces(loaded.milestoneTraces);
    setUseGenesisPass(loaded.useGenesisPass);
    setStartDate(loaded.startDate);
    setSelections(loaded.selections);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          type,
          tracesHeld,
          milestoneTraces,
          useGenesisPass,
          startDate,
          selections,
        } satisfies Persisted),
      );
    } catch {
      /* ignore */
    }
  }, [
    ready,
    type,
    tracesHeld,
    milestoneTraces,
    useGenesisPass,
    startDate,
    selections,
  ]);

  const result = useMemo(
    () =>
      calculateLiberation({
        type,
        tracesHeld,
        milestoneTraces,
        useGenesisPass,
        startDate,
        selections,
      }),
    [
      type,
      tracesHeld,
      milestoneTraces,
      useGenesisPass,
      startDate,
      selections,
    ],
  );

  const milestones = milestonesFor(type);
  const target = targetFor(type);

  const patch = (bossName: string, partial: Partial<TraceSelection>) => {
    setSelections((prev) =>
      prev.map((s) => (s.bossName === bossName ? { ...s, ...partial } : s)),
    );
  };

  const pct = Math.min(100, Math.round((result.progress / target) * 100));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Liberation Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Track Genesis or Destiny liberation progress with Traces of Darkness
          from weekly bosses. Genesis Pass triples trace gains. Quest mission
          penalties and Destiny material routes beyond Kaling are stubbed.
        </p>
      </header>

      <section className="flex flex-wrap items-end gap-4 rounded-xl border border-border/40 bg-surface/80 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
            Liberation type
          </span>
          <div className="flex gap-1.5">
            {(
              [
                ["genesis", "Genesis"],
                ["destiny", "Destiny"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setType(id);
                  setMilestoneTraces(0);
                }}
                className={[
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  type === id
                    ? "bg-accent text-white dark:text-zinc-900"
                    : "border border-border/50 hover:bg-accent-soft hover:text-accent",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Quest milestone reached
          <select
            className={inputClass}
            value={milestoneTraces}
            onChange={(e) => setMilestoneTraces(Number(e.target.value))}
          >
            {milestones.map((m) => (
              <option key={m.label} value={m.requiredTraces}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Traces held (0–{TRACE_BANK_CAP})
          <input
            type="number"
            min={0}
            max={TRACE_BANK_CAP}
            className={`${inputClass} w-28`}
            value={tracesHeld}
            onChange={(e) =>
              setTracesHeld(
                Math.max(
                  0,
                  Math.min(TRACE_BANK_CAP, Number(e.target.value) || 0),
                ),
              )
            }
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Start date
          <input
            type="date"
            className={inputClass}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={useGenesisPass}
            onChange={(e) => setUseGenesisPass(e.target.checked)}
          />
          Genesis Pass (3× traces)
        </label>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Progress" value={`${result.progress.toLocaleString()} / ${target.toLocaleString()}`} />
        <Stat label="Remaining" value={result.remaining.toLocaleString()} />
        <Stat
          label="Weekly traces"
          value={result.weeklyTraces.toLocaleString()}
        />
        <Stat
          label="ETA"
          value={
            result.weeksNeeded == null
              ? "Select bosses"
              : result.weeksNeeded === 0
                ? "Done"
                : `${result.weeksNeeded} wk${result.etaISO ? ` (${result.etaISO})` : ""}`
          }
        />
      </section>

      <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs opacity-70">
        {pct}% toward {type === "destiny" ? "Destiny" : "Genesis"} target
        {result.nextMilestone
          ? ` · next mission: ${result.nextMilestone.bossName}`
          : ""}
        {result.monthlyTraces > 0
          ? ` · monthly BM traces: ${result.monthlyTraces}`
          : ""}
      </p>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">
          Weekly / monthly trace sources
        </h2>
        <p className="text-xs opacity-70">
          Trace amounts use MapleHub&apos;s table: floor(base ÷ party) × pass
          multiplier. Cap remains {TRACE_BANK_CAP} held at once.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border/40">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-surface-muted/80 text-xs uppercase tracking-wider opacity-70">
              <tr>
                <th className="px-3 py-2 font-semibold">Include</th>
                <th className="px-3 py-2 font-semibold">Boss</th>
                <th className="px-3 py-2 font-semibold">Difficulty</th>
                <th className="px-3 py-2 font-semibold">Party</th>
                <th className="px-3 py-2 font-semibold">Your traces</th>
              </tr>
            </thead>
            <tbody>
              {TRACE_BOSSES.map((boss) => {
                const sel = selections.find((s) => s.bossName === boss.name)!;
                const gained = sel.included
                  ? tracesFromClear(
                      boss.name,
                      sel.difficulty,
                      sel.partySize,
                      useGenesisPass,
                    )
                  : 0;
                return (
                  <tr
                    key={boss.name}
                    className="border-t border-border/30 odd:bg-surface/40"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={sel.included}
                        onChange={(e) =>
                          patch(boss.name, { included: e.target.checked })
                        }
                        aria-label={`Include ${boss.name}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {boss.name}
                      {boss.name === "Black Mage" ? (
                        <span className="ml-2 text-xs opacity-55">monthly</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className={inputClass}
                        value={sel.difficulty}
                        onChange={(e) =>
                          patch(boss.name, { difficulty: e.target.value })
                        }
                      >
                        {boss.difficulties.map((d) => (
                          <option key={d.label} value={d.label}>
                            {d.label} ({d.baseTraces})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        max={6}
                        className={`${inputClass} w-16`}
                        value={sel.partySize}
                        onChange={(e) =>
                          patch(boss.name, {
                            partySize: Math.max(
                              1,
                              Math.min(6, Number(e.target.value) || 1),
                            ),
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {sel.included ? gained.toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border/40 bg-surface/80 p-4">
        <h2 className="font-display text-lg font-semibold">Milestones</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {milestones.map((m) => {
            const done = milestoneTraces >= m.requiredTraces;
            return (
              <li
                key={m.label}
                className={[
                  "flex items-center justify-between rounded-lg border border-border/30 px-3 py-2",
                  done ? "bg-accent-soft/40" : "opacity-70",
                ].join(" ")}
              >
                <span>{m.label}</span>
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {done ? "Reached" : "Locked"}
                </span>
              </li>
            );
          })}
          <li className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2">
            <span>
              Target — {target.toLocaleString()} (
              {type === "destiny" ? "Destiny" : "Genesis"})
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider">
              {result.remaining <= 0 ? "Complete" : "In progress"}
            </span>
          </li>
        </ul>
      </section>

      <p className="text-xs opacity-60">
        Trace table and milestones aligned with MapleHub&apos;s liberation
        calculator. Mission fight conditions (FD penalties, consumable limits)
        are not simulated here.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold tabular-nums sm:text-xl">
        {value}
      </p>
    </div>
  );
}
