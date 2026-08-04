"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PairingBar } from "@/components/PairingBar";
import {
  formatPairingLabel,
  getPairing,
  hasEquipSetup,
  hasScouterStats,
  isGuideDismissed,
  setGuideDismissed,
  type ScouterEquipPairing,
} from "@/lib/pairing";

const STEPS = [
  {
    n: 1,
    title: "Enter character stats in Scouter",
    body: "Open Scouter and fill in your character window stats (or load a saved preset). This is the baseline for FD% calculations.",
    href: "/calc/scouter",
    cta: "Open Scouter",
    doneKey: "scouter" as const,
  },
  {
    n: 2,
    title: "Build your gear in Equipment Setup",
    body: "Pick a class, fill the equip window (or apply a starter loadout), and set Star Force, flames, and potential on each piece.",
    href: "/calc/equips/setup",
    cta: "Open Equipment Setup",
    doneKey: "equip" as const,
  },
  {
    n: 3,
    title: "Pair Scouter ↔ Equipment",
    body: "Use Pair on Scouter, Equipment Setup, or below. Planner only ranks upgrades once these two are linked.",
    href: "#pair",
    cta: "Jump to Pair",
    doneKey: "pair" as const,
  },
  {
    n: 4,
    title: "Open Planner for FD% / meso rankings",
    body: "With a pairing active, Upgrade Planner ranks Star Force, flame, and cube upgrades by scouter FD% per meso for your character.",
    href: "/calc/planner",
    cta: "Open Planner",
    doneKey: "planner" as const,
  },
];

export default function GuidePage() {
  const [pairing, setPairing] = useState<ScouterEquipPairing | null>(null);
  const [scouterReady, setScouterReady] = useState(false);
  const [equipReady, setEquipReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPairing(getPairing());
    setScouterReady(hasScouterStats());
    setEquipReady(hasEquipSetup());
    setDismissed(isGuideDismissed());
    setHydrated(true);
  }, []);

  const stepDone = (key: (typeof STEPS)[number]["doneKey"]) => {
    if (key === "scouter") return scouterReady;
    if (key === "equip") return equipReady;
    if (key === "pair") return pairing != null;
    return pairing != null;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Getting started
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Start guide
        </h1>
        <p className="max-w-2xl text-base opacity-80">
          MapleCompile works best as a short loop: enter scouter stats, build
          your equipment grid, pair them, then let Planner rank upgrades by
          FD% for that character.
        </p>
        {hydrated ? (
          <div className="flex flex-wrap gap-2">
            {dismissed ? (
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
                onClick={() => {
                  setGuideDismissed(false);
                  setDismissed(false);
                }}
              >
                Show home tip again
              </button>
            ) : (
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
                onClick={() => {
                  setGuideDismissed(true);
                  setDismissed(true);
                }}
              >
                Dismiss home tip
              </button>
            )}
            <Link
              href="/"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
            >
              Back home
            </Link>
          </div>
        ) : null}
      </header>

      <ol className="space-y-4">
        {STEPS.map((step) => {
          const done = hydrated && stepDone(step.doneKey);
          return (
            <li
              key={step.n}
              className="rounded-xl border border-border/50 bg-surface/90 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-bold text-white dark:text-zinc-900">
                      {step.n}
                    </span>
                    <h2 className="font-display text-lg font-semibold">
                      {step.title}
                    </h2>
                    {done ? (
                      <span className="rounded-full bg-accent-soft/50 px-2 py-0.5 text-[11px] font-semibold text-accent">
                        Done
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm opacity-75">{step.body}</p>
                </div>
                {step.href.startsWith("#") ? (
                  <a
                    href={step.href}
                    className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-muted"
                  >
                    {step.cta}
                  </a>
                ) : (
                  <Link
                    href={step.href}
                    className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
                  >
                    {step.cta}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <section id="pair" className="scroll-mt-6 space-y-3">
        <h2 className="font-display text-xl font-semibold">Pair now</h2>
        <PairingBar
          onChange={(next) => {
            setPairing(next);
            setScouterReady(hasScouterStats());
            setEquipReady(hasEquipSetup());
          }}
        />
        {pairing ? (
          <p className="text-sm opacity-70">{formatPairingLabel(pairing)}</p>
        ) : (
          <p className="text-sm opacity-70">
            Need both a saved scouter draft and at least one equipped piece
            before pairing.
          </p>
        )}
      </section>
    </div>
  );
}
