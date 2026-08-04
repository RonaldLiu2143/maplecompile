"use client";

import Link from "next/link";
import type { CharacterLookupResult } from "@/lib/character/lookup";

function formatRank(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return `#${n.toLocaleString()}`;
}

function formatExpPerDay(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "—";
  const v = raw.trim();
  return v.endsWith("/day") ? v : `${v}/day`;
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider opacity-55">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-bold tabular-nums sm:text-xl">
        {value}
      </p>
    </div>
  );
}

export function PinnedCharacterCard({
  character,
  onUnpin,
  onChangePin,
}: {
  character: CharacterLookupResult;
  onUnpin: () => void;
  onChangePin: () => void;
}) {
  const world = character.worldName;
  const classRankInWorld = character.ranking?.jobRank;
  const title = `${character.name} · ${character.level} (${world})`;
  const profileHref = `/calc/character/${encodeURIComponent(character.name)}?region=${character.region}`;

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-border bg-surface">
      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start">
        <div className="flex shrink-0 justify-center sm:justify-start">
          {character.characterImgURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.characterImgURL}
              alt={`${character.name} avatar`}
              width={140}
              height={140}
              className="h-[140px] w-[140px] object-contain"
            />
          ) : (
            <div className="flex h-[140px] w-[140px] items-center justify-center rounded-lg bg-surface-muted text-sm opacity-60">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent opacity-80">
                Pinned character
              </p>
              <h2 className="font-display mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {title}
              </h2>
              <p className="mt-1 text-sm opacity-70">
                {character.jobName} · {character.region.toUpperCase()}
                {character.isHeroic ? " · Heroic" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onChangePin}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
              >
                Change pin
              </button>
              <button
                type="button"
                onClick={onUnpin}
                className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-semibold text-danger transition hover:bg-danger/10"
              >
                Unpin
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Stat
              label="Avg EXP / day · last 7 days"
              value={formatExpPerDay(character.expAverages?.avg7d)}
            />
            <Stat
              label="Avg EXP / day · last 14 days"
              value={formatExpPerDay(character.expAverages?.avg14d)}
            />
            <Stat
              label={`Class rank (${world})`}
              value={formatRank(classRankInWorld)}
            />
            <Stat
              label="Legion level"
              value={
                character.legionLevel != null
                  ? character.legionLevel.toLocaleString()
                  : "—"
              }
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={profileHref}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
            >
              Full profile
            </Link>
            <p className="text-xs opacity-55">
              Fetched {new Date(character.fetchedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
