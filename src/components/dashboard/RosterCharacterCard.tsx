"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent, type MouseEvent } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import type { LiberationTagFlags } from "@/lib/dashboard/roster-status";
import {
  LiberationStatusTags,
} from "@/components/dashboard/LiberationStatusTags";
import {
  isStickyActiveSwitchBlocked,
  UNLOCK_TO_CHANGE_ACTIVE_MSG,
} from "@/lib/active-character";
import { characterProfileHref } from "@/lib/character/client";
import type { CharacterLookupResult } from "@/lib/character/lookup";

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

function StarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.5l2.6 6.2 6.7.6-5.1 4.4 1.5 6.5L12 16.8 6.3 20.2l1.5-6.5-5.1-4.4 6.7-.6L12 2.5z"
      />
    </svg>
  );
}

function TrashIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden fill="none">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 7h14M10 11v6M14 11v6M8.5 7l.7-2h5.6l.7 2M7 7l.8 12.5a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4L17 7"
      />
    </svg>
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

function formatExpPercent(pct: number | null | undefined): string | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  const rounded = Math.round(pct * 1000) / 1000;
  return `${rounded}%`;
}

function stopCardNav(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function RosterCharacterCard({
  character,
  isPrimary,
  managing,
  selected,
  badge,
  liberation,
  onRemove,
  onSetPrimary,
  onSelect,
  drag,
}: {
  character: CharacterLookupResult;
  isPrimary?: boolean;
  managing?: boolean;
  /** Highlight when this card’s profile is open inline. */
  selected?: boolean;
  /** Optional status pill (e.g. boss clears `0/14`). */
  badge?: string | null;
  /** Genesis / Destiny liberated flags from maplecompile.liberation.v2 */
  liberation?: LiberationTagFlags | null;
  onRemove?: () => void;
  onSetPrimary?: () => void;
  /** When set, card click selects instead of navigating to the profile page. */
  onSelect?: () => void;
  drag?: RosterDragProps;
}) {
  const profileHref = characterProfileHref(character);
  const expPct = formatExpPercent(character.expPercent);
  const showActions = Boolean(onRemove || onSetPrimary);
  const showDragHandle = Boolean(managing || drag?.draggable);
  const draggedRef = useRef(false);
  const [pendingRemove, setPendingRemove] = useState(false);

  function handleRemove(e: MouseEvent) {
    stopCardNav(e);
    if (!onRemove) return;
    setPendingRemove(true);
  }

  function handleSetPrimary(e: MouseEvent) {
    stopCardNav(e);
    onSetPrimary?.();
  }

  const dragAttrs = withDragAttrs(drag);
  if (dragAttrs.draggable && dragAttrs.onDragStart) {
    const userStart = dragAttrs.onDragStart;
    dragAttrs.onDragStart = (e: DragEvent) => {
      draggedRef.current = true;
      userStart(e);
    };
  }
  if (dragAttrs.draggable && dragAttrs.onDragEnd) {
    const userEnd = dragAttrs.onDragEnd;
    dragAttrs.onDragEnd = (e: DragEvent) => {
      userEnd(e);
      // Click can fire after dragend; clear on next tick.
      window.setTimeout(() => {
        draggedRef.current = false;
      }, 0);
    };
  }

  return (
    <>
    <article
      {...dragAttrs}
      className={dragShellClass(
        [
          "group relative overflow-hidden rounded-xl border bg-surface transition",
          selected
            ? "border-accent ring-2 ring-accent/35"
            : isPrimary
              ? "border-accent/60"
              : "border-border/70",
          managing ? "" : "hover:border-accent/45 hover:bg-surface-muted/40",
        ].join(" "),
        drag,
      )}
    >
      {onSelect ? (
        <button
          type="button"
          className="absolute inset-0 z-0 cursor-pointer"
          aria-label={`Show ${character.name} profile`}
          aria-pressed={selected}
          draggable={false}
          onClick={() => {
            if (managing || draggedRef.current) return;
            onSelect();
          }}
        />
      ) : (
        <Link
          href={profileHref}
          className="absolute inset-0 z-0"
          aria-label={`Open ${character.name} profile`}
          draggable={false}
          onClick={(e) => {
            if (managing) e.preventDefault();
          }}
        />
      )}

      <div className="relative z-10 flex items-stretch gap-3 p-3 pointer-events-none sm:gap-4 sm:p-3.5">
        {showDragHandle ? (
          <div className="flex shrink-0 items-center pointer-events-auto">
            <DragHandle />
          </div>
        ) : null}

        <div className="flex shrink-0 items-center">
          {character.characterImgURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.characterImgURL}
              alt=""
              width={72}
              height={72}
              className="pointer-events-none h-[72px] w-[72px] rounded-lg object-contain"
              draggable={false}
            />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-lg bg-surface-muted text-[0.65rem] font-semibold uppercase tracking-wide opacity-50">
              {character.name.slice(0, 2)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 self-center">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="truncate text-base font-bold tracking-tight text-accent">
              {character.name}
            </p>
            {liberation ? (
              <LiberationStatusTags
                genesis={liberation.genesis}
                destiny={liberation.destiny}
                compact
              />
            ) : null}
          </div>
          <p className="mt-0.5 text-sm tabular-nums opacity-85">
            Lv. {character.level}
            {expPct ? (
              <span className="opacity-70"> ({expPct})</span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate text-sm opacity-75">
            {character.jobName || "—"}
          </p>
          <p className="mt-0.5 truncate text-sm opacity-65">
            {character.worldName || "—"}
            {character.isHeroic ? " · Heroic" : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-start gap-1.5 pt-0.5 pointer-events-auto">
          {badge ? (
            <span className="mr-0.5 rounded-full bg-violet-600/90 px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums">
              {badge}
            </span>
          ) : null}

          {showActions ? (
            <div className="flex items-center gap-1">
              {isPrimary ? (
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/60 bg-amber-400/15 text-amber-400"
                  title="Primary character"
                  aria-label={`${character.name} is primary`}
                >
                  <StarIcon />
                </span>
              ) : onSetPrimary ? (
                <button
                  type="button"
                  onClick={handleSetPrimary}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-surface text-foreground/35 transition hover:border-amber-400/50 hover:bg-surface-muted hover:text-amber-400"
                  title={
                    isStickyActiveSwitchBlocked({
                      name: character.name,
                      region: character.region,
                    })
                      ? UNLOCK_TO_CHANGE_ACTIVE_MSG
                      : "Set as primary"
                  }
                  aria-label={`Set ${character.name} as primary`}
                >
                  <StarIcon />
                </button>
              ) : null}

              {onRemove ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-surface text-foreground/45 transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
                  title="Remove from roster"
                  aria-label={`Remove ${character.name} from roster`}
                >
                  <TrashIcon />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>

      <ConfirmModal
        open={pendingRemove}
        title="Remove from roster?"
        message={`Remove ${character.name} from your roster?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        titleId="roster-card-remove-confirm-title"
        onCancel={() => setPendingRemove(false)}
        onConfirm={() => {
          setPendingRemove(false);
          onRemove?.();
        }}
      />
    </>
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
        "rounded-xl border border-border/50 bg-surface/80 px-4 py-8 text-center text-sm opacity-70 transition",
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
  onRemove,
  onRetry,
  drag,
}: {
  name: string;
  region: string;
  error: string;
  /** Kept for call-site compatibility. */
  managing?: boolean;
  onRemove?: () => void;
  onRetry?: () => void;
  drag?: RosterDragProps;
}) {
  const [pendingRemove, setPendingRemove] = useState(false);

  function handleRemove(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!onRemove) return;
    setPendingRemove(true);
  }

  return (
    <>
    <div
      role="alert"
      {...withDragAttrs(drag)}
      className={dragShellClass(
        "rounded-xl border border-danger/40 bg-danger/10 px-4 py-4 text-sm transition",
        drag,
      )}
    >
      <p className="font-semibold">
        {name} ({region.toUpperCase()})
      </p>
      <p className="mt-1 opacity-90">{error}</p>
      <div
        className="mt-3 flex flex-wrap items-center gap-2"
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
        {onRemove ? (
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-danger/40 text-danger transition hover:bg-danger/10"
            title="Remove from roster"
            aria-label={`Remove ${name} from roster`}
          >
            <TrashIcon />
          </button>
        ) : null}
      </div>
    </div>

      <ConfirmModal
        open={pendingRemove}
        title="Remove from roster?"
        message={`Remove ${name} from your roster?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        titleId="roster-card-error-remove-confirm-title"
        onCancel={() => setPendingRemove(false)}
        onConfirm={() => {
          setPendingRemove(false);
          onRemove?.();
        }}
      />
    </>
  );
}
