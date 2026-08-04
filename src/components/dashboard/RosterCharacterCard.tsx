"use client";

import Link from "next/link";
import type { CharacterLookupResult } from "@/lib/character/lookup";

function formatRank(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return `#${n.toLocaleString()}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider opacity-55">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums sm:text-base">
        {value}
      </p>
    </div>
  );
}

export function RosterCharacterCard({
  character,
  index,
  total,
  managing,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  character: CharacterLookupResult;
  index: number;
  total: number;
  managing?: boolean;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const world = character.worldName;
  const classRankInWorld = character.ranking?.jobRank;
  const title = `${character.name} · ${character.level} (${world})`;
  const profileHref = `/calc/character/${encodeURIComponent(character.name)}?region=${character.region}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-surface">
      <div className="flex flex-1 flex-col gap-4 p-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 justify-center sm:justify-start">
          {character.characterImgURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.characterImgURL}
              alt={`${character.name} avatar`}
              width={96}
              height={96}
              className="h-24 w-24 object-contain"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-surface-muted text-xs opacity-60">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              {index === 0 ? (
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-accent opacity-80">
                  Primary
                </p>
              ) : null}
              <h2 className="font-display text-xl font-bold tracking-tight">
                {title}
              </h2>
              <p className="mt-0.5 text-sm opacity-70">
                {character.jobName} · {character.region.toUpperCase()}
                {character.isHeroic ? " · Heroic" : ""}
              </p>
            </div>
            {managing ? (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={index === 0}
                  className="rounded-lg border border-border px-2 py-1 text-xs font-semibold transition hover:bg-surface-muted disabled:opacity-40"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={index >= total - 1}
                  className="rounded-lg border border-border px-2 py-1 text-xs font-semibold transition hover:bg-surface-muted disabled:opacity-40"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  className="rounded-lg border border-danger/40 px-2 py-1 text-xs font-semibold text-danger transition hover:bg-danger/10"
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
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

          <div className="mt-3">
            <Link
              href={profileHref}
              className="text-sm font-semibold text-accent underline-offset-2 hover:underline"
            >
              Full profile →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function RosterCardSkeleton({ name }: { name: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface/80 px-4 py-10 text-center text-sm opacity-70">
      Loading {name}…
    </div>
  );
}

export function RosterCardError({
  name,
  region,
  error,
  managing,
  onRemove,
  onRetry,
}: {
  name: string;
  region: string;
  error: string;
  managing?: boolean;
  onRemove?: () => void;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-4 text-sm"
    >
      <p className="font-semibold">
        {name} ({region.toUpperCase()})
      </p>
      <p className="mt-1 opacity-90">{error}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
          >
            Retry
          </button>
        ) : null}
        {managing && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-semibold text-danger transition hover:bg-danger/10"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
