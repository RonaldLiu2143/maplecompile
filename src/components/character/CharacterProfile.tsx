"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ExpRangeGraph,
  LevelProgressGraph,
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
}: {
  label: string;
  avg: string;
  dailyPct: string;
  total: string;
}) {
  return (
    <div className="rounded-xl border border-border/45 bg-surface-muted/35 px-3.5 py-3 sm:px-4 sm:py-3.5">
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
    </div>
  );
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
  if (n < 10) return n.toFixed(1);
  return String(Math.round(n));
}

function defaultAvgInput(avg7n: number, avg7Label: string | null): string {
  if (avg7Label) {
    return avg7Label.replace(/\/day$/i, "").trim();
  }
  return formatCompact(avg7n);
}

/**
 * ETA to next levels using the 7d average as the base rate.
 * Edit daily EXP to recalculate ETAs, or edit a milestone's days to set the
 * required daily rate for that target (remaining EXP / days).
 */
function EtaToLevelSection({
  level,
  exp,
  avg7n,
  avg7Label,
  targets,
}: {
  level: number;
  exp: number;
  avg7n: number;
  avg7Label: string | null;
  targets: number[];
}) {
  const [expInput, setExpInput] = useState(() =>
    defaultAvgInput(avg7n, avg7Label),
  );
  const [editingDays, setEditingDays] = useState<{
    lv: number;
    value: string;
  } | null>(null);

  const rate = useMemo(() => {
    const parsed = parseCompactExp(expInput);
    return parsed != null && parsed > 0 ? parsed : avg7n;
  }, [expInput, avg7n]);

  const baseLabel = avg7Label?.replace(/\/day$/i, "") ?? formatCompact(avg7n);

  function commitDays(lv: number, raw: string) {
    setEditingDays(null);
    const n = Number(String(raw).trim());
    if (!Number.isFinite(n) || n <= 0) return;
    const remaining = expRemainingToLevel(level, exp, lv);
    if (remaining == null || remaining <= 0) return;
    setExpInput(formatCompact(remaining / n));
  }

  return (
    <div className="mt-5 border-t border-border/40 pt-4">
      <div>
        <h4 className="font-display text-xs font-bold uppercase tracking-[0.14em] text-foreground/55">
          ETA to Level
        </h4>
        <p className="mt-1 text-xs text-foreground/50">
          Base rate: 7d average ({baseLabel}/day)
        </p>
      </div>

      <div className="mt-3">
        <label className="flex max-w-xs flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Daily EXP rate
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={expInput}
            onChange={(e) => setExpInput(e.target.value)}
            placeholder={baseLabel}
            className="rounded-lg border border-border/60 bg-surface px-3 py-1.5 font-mono text-sm tabular-nums outline-none focus:border-accent"
            aria-describedby="eta-exp-hint"
          />
          <span id="eta-exp-hint" className="text-xs text-foreground/45">
            Edit rate or a milestone&apos;s days to keep ETAs consistent
          </span>
        </label>
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {targets.map((lv) => {
          const remaining = expRemainingToLevel(level, exp, lv);
          const days = daysToLevel(level, exp, lv, rate);
          const canEdit = remaining != null && remaining > 0;
          const displayDays =
            editingDays?.lv === lv
              ? editingDays.value
              : days != null && Number.isFinite(days)
                ? formatDaysNumber(days)
                : "";

          return (
            <li
              key={lv}
              className="flex items-baseline justify-between gap-3 rounded-lg bg-surface-muted/40 px-3 py-2"
            >
              <span className="text-sm font-semibold">Lv. {lv}</span>
              {canEdit ? (
                <label className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-foreground/75">
                  <span className="sr-only">Days to Lv. {lv}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={displayDays}
                    placeholder="—"
                    onFocus={() =>
                      setEditingDays({
                        lv,
                        value:
                          days != null && Number.isFinite(days)
                            ? formatDaysNumber(days)
                            : "",
                      })
                    }
                    onChange={(e) =>
                      setEditingDays({ lv, value: e.target.value })
                    }
                    onBlur={(e) => commitDays(lv, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      } else if (e.key === "Escape") {
                        setEditingDays(null);
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-14 rounded border border-border bg-background px-2 py-1 text-right outline-none focus:border-accent"
                    aria-label={`Days to reach level ${lv}`}
                  />
                  <span className="text-foreground/55">days</span>
                </label>
              ) : (
                <span className="font-mono text-sm tabular-nums text-foreground/45">
                  —
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {rate !== avg7n ? (
        <p className="mt-2 text-xs text-foreground/45">
          Using custom rate {formatCompact(rate)}/day (7d avg{" "}
          {formatCompact(avg7n)}/day)
        </p>
      ) : null}
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
}: {
  character: CharacterLookupResult;
  actions?: ReactNode;
  /** Dashboard-tight: smaller chrome; still includes Daily EXP graph. */
  dense?: boolean;
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

  const avatarPx = dense ? 56 : 88;

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
      <article className="overflow-hidden rounded-xl border border-border/50 bg-surface">
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
              </div>

              <RankStatsGrid
                items={rankStats}
                className="hidden shrink-0 sm:grid lg:gap-x-5"
              />
            </div>

            <div className="mt-1.5 max-w-xs min-w-0 sm:max-w-sm">
              <div className="mb-0.5 flex justify-between gap-2 font-mono text-xs tabular-nums text-foreground/60">
                <span>{formatCompact(character.exp)}</span>
                <span>{need != null ? formatCompact(need) : "Max level"}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-accent transition-[width]"
                  style={{ width: `${pct ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 px-2 pb-2 pt-1.5 sm:px-2.5">
          <div className="mb-1.5 sm:hidden">
            <RankStatsGrid items={rankStats} className="gap-x-3" />
          </div>
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
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border-2 border-border bg-surface">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
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
                <h2 className="font-display text-xl font-bold tracking-tight">
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
              <p className="mt-0.5 font-display text-base font-semibold">
                Lv. {character.level}
                {pct != null ? (
                  <span className="ml-1.5 text-sm font-medium opacity-70">
                    ({pct.toFixed(2)}%)
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-sm opacity-70">
                {job}
                {world ? ` in ${world}` : ""}
                {` · ${region}`}
              </p>
            </div>

            {actions ? (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            ) : null}
          </div>

          <div className="mt-3 max-w-sm">
            <div className="mb-1 flex justify-between gap-3 font-mono text-xs tabular-nums text-foreground/60">
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

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
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

          <ExpRangeGraph
            graph={character.graph}
            averages={character.expAverages}
            compact
          />
          <LevelProgressGraph graph={character.graph} compact />
        </div>
      </div>
    </article>
  );
}

function FullCharacterProfile({
  character,
  actions,
}: {
  character: CharacterLookupResult;
  actions?: ReactNode;
}) {
  const router = useRouter();
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
  const avg7n = parseCompactExp(avg7);
  const dailyExp = character.graph?.dailyExp ?? [];

  const metric = (
    label: string,
    avgLabel: string | null,
    days: number,
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
      />
    );
  };

  const etaTargets = [1, 2, 3, 4]
    .map((d) => character.level + d)
    .filter((lv) => lv <= 300 && lv > character.level);

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
      <div className="grid gap-5 xl:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)] xl:items-start">
        <div className="flex flex-col gap-4">
          <section className="overflow-hidden rounded-2xl border-2 border-border bg-surface">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start xl:flex-col xl:items-stretch">
              <div className="flex shrink-0 justify-center sm:justify-start">
                {character.characterImgURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={character.characterImgURL}
                    alt={`${character.name} avatar`}
                    width={200}
                    height={200}
                    className="h-[180px] w-[180px] object-contain sm:h-[200px] sm:w-[200px]"
                  />
                ) : (
                  <div className="flex h-[180px] w-[180px] items-center justify-center rounded-xl bg-surface-muted text-sm opacity-60 sm:h-[200px] sm:w-[200px]">
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
            <section className="min-h-[22rem] rounded-2xl border border-border/60 bg-surface/90 p-5 sm:min-h-[26rem] sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h3 className="font-display text-base font-bold uppercase tracking-[0.14em] text-accent sm:text-lg">
                  Daily Exp Gained
                </h3>
                <p className="text-xs text-foreground/50">
                  Tracked history (MapleHub)
                </p>
              </div>

              {character.expAverages ? (
                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {metric("7d", avg7, 7)}
                  {metric("14d", avg14, 14)}
                  {metric("30d", avg30, 30)}
                  {metric("90d", avg90, 90)}
                </div>
              ) : null}

              <ExpRangeGraph
                graph={character.graph}
                averages={character.expAverages}
                showAvg={false}
              />

              {avg7n != null && etaTargets.length > 0 ? (
                <EtaToLevelSection
                  level={character.level}
                  exp={character.exp}
                  avg7n={avg7n}
                  avg7Label={avg7}
                  targets={etaTargets}
                />
              ) : null}
            </section>
          ) : null}

          {hasLevelProgress ? (
            <section className="rounded-2xl border border-border/60 bg-surface/90 p-3 sm:p-4">
              <LevelProgressGraph graph={character.graph} />
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
  actions,
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
  /** Optional action buttons (Save, Add to roster, etc.). */
  actions?: ReactNode;
}) {
  if (compact || dense) {
    return (
      <CompactCharacterProfile
        character={character}
        actions={actions}
        dense={dense}
      />
    );
  }
  return (
    <FullCharacterProfile
      character={character}
      actions={actions}
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
