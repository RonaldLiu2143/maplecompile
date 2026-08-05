"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ExpRangeGraph } from "@/components/character/ExpRangeGraph";
import {
  daysToLevel,
  formatCompact,
  parseCompactExp,
} from "@/lib/character/exp";
import { formatOptionalInt, formatRank } from "@/lib/character/format";
import type { CharacterLookupResult } from "@/lib/character/lookup";

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border/70 bg-surface-muted/50 px-2 py-0.5 text-[0.7rem] font-semibold tabular-nums">
      {children}
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
      <h3 className="font-display text-[0.7rem] font-bold uppercase tracking-[0.14em] text-accent">
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
    <div className="rounded-xl border border-border/45 bg-surface-muted/35 px-3 py-2.5">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
        {label}
      </p>
      <dl className="mt-1.5 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-[0.7rem] text-foreground/55">Daily avg</dt>
          <dd className="font-mono text-sm font-bold tabular-nums">{avg}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-[0.7rem] text-foreground/55">Daily %</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums">
            {dailyPct}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-[0.7rem] text-foreground/55">Total</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums">
            {total}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function formatDays(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n < 10) return `${n.toFixed(1)} days`;
  return `${Math.round(n)} days`;
}

function sumSlice(values: number[], days: number): number | null {
  if (!values.length) return null;
  const slice = values.slice(-days);
  if (!slice.length) return null;
  return slice.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

export function CharacterProfile({
  character,
  embedded,
}: {
  character: CharacterLookupResult;
  /** Hide standalone-page chrome (e.g. Back to Roster) when shown inline. */
  embedded?: boolean;
}) {
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

  const hasExpSection =
    Boolean(character.expAverages) || Boolean(dailyExp.length);

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
                <div className="flex flex-wrap items-center gap-2">
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
                  {character.isMain ? (
                    <span className="rounded-md border border-border px-2 py-0.5 text-xs font-semibold opacity-70">
                      World main
                    </span>
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

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Chip>
                    {job} · {formatRank(ranking?.jobRank)}
                  </Chip>
                  <Chip>
                    {world} · {formatRank(ranking?.worldRank)}
                  </Chip>
                  <Chip>
                    GMS {regionLabel} · {formatRank(overall)}
                  </Chip>
                </div>

                <p className="mt-4 text-[0.7rem] leading-relaxed text-foreground/45">
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
                  <p className="mt-3 text-[0.7rem] leading-relaxed text-foreground/50">
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
          {hasExpSection ? (
            <section className="rounded-2xl border border-border/60 bg-surface/90 p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h3 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-accent">
                  Daily Exp Gained
                </h3>
                <p className="text-[0.7rem] text-foreground/50">
                  Tracked history (MapleHub)
                </p>
              </div>

              {character.expAverages ? (
                <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
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
                <div className="mt-5 border-t border-border/40 pt-4">
                  <h4 className="font-display text-[0.7rem] font-bold uppercase tracking-[0.14em] text-foreground/55">
                    ETA to Level
                  </h4>
                  <p className="mt-1 text-[0.7rem] text-foreground/50">
                    Using 7d average daily EXP (
                    {avg7?.replace(/\/day$/i, "") ?? formatCompact(avg7n)}
                    /day)
                  </p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {etaTargets.map((lv) => (
                      <li
                        key={lv}
                        className="flex items-baseline justify-between gap-3 rounded-lg bg-surface-muted/40 px-3 py-2"
                      >
                        <span className="text-sm font-semibold">Lv. {lv}</span>
                        <span className="font-mono text-sm tabular-nums text-foreground/75">
                          {formatDays(
                            daysToLevel(
                              character.level,
                              character.exp,
                              lv,
                              avg7n,
                            ),
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-border/50 bg-surface/60 px-4 py-10 text-center text-sm text-foreground/55">
              No tracked daily EXP yet (available for characters MapleHub
              watches at Lv. 215+).
            </section>
          )}

          <section className="rounded-xl border border-dashed border-border/45 bg-surface/40 p-4">
            <h3 className="font-display text-[0.7rem] font-bold uppercase tracking-[0.14em] text-foreground/55">
              Not available yet
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-foreground/55">
              <li>Nearby mini-leaderboards — MapleRanks-only historical board</li>
              <li>Fashion history — {character.stubs.fashion}</li>
              <li>Gear / set — {character.stubs.gear}</li>
              <li>Combat power — {character.stubs.combatPower}</li>
              <li>
                Achievement history — {character.stubs.achievementHistory}
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 text-sm">
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
        {!embedded ? (
          <Link
            href="/roster"
            className="rounded-lg border border-border px-3 py-1.5 font-semibold transition hover:bg-surface-muted"
          >
            Back to Manager
          </Link>
        ) : null}
      </div>

      <p className="text-xs text-foreground/45">{character.note}</p>
    </div>
  );
}
