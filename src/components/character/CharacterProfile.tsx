"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ExpRangeGraph,
  LevelProgressGraph,
  type ExpRangeDays,
} from "@/components/character/ExpRangeGraph";
import type { LiberationTagFlags } from "@/lib/dashboard/roster-status";
import { LiberationStatusTags } from "@/components/dashboard/LiberationStatusTags";
import { characterProfileHref } from "@/lib/character/client";
import {
  daysToLevel,
  expRemainingToLevel,
  formatCompact,
  parseCompactExp,
} from "@/lib/character/exp";
import { formatOptionalInt, formatRank } from "@/lib/character/format";
import type { CharacterLookupResult } from "@/lib/character/lookup";
import {
  applyCharacterLookupToScouter,
  SCOUTER_FROM_LOOKUP_HREF,
} from "@/lib/character/open-in-scouter";
import { entryKey } from "@/lib/dashboard/roster";
import { readLiberationFlags } from "@/lib/dashboard/roster-status";
import { useMapleDataReload } from "@/hooks/useMapleDataReload";

function RankChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-md border border-border/70 bg-surface-muted/50 px-1.5 py-0.5 text-xs font-semibold leading-tight tabular-nums">
      <span className="text-foreground/70">{label}</span>
      <span className="mx-1 text-foreground/35" aria-hidden>
        ·
      </span>
      <span>{value}</span>
    </span>
  );
}

function Panel({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/55 bg-surface/90 p-3.5 sm:p-4">
      <h3 className="font-display text-xs font-bold uppercase tracking-[0.14em] text-accent">
        {title}
      </h3>
      <dl className="mt-2.5 divide-y divide-border/35">{children}</dl>
      {footer}
    </section>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-sm text-foreground/65">{label}</dt>
      <dd className="font-mono text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function MetricCard({
  label,
  avg,
  dailyPct,
  total,
  selected = false,
  onSelect,
}: {
  label: string;
  avg: string;
  dailyPct: string;
  total: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
        {label}
      </p>
      <dl className="mt-2 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-foreground/55">Daily avg</dt>
          <dd className="font-mono text-base font-bold tabular-nums">{avg}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-foreground/55">Daily %</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">
            {dailyPct}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-foreground/55">Total</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">
            {total}
          </dd>
        </div>
      </dl>
    </>
  );

  const shell =
    "rounded-xl border px-3.5 py-3 text-left sm:px-4 sm:py-3.5 transition";
  const tone = selected
    ? "border-accent/60 bg-accent-soft/40 ring-1 ring-accent/30"
    : "border-border/45 bg-surface-muted/35";

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`${shell} ${tone} hover:border-border hover:bg-surface-muted/55`}
      >
        {body}
      </button>
    );
  }

  return <div className={`${shell} ${tone}`}>{body}</div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs font-semibold uppercase tracking-wider opacity-55">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

