"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ExpRangeGraph } from "@/components/character/ExpRangeGraph";
import { characterProfileHref } from "@/lib/character/client";
import {
  daysToLevel,
  expPercent,
  expRemainingToLevel,
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[0.65rem] font-semibold uppercase tracking-wider opacity-55">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function formatDays(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n < 10) return `${n.toFixed(1)} days`;
  return `${Math.round(n)} days`;
}

function defaultAvgInput(avg7n: number, avg7Label: string | null): string {
  if (avg7Label) {
    return avg7Label.replace(/\/day$/i, "").trim();
  }
  return formatCompact(avg7n);
}

/** Project level after gaining `gained` EXP from current progress. */
function projectAfterExp(
  level: number,
  exp: number,
  gained: number,
): { level: number; exp: number; pct: number | null } {
  let walkLv = level;
  let walkExp = exp;
  let pool = Math.max(0, gained);
  while (pool > 0 && walkLv < 300) {
    const rem = expRemainingToLevel(walkLv, walkExp, walkLv + 1);
    if (rem == null || rem <= 0) break;
    if (pool < rem) {
      walkExp += pool;
      pool = 0;
      break;
    }
    pool -= rem;
    walkLv += 1;
    walkExp = 0;
  }
  return {
    level: walkLv,
    exp: walkExp,
    pct: expPercent(walkLv, walkExp),
  };
}

