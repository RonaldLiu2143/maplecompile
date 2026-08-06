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
            5 easy steps on the Dashboard
          </p>
          <p className="mt-1 text-sm opacity-75">
            Find your character → lock your main → fill damage numbers → fill
            gear → link them together.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard#get-started"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
          >
            Start here
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
