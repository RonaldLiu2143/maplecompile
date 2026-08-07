"use client";

import { useState } from "react";
import { expPercent, expToNext, formatCompact } from "@/lib/character/exp";
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

/** Gaps between bars — tighter on short windows; dense 30/90 almost flush. */
function barGapClass(count: number, compact: boolean): string {
  if (count <= 7) return compact ? "gap-0.5" : "gap-1";
  if (count <= 14) return compact ? "gap-px" : "gap-0.5";
  if (count <= 30) return "gap-0";
  return "gap-0";
}

/** Fraction of column width the bar occupies (rest is gap-like margin). */
function barWidthClass(count: number): string {
  if (count <= 7) return "w-[82%]";
  if (count <= 14) return "w-[88%]";
  if (count <= 30) return "w-[96%]";
  return "w-full";
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
          <div className={`relative flex min-h-0 flex-1 ${gap}`}>
            {values.map((v, i) => {
              const hPct =
                yMax > 0 ? Math.max(v > 0 ? 2 : 0, (v / yMax) * 100) : 0;
              const active = hover === i;
              const showVal = shouldShowValueLabel(i, n, isCompact) && v > 0;
              return (
                <div
                  key={i}
                  className="relative min-w-0 flex-1"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${labels?.[i] ?? `Day ${i + 1}`}: ${formatCompact(v)} EXP`}
                >
                  <div
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 cursor-default rounded-[2px] border transition-colors ${barW} ${
                      active
                        ? "border-accent bg-accent/45"
                        : "border-accent/85 bg-accent/25 hover:border-accent hover:bg-accent/40"
                    }`}
                    style={{ height: `${Math.max(hPct, v > 0 ? 2 : 0)}%` }}
                  />
                  {showVal ? (
                    <span
                      className={`pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2 -translate-y-full pb-0.5 font-mono tabular-nums leading-none text-foreground/60 ${labelCls}`}
                      style={{ bottom: `${hPct}%` }}
                    >
                      {formatCompact(v)}
                    </span>
                  ) : null}
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
          {compact ? "Daily EXP" : `${days}d chart`}
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

      <div
        className={`mt-2 rounded-xl border border-border/55 bg-surface-muted/25 ${
          compact ? "px-2 py-2.5 sm:px-2.5" : "px-3 py-3 sm:px-4 sm:py-3.5"
        }`}
      >
        {hasBars ? (
          <SparkBars values={slice} labels={labelSlice} compact={compact} />
        ) : (
          <p
            className={`flex items-center justify-center text-xs opacity-55 ${
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

/** Fractional level for progress charts: level + (exp / need). */
function fractionalLevel(level: number, expInLevel: number | undefined): number {
  if (!Number.isFinite(level)) return 0;
  if (level >= 300) return 300;
  const need = expToNext(level);
  if (
    need == null ||
    need <= 0 ||
    expInLevel == null ||
    !Number.isFinite(expInLevel)
  ) {
    return level;
  }
  const frac = Math.min(1, Math.max(0, expInLevel / need));
  return level + frac;
}

function buildLevelYTicks(min: number, max: number): number[] {
  const lo = Math.floor(min);
  const hi = Math.ceil(max);
  if (hi <= lo) return [lo];
  const span = hi - lo;
  const step =
    span <= 2 ? 1 : span <= 6 ? 1 : span <= 12 ? 2 : Math.ceil(span / 6);
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== hi) ticks.push(hi);
  return ticks;
}

function LevelProgressSpark({
  levels,
  cumulativeExp,
  labels,
  compact,
}: {
  levels: number[];
  cumulativeExp: number[];
  labels?: string[];
  compact?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = levels.length;
  if (!n) return null;

  const points = levels.map((lv, i) => fractionalLevel(lv, cumulativeExp[i]));
  const yMin = Math.min(...points);
  const yMax = Math.max(...points);
  const pad = yMax - yMin < 0.05 ? 0.05 : (yMax - yMin) * 0.08;
  const plotMin = yMin - pad;
  const plotMax = yMax + pad;
  const yTicks = buildLevelYTicks(plotMin, plotMax);
  const isCompact = Boolean(compact);
  const plotH = isCompact ? "h-24" : "h-40";
  const step = axisStep(n, isCompact);
  const hasAxis = Boolean(labels?.length);
  const dateRotate = n > 14;
  const tipIdx = hover;

  const W = 1000;
  const H = 100;
  const pathFor = (from: number, to: number) => {
    const coords: string[] = [];
    for (let i = from; i <= to; i++) {
      const x = n === 1 ? W / 2 : (i / (n - 1)) * W;
      const y =
        plotMax === plotMin
          ? H / 2
          : H - ((points[i]! - plotMin) / (plotMax - plotMin)) * H;
      coords.push(`${i === from ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return coords.join(" ");
  };

  /** Split the polyline when level integer changes (MapleRanks color cue). */
  const segments: { d: string; leveled: boolean }[] = [];
  let segStart = 0;
  for (let i = 1; i < n; i++) {
    if (Math.floor(levels[i]!) > Math.floor(levels[i - 1]!)) {
      segments.push({ d: pathFor(segStart, i - 1), leveled: false });
      segments.push({ d: pathFor(i - 1, i), leveled: true });
      segStart = i;
    }
  }
  segments.push({ d: pathFor(segStart, n - 1), leveled: false });

  const tipLevel = tipIdx != null ? levels[tipIdx] : null;
  const tipFrac = tipIdx != null ? points[tipIdx] : null;
  const tipPct =
    tipLevel != null && tipFrac != null
      ? ((tipFrac - tipLevel) * 100).toFixed(2)
      : null;
  const tipLabel =
    tipIdx != null ? (labels?.[tipIdx] ?? `Day ${tipIdx + 1}`) : null;

  return (
    <div className="flex gap-1.5 sm:gap-2">
      <div
        className={`relative flex w-8 shrink-0 flex-col sm:w-10 ${plotH}`}
        aria-hidden
      >
        <div className="relative min-h-0 flex-1 border-r border-border/70">
          {yTicks.map((tick) => {
            const pct =
              plotMax === plotMin
                ? 50
                : ((tick - plotMin) / (plotMax - plotMin)) * 100;
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
                {tick}
              </span>
            );
          })}
        </div>
      </div>

      <div className="relative min-w-0 flex-1">
        {tipIdx != null && tipLabel != null && tipLevel != null ? (
          <div
            className="pointer-events-none absolute bottom-full z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-center shadow-sm"
            style={{ left: `${((tipIdx + 0.5) / n) * 100}%` }}
            role="tooltip"
          >
            <p className="text-[0.65rem] font-semibold opacity-65">{tipLabel}</p>
            <p className="font-mono text-xs font-bold tabular-nums">
              Lv. {tipLevel}
              {tipPct != null ? ` (${tipPct}%)` : ""}
            </p>
          </div>
        ) : null}

        <div
          className={`relative ${plotH}`}
          role="img"
          aria-label="Level progress"
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            {segments.map((seg, i) => (
              <path
                key={i}
                d={seg.d}
                fill="none"
                stroke={seg.leveled ? "var(--accent)" : "currentColor"}
                strokeWidth={seg.leveled ? 2.4 : 1.8}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className={seg.leveled ? "" : "text-accent/70"}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex">
            {points.map((_, i) => (
              <div
                key={i}
                className="min-w-0 flex-1 cursor-default"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${labels?.[i] ?? `Day ${i + 1}`}: Lv. ${levels[i]}`}
              />
            ))}
          </div>
          {tipIdx != null ? (
            <div
              className="pointer-events-none absolute top-0 h-full w-px bg-accent/50"
              style={{ left: `${((tipIdx + 0.5) / n) * 100}%` }}
            />
          ) : null}
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

/** MapleRanks-style level-over-time chart (level + within-level %). */
export function LevelProgressGraph({
  graph,
  compact = false,
}: {
  graph: MapleHubGraphData | null | undefined;
  compact?: boolean;
}) {
  const levels = graph?.levels ?? [];
  const cumulativeExp = graph?.cumulativeExp ?? [];
  const labels = graph?.labels ?? [];
  const [days, setDays] = useState<ExpRangeDays>(30);

  if (!levels.length) return null;

  const slice = levels.slice(-days);
  const expSlice =
    cumulativeExp.length === levels.length
      ? cumulativeExp.slice(-days)
      : cumulativeExp.slice(-slice.length);
  const labelSlice =
    labels.length === levels.length ? labels.slice(-days) : undefined;

  return (
    <div className={compact ? "mt-3 border-t border-border/40 pt-3" : "mt-5"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider opacity-55">
          {compact ? "Level progress" : `${days}d chart`}
        </p>
        <div
          className="inline-flex rounded-lg border border-border/60 bg-surface-muted/40 p-0.5"
          role="group"
          aria-label="Level progress range"
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

      <div
        className={`mt-2 rounded-xl border border-border/55 bg-surface-muted/25 ${
          compact ? "px-2 py-2.5 sm:px-2.5" : "px-3 py-3 sm:px-4 sm:py-3.5"
        }`}
      >
        <LevelProgressSpark
          levels={slice}
          cumulativeExp={expSlice}
          labels={labelSlice}
          compact={compact}
        />
      </div>
    </div>
  );
}

/** Thin EXP bar used on Saved cards / compact profiles. */
export function LevelExpBar({
  level,
  exp,
  dense = false,
}: {
  level?: number;
  exp?: number;
  dense?: boolean;
}) {
  if (level == null) return null;
  const pct =
    exp != null && Number.isFinite(exp) ? expPercent(level, exp) : null;
  const need = expToNext(level);
  return (
    <div className={dense ? "mt-1.5" : "mt-2"}>
      {pct != null && need != null ? (
        <div className="mb-0.5 flex justify-between gap-2 font-mono text-[0.6rem] tabular-nums text-foreground/50">
          <span>{formatCompact(exp!)}</span>
          <span>{formatCompact(need)}</span>
        </div>
      ) : null}
      <div
        className={`overflow-hidden rounded-full bg-surface-muted ${
          dense ? "h-1" : "h-1.5"
        }`}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
    </div>
  );
}
