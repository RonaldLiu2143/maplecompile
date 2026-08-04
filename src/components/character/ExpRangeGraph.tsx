"use client";

import { useState } from "react";
import { formatCompact } from "@/lib/character/exp";
import type {
  MapleHubExpAverages,
  MapleHubGraphData,
} from "@/lib/character/maplehub";

export type ExpRangeDays = 7 | 14 | 30 | 90;

const RANGES: ExpRangeDays[] = [7, 14, 30, 90];

function avgForRange(
  averages: MapleHubExpAverages | null | undefined,
  days: ExpRangeDays,
): string | null {
  if (!averages) return null;
  const raw =
    days === 7
      ? averages.avg7d
      : days === 14
        ? averages.avg14d
        : days === 30
          ? averages.avg30d
          : averages.avg90d;
  if (!raw || !raw.trim()) return null;
  const v = raw.trim();
  return v.endsWith("/day") ? v : `${v}/day`;
}

/** How many x-axis ticks to aim for (first + last always included when thinning). */
function axisStep(count: number, compact: boolean): number {
  if (count <= 7) return 1;
  if (count <= 14) return compact ? 2 : 1;
  if (count <= 30) return compact ? 5 : 4;
  return compact ? 15 : 10;
}

function shouldShowAxisLabel(i: number, count: number, step: number): boolean {
  if (count <= 1) return true;
  if (i === 0 || i === count - 1) return true;
  return i % step === 0 && i !== count - 1;
}

function SparkBars({
  values,
  labels,
  compact,
}: {
  values: number[];
  labels?: string[];
  compact?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!values.length) return null;

  const max = Math.max(...values, 1);
  const tipIdx = hover;
  const tipLabel =
    tipIdx != null
      ? (labels?.[tipIdx] ?? `Day ${tipIdx + 1}`)
      : null;
  const tipExp = tipIdx != null ? formatCompact(values[tipIdx] ?? 0) : null;
  const n = values.length;
  const step = axisStep(n, Boolean(compact));
  const hasAxis = Boolean(labels?.length);

  return (
    <div className="relative">
      {tipIdx != null && tipLabel != null && tipExp != null ? (
        <div
          className="pointer-events-none absolute bottom-full z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-center shadow-sm"
          style={{
            left: `${((tipIdx + 0.5) / n) * 100}%`,
          }}
          role="tooltip"
        >
          <p className="text-[0.65rem] font-semibold opacity-65">{tipLabel}</p>
          <p className="font-mono text-xs font-bold tabular-nums">{tipExp}</p>
        </div>
      ) : null}

      <div
        className={`flex items-end gap-px ${compact ? "h-14" : "h-20"}`}
        role="img"
        aria-label="Daily EXP gained"
      >
        {values.map((v, i) => {
          const h = Math.max(v > 0 ? 4 : 2, Math.round((v / max) * 100));
          const active = hover === i;
          return (
            <div
              key={i}
              className={`min-w-0 flex-1 cursor-default rounded-sm transition-colors ${
                active ? "bg-accent" : "bg-accent/65 hover:bg-accent/90"
              }`}
              style={{ height: `${h}%` }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              aria-label={`${labels?.[i] ?? `Day ${i + 1}`}: ${formatCompact(v)} EXP`}
            />
          );
        })}
      </div>

      {hasAxis ? (
        <div
          className={`relative mt-1 ${compact ? "h-3.5" : "h-4"}`}
          aria-hidden
        >
          {labels!.map((label, i) => {
            if (!shouldShowAxisLabel(i, n, step)) return null;
            const isFirst = i === 0;
            const isLast = i === n - 1;
            return (
              <span
                key={i}
                className={`absolute top-0 font-mono text-[0.6rem] tabular-nums leading-none opacity-50 ${
                  isFirst
                    ? "left-0 translate-x-0 text-left"
                    : isLast
                      ? "right-0 translate-x-0 text-right"
                      : "left-0 -translate-x-1/2 text-center"
                }`}
                style={
                  isFirst || isLast
                    ? undefined
                    : { left: `${((i + 0.5) / n) * 100}%` }
                }
              >
                {label}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ExpRangeGraph({
  graph,
  averages,
  compact = false,
  showAvg = true,
}: {
  graph: MapleHubGraphData | null | undefined;
  averages?: MapleHubExpAverages | null;
  /** Tighter layout for dashboard mini / roster cards. */
  compact?: boolean;
  /** Show matching MapleHub avg/day for the selected range. */
  showAvg?: boolean;
}) {
  const dailyExp = graph?.dailyExp ?? [];
  const labels = graph?.labels ?? [];
  const [days, setDays] = useState<ExpRangeDays>(7);

  if (!dailyExp.length && !averages) return null;

  const slice = dailyExp.slice(-days);
  const labelSlice =
    labels.length === dailyExp.length ? labels.slice(-days) : undefined;
  const avg = showAvg ? avgForRange(averages, days) : null;
  const hasBars = slice.length > 0;

  return (
    <div className={compact ? "mt-3 border-t border-border/40 pt-3" : "mt-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider opacity-55">
          {compact ? "Daily EXP" : `${days}d history`}
        </p>
        <div
          className="inline-flex rounded-lg border border-border/60 bg-surface-muted/40 p-0.5"
          role="group"
          aria-label="EXP history range"
        >
          {RANGES.map((r) => {
            const active = days === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                className={`rounded-md px-2 py-0.5 text-[0.7rem] font-semibold tabular-nums transition ${
                  active
                    ? "bg-accent text-white dark:text-zinc-900"
                    : "opacity-70 hover:bg-surface-muted hover:opacity-100"
                }`}
                aria-pressed={active}
              >
                {r}d
              </button>
            );
          })}
        </div>
      </div>

      {avg ? (
        <p className="mt-1.5 font-mono text-sm font-bold tabular-nums">
          <span className="mr-1.5 text-[0.65rem] font-semibold uppercase tracking-wider opacity-55">
            {days}d avg
          </span>
          {avg}
        </p>
      ) : hasBars ? (
        <p className="mt-1.5 text-[0.65rem] font-semibold uppercase tracking-wider opacity-55">
          Last {days} days
          {slice.length < days ? ` (${slice.length} avail.)` : ""}
        </p>
      ) : null}

      <div className="mt-2">
        {hasBars ? (
          <SparkBars values={slice} labels={labelSlice} compact={compact} />
        ) : (
          <p
            className={`flex items-center justify-center rounded-lg border border-dashed border-border/50 bg-surface-muted/30 text-xs opacity-55 ${
              compact ? "h-14" : "h-20"
            }`}
          >
            No daily EXP history for this window
          </p>
        )}
      </div>
    </div>
  );
}
