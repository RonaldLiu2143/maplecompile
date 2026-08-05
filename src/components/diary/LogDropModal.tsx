"use client";

import { useEffect, useState } from "react";
import {
  createDropLog,
  DIARY_DROP_GROUPS,
  DIARY_DROP_ITEMS,
  todayISO,
  nowTimeLocal,
  type DiaryDropItem,
  type PitchDropLog,
} from "@/lib/diary";

const inputClass =
  "rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent";

export type DiaryWizardChar = {
  name: string;
  region: string;
  jobName: string;
  avatar?: string | null;
};

function CharPickCard({
  char,
  onSelect,
}: {
  char: DiaryWizardChar;
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

export function LogDropModal({
  open,
  onClose,
  characters,
  onLog,
}: {
  open: boolean;
  onClose: () => void;
  characters: DiaryWizardChar[];
  onLog: (log: PitchDropLog, bumpGrindstone: boolean) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [char, setChar] = useState<DiaryWizardChar | null>(null);
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

        <div className="maple-scroll min-h-0 flex-1 px-4 py-3">
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
