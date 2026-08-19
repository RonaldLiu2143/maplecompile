"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  DAILY_SLOTS,
  clearAllDailies,
  dailiesProgress,
  markAllDailiesDone,
  readDailiesStore,
  toggleDailyCleared,
  type DailiesStore,
  type DailySlotId,
} from "@/lib/dailies";
import { subscribeMapleDataReload } from "@/lib/maple-events";

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
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function DashboardDailiesSection({ hydrated }: { hydrated: boolean }) {
  const [store, setStore] = useState<DailiesStore | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const reload = () => setStore(readDailiesStore());
    reload();
    return subscribeMapleDataReload(reload);
  }, [hydrated]);

  if (!hydrated || !store) {
    return (
      <section className="rounded-lg border border-border/40 bg-surface/70 p-2.5 text-xs opacity-70 sm:p-3">
        Loading dailies…
      </section>
    );
  }

  const { cleared, total } = dailiesProgress(store);
  const allDone = total > 0 && cleared >= total;
  const tone = allDone ? "good" : cleared > 0 ? "accent" : "warn";

  function toggle(id: DailySlotId) {
    setStore((prev) => (prev ? toggleDailyCleared(prev, id) : prev));
  }

  return (
    <section className="rounded-lg border border-border/40 bg-surface/70 p-2.5 sm:p-3">
      <div className="flex flex-wrap items-start justify-between gap-1.5">
        <div className="min-w-0">
          <h2 className="font-display text-sm font-bold tracking-tight sm:text-base">
            Dailies
          </h2>
          <p className="mt-0.5 text-[0.65rem] opacity-60">
            Account checklist · resets 00:00 UTC (see Daily timer above)
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <Chip tone={tone}>
            {cleared}/{total}
          </Chip>
          <Link
            href="/calc/diary"
            className="rounded-md border border-border px-2 py-1 text-[0.65rem] font-semibold transition hover:bg-surface-muted"
          >
            Diary
          </Link>
          {cleared > 0 ? (
            <button
              type="button"
              onClick={() =>
                setStore((prev) => (prev ? clearAllDailies(prev) : prev))
              }
              className="rounded-md border border-border px-2 py-1 text-[0.65rem] font-semibold transition hover:bg-surface-muted"
            >
              Reset
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setStore((prev) => (prev ? markAllDailiesDone(prev) : prev))
              }
              className="rounded-md border border-border px-2 py-1 text-[0.65rem] font-semibold transition hover:bg-surface-muted"
            >
              All done
            </button>
          )}
        </div>
      </div>

      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {DAILY_SLOTS.map((slot) => {
          const done = store.cleared[slot.id] === true;
          return (
            <li key={slot.id}>
              <button
                type="button"
                onClick={() => toggle(slot.id)}
                className={[
                  "flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition min-h-11",
                  done
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-border/45 bg-surface-muted/25 hover:border-accent/35 hover:bg-accent/5",
                ].join(" ")}
                aria-pressed={done}
              >
                <span
                  className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold",
                    done
                      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                      : "border-border/60 opacity-50",
                  ].join(" ")}
                  aria-hidden
                >
                  {done ? "✓" : ""}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={[
                      "font-semibold",
                      done ? "line-through opacity-70" : "",
                    ].join(" ")}
                  >
                    {slot.label}
                  </span>
                  {slot.hint ? (
                    <span className="ml-1 text-[0.65rem] opacity-45">
                      {slot.hint}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