/**
 * ETA to next levels using the 7d average as the base rate.
 * Toggle: override daily EXP, or enter a time window to project progress.
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
  const [mode, setMode] = useState<"exp" | "time">("exp");
  const [expInput, setExpInput] = useState(() =>
    defaultAvgInput(avg7n, avg7Label),
  );
  const [daysInput, setDaysInput] = useState("7");

  const rate = useMemo(() => {
    if (mode === "time") return avg7n;
    const parsed = parseCompactExp(expInput);
    return parsed != null && parsed > 0 ? parsed : avg7n;
  }, [mode, expInput, avg7n]);

  const windowDays = useMemo(() => {
    const n = Number(String(daysInput).trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [daysInput]);

  const projected = useMemo(() => {
    if (mode !== "time" || windowDays == null) return null;
    const gained = windowDays * avg7n;
    return { gained, ...projectAfterExp(level, exp, gained) };
  }, [mode, windowDays, avg7n, level, exp]);

  const baseLabel = avg7Label?.replace(/\/day$/i, "") ?? formatCompact(avg7n);

  return (
    <div className="mt-5 border-t border-border/40 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h4 className="font-display text-[0.7rem] font-bold uppercase tracking-[0.14em] text-foreground/55">
            ETA to Level
          </h4>
          <p className="mt-1 text-[0.7rem] text-foreground/50">
            Base rate: 7d average ({baseLabel}/day)
          </p>
        </div>
        <div
          className="inline-flex rounded-lg border border-border/60 bg-surface-muted/40 p-0.5"
          role="group"
          aria-label="ETA input mode"
        >
          {(
            [
              ["exp", "Daily EXP"],
              ["time", "Time"],
            ] as const
          ).map(([id, label]) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold transition ${
                  active
                    ? "bg-accent text-white dark:text-zinc-900"
                    : "opacity-70 hover:bg-surface-muted hover:opacity-100"
                }`}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        {mode === "exp" ? (
          <label className="flex max-w-xs flex-col gap-1">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
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
            <span id="eta-exp-hint" className="text-[0.65rem] text-foreground/45">
              Defaults to 7d avg — edit to recalculate ETAs (e.g. 12.5T)
            </span>
          </label>
        ) : (
          <label className="flex max-w-xs flex-col gap-1">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-foreground/50">
              Days of grinding
            </span>
            <input
              type="number"
              min={0.1}
              step="any"
              value={daysInput}
              onChange={(e) => setDaysInput(e.target.value)}
              className="rounded-lg border border-border/60 bg-surface px-3 py-1.5 font-mono text-sm tabular-nums outline-none focus:border-accent"
              aria-describedby="eta-time-hint"
            />
            <span id="eta-time-hint" className="text-[0.65rem] text-foreground/45">
              Projects progress at the 7d average rate
            </span>
          </label>
        )}
      </div>

      {projected ? (
        <p className="mt-3 rounded-lg bg-surface-muted/40 px-3 py-2 text-sm text-foreground/75">
          In {windowDays} day{windowDays === 1 ? "" : "s"} at 7d avg you gain{" "}
          <span className="font-mono font-semibold tabular-nums text-foreground">
            {formatCompact(projected.gained)}
          </span>
          {" → "}
          <span className="font-semibold text-foreground">
            Lv. {projected.level}
            {projected.pct != null ? (
              <span className="ml-1 font-mono text-sm font-medium tabular-nums text-foreground/60">
                ({projected.pct.toFixed(2)}%)
              </span>
            ) : null}
          </span>
        </p>
      ) : null}

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {targets.map((lv) => {
          const days = daysToLevel(level, exp, lv, rate);
          const withinWindow =
            mode === "time" &&
            windowDays != null &&
            days != null &&
            days <= windowDays;
          return (
            <li
              key={lv}
              className="flex items-baseline justify-between gap-3 rounded-lg bg-surface-muted/40 px-3 py-2"
            >
              <span className="text-sm font-semibold">
                Lv. {lv}
                {withinWindow ? (
                  <span className="ml-1.5 text-[0.65rem] font-semibold text-accent">
                    in window
                  </span>
                ) : null}
              </span>
              <span className="font-mono text-sm tabular-nums text-foreground/75">
                {formatDays(days)}
              </span>
            </li>
          );
        })}
      </ul>
      {mode === "exp" && rate !== avg7n ? (
        <p className="mt-2 text-[0.65rem] text-foreground/45">
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
  /** Dashboard-tight: smaller chrome, no EXP spark chart (keeps bar + ranks). */
  dense?: boolean;
}) {
  const world = character.worldName;
  const job = character.jobName;
  const region = character.region.toUpperCase();
  const ranking = character.ranking;
  const pct = character.expPercent;
  const need = character.expToNext;
  const avg7 = character.expAverages?.avg7d ?? null;

  const classInWorld = formatRank(ranking?.jobRank);
  const worldRank = formatRank(ranking?.worldRank);
  const gmsOverall = formatRank(ranking?.globalRank ?? character.overallRank);
  const legion = formatOptionalInt(character.legionLevel);

  const avatarPx = dense ? 64 : 88;

  return (
    <article
      className={
        dense
          ? "overflow-hidden rounded-xl border border-border/50 bg-surface"
          : "overflow-hidden rounded-2xl border-2 border-border bg-surface"
      }
    >
      <div
        className={`flex flex-col sm:flex-row sm:items-start ${
          dense ? "gap-3 p-2.5 sm:p-3" : "gap-4 p-4"
        }`}
      >
        <div className="flex shrink-0 justify-center sm:justify-start">
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
              className="flex items-center justify-center rounded-lg bg-surface-muted text-[0.65rem] opacity-60"
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
                <h2
                  className={`font-display font-bold tracking-tight ${
                    dense ? "text-lg" : "text-xl"
                  }`}
                >
                  {character.name}
                </h2>
                {character.isHeroic ? (
                  <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[0.65rem] font-semibold text-accent">
                    Heroic
                  </span>
                ) : null}
                {character.isMain ? (
                  <span className="rounded-md border border-border px-1.5 py-0.5 text-[0.65rem] font-semibold opacity-70">
                    World main
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-0.5 font-display font-semibold ${
                  dense ? "text-sm" : "text-base"
                }`}
              >
                Lv. {character.level}
                {pct != null ? (
                  <span className="ml-1.5 text-sm font-medium opacity-70">
                    ({pct.toFixed(2)}%)
                  </span>
                ) : null}
              </p>
              <p className={`mt-0.5 opacity-70 ${dense ? "text-xs" : "text-sm"}`}>
                {job}
                {world ? ` in ${world}` : ""}
                {` · ${region}`}
              </p>
            </div>

            {actions ? (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            ) : null}
          </div>

          <div className={`max-w-sm ${dense ? "mt-2" : "mt-3"}`}>
            <div className="mb-1 flex justify-between gap-3 font-mono text-[0.65rem] tabular-nums text-foreground/60">
              <span>{formatCompact(character.exp)}</span>
              <span>
                {need != null ? formatCompact(need) : "Max level"}
              </span>
            </div>
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

          <div
            className={`grid grid-cols-2 sm:grid-cols-4 ${
              dense ? "mt-2 gap-x-3 gap-y-1.5" : "mt-3 gap-x-4 gap-y-2"
            }`}
          >
            <MiniStat
              label={world ? `${job} (${world})` : `${job} rank`}
              value={classInWorld}
            />
            <MiniStat
              label={world ? `${world} rank` : "World rank"}
              value={worldRank}
            />
            <MiniStat label={`GMS ${region}`} value={gmsOverall} />
            <MiniStat label="Legion" value={legion} />
          </div>

          {dense ? (
            avg7 ? (
              <p className="mt-2 font-mono text-xs tabular-nums text-foreground/65">
                <span className="mr-1.5 text-[0.65rem] font-semibold uppercase tracking-wider opacity-55">
                  7d avg
                </span>
                {avg7.replace(/\/day$/i, "")}
                <span className="opacity-55">/day</span>
              </p>
            ) : null
          ) : (
            <ExpRangeGraph
              graph={character.graph}
              averages={character.expAverages}
              compact
            />
          )}
        </div>
      </div>
    </article>
  );
}

function FullCharacterProfile({
  character,
  embedded,
}: {
  character: CharacterLookupResult;
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
                <EtaToLevelSection
                  level={character.level}
                  exp={character.exp}
                  avg7n={avg7n}
                  avg7Label={avg7}
                  targets={etaTargets}
                />
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

export function CharacterProfile({
  character,
  embedded,
  compact = false,
  dense = false,
  actions,
}: {
  character: CharacterLookupResult;
  /** Hide standalone-page chrome (e.g. Back to Roster) when shown inline. */
  embedded?: boolean;
  /**
   * Dense roster / search preview: avatar, ranks, EXP bar, compact Daily EXP
   * spark. Full MapleRanks layout remains the default for dedicated pages.
   */
  compact?: boolean;
  /**
   * Tighter than compact (dashboard Primary): smaller avatar/padding, ranks +
   * EXP bar, optional 7d avg line — no spark chart.
   */
  dense?: boolean;
  /** Optional action buttons (e.g. Add to roster) for compact search results. */
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
  return <FullCharacterProfile character={character} embedded={embedded} />;
}

/** Search-result actions for compact profile (View + Add). */
export function CharacterSearchActions({
  character,
  alreadyOnRoster,
  adding,
  onAdd,
}: {
  character: CharacterLookupResult;
  alreadyOnRoster: boolean;
  adding?: boolean;
  onAdd: () => void;
}) {
  const profileHref = characterProfileHref(character);
  return (
    <>
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
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 dark:text-zinc-900"
        >
          {adding ? "Adding…" : "Add to roster"}
        </button>
      )}
    </>
  );
}
