"use client";

/** Genesis / Destiny liberated chips — colors match Liberation page (G emerald / D amber). */

import type { LiberationTagFlags } from "@/lib/dashboard/roster-status";

export type { LiberationTagFlags };

const GENESIS_CLASS =
  "border-emerald-700/40 bg-emerald-700/15 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300";
const DESTINY_CLASS =
  "border-amber-600/45 bg-amber-600/15 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200";

export function LiberationStatusTags({
  genesis,
  destiny,
  compact,
}: LiberationTagFlags & {
  /** Slightly smaller chips for dense roster rows / Primary. */
  compact?: boolean;
}) {
  if (!genesis && !destiny) return null;

  const size = compact
    ? "px-1.5 py-px text-[0.65rem]"
    : "px-2 py-0.5 text-[0.7rem]";

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {genesis ? (
        <span
          className={`inline-flex items-center rounded-md border font-semibold ${size} ${GENESIS_CLASS}`}
          title="Genesis weapon liberated"
        >
          Genesis
        </span>
      ) : null}
      {destiny ? (
        <span
          className={`inline-flex items-center rounded-md border font-semibold ${size} ${DESTINY_CLASS}`}
          title="Destiny weapon liberated"
        >
          Destiny
        </span>
      ) : null}
    </span>
  );
}
