"use client";

import Link from "next/link";
import type { DragEvent } from "react";
import { characterProfileHref } from "@/lib/character/client";
import { formatOptionalInt, formatRank } from "@/lib/character/format";
import type { CharacterLookupResult } from "@/lib/character/lookup";

function formatDailyExp(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "—";
  const v = raw.trim();
  return v.endsWith("/day") ? v : `${v}/day`;
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

function DragHandle() {
  return (
    <span
      className="inline-flex cursor-grab touch-none select-none flex-col justify-center gap-0.5 px-1 py-2 text-xs opacity-45 active:cursor-grabbing"
      aria-hidden
      title="Drag to reorder"
    >
      <span className="block h-0.5 w-3.5 rounded-full bg-current" />
      <span className="block h-0.5 w-3.5 rounded-full bg-current" />
      <span className="block h-0.5 w-3.5 rounded-full bg-current" />
    </span>
  );
}

export type RosterDragProps = {
  draggable?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDragLeave?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
};

function dragShellClass(
  base: string,
  drag?: Pick<RosterDragProps, "isDragging" | "isDropTarget" | "draggable">,
): string {
  return [
    base,
    drag?.draggable ? "cursor-grab active:cursor-grabbing" : "",
    drag?.isDragging ? "opacity-40 scale-[0.98]" : "",
    drag?.isDropTarget && !drag?.isDragging
      ? "ring-2 ring-accent ring-offset-2 ring-offset-background"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function withDragAttrs(
  drag: RosterDragProps | undefined,
): RosterDragProps | Record<string, never> {
  if (!drag?.draggable) return {};
  return {
    draggable: true,
    onDragStart: drag.onDragStart,
    onDragOver: drag.onDragOver,
    onDragLeave: drag.onDragLeave,
    onDrop: drag.onDrop,
    onDragEnd: drag.onDragEnd,
  };
}

export function RosterCharacterCard({
  character,
  isPrimary,
  managing,
  onRemove,
  onSetPrimary,
  drag,
}: {
  character: CharacterLookupResult;
  isPrimary?: boolean;
  managing?: boolean;
  onRemove?: () => void;
  onSetPrimary?: () => void;
  drag?: RosterDragProps;
}) {
  const world = character.worldName;
  const classRankInWorld = character.ranking?.jobRank;
  const title = `${character.name} · ${character.level} (${world})`;
  const profileHref = characterProfileHref(character);

  return (
    <article
      {...withDragAttrs(drag)}
      className={dragShellClass(
        [
          "flex flex-col overflow-hidden rounded-2xl border-2 bg-surface transition",
          isPrimary ? "border-accent/70" : "border-border",
        ].join(" "),
        drag,
      )}
    >
      <div className="flex flex-1 flex-col gap-4 p-4 sm:flex-row sm:items-start">
        {managing ? (
          <div className="flex shrink-0 items-start pt-1">
            <DragHandle />
          </div>
        ) : null}

        <div className="flex shrink-0 justify-center sm:justify-start">
          {character.characterImgURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.characterImgURL}
              alt={`${character.name} avatar`}
              width={96}
              height={96}
              className="pointer-events-none h-24 w-24 object-contain"
              draggable={false}
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
              {isPrimary ? (
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
              <div
                className="flex flex-wrap gap-1.5"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {!isPrimary && onSetPrimary ? (
                  <button
                    type="button"
                    onClick={onSetPrimary}
                    className="rounded-lg border border-accent/50 px-2 py-1 text-xs font-semibold text-accent transition hover:bg-accent/10"
                    title="Set as primary"
                  >
                    Set primary
                  </button>
                ) : null}
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

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="7d EXP" value={formatDailyExp(character.expAverages?.avg7d)} />
            <Stat
              label="14d EXP"
              value={formatDailyExp(character.expAverages?.avg14d)}
            />
            <Stat
              label={`Class rank (${world})`}
              value={formatRank(classRankInWorld)}
            />
            <Stat
              label="Legion"
              value={formatOptionalInt(character.legionLevel)}
            />
          </div>

          <div className="mt-3">
            <Link
              href={profileHref}
              className="text-sm font-semibold text-accent underline-offset-2 hover:underline"
              draggable={false}
              onClick={(e) => {
                if (managing) e.stopPropagation();
              }}
            >
              Full profile →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function RosterCardSkeleton({
  name,
  drag,
}: {
  name: string;
  drag?: RosterDragProps;
}) {
  return (
    <div
      {...withDragAttrs(drag)}
      className={dragShellClass(
        "rounded-2xl border border-border/50 bg-surface/80 px-4 py-10 text-center text-sm opacity-70 transition",
        drag,
      )}
    >
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
  drag,
}: {
  name: string;
  region: string;
  error: string;
  managing?: boolean;
  onRemove?: () => void;
  onRetry?: () => void;
  drag?: RosterDragProps;
}) {
  return (
    <div
      role="alert"
      {...withDragAttrs(drag)}
      className={dragShellClass(
        "rounded-2xl border border-danger/40 bg-danger/10 px-4 py-4 text-sm transition",
        drag,
      )}
    >
      <p className="font-semibold">
        {name} ({region.toUpperCase()})
      </p>
      <p className="mt-1 opacity-90">{error}</p>
      <div
        className="mt-3 flex flex-wrap gap-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
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
