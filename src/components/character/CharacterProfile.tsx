"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ExpRangeGraph } from "@/components/character/ExpRangeGraph";
import { formatCompact } from "@/lib/character/exp";
import { formatOptionalInt, formatRank } from "@/lib/character/format";
import type { CharacterLookupResult } from "@/lib/character/lookup";

function StatRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-sm opacity-70">{label}</dt>
      <dd className="font-mono text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function CharacterProfile({
  character,
}: {
  character: CharacterLookupResult;
}) {
  const pct = character.expPercent;
  const regionLabel = character.region.toUpperCase();
  const job = character.jobName;
  const world = character.worldName;
  const ranking = character.ranking;

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-2xl border-2 border-border bg-surface">
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start">
          <div className="flex shrink-0 justify-center sm:justify-start">
            {character.characterImgURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={character.characterImgURL}
                alt={`${character.name} avatar`}
                width={160}
                height={160}
                className="h-[160px] w-[160px] object-contain"
              />
            ) : (
              <div className="flex h-[160px] w-[160px] items-center justify-center rounded-lg bg-surface-muted text-sm opacity-60">
                No image
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-3xl font-bold tracking-tight">
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
            <p className="mt-1 text-sm opacity-75">
              {job} in {world} ({regionLabel})
            </p>
            <p className="mt-2 font-display text-xl font-semibold">
              Lv. {character.level}
              {pct != null ? (
                <span className="ml-2 text-base font-medium opacity-70">
                  ({pct.toFixed(3)}%)
                </span>
              ) : null}
            </p>

            <div className="mt-3 max-w-md">
              <div className="mb-1 flex justify-between text-xs opacity-65">
                <span>{formatCompact(character.exp)} EXP</span>
                <span>
                  {character.expToNext != null
                    ? `${formatCompact(character.expToNext)} to next`
                    : "Max level"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-accent transition-[width]"
                  style={{ width: `${pct ?? 0}%` }}
                />
              </div>
            </div>

            <p className="mt-4 text-xs opacity-55">
              Sources: {character.sources.join(" · ")} · fetched{" "}
              {new Date(character.fetchedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/60 bg-surface/90 p-4">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-accent">
            Rankings
          </h3>
          <dl className="mt-2 divide-y divide-border/40">
            <StatRow
              label={`${job} in ${world}`}
              value={formatRank(ranking?.jobRank)}
            />
            <StatRow label={`${world} rank`} value={formatRank(ranking?.worldRank)} />
            <StatRow
              label={`${job} in GMS ${regionLabel}`}
              value={formatRank(ranking?.jobGlobalRank ?? character.classRank)}
            />
            <StatRow
              label={`GMS ${regionLabel} overall`}
              value={formatRank(ranking?.globalRank ?? character.overallRank)}
            />
            <StatRow
              label="Fame"
              value={formatOptionalInt(character.fame)}
            />
          </dl>
        </section>

        <section className="rounded-2xl border border-border/60 bg-surface/90 p-4">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-accent">
            Legion
          </h3>
          <dl className="mt-2 divide-y divide-border/40">
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
          </dl>
          {!character.legionLevel ? (
            <p className="mt-3 text-xs opacity-55">
              Legion stats appear on the account’s highest-level character in
              the world (same rule as official rankings).
            </p>
          ) : null}
        </section>
      </div>

      {character.expAverages || character.graph?.dailyExp?.length ? (
        <section className="rounded-2xl border border-border/60 bg-surface/90 p-4">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-accent">
            Daily EXP (tracked)
          </h3>
          {character.expAverages ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["7d avg", character.expAverages.avg7d],
                  ["14d avg", character.expAverages.avg14d],
                  ["30d avg", character.expAverages.avg30d],
                  ["90d avg", character.expAverages.avg90d],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl bg-surface-muted/60 px-3 py-2"
                >
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wider opacity-55">
                    {label}
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-bold tabular-nums">
                    {value ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          <ExpRangeGraph
            graph={character.graph}
            averages={character.expAverages}
            showAvg={false}
          />
        </section>
      ) : null}

      <section className="rounded-2xl border border-dashed border-border/50 bg-surface/50 p-4">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider opacity-70">
          Not available yet
        </h3>
        <ul className="mt-2 space-y-1.5 text-xs opacity-60">
          <li>Gear / set — {character.stubs.gear}</li>
          <li>Combat power — {character.stubs.combatPower}</li>
          <li>Fashion history — {character.stubs.fashion}</li>
          <li>Achievement history — {character.stubs.achievementHistory}</li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
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
        <Link
          href="/roster"
          className="rounded-lg border border-border px-3 py-1.5 font-semibold transition hover:bg-surface-muted"
        >
          Back to Roster
        </Link>
      </div>

      <p className="text-xs opacity-50">{character.note}</p>
    </div>
  );
}
