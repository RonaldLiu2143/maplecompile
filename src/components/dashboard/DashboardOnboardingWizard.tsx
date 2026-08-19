"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { lockActiveCharacter } from "@/lib/active-character";
import { entryKey, type RosterEntry, type RosterPrimary } from "@/lib/dashboard/roster";
import { useMapleDataReload } from "@/hooks/useMapleDataReload";
import {
  getPairing,
  hasEquipSetup,
  hasPrimaryLocked,
  hasScouterBasics,
  isGuideDismissed,
  pairScouterAndEquip,
  setGuideDismissed,
} from "@/lib/pairing";

type StepId = "find" | "main" | "scouter" | "equip" | "pair";

type StepDef = {
  id: StepId;
  n: number;
  title: string;
  kid: string;
  body: string;
};

const STEPS: StepDef[] = [
  {
    id: "find",
    n: 1,
    title: "Find your character",
    kid: "This is you",
    body: "Type your IGN in the search box below and add them to your roster.",
  },
  {
    id: "main",
    n: 2,
    title: "Set as your main",
    kid: "Your main character",
    body: "Make them primary and lock so tools always open on this character.",
  },
  {
    id: "scouter",
    n: 3,
    title: "Fill Scouter",
    kid: "Your damage numbers",
    body: "Enter character-window stats. Only main, sub, and attack are required to get started.",
  },
  {
    id: "equip",
    n: 4,
    title: "Fill Equipment",
    kid: "Your gear",
    body: "On the same Scouter page, pick gear and review set effects. Gear is included when you save a Character Stats preset.",
  },
  {
    id: "pair",
    n: 5,
    title: "Optional: pair preset",
    kid: "Active Character build",
    body: "Optional. On Scouter, pair a Character Stats preset with Active Character so switching characters recalls that build. Gallery posting does not need this.",
  },
];

type Progress = {
  find: boolean;
  main: boolean;
  scouter: boolean;
  equip: boolean;
  pair: boolean;
};

function readProgress(rosterLength: number): Progress {
  return {
    find: rosterLength > 0,
    main: hasPrimaryLocked(),
    scouter: hasScouterBasics(),
    equip: hasEquipSetup(),
    pair: getPairing() != null,
  };
}

function firstIncomplete(progress: Progress): StepId {
  for (const step of STEPS) {
    if (!progress[step.id]) return step.id;
  }
  return "pair";
}

export function DashboardOnboardingWizard({
  roster,
  primary,
  onSetPrimary,
}: {
  roster: RosterEntry[];
  primary: RosterPrimary | null;
  onSetPrimary: (entry: RosterEntry) => void;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [progress, setProgress] = useState<Progress>({
    find: false,
    main: false,
    scouter: false,
    equip: false,
    pair: false,
  });
  const [active, setActive] = useState<StepId>("find");
  const [flash, setFlash] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const next = readProgress(roster.length);
    setProgress(next);
    setDismissed(isGuideDismissed());
    setHydrated(true);
    setActive((prev) => {
      // Stay on current if still incomplete; otherwise auto-advance.
      if (!next[prev]) return prev;
      return firstIncomplete(next);
    });
  }, [roster.length]);

  useMapleDataReload(refresh);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!hydrated || dismissed) return null;

  const doneCount = STEPS.filter((s) => progress[s.id]).length;
  const allDone = doneCount === STEPS.length;
  const current = STEPS.find((s) => s.id === active) ?? STEPS[0]!;

  const showFlash = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2800);
  };

  const handleSetMainAndLock = () => {
    const target =
      (primary && roster.find((e) => entryKey(e) === entryKey(primary))) ||
      roster[0];
    if (!target) {
      showFlash("Add a character first (step 1)");
      setActive("find");
      document.getElementById("character-search")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    // Lock clears any prior sticky lock, sets primary, then sticks this char.
    lockActiveCharacter(target);
    onSetPrimary(target);
    showFlash(`Locked ${target.name} as your main`);
    refresh();
  };

  const handlePair = () => {
    if (!hasScouterBasics()) {
      showFlash("Fill main / sub / attack in Scouter first");
      setActive("scouter");
      return;
    }
    if (!hasEquipSetup()) {
      showFlash("Add at least one piece of gear first");
      setActive("equip");
      return;
    }
    pairScouterAndEquip();
    showFlash("Paired for damage calc");
    refresh();
  };

  return (
    <section
      id="get-started"
      className="scroll-mt-6 overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-elevated)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-accent/20 px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display mt-0.5 text-xl font-bold tracking-tight">
            {allDone ? "You’re set up!" : "5 easy steps"}
          </h2>
          <p className="mt-1 text-sm opacity-75">
            {allDone
              ? "Scouter stats and gear are ready. You can hide this tip."
              : `${doneCount} of ${STEPS.length} done — one step at a time.`}
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
          onClick={() => {
            setGuideDismissed(true);
            setDismissed(true);
          }}
        >
          {allDone ? "Hide tip" : "Dismiss"}
        </button>
      </div>

      <ol className="flex gap-1 overflow-x-auto px-4 py-3">
        {STEPS.map((step) => {
          const done = progress[step.id];
          const isActive = step.id === active;
          return (
            <li key={step.id} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setActive(step.id)}
                className={[
                  "flex w-full flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition",
                  isActive ? "bg-surface/90 shadow-sm" : "hover:bg-surface/50",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex size-8 items-center justify-center rounded-full text-sm font-bold",
                    done
                      ? "bg-accent text-primary-foreground"
                      : isActive
                        ? "bg-accent/20 text-accent"
                        : "bg-surface-muted opacity-70",
                  ].join(" ")}
                  aria-hidden
                >
                  {done ? "✓" : step.n}
                </span>
                <span className="hidden text-[10px] font-semibold leading-tight sm:block">
                  {step.kid}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="space-y-3 px-5 pb-5">
        <div className="rounded-xl border border-border/40 bg-surface/90 p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-lg font-bold text-primary-foreground">
              {progress[current.id] ? "✓" : current.n}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {current.kid}
              </p>
              <h3 className="font-display text-lg font-semibold">
                {current.title}
              </h3>
            </div>
          </div>
          <p className="mt-2 text-sm opacity-75">{current.body}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {current.id === "find" ? (
              <button
                type="button"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                onClick={() => {
                  document.getElementById("character-search")?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }}
              >
                {progress.find ? "Find another" : "Search IGN"}
              </button>
            ) : null}

            {current.id === "main" ? (
              <button
                type="button"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                onClick={handleSetMainAndLock}
                disabled={roster.length === 0}
              >
                {progress.main ? "Main locked ✓" : "Set main + lock"}
              </button>
            ) : null}

            {current.id === "scouter" ? (
              <Link
                href="/calc/scouter"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {progress.scouter ? "Open Scouter" : "Go fill numbers"}
              </Link>
            ) : null}

            {current.id === "equip" ? (
              <Link
                href="/calc/scouter"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {progress.equip ? "Open Scouter (gear)" : "Go fill gear"}
              </Link>
            ) : null}

            {current.id === "pair" ? (
              <button
                type="button"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                onClick={handlePair}
              >
                {progress.pair ? "Already paired ✓" : "Pair for damage calc"}
              </button>
            ) : null}
          </div>

          {flash ? (
            <p className="mt-3 text-sm font-medium text-accent">{flash}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