/** Rank grid for dashboard Primary (dense) header. */
function RankStatsGrid({
  items,
  className = "",
}: {
  items: { label: string; value: string }[];
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-2 gap-x-4 gap-y-1 ${className}`.trim()}
    >
      {items.map((item) => (
        <MiniStat key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

function formatDaysNumber(n: number): string {
  return n.toFixed(1);
}

function defaultAvgInput(avgN: number, avgLabel: string | null): string {
  if (avgLabel) {
    return avgLabel.replace(/\/day$/i, "").trim();
  }
  return formatCompact(avgN);
}

/**
 * ETA to next levels using the selected range average as the base rate.
 * Compact MapleRanks-style card: editable daily EXP, 2×2 milestone grid.
 * First cell: editable target level + days (days edits set the rate).
 * Editing the rate does not change which range card is selected.
 */
function EtaToLevelSection({
  level,
  exp,
  avgRate,
  avgLabel,
  rangeDays,
}: {
  level: number;
  exp: number;
  avgRate: number;
  avgLabel: string | null;
  rangeDays: ExpRangeDays;
}) {
  const defaultTarget = Math.min(300, level + 1);
  const [expInput, setExpInput] = useState(() =>
    defaultAvgInput(avgRate, avgLabel),
  );
  const [targetInput, setTargetInput] = useState(String(defaultTarget));
  const [editingDays, setEditingDays] = useState<string | null>(null);

  useEffect(() => {
    setExpInput(defaultAvgInput(avgRate, avgLabel));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- range-driven reset only
  }, [rangeDays]);

  useEffect(() => {
    setTargetInput(String(Math.min(300, level + 1)));
  }, [level]);

  const rate = useMemo(() => {
    const parsed = parseCompactExp(expInput);
    return parsed != null && parsed > 0 ? parsed : avgRate;
  }, [expInput, avgRate]);

  const baseLabel = avgLabel?.replace(/\/day$/i, "") ?? formatCompact(avgRate);

  const primaryTarget = useMemo(() => {
    const n = Number.parseInt(targetInput.trim(), 10);
    if (!Number.isFinite(n) || n <= level || n > 300) return defaultTarget;
    return n;
  }, [targetInput, level, defaultTarget]);

  const milestones = [0, 1, 2, 3]
    .map((i) => primaryTarget + i)
    .filter((lv) => lv <= 300 && lv > level);

  function commitDays(raw: string) {
    setEditingDays(null);
    const n = Number(String(raw).trim());
    if (!Number.isFinite(n) || n <= 0) return;
    const remaining = expRemainingToLevel(level, exp, primaryTarget);
    if (remaining == null || remaining <= 0) return;
    setExpInput(formatCompact(remaining / n));
  }

  const primaryDays = daysToLevel(level, exp, primaryTarget, rate);
  const primaryDaysDisplay =
    editingDays != null
      ? editingDays
      : primaryDays != null && Number.isFinite(primaryDays)
        ? formatDaysNumber(primaryDays)
        : "";

  const inputClass =
    "rounded border border-border/70 bg-background px-2 py-0.5 font-mono text-sm tabular-nums outline-none focus:border-accent";

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border/55 bg-surface-muted/20">
      <h4 className="border-b border-border/45 px-3 py-2.5 text-center font-display text-sm font-bold tracking-tight sm:text-base">
        ETA to Level
      </h4>

      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-border/45 px-3 py-2.5">
        <label className="flex items-center gap-2 text-sm text-foreground/75">
          <span>Average Daily Exp:</span>
          <input
            type="text"
            inputMode="decimal"
            value={expInput}
            onChange={(e) => setExpInput(e.target.value)}
            placeholder={baseLabel}
            className={`${inputClass} w-[5.5rem] text-center`}
            aria-label="Average daily EXP"
          />
        </label>
      </div>

      <ul className="grid grid-cols-2 divide-x divide-y divide-border/45">
        {milestones.map((lv, i) => {
          const days = daysToLevel(level, exp, lv, rate);
          const canEdit = i === 0 && expRemainingToLevel(level, exp, lv) != null;
          const daysLabel =
            days != null && Number.isFinite(days)
              ? `${formatDaysNumber(days)} days`
              : "—";

          if (i === 0 && canEdit) {
            return (
              <li
                key={lv}
                className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4"
              >
                <label className="flex items-center gap-1.5 text-sm font-semibold">
                  <span>Lv.</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    onBlur={() => {
                      const n = Number.parseInt(targetInput.trim(), 10);
                      if (!Number.isFinite(n) || n <= level || n > 300) {
                        setTargetInput(String(defaultTarget));
                      } else {
                        setTargetInput(String(n));
                      }
                    }}
                    className={`${inputClass} w-12 text-center`}
                    aria-label="Target level"
                  />
                </label>
                <label className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-foreground/80">
                  <span className="sr-only">Days to target level</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={primaryDaysDisplay}
                    placeholder="—"
                    onFocus={() =>
                      setEditingDays(
                        primaryDays != null && Number.isFinite(primaryDays)
                          ? formatDaysNumber(primaryDays)
                          : "",
                      )
                    }
                    onChange={(e) => setEditingDays(e.target.value)}
                    onBlur={(e) => commitDays(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      else if (e.key === "Escape") {
                        setEditingDays(null);
                        e.currentTarget.blur();
                      }
                    }}
                    className={`${inputClass} w-14 text-right`}
                    aria-label="Days to reach target level"
                  />
                  <span className="text-foreground/55">days</span>
                </label>
              </li>
            );
          }

          return (
            <li
              key={lv}
              className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm sm:px-4"
            >
              <span className="font-semibold">Lv. {lv}</span>
              <span className="font-mono tabular-nums text-foreground/75">
                {daysLabel}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const EXP_RANGE_DAYS: ExpRangeDays[] = [7, 14, 30, 90];

function ExpRangeDayLinks({
  days,
  onChange,
  ariaLabel,
}: {
  days: ExpRangeDays;
  onChange: (d: ExpRangeDays) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-2.5 text-xs sm:text-sm"
      role="group"
      aria-label={ariaLabel}
    >
      {EXP_RANGE_DAYS.map((r) => {
        const active = days === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
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
  );
}

function sumSlice(values: number[], days: number): number | null {
  if (!values.length) return null;
  const slice = values.slice(-days);
  if (!slice.length) return null;
  return slice.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

function CompactCharacterProfile({
  character,
  actions,
  dense = false,
  hideCharts = false,
}: {
  character: CharacterLookupResult;
  actions?: ReactNode;
  /** Dashboard-tight: smaller chrome; still includes Daily EXP graph. */
  dense?: boolean;
  /** Search preview: identity + actions only (no EXP charts). */
  hideCharts?: boolean;
}) {
  const world = character.worldName;
  const job = character.jobName;
  const region = character.region.toUpperCase();
  const ranking = character.ranking;
  const pct = character.expPercent;
  const need = character.expToNext;

  const classInWorld = formatRank(ranking?.jobRank);
  const worldRank = formatRank(ranking?.worldRank);
  const gmsOverall = formatRank(ranking?.globalRank ?? character.overallRank);
  const legion = formatOptionalInt(character.legionLevel);

  const avatarPx = dense ? 56 : hideCharts ? 72 : 72;

  const [liberation, setLiberation] = useState<LiberationTagFlags>({
    genesis: false,
    destiny: false,
  });

  useEffect(() => {
    if (!dense) return;
    setLiberation(readLiberationFlags(entryKey(character)));
  }, [dense, character.name, character.region]);

  useMapleDataReload(() => {
    if (!dense) return;
    setLiberation(readLiberationFlags(entryKey(character)));
  });

  const rankStats = [
    {
      label: world ? `${job} (${world})` : `${job} rank`,
      value: classInWorld,
    },
    {
      label: world ? `${world} rank` : "World rank",
      value: worldRank,
    },
    { label: `GMS ${region}`, value: gmsOverall },
    { label: "Legion", value: legion },
  ];

  if (dense) {
    const subtitle = [
      `Lv. ${character.level}`,
      pct != null ? `(${pct.toFixed(2)}%)` : null,
      "·",
      job,
      world ? `in ${world}` : null,
      `· ${region}`,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <article className="rounded-xl border border-border/50 bg-surface">
        <div className="flex items-start gap-2.5 p-2.5 sm:gap-3">
          <div className="shrink-0">
            {character.characterImgURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={character.characterImgURL}
                alt={`${character.name} avatar`}
                width={avatarPx}
                height={avatarPx}
                className="object-contain"
                style={{ width: avatarPx, height: avatarPx }}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-lg bg-surface-muted text-xs opacity-60"
                style={{ width: avatarPx, height: avatarPx }}
              >
                No img
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <h2 className="font-display text-base font-bold tracking-tight sm:text-lg">
                    {character.name}
                  </h2>
                  {character.isHeroic ? (
                    <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent">
                      Heroic
                    </span>
                  ) : null}
                  {world ? (
                    <span className="rounded-md border border-border px-1.5 py-0.5 text-xs font-semibold opacity-70">
                      {world}
                    </span>
                  ) : null}
                  <LiberationStatusTags
                    genesis={liberation.genesis}
                    destiny={liberation.destiny}
                    compact
                  />
                </div>
                <p className="mt-0.5 truncate text-xs font-medium opacity-75 sm:text-sm">
                  {subtitle}
                </p>
                <div className="mt-1.5 w-44 max-w-full">
                  <div className="mb-0.5 flex justify-between gap-2 font-mono text-xs tabular-nums text-foreground/60">
                    <span>{formatCompact(character.exp)}</span>
                    <span>
                      {need != null ? formatCompact(need) : "Max level"}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-accent transition-[width]"
                      style={{ width: `${pct ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <RankStatsGrid
                items={rankStats}
                className="hidden shrink-0 sm:grid lg:gap-x-5"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 px-2 pb-2 pt-1.5 sm:px-2.5">
          <div className="mb-1.5 sm:hidden">
            <RankStatsGrid items={rankStats} className="gap-x-3" />
          </div>
          {!hideCharts ? (
            <>
              <ExpRangeGraph
                graph={character.graph}
                averages={character.expAverages}
                compact
                sectionLead
                chartHeight={220}
              />
              <LevelProgressGraph
                graph={character.graph}
                compact
                chartHeight={200}
              />
            </>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border-2 border-border bg-surface">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:gap-3 sm:p-3.5">
        <div className="flex shrink-0 justify-start">
          {character.characterImgURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.characterImgURL}
              alt={`${character.name} avatar`}
              width={avatarPx}
              height={avatarPx}
              className="object-contain"
              style={{ width: avatarPx, height: avatarPx }}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-lg bg-surface-muted text-xs opacity-60"
              style={{ width: avatarPx, height: avatarPx }}
            >
              No img
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">
                  {character.name}
                </h2>
                {character.isHeroic ? (
                  <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent">
                    Heroic
                  </span>
                ) : null}
                {world ? (
                  <span className="rounded-md border border-border px-1.5 py-0.5 text-xs font-semibold opacity-70">
                    {world}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 whitespace-nowrap font-display text-sm font-semibold sm:text-base">
                Lv. {character.level}
                {pct != null ? (
                  <span className="ml-1.5 text-sm font-medium opacity-70">
                    ({pct.toFixed(2)}%)
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs opacity-70 sm:text-sm">
                {job}
                {world ? ` in ${world}` : ""}
                {` · ${region}`}
              </p>
            </div>

            {actions ? (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            ) : null}
          </div>

          <div className="mt-2 max-w-sm">
            <div className="mb-1 flex justify-between gap-3 font-mono text-[0.65rem] tabular-nums text-foreground/60 sm:text-xs">
              <span>{formatCompact(character.exp)}</span>
              <span>
                {need != null ? formatCompact(need) : "Max level"}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${pct ?? 0}%` }}
              />
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
            <MiniStat
              label={rankStats[0]!.label}
              value={rankStats[0]!.value}
            />
            <MiniStat
              label={rankStats[1]!.label}
              value={rankStats[1]!.value}
            />
            <MiniStat label={rankStats[2]!.label} value={rankStats[2]!.value} />
            <MiniStat label={rankStats[3]!.label} value={rankStats[3]!.value} />
          </div>
        </div>
      </div>

      {!hideCharts ? (
        <div className="border-t border-border/40 px-3 pb-3 pt-2 sm:px-3.5 sm:pb-3.5">
          <ExpRangeGraph
            graph={character.graph}
            averages={character.expAverages}
            compact
            sectionLead
            chartHeight={168}
          />
          <LevelProgressGraph
            graph={character.graph}
            compact
            chartHeight={152}
          />
        </div>
      ) : null}
    </article>
  );
}

function FullCharacterProfile({
  character,
  actions,
  showOpenInScouter = true,
}: {
  character: CharacterLookupResult;
  actions?: ReactNode;
  showOpenInScouter?: boolean;
}) {
  const router = useRouter();
  const [expRangeDays, setExpRangeDays] = useState<ExpRangeDays>(7);
  const pct = character.expPercent;
  const regionLabel = character.region.toUpperCase();
  const job = character.jobName;
  const world = character.worldName;
  const ranking = character.ranking;
  const need = character.expToNext;
  const avg7 = character.expAverages?.avg7d ?? null;
  const avg14 = character.expAverages?.avg14d ?? null;
  const avg30 = character.expAverages?.avg30d ?? null;
  const avg90 = character.expAverages?.avg90d ?? null;
  const dailyExp = character.graph?.dailyExp ?? [];

  const avgByDays = (days: ExpRangeDays): string | null => {
    if (days === 7) return avg7;
    if (days === 14) return avg14;
    if (days === 30) return avg30;
    return avg90;
  };
  const selectedAvgLabel = avgByDays(expRangeDays);
  const selectedAvgN = parseCompactExp(selectedAvgLabel);

  const metric = (
    label: string,
    avgLabel: string | null,
    days: ExpRangeDays,
  ) => {
    const avgN = parseCompactExp(avgLabel);
    const total = sumSlice(dailyExp, days);
    const dailyPct =
      avgN != null && need != null && need > 0
        ? `${((avgN / need) * 100).toFixed(2)}%`
        : "—";
    return (
      <MetricCard
        key={label}
        label={label}
        avg={avgLabel?.replace(/\/day$/i, "") ?? "—"}
        dailyPct={dailyPct}
        total={total != null ? formatCompact(total) : "—"}
        selected={expRangeDays === days}
        onSelect={() => setExpRangeDays(days)}
      />
    );
  };

  const canShowEta =
    character.level < 300 &&
    selectedAvgN != null;

  const hasLevelProgress = Boolean(character.graph?.levels?.length);
  const hasExpSection =
    Boolean(character.expAverages) ||
    Boolean(dailyExp.length) ||
    hasLevelProgress;

  const overall = ranking?.globalRank ?? character.overallRank;
  const jobGlobal = ranking?.jobGlobalRank ?? character.classRank;

  return (
    <div className="flex flex-col gap-5">
      {/* MapleRanks-style split: identity + side stats | charts */}
      <div className="grid gap-5 xl:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)] xl:items-start xl:gap-6">
        <div className="flex flex-col gap-4">
          <section className="overflow-hidden rounded-2xl border-2 border-border bg-surface">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start xl:flex-col xl:items-stretch">
              <div className="flex shrink-0 justify-center sm:justify-start xl:justify-center">
                {character.characterImgURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={character.characterImgURL}
                    alt={`${character.name} avatar`}
                    width={200}
                    height={200}
                    className="mx-auto h-[180px] w-[180px] object-contain object-center sm:mx-0 sm:h-[200px] sm:w-[200px] xl:mx-auto"
                  />
                ) : (
                  <div className="mx-auto flex h-[180px] w-[180px] items-center justify-center rounded-xl bg-surface-muted text-sm opacity-60 sm:mx-0 sm:h-[200px] sm:w-[200px] xl:mx-auto">
                    No image
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                      {character.name}
                    </h2>
                    {character.isHeroic ? (
                      <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                        Heroic
                      </span>
                    ) : (
                      <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold opacity-70">
                        Interactive
                      </span>
                    )}
                    {world ? (
                      <span className="rounded-md border border-border px-2 py-0.5 text-xs font-semibold opacity-70">
                        {world}
                      </span>
                    ) : null}
                  </div>
                  {actions ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {actions}
                    </div>
                  ) : null}
                </div>

                <p className="mt-1.5 text-base text-foreground/75">
                  {job} in {world}
                  <span className="ml-1.5 text-sm opacity-60">
                    ({regionLabel})
                  </span>
                </p>

                <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
                  Lv. {character.level}
                  {pct != null ? (
                    <span className="ml-2 text-lg font-medium text-foreground/60">
                      ({pct.toFixed(3)}%)
                    </span>
                  ) : null}
                </p>

                <div className="mt-3 max-w-md">
                  <div className="mb-1.5 flex justify-between gap-3 font-mono text-xs tabular-nums text-foreground/65">
                    <span>{formatCompact(character.exp)}</span>
                    <span>
                      {need != null
                        ? formatCompact(need)
                        : "Max level"}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-accent transition-[width]"
                      style={{ width: `${pct ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1">
                  <RankChip
                    label={job ?? "Class"}
                    value={formatRank(ranking?.jobRank)}
                  />
                  <RankChip
                    label={world ?? "World"}
                    value={formatRank(ranking?.worldRank)}
                  />
                  <RankChip
                    label={`GMS ${regionLabel}`}
                    value={formatRank(overall)}
                  />
                </div>

                <p className="mt-4 text-xs leading-relaxed text-foreground/45">
                  Sources: {character.sources.join(" · ")} · fetched{" "}
                  {new Date(character.fetchedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Panel title="Rankings">
              <StatRow
                label={`${job} in ${world}`}
                value={formatRank(ranking?.jobRank)}
              />
              <StatRow
                label={`${world} rank`}
                value={formatRank(ranking?.worldRank)}
              />
              <StatRow
                label={`${job} in GMS ${regionLabel}`}
                value={formatRank(jobGlobal)}
              />
              <StatRow
                label={`GMS ${regionLabel} overall`}
                value={formatRank(overall)}
              />
              <StatRow label="Fame" value={formatOptionalInt(character.fame)} />
            </Panel>

            <Panel
              title="Legion"
              footer={
                !character.legionLevel ? (
                  <p className="mt-3 text-xs leading-relaxed text-foreground/50">
                    Legion stats appear on the account’s highest-level character
                    in the world (same rule as official rankings).
                  </p>
                ) : null
              }
            >
              <StatRow
                label={`${world} legion rank`}
                value={formatRank(ranking?.legionRank)}
              />
              <StatRow
                label="Legion level"
                value={formatOptionalInt(character.legionLevel)}
              />
              <StatRow
                label="Raid power"
                value={formatOptionalInt(character.raidPower)}
              />
            </Panel>

            {character.achievementTiercore != null ||
            character.achievementTierId != null ? (
              <Panel title="Achievement">
                <StatRow
                  label="Score"
                  value={formatOptionalInt(character.achievementTiercore)}
                />
                <StatRow
                  label="Tier id"
                  value={formatOptionalInt(character.achievementTierId)}
                />
              </Panel>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {dailyExp.length || character.expAverages ? (
            <section className="min-h-[22rem] rounded-2xl border border-border/60 bg-surface/90 p-5 sm:min-h-[26rem] sm:p-6 xl:p-7">
              <div className="relative flex flex-wrap items-end justify-between gap-2">
                <h3 className="font-display text-base font-bold uppercase tracking-[0.14em] text-accent sm:text-lg">
                  Daily Exp Gained
                </h3>
                <ExpRangeDayLinks
                  days={expRangeDays}
                  onChange={setExpRangeDays}
                  ariaLabel="Daily EXP history range"
                />
              </div>

              <ExpRangeGraph
                graph={character.graph}
                averages={character.expAverages}
                showAvg={false}
                days={expRangeDays}
                onDaysChange={setExpRangeDays}
                hideRangePicker
              />

              {character.expAverages ? (
                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {metric("7d", avg7, 7)}
                  {metric("14d", avg14, 14)}
                  {metric("30d", avg30, 30)}
                  {metric("90d", avg90, 90)}
                </div>
              ) : null}

              {canShowEta ? (
                <EtaToLevelSection
                  level={character.level}
                  exp={character.exp}
                  avgRate={selectedAvgN}
                  avgLabel={selectedAvgLabel}
                  rangeDays={expRangeDays}
                />
              ) : null}
            </section>
          ) : null}

          {hasLevelProgress ? (
            <section className="rounded-2xl border border-border/60 bg-surface/90 p-4 sm:p-5 xl:p-6">
              <LevelProgressGraph
                graph={character.graph}
                days={expRangeDays}
                onDaysChange={setExpRangeDays}
              />
            </section>
          ) : null}

          {!hasExpSection ? (
            <section className="rounded-2xl border border-dashed border-border/50 bg-surface/60 px-4 py-10 text-center text-sm text-foreground/55">
              No tracked daily EXP yet (available for characters MapleHub
              watches at Lv. 215+).
            </section>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 text-sm">
        {showOpenInScouter ? (
          <button
            type="button"
            onClick={() => {
              applyCharacterLookupToScouter(character);
              router.push(SCOUTER_FROM_LOOKUP_HREF);
            }}
            className="rounded-lg border border-border px-3 py-1.5 font-semibold transition hover:bg-surface-muted"
          >
            Open in Scouter
          </button>
        ) : null}
        <a
          href={`https://mapleranks.com/u/${character.region === "eu" ? "eu/" : ""}${encodeURIComponent(character.name)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-border px-3 py-1.5 font-semibold transition hover:bg-surface-muted"
        >
          Open on MapleRanks ↗
        </a>
        <a
          href={`https://maplehub.app/roster/${character.region}/${encodeURIComponent(character.name)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-border px-3 py-1.5 font-semibold transition hover:bg-surface-muted"
        >
          Open on MapleHub ↗
        </a>
      </div>

      <p className="text-xs text-foreground/45">{character.note}</p>
    </div>
  );
}

export function CharacterProfile({
  character,
  compact = false,
  dense = false,
  hideCharts = false,
  actions,
  showOpenInScouter = true,
}: {
  character: CharacterLookupResult;
  /**
   * Dense roster / search preview: avatar, ranks, EXP bar, compact Daily EXP
   * spark. Full MapleRanks layout remains the default for dedicated pages.
   */
  compact?: boolean;
  /**
   * Tighter than compact (dashboard Primary): smaller avatar/padding, ranks +
   * EXP bar, and compact Daily EXP graph.
   */
  dense?: boolean;
  /** Hide Daily EXP / Level Progress charts (search result preview). */
  hideCharts?: boolean;
  /** Optional action buttons (Save, Add to roster, etc.). */
  actions?: ReactNode;
  /** Full profile footer link into Scouter (hidden on Character Search). */
  showOpenInScouter?: boolean;
}) {
  if (compact || dense) {
    return (
      <CompactCharacterProfile
        character={character}
        actions={actions}
        dense={dense}
        hideCharts={hideCharts}
      />
    );
  }
  return (
    <FullCharacterProfile
      character={character}
      actions={actions}
      showOpenInScouter={showOpenInScouter}
    />
  );
}

/** Search-result actions for compact profile (View + Add, optional Use as active). */
export function CharacterSearchActions({
  character,
  alreadyOnRoster,
  adding,
  onAdd,
  onUseActive,
  usingActive,
}: {
  character: CharacterLookupResult;
  alreadyOnRoster: boolean;
  adding?: boolean;
  onAdd: () => void;
  /** When set, show primary “Use as active” for tool pages (e.g. Scouter pairing). */
  onUseActive?: () => void;
  usingActive?: boolean;
}) {
  const profileHref = characterProfileHref(character);
  return (
    <>
      {onUseActive ? (
        <button
          type="button"
          onClick={onUseActive}
          disabled={usingActive}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {usingActive ? "Switching…" : "Use as active"}
        </button>
      ) : null}
      <Link
        href={profileHref}
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
      >
        View
      </Link>
      {alreadyOnRoster ? (
        <span className="rounded-lg border border-border/60 bg-surface-muted px-3 py-1.5 text-sm font-semibold opacity-70">
          On roster
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          disabled={adding}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add to roster"}
        </button>
      )}
    </>
  );
}
