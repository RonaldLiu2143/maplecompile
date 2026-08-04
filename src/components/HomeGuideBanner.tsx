"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isGuideDismissed, setGuideDismissed } from "@/lib/pairing";

export function HomeGuideBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!isGuideDismissed());
  }, []);

  if (!show) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-accent/40 bg-accent-soft/30 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            New here?
          </p>
          <p className="mt-1 font-display text-lg font-semibold">
            Start with Scouter → Equipment → Pair → Planner
          </p>
          <p className="mt-1 text-sm opacity-75">
            A four-step guide walks you through stats, gear, pairing, and FD%
            upgrade rankings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/guide"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
          >
            Open start guide
          </Link>
          <button
            type="button"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-surface-muted"
            onClick={() => {
              setGuideDismissed(true);
              setShow(false);
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
