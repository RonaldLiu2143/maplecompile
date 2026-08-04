"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  createPitchLog,
  loadDiary,
  saveDiary,
  todayISO,
  type DiaryState,
  type PitchDropLog,
} from "@/lib/diary";

const inputClass =
  "rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent";

type TabId = "pitch" | "grindstone" | "familiar";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
        active
          ? "bg-accent text-white dark:text-zinc-900"
          : "border border-border/60 bg-background hover:bg-surface-muted",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function CounterPanel({
  title,
  blurb,
  value,
  onChange,
}: {
  title: string;
  blurb: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border/50 bg-surface/80 p-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm opacity-65">{blurb}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Decrease"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="rounded-lg border border-border px-3 py-2 text-sm font-bold hover:bg-surface-muted"
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
          className={`${inputClass} w-28 text-center text-lg font-semibold`}
        />
        <button
          type="button"
          aria-label="Increase"
          onClick={() => onChange(value + 1)}
          className="rounded-lg border border-border px-3 py-2 text-sm font-bold hover:bg-surface-muted"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => onChange(0)}
          className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-surface-muted"
        >
          Reset
        </button>
      </div>
      <p className="text-sm opacity-70">
        Total: <span className="font-semibold text-accent">{value}</span>
      </p>
    </div>
  );
}

function PitchPanel({
  logs,
  onAdd,
  onRemove,
}: {
  logs: PitchDropLog[];
  onAdd: (log: PitchDropLog) => void;
  onRemove: (id: string) => void;
}) {
  const [date, setDate] = useState(todayISO);
  const [boss, setBoss] = useState("");
  const [item, setItem] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const b = boss.trim();
    const i = item.trim();
    if (!b || !i) return;
    onAdd(createPitchLog({ date: date || todayISO(), boss: b, item: i }));
    setBoss("");
    setItem("");
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/50 bg-surface/80 p-4">
      <div>
        <h2 className="text-lg font-semibold">Pitch boss drop log</h2>
        <p className="mt-1 text-sm opacity-65">
          Track pitch / valuable drops by date, boss, and item. Saved in this
          browser.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="grid gap-2 sm:grid-cols-[auto_1fr_1fr_auto]"
      >
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
          required
        />
        <input
          type="text"
          placeholder="Boss"
          value={boss}
          onChange={(e) => setBoss(e.target.value)}
          className={inputClass}
          required
        />
        <input
          type="text"
          placeholder="Item"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className={inputClass}
          required
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 dark:text-zinc-900"
        >
          Add
        </button>
      </form>

      {logs.length === 0 ? (
        <p className="text-sm opacity-60">No drops logged yet.</p>
      ) : (
        <ul className="divide-y divide-border/40 overflow-hidden rounded-lg border border-border/40">
          {[...logs].reverse().map((log) => (
            <li
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium opacity-55">{log.date}</span>
                <span className="mx-2 opacity-30">·</span>
                <span className="font-semibold">{log.boss}</span>
                <span className="mx-2 opacity-30">→</span>
                <span>{log.item}</span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(log.id)}
                className="rounded border border-border px-2 py-0.5 text-xs font-semibold hover:bg-surface-muted"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DiaryPage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabId>("pitch");
  const [state, setState] = useState<DiaryState>(() => ({
    pitchLogs: [],
    grindstone: 0,
    familiar: 0,
  }));

  useEffect(() => {
    setState(loadDiary());
    setReady(true);
  }, []);

  const persist = (next: DiaryState) => {
    setState(next);
    saveDiary(next);
  };

  if (!ready) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight">Diary</h1>
        <p className="text-sm opacity-60">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Diary</h1>
        <p className="mt-1 text-sm opacity-70">
          Pitch drops, grindstones, and familiars — stored locally in this
          browser.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "pitch"} onClick={() => setTab("pitch")}>
          Pitch drops
        </TabButton>
        <TabButton
          active={tab === "grindstone"}
          onClick={() => setTab("grindstone")}
        >
          Grindstone ({state.grindstone})
        </TabButton>
        <TabButton
          active={tab === "familiar"}
          onClick={() => setTab("familiar")}
        >
          Familiar ({state.familiar})
        </TabButton>
      </div>

      {tab === "pitch" ? (
        <PitchPanel
          logs={state.pitchLogs}
          onAdd={(log) =>
            persist({ ...state, pitchLogs: [...state.pitchLogs, log] })
          }
          onRemove={(id) =>
            persist({
              ...state,
              pitchLogs: state.pitchLogs.filter((l) => l.id !== id),
            })
          }
        />
      ) : null}

      {tab === "grindstone" ? (
        <CounterPanel
          title="Grindstone counter"
          blurb="Track grindstones on hand or earned this reset."
          value={state.grindstone}
          onChange={(grindstone) => persist({ ...state, grindstone })}
        />
      ) : null}

      {tab === "familiar" ? (
        <CounterPanel
          title="Familiar counter"
          blurb="Track familiars collected or badges progress."
          value={state.familiar}
          onChange={(familiar) => persist({ ...state, familiar })}
        />
      ) : null}
    </div>
  );
}
