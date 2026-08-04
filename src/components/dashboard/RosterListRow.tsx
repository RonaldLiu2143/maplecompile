"use client";

import Link from "next/link";
import { characterProfileHref } from "@/lib/character/client";
import type { CharacterLookupResult } from "@/lib/character/lookup";
import type { RosterEntry } from "@/lib/dashboard/roster";

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      width={14}
      height={14}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 2.5l2.6 6.2 6.7.6-5.1 4.4 1.5 6.5L12 16.8 6.3 20.2l1.5-6.5-5.1-4.4 6.7-.6L12 2.5z"
      />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 20 20" width={14} height={14} aria-hidden fill="currentColor">
      <path d="M10 6.5l5 5.5H5l5-5.5z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" width={14} height={14} aria-hidden fill="currentColor">
      <path d="M10 13.5L5 8h10l-5 5.5z" />
    </svg>
  );
}

function AvatarThumb({
  src,
  name,
}: {
  src: string | null | undefined;
  name: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={48}
        height={48}
        className="pointer-events-none h-12 w-12 shrink-0 object-contain"
        draggable={false}
      />
    );
  }
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface-muted text-[0.6rem] font-semibold uppercase tracking-wide opacity-50"
      aria-hidden
    >
      {name.slice(0, 2)}
    </div>
  );
}

export function RosterListRow({
  entry,
  index,
  total,
  character,
  loading,
  error,
  isPrimary,
  reorderable,
  managing,
  onMoveUp,
  onMoveDown,
  onSetPrimary,
  onRemove,
  onRetry,
}: {
  entry: RosterEntry;
  index: number;
  total: number;
  character?: CharacterLookupResult | null;
  loading?: boolean;
  error?: string | null;
  isPrimary?: boolean;
  /** Show #N + up/down chevrons */
  reorderable?: boolean;
  /** Show remove + allow star click to set primary */
  managing?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSetPrimary?: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
}) {
  const name = character?.name ?? entry.name;
  const level = character?.level;
  const jobName = character?.jobName;
  const avatar = character?.characterImgURL;
  const profileHref = characterProfileHref(entry);
  const canMoveUp = reorderable && index > 0;
  const canMoveDown = reorderable && index < total - 1;

  const secondary =
    error != null
      ? error
      : loading || !character
        ? "Loading…"
        : level != null && jobName
          ? `Lv. ${level} • ${jobName}`
          : level != null
            ? `Lv. ${level}`
            : jobName ?? "—";

  return (
    <li
      className={[
        "flex items-center gap-3 rounded-xl border border-border/50 bg-surface px-3 py-2.5 sm:gap-4 sm:px-4",
        error ? "border-danger/40 bg-danger/5" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <AvatarThumb src={avatar} name={name} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={profileHref}
            className="truncate font-semibold tracking-tight text-foreground hover:text-accent"
            title={`${name} (${entry.region.toUpperCase()})`}
          >
            {name}
          </Link>
          {isPrimary ? (
            <span
              className="inline-flex shrink-0 text-amber-400"
              title="Primary character"
            >
              <StarIcon />
              <span className="sr-only">Primary</span>
            </span>
          ) : managing && onSetPrimary ? (
            <button
              type="button"
              onClick={onSetPrimary}
              className="inline-flex shrink-0 rounded p-0.5 text-foreground/25 transition hover:text-amber-400"
              title="Set as primary"
              aria-label={`Set ${name} as primary`}
            >
              <StarIcon />
            </button>
          ) : null}
        </div>
        <p
          className={[
            "truncate text-sm",
            error ? "text-danger" : "opacity-55",
          ].join(" ")}
        >
          {secondary}
        </p>
        {error && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 text-xs font-semibold text-accent underline-offset-2 hover:underline"
          >
            Retry
          </button>
        ) : null}
      </div>

      {managing && onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg border border-danger/35 px-2 py-1 text-xs font-semibold text-danger transition hover:bg-danger/10"
          aria-label={`Remove ${name}`}
        >
          Remove
        </button>
      ) : null}

      {reorderable ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-sm tabular-nums opacity-45">
            #{index + 1}
          </span>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="rounded p-0.5 opacity-55 transition hover:bg-surface-muted hover:opacity-100 disabled:pointer-events-none disabled:opacity-20"
              aria-label={`Move ${name} up`}
              title="Move up"
            >
              <ChevronUpIcon />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="rounded p-0.5 opacity-55 transition hover:bg-surface-muted hover:opacity-100 disabled:pointer-events-none disabled:opacity-20"
              aria-label={`Move ${name} down`}
              title="Move down"
            >
              <ChevronDownIcon />
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
