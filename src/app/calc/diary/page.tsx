"use client";

import { useEffect, useState } from "react";
import {
  createDropLog,
  DIARY_DROP_GROUPS,
  DIARY_DROP_ITEMS,
  dropLogCharacterLabel,
  dropLogDateTimeLabel,
  loadDiary,
  nowTimeLocal,
  saveDiary,
  todayISO,
  type DiaryDropItem,
  type DiaryState,
  type PitchDropLog,
} from "@/lib/diary";
import { useRoster } from "@/hooks/useRoster";
import { entryKey } from "@/lib/dashboard/roster";
import type { CharacterLookupResult } from "@/lib/character/lookup";

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

type WizardChar = {
  name: string;
  region: string;
  jobName: string;
  avatar?: string | null;
};

function CharPickCard({
  char,
  onSelect,
}: {
  char: WizardChar;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-left transition hover:border-accent/50 hover:bg-surface-muted/50"
    >
      {char.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={char.avatar}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 object-contain"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface-muted text-xs font-semibold uppercase opacity-50">
          {char.name.slice(0, 2)}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold text-accent">{char.name}</p>
        <p className="truncate text-sm opacity-65">{char.jobName || "—"}</p>
      </div>
    </button>
  );
}

function ItemPickButton({
  item,
  onSelect,
}: {
  item: DiaryDropItem;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-lg border border-border/60 bg-background px-3 py-2 text-left text-sm font-semibold transition hover:border-accent/50 hover:bg-surface-muted"
    >
      {item.label}
    </button>
  );
}

function LogDropModal({
  open,
  onClose,
  characters,
  onLog,
}: {
  open: boolean;
  onClose: () => void;
  characters: WizardChar[];
  onLog: (log: PitchDropLog, bumpGrindstone: boolean) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [char, setChar] = useState<WizardChar | null>(null);
  const [item, setItem] = useState<DiaryDropItem | null>(null);
  const [date, setDate] = useState(todayISO);
  const [time, setTime] = useState(nowTimeLocal);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setChar(null);
    setItem(null);
    setDate(todayISO());
    setTime(nowTimeLocal());
    setNotes("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title =
    step === 1
      ? "Who got the drop?"
      : step === 2
        ? "What dropped?"
        : "When & notes";

  const submit = () => {
    if (!char || !item) return;
    onLog(
      createDropLog({
        date: date || todayISO(),
        time: time || undefined,
        characterName: char.name,
        characterRegion: char.region,
        characterClass: char.jobName,
        item: item.label,
        itemId: item.id,
        notes: notes.trim() || undefined,
      }),
      Boolean(item.bumpsGrindstone),
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-drop-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider opacity-55">
              Step {step} of 3
            </p>
            <h2
              id="log-drop-title"
              className="font-display text-lg font-bold tracking-tight"
            >
              {title}
            </h2>
            {char ? (
              <p className="mt-0.5 truncate text-xs opacity-60">
                {char.name}
                {item ? ` · ${item.label}` : ""}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-2 py-1 text-sm font-semibold hover:bg-surface-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {step === 1 ? (
            characters.length === 0 ? (
              <p className="text-sm opacity-65">
                Add characters to your roster first, then log a drop.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {characters.map((c) => (
                  <CharPickCard
                    key={`${c.region}:${c.name}`}
                    char={c}
                    onSelect={() => {
                      setChar(c);
                      setStep(2);
                    }}
                  />
                ))}
              </div>
            )
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              {DIARY_DROP_GROUPS.map((group) => {
                const items = DIARY_DROP_ITEMS.filter((i) => i.group === group);
                return (
                  <div key={group}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider opacity-55">
                      {group}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {items.map((it) => (
                        <ItemPickButton
                          key={it.id}
                          item={it}
                          onSelect={() => {
                            setItem(it);
                            setStep(3);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold opacity-60">Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${inputClass} w-full`}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold opacity-60">Time</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={`${inputClass} w-full`}
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-semibold opacity-60">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional — boss, party, luck, etc."
                  className={`${inputClass} w-full resize-y`}
                />
              </label>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              if (step === 1) onClose();
              else if (step === 2) {
                setItem(null);
                setStep(1);
              } else {
                setStep(2);
              }
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-muted"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <div className="flex gap-2">
            {step === 3 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!char || !item}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 dark:text-zinc-900"
                >
                  Log Drop
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function wizardCharsFromRoster(
  roster: ReturnType<typeof useRoster>["roster"],
  slots: ReturnType<typeof useRoster>["slots"],
): WizardChar[] {
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

export default function DiaryPage() {
  const { hydrated, roster, slots } = useRoster();
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

  const persist = (next: DiaryState) => {
    setState(next);
    saveDiary(next);
  };

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
