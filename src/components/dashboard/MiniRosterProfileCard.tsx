"use client";

import Link from "next/link";
import { ExpRangeGraph } from "@/components/character/ExpRangeGraph";
import type { CharacterLookupResult } from "@/lib/character/lookup";

function formatRank(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return `#${n.toLocaleString()}`;
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

export function MiniRosterProfileCard({
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
  const world = character.worldName;
  const job = character.jobName;
  const region = character.region.toUpperCase();
  const ranking = character.ranking;
  const pct = character.expPercent;
  const profileHref = `/calc/character/${encodeURIComponent(character.name)}?region=${character.region}`;

  const classInWorld = formatRank(ranking?.jobRank);
  const worldRank = formatRank(ranking?.worldRank);
  const gmsOverall = formatRank(ranking?.globalRank ?? character.overallRank);
  const legion =
    character.legionLevel != null
      ? character.legionLevel.toLocaleString()
      : "—";

  return (
    <article className="overflow-hidden rounded-2xl border-2 border-border bg-surface">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 justify-center sm:justify-start">
          {character.characterImgURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.characterImgURL}
              alt={`${character.name} avatar`}
              width={88}
              height={88}
              className="h-[88px] w-[88px] object-contain"
            />
          ) : (
            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-lg bg-surface-muted text-[0.65rem] opacity-60">
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

            <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
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

          <ExpRangeGraph
            graph={character.graph}
            averages={character.expAverages}
            compact
          />
        </div>
      </div>
    </article>
  );
}
