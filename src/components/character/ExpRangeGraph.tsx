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
      : "text-[0.65rem] sm:text-[0.72rem]";
  }
  if (count <= 14) {
    return compact
      ? "text-[0.45rem]"
      : "text-[0.55rem] sm:text-[0.62rem]";
  }
  return compact
    ? "text-[0.45rem] sm:text-[0.5rem]"
    : "text-[0.5rem] sm:text-[0.58rem]";
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
  const plotH = isCompact ? "h-28" : "h-56 sm:h-64";
  const labelPad = isCompact ? "h-3.5" : "h-5";
  const gap = barGapClass(n, isCompact);
  const barW = barWidthClass(n);
  const labelCls = valueLabelClass(n, isCompact);
  const dateRotate = n > 14;
  const yAxisW = isCompact ? "w-8 sm:w-10" : "w-10 sm:w-12";
  const yLabelCls = isCompact
    ? "text-[0.55rem] sm:text-[0.6rem]"
    : "text-[0.65rem] sm:text-[0.72rem]";
  const xLabelCls = isCompact
    ? dateRotate
      ? "origin-top-left -translate-x-1/2 rotate-[-35deg] text-[0.5rem]"
      : "-translate-x-1/2 text-center text-[0.6rem]"
    : dateRotate
      ? "origin-top-left -translate-x-1/2 rotate-[-35deg] text-[0.58rem] sm:text-[0.62rem]"
      : "-translate-x-1/2 text-center text-[0.68rem] sm:text-[0.75rem]";
  const xAxisH = dateRotate
    ? isCompact
      ? "h-7"
      : "h-9 sm:h-10"
    : isCompact
      ? "h-3.5"
      : "h-5";

  return (
    <div className={`flex ${isCompact ? "gap-1.5 sm:gap-2" : "gap-2 sm:gap-3"}`}>
      <div
        className={`relative flex shrink-0 flex-col ${yAxisW} ${plotH}`}
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
                className={`absolute right-1.5 font-mono leading-none tabular-nums text-foreground/55 sm:right-2 ${yLabelCls} ${edge}`}
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
          <div className={`relative mt-1.5 ${xAxisH}`} aria-hidden>
            {labels!.map((label, i) => {
              if (!shouldShowAxisLabel(i, n, step)) return null;
              return (
                <span
                  key={i}
                  className={`absolute top-0 font-mono tabular-nums leading-none text-foreground/55 ${xLabelCls}`}
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
    <div className={compact ? "mt-3 border-t border-border/40 pt-3" : "mt-5"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={`font-semibold uppercase tracking-wider opacity-55 ${
            compact ? "text-[0.65rem]" : "text-[0.75rem] sm:text-sm"
          }`}
        >
          {compact ? "Daily EXP" : `${days}d chart`}
        </p>
        <div
          className={`inline-flex rounded-lg border border-border/60 bg-surface-muted/40 ${
            compact ? "p-0.5" : "p-1"
          }`}
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
                className={`rounded-md font-semibold tabular-nums transition ${
                  compact
                    ? "px-2 py-0.5 text-[0.7rem]"
                    : "px-2.5 py-1 text-xs sm:text-sm"
                } ${
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
        <p
          className={`mt-1.5 font-semibold uppercase tracking-wider opacity-55 ${
            compact ? "text-[0.65rem]" : "text-[0.7rem] sm:text-xs"
          }`}
        >
          Last {days} days
          {slice.length < days ? ` (${slice.length} avail.)` : ""}
        </p>
      ) : null}

      <div
        className={`mt-2 rounded-xl border border-border/55 bg-surface-muted/25 ${
          compact
            ? "px-2 py-2.5 sm:px-2.5"
            : "px-3.5 py-4 sm:px-5 sm:py-5"
        }`}
      >
        {hasBars ? (
          <SparkBars values={slice} labels={labelSlice} compact={compact} />
        ) : (
          <p
            className={`flex items-center justify-center text-xs opacity-55 ${
              compact ? "h-28" : "h-56 sm:h-64"
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

/** MapleRanks y-tick: `295 70%` (level + floor of within-level %). */
function formatLevelTick(v: number): string {
  const lv = Math.floor(v);
  const p = Math.floor((v - lv) * 100);
  return p > 0 ? `${lv} ${p}%` : `${lv} 0%`;
}

/** Evenly spaced fractional ticks across the visible level range. */
function buildLevelYTicks(
  min: number,
  max: number,
  targetCount: number,
): number[] {
  const span = Math.max(max - min, 0.02);
  const step = niceStep(span / Math.max(targetCount - 1, 1));
  const lo = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= max + step * 1e-9; v += step) {
    if (v < min - step * 0.05 || v > max + step * 0.05) continue;
    ticks.push(Number(v.toFixed(10)));
  }
  if (!ticks.length) {
    ticks.push(min);
    if (max - min > 1e-6) ticks.push(max);
  }
  return ticks;
}

/** MapleRanks Chart.js palette: even-level blue / odd-level green. */
const LEVEL_LINE_EVEN = "rgba(54, 162, 235, 0.85)";
const LEVEL_LINE_ODD = "rgba(153, 217, 140, 0.85)";
const LEVEL_POINT = "rgba(54, 162, 235, 0.95)";

const LEVEL_RANGES: ExpRangeDays[] = [7, 14, 30, 90];

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
  const pad = yMax - yMin < 0.05 ? 0.05 : (yMax - yMin) * 0.12;
  const plotMin = yMin - pad;
  const plotMax = yMax + pad;
  const isCompact = Boolean(compact);
  const yTicks = buildLevelYTicks(plotMin, plotMax, isCompact ? 4 : 6);
  // MapleRanks canvas ~680×170 — wide, short chart.
  const plotH = isCompact ? "h-[6.5rem]" : "h-[10.5rem] sm:h-[11.5rem]";
  const step = axisStep(n, isCompact);
  const hasAxis = Boolean(labels?.length);
  const dateRotate = n > 14;
  const tipIdx = hover;
  const yAxisW = isCompact ? "w-[3.4rem] sm:w-16" : "w-[4.25rem] sm:w-[4.75rem]";
  const yLabelCls = isCompact
    ? "text-[0.5rem] sm:text-[0.55rem]"
    : "text-[0.58rem] sm:text-[0.65rem]";
  const xLabelCls = isCompact
    ? dateRotate
      ? "origin-top-left -translate-x-1/2 rotate-[-35deg] text-[0.5rem]"
      : "-translate-x-1/2 text-center text-[0.55rem]"
    : dateRotate
      ? "origin-top-left -translate-x-1/2 rotate-[-35deg] text-[0.55rem] sm:text-[0.6rem]"
      : "-translate-x-1/2 text-center text-[0.62rem] sm:text-[0.68rem]";
  const xAxisH = dateRotate
    ? isCompact
      ? "h-7"
      : "h-8 sm:h-9"
    : isCompact
      ? "h-3.5"
      : "h-4";

  const W = 1000;
  const H = 250;
  const xy = (i: number) => {
    const x = n === 1 ? W / 2 : (i / (n - 1)) * W;
    const y =
      plotMax === plotMin
        ? H / 2
        : H - ((points[i]! - plotMin) / (plotMax - plotMin)) * H;
    return { x, y };
  };

  /** One stroke per day-to-day segment; color by starting level parity (MR). */
  const segments: { d: string; even: boolean }[] = [];
  for (let i = 1; i < n; i++) {
    const a = xy(i - 1);
    const b = xy(i);
    segments.push({
      d: `M${a.x.toFixed(1)},${a.y.toFixed(1)} L${b.x.toFixed(1)},${b.y.toFixed(1)}`,
      even: Math.floor(points[i - 1]!) % 2 === 0,
    });
  }

  const tipFrac = tipIdx != null ? points[tipIdx] : null;
  const tipLv = tipFrac != null ? Math.floor(tipFrac) : null;
  const tipPct =
    tipFrac != null ? ((tipFrac - Math.floor(tipFrac)) * 100).toFixed(1) : null;
  const tipLabel =
    tipIdx != null ? (labels?.[tipIdx] ?? `Day ${tipIdx + 1}`) : null;
  const tipLeftPct =
    tipIdx == null ? 0 : n <= 1 ? 50 : (tipIdx / (n - 1)) * 100;

  return (
    <div className={`flex ${isCompact ? "gap-1" : "gap-1.5 sm:gap-2"}`}>
      <div
        className={`relative flex shrink-0 flex-col ${yAxisW} ${plotH}`}
        aria-hidden
      >
        <div className="relative min-h-0 flex-1">
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
                className={`absolute right-1 font-mono leading-none tabular-nums text-foreground/50 sm:right-1.5 ${yLabelCls} ${edge}`}
                style={{ bottom: `${pct}%` }}
              >
                {formatLevelTick(tick)}
              </span>
            );
          })}
        </div>
      </div>

      <div className="relative min-w-0 flex-1">
        {tipIdx != null && tipLabel != null && tipLv != null ? (
          <div
            className="pointer-events-none absolute bottom-full z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-surface px-2 py-0.5 text-center shadow-sm"
            style={{ left: `${tipLeftPct}%` }}
            role="tooltip"
          >
            <p className="text-[0.6rem] font-semibold opacity-60">{tipLabel}</p>
            <p className="font-mono text-[0.7rem] font-bold tabular-nums sm:text-xs">
              Lv. {tipLv} {tipPct}%
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
            {yTicks.map((tick) => {
              const y =
                plotMax === plotMin
                  ? H / 2
                  : H - ((tick - plotMin) / (plotMax - plotMin)) * H;
              return (
                <line
                  key={`g-${tick}`}
                  x1={0}
                  x2={W}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  className="text-foreground/10"
                />
              );
            })}
            {segments.map((seg, i) => (
              <path
                key={i}
                d={seg.d}
                fill="none"
                stroke={seg.even ? LEVEL_LINE_EVEN : LEVEL_LINE_ODD}
                strokeWidth={isCompact ? 1.6 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {points.map((_, i) => {
              const { x, y } = xy(i);
              const r = isCompact ? 2.2 : 3.2;
              const active = tipIdx === i;
              return (
                <circle
                  key={`pt-${i}`}
                  cx={x}
                  cy={y}
                  r={active ? r + 1.2 : r}
                  fill={LEVEL_POINT}
                  stroke="var(--surface, #fff)"
                  strokeWidth={isCompact ? 1 : 1.4}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0">
            {points.map((_, i) => {
              const left = n <= 1 ? 0 : (i / (n - 1)) * 100;
              const half =
                n <= 1 ? 50 : (0.5 / Math.max(n - 1, 1)) * 100;
              return (
                <div
                  key={i}
                  className="absolute top-0 h-full cursor-default"
                  style={{
                    left: `${Math.max(0, left - half)}%`,
                    width: `${Math.min(100, half * 2)}%`,
                  }}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${labels?.[i] ?? `Day ${i + 1}`}: Lv. ${Math.floor(points[i]!)} ${((points[i]! % 1) * 100).toFixed(1)}%`}
                />
              );
            })}
          </div>
          {tipIdx != null ? (
            <div
              className="pointer-events-none absolute top-0 h-full w-px bg-[rgba(54,162,235,0.45)]"
              style={{ left: `${tipLeftPct}%` }}
            />
          ) : null}
        </div>

        {hasAxis ? (
          <div className={`relative mt-1 ${xAxisH}`} aria-hidden>
            {labels!.map((label, i) => {
              if (!shouldShowAxisLabel(i, n, step)) return null;
              const left = n <= 1 ? 50 : (i / (n - 1)) * 100;
              return (
                <span
                  key={i}
                  className={`absolute top-0 font-mono tabular-nums leading-none text-foreground/50 ${xLabelCls}`}
                  style={{ left: `${left}%` }}
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
    <div className={compact ? "mt-3 border-t border-border/40 pt-3" : ""}>
      {/* MapleRanks card-header: centered title + absolute-right range links */}
      <div
        className={`relative flex items-center ${
          compact ? "justify-between gap-2" : "justify-center py-1"
        }`}
      >
        <p
          className={`font-semibold tracking-wide ${
            compact
              ? "text-[0.65rem] uppercase tracking-wider opacity-55"
              : "font-display text-sm font-bold sm:text-base"
          }`}
        >
          {compact ? "Level progress" : "Level Progress"}
        </p>
        <div
          className={`${
            compact
              ? "inline-flex items-center gap-2 text-[0.7rem]"
              : "absolute right-0 bottom-1 inline-flex items-center gap-2.5 text-xs sm:text-sm"
          }`}
          role="group"
          aria-label="Level progress range"
        >
          {LEVEL_RANGES.map((r) => {
            const active = days === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                className={`tabular-nums transition ${
                  active
                    ? "font-bold text-foreground no-underline"
                    : "font-medium text-foreground/55 underline decoration-foreground/25 underline-offset-2 hover:text-foreground/80"
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
        className={`mt-2 rounded-xl border border-border/55 bg-surface-muted/20 ${
          compact ? "px-2 py-2 sm:px-2.5" : "px-2.5 py-2.5 sm:px-3 sm:py-3"
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
