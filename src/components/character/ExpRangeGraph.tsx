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

/** Clear gaps between bars; denser ranges keep a visible gap. */
function barGapClass(count: number, compact: boolean): string {
  if (count <= 7) return compact ? "gap-1.5" : "gap-2.5";
  if (count <= 14) return compact ? "gap-1" : "gap-1.5";
  if (count <= 30) return compact ? "gap-0.5" : "gap-1";
  return "gap-px";
}

/** Fraction of column width the bar occupies (rest is gap-like margin). */
function barWidthClass(count: number): string {
  if (count <= 7) return "w-[58%]";
  if (count <= 14) return "w-[65%]";
  if (count <= 30) return "w-[72%]";
  return "w-[80%]";
}

function niceStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const exp = Math.floor(Math.log10(rough));
  const f = rough / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
}

/** Evenly spaced Y ticks from 0 to a nice rounded max (~5–10 ticks). */
function buildYTicks(
  dataMax: number,
  targetTickCount: number,
): { max: number; ticks: number[] } {
  const maxVal = Math.max(dataMax, 1);
  const intervals = Math.max(2, targetTickCount - 1);
  const step = niceStep(maxVal / intervals);
  const niceMax = Math.ceil(maxVal / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= niceMax + step * 1e-9; v += step) {
    ticks.push(v);
  }
  return { max: niceMax, ticks };
}

/** Axis labels: strip trailing .00 so 2.00T → 2T (matches reference). */
function formatTickLabel(n: number): string {
  if (n === 0) return "0";
  return formatCompact(n).replace(/\.00([TBMK])$/, "$1");
}

function shouldShowValueLabel(
  i: number,
  count: number,
  compact: boolean,
): boolean {
  if (count <= 7) return true;
  if (count <= 14) return compact ? i % 2 === 0 : true;
  if (count <= 30) {
    const step = compact ? 4 : 3;
    return i % step === 0 || i === count - 1;
  }
  const step = compact ? 12 : 8;
  return i % step === 0 || i === count - 1;
}

function valueLabelClass(count: number, compact: boolean): string {
  if (count <= 7) {
    return compact
      ? "text-[0.5rem] sm:text-[0.55rem]"
      : "text-[0.55rem] sm:text-[0.62rem]";
  }
  if (count <= 14) {
    return compact ? "text-[0.45rem]" : "text-[0.5rem] sm:text-[0.55rem]";
  }
  return "text-[0.45rem] sm:text-[0.5rem]";
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

  const dataMax = Math.max(...values, 0);
  const isCompact = Boolean(compact);
  const targetTicks = isCompact ? 5 : 10;
  const { max: yMax, ticks: yTicks } = buildYTicks(dataMax, targetTicks);
  const tipIdx = hover;
  const tipLabel =
    tipIdx != null
      ? (labels?.[tipIdx] ?? `Day ${tipIdx + 1}`)
      : null;
  const tipExp = tipIdx != null ? formatCompact(values[tipIdx] ?? 0) : null;
  const n = values.length;
  const step = axisStep(n, isCompact);
  const hasAxis = Boolean(labels?.length);
  const plotH = isCompact ? "h-28" : "h-44";
  const labelPad = isCompact ? "h-3.5" : "h-4";
  const gap = barGapClass(n, isCompact);
  const barW = barWidthClass(n);
  const labelCls = valueLabelClass(n, isCompact);
  const dateRotate = n > 14;

  return (
    <div className="flex gap-1.5 sm:gap-2">
      {/* Y-axis: tick labels + vertical axis line (aligned to bar plot) */}
      <div
        className={`relative flex w-8 shrink-0 flex-col sm:w-10 ${plotH}`}
        aria-hidden
      >
        <div className={`shrink-0 ${labelPad}`} />
        <div className="relative min-h-0 flex-1 border-r border-border/70">
          {yTicks.map((tick) => {
            const pct = yMax > 0 ? (tick / yMax) * 100 : 0;
            const edge =
              pct <= 0.01
                ? "translate-y-0"
                : pct >= 99.99
                  ? "-translate-y-full"
                  : "-translate-y-1/2";
            return (
              <span
                key={tick}
                className={`absolute right-1.5 font-mono text-[0.55rem] leading-none tabular-nums text-foreground/55 sm:right-2 sm:text-[0.6rem] ${edge}`}
                style={{ bottom: `${pct}%` }}
              >
                {formatTickLabel(tick)}
              </span>
            );
          })}
        </div>
      </div>

      <div className="relative min-w-0 flex-1">
        {tipIdx != null && tipLabel != null && tipExp != null ? (
          <div
            className="pointer-events-none absolute bottom-full z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-center shadow-sm"
            style={{ left: `${((tipIdx + 0.5) / n) * 100}%` }}
            role="tooltip"
          >
            <p className="text-[0.65rem] font-semibold opacity-65">{tipLabel}</p>
            <p className="font-mono text-xs font-bold tabular-nums">{tipExp}</p>
          </div>
        ) : null}

        <div
          className={`relative flex flex-col ${plotH}`}
          role="img"
          aria-label="Daily EXP gained"
        >
          <div className={`shrink-0 ${labelPad}`} aria-hidden />
          <div className={`relative flex min-h-0 flex-1 items-end ${gap}`}>
            {values.map((v, i) => {
              const hPct =
                yMax > 0 ? Math.max(v > 0 ? 2 : 0, (v / yMax) * 100) : 0;
              const active = hover === i;
              const showVal = shouldShowValueLabel(i, n, isCompact) && v > 0;
              return (
                <div
                  key={i}
                  className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${labels?.[i] ?? `Day ${i + 1}`}: ${formatCompact(v)} EXP`}
                >
                  {showVal ? (
                    <span
                      className={`pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2 -translate-y-full pb-0.5 font-mono tabular-nums leading-none text-foreground/60 ${labelCls}`}
                      style={{ bottom: `${hPct}%` }}
                    >
                      {formatCompact(v)}
                    </span>
                  ) : null}
                  <div
                    className={`cursor-default rounded-[2px] border transition-colors ${barW} ${
                      active
                        ? "border-accent bg-accent/45"
                        : "border-accent/85 bg-accent/25 hover:border-accent hover:bg-accent/40"
                    }`}
                    style={{ height: `${Math.max(hPct, v > 0 ? 2 : 0)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {hasAxis ? (
          <div
            className={`relative mt-1.5 ${
              dateRotate
                ? isCompact
                  ? "h-7"
                  : "h-8"
                : isCompact
                  ? "h-3.5"
                  : "h-4"
            }`}
            aria-hidden
          >
            {labels!.map((label, i) => {
              if (!shouldShowAxisLabel(i, n, step)) return null;
              return (
                <span
                  key={i}
                  className={`absolute top-0 font-mono text-[0.6rem] tabular-nums leading-none text-foreground/55 ${
                    dateRotate
                      ? "origin-top-left -translate-x-1/2 rotate-[-35deg] text-[0.5rem]"
                      : "-translate-x-1/2 text-center"
                  }`}
                  style={{ left: `${((i + 0.5) / n) * 100}%` }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
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
              compact ? "h-28" : "h-44"
            }`}
          >
            No daily EXP history for this window
          </p>
        )}
      </div>
    </div>
  );
}
