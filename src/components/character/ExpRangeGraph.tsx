"use client";

import { useState } from "react";
import { ThemeLineChart } from "@/components/charts/ThemeLineChart";
import { expPercent, expToNext, formatCompact } from "@/lib/character/exp";
import type {
  MapleHubExpAverages,
  MapleHubGraphData,
} from "@/lib/character/maplehub";

export type ExpRangeDays = 7 | 14 | 30 | 90;

const RANGES: ExpRangeDays[] = [7, 14, 30, 90];
const LEVEL_RANGES: ExpRangeDays[] = [7, 14, 30, 90];

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

export function ExpRangeGraph({
  graph,
  averages,
  compact = false,
  showAvg = true,
  centerChart = false,
  sectionLead = false,
  chartHeight,
}: {
  graph: MapleHubGraphData | null | undefined;
  averages?: MapleHubExpAverages | null;
  compact?: boolean;
  showAvg?: boolean;
  /** Center the chart canvas; headers stay left-aligned. */
  centerChart?: boolean;
  /** First graph block under a parent divider (no extra top rule). */
  sectionLead?: boolean;
  chartHeight?: number;
}) {
  const dailyExp = graph?.dailyExp ?? [];
  const labels = graph?.labels ?? [];
  const [days, setDays] = useState<ExpRangeDays>(7);

  if (!dailyExp.length && !averages) return null;

  const slice = dailyExp.slice(-days);
  const labelSlice =
    labels.length === dailyExp.length
      ? labels.slice(-days)
      : slice.map((_, i) => String(i + 1));
  const avg = showAvg ? avgForRange(averages, days) : null;
  const hasLine = slice.length > 0;
  const barHeight = chartHeight ?? (compact ? 140 : 220);
  const tightChart = chartHeight != null;

  return (
    <div
      className={
        compact
          ? sectionLead
            ? tightChart
              ? "pt-1.5"
              : "pt-3"
            : "mt-3 border-t border-border/40 pt-3"
          : "mt-5"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={`font-semibold uppercase tracking-wider opacity-55 ${
            compact ? "text-xs" : "text-xs sm:text-sm"
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
                    ? "px-2 py-0.5 text-xs"
                    : "px-2.5 py-1 text-xs sm:text-sm"
                } ${
                  active
                    ? "bg-accent text-primary-foreground"
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
          <span className="mr-1.5 text-xs font-semibold uppercase tracking-wider opacity-55">
            {days}d avg
          </span>
          {avg}
        </p>
      ) : hasLine ? (
        <p
          className={`mt-1.5 font-semibold uppercase tracking-wider opacity-55 ${
            compact ? "text-xs" : "text-xs sm:text-xs"
          }`}
        >
          Last {days} days
          {slice.length < days ? ` (${slice.length} avail.)` : ""}
        </p>
      ) : null}

      <div
        className={`mt-2 rounded-xl border border-border/55 bg-surface-muted/25 ${
          tightChart
            ? "px-1 py-1"
            : compact
              ? "px-2 py-2 sm:px-2.5"
              : "px-3 py-3 sm:px-4"
        } ${centerChart ? "mx-auto max-w-xl" : ""}`}
      >
        {hasLine ? (
          <ThemeLineChart
            type="bar"
            labels={labelSlice}
            values={slice}
            height={barHeight}
            yFormatter={(n) => formatCompact(n)}
            valueFormatter={(n) => formatCompact(n)}
          />
        ) : (
          <p
            className="flex items-center justify-center text-xs opacity-55"
            style={{ height: barHeight }}
          >
            No daily EXP history for this window
          </p>
        )}
      </div>
    </div>
  );
}

export function LevelProgressGraph({
  graph,
  compact = false,
  centerChart = false,
  chartHeight,
}: {
  graph: MapleHubGraphData | null | undefined;
  compact?: boolean;
  centerChart?: boolean;
  chartHeight?: number;
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
    labels.length === levels.length
      ? labels.slice(-days)
      : slice.map((_, i) => String(i + 1));
  const values = slice.map((lv, i) => fractionalLevel(lv, expSlice[i]));

  // Pin y-axis to session range so gain fills the chart (start to end).
  let yMin: number | undefined;
  let yMax: number | undefined;
  if (values.length >= 2) {
    const start = values[0]!;
    const end = values[values.length - 1]!;
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    const pad = Math.max((hi - lo) * 0.05, 0.002);
    yMin = lo - pad;
    yMax = hi + pad;
    if (yMin === yMax) {
      yMin -= 0.01;
      yMax += 0.01;
    }
  } else if (values.length === 1) {
    yMin = values[0]! - 0.01;
    yMax = values[0]! + 0.01;
  }

  const lineHeight = chartHeight ?? (compact ? 132 : 184);

  return (
    <div className={compact ? (chartHeight != null ? "mt-2 border-t border-border/40 pt-2" : "mt-3 border-t border-border/40 pt-3") : ""}>
      <div
        className={`relative flex items-center ${
          compact ? "justify-between gap-2" : "justify-center py-1"
        }`}
      >
        <p
          className={`font-semibold tracking-wide ${
            compact
              ? "text-xs uppercase tracking-wider opacity-55"
              : "font-display text-sm font-bold sm:text-base"
          }`}
        >
          {compact ? "Level progress" : "Level Progress"}
        </p>
        <div
          className={`${
            compact
              ? "inline-flex items-center gap-2 text-xs"
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
          chartHeight != null
            ? "px-1 py-1"
            : compact
              ? "px-2 py-2 sm:px-2.5"
              : "px-2.5 py-2.5 sm:px-3 sm:py-3"
        } ${centerChart ? "mx-auto max-w-xl" : ""}`}
      >
        <ThemeLineChart
          labels={labelSlice}
          values={values}
          height={lineHeight}
          yFormatter={formatLevelTick}
          valueFormatter={formatLevelTick}
          yMin={yMin}
          yMax={yMax}
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
