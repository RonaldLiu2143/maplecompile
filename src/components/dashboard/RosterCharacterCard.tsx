"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent } from "react";
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

function EllipsisIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden fill="currentColor">
      <circle cx="10" cy="4.5" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="10" cy="15.5" r="1.5" />
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

export function RosterCharacterCard({
  character,
  isPrimary,
  managing,
  badge,
  onRemove,
  onSetPrimary,
  drag,
}: {
  character: CharacterLookupResult;
  isPrimary?: boolean;
  managing?: boolean;
  /** Optional status pill (e.g. boss clears `0/14`). */
  badge?: string | null;
  onRemove?: () => void;
  onSetPrimary?: () => void;
  drag?: RosterDragProps;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileHref = characterProfileHref(character);
  const expPct = formatExpPercent(character.expPercent);
  const showMenu = Boolean(onRemove || onSetPrimary);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <article
      {...withDragAttrs(drag)}
      className={dragShellClass(
        [
          "group relative overflow-hidden rounded-xl border bg-surface transition",
          isPrimary ? "border-accent/60" : "border-border/70",
          managing ? "" : "hover:border-accent/45 hover:bg-surface-muted/40",
        ].join(" "),
        drag,
      )}
    >
      <Link
        href={profileHref}
        className="absolute inset-0 z-0"
        aria-label={`Open ${character.name} profile`}
        draggable={false}
        onClick={(e) => {
          if (managing) e.preventDefault();
        }}
      />

      <div className="relative z-10 flex items-stretch gap-3 p-3 pointer-events-none sm:gap-4 sm:p-3.5">
        {managing ? (
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
          <p className="truncate text-base font-bold tracking-tight text-accent">
            {character.name}
          </p>
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

        <div className="flex shrink-0 items-start gap-2 pt-0.5 pointer-events-auto">
          {badge ? (
            <span className="rounded-full bg-violet-600/90 px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums">
              {badge}
            </span>
          ) : null}

          {showMenu ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label={`Actions for ${character.name}`}
                aria-expanded={menuOpen}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-surface text-foreground/70 transition hover:bg-surface-muted hover:text-foreground"
              >
                <EllipsisIcon />
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-20 mt-1 min-w-[9.5rem] overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
                >
                  {!isPrimary && onSetPrimary ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-sm font-semibold transition hover:bg-surface-muted"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(false);
                        onSetPrimary();
                      }}
                    >
                      Set primary
                    </button>
                  ) : null}
                  {isPrimary ? (
                    <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-accent opacity-80">
                      Primary
                    </p>
                  ) : null}
                  {onRemove ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-sm font-semibold text-danger transition hover:bg-danger/10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(false);
                        onRemove();
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
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
        "rounded-xl border border-danger/40 bg-danger/10 px-4 py-4 text-sm transition",
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
