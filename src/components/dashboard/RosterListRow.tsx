"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import type { RosterDragProps } from "@/components/dashboard/RosterCharacterCard";
import { LiberationStatusTags } from "@/components/dashboard/LiberationStatusTags";
import {
  isStickyActiveSwitchBlocked,
  switchActiveCharacter,
  UNLOCK_TO_CHANGE_ACTIVE_MSG,
} from "@/lib/active-character";
import { characterProfileHref } from "@/lib/character/client";
import type { CharacterLookupResult } from "@/lib/character/lookup";
import type { RosterEntry } from "@/lib/dashboard/roster";
import type { RosterStatusSnapshot } from "@/lib/dashboard/roster-status";

function StarIcon({ className, size = 14 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      width={size}
      height={size}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 2.5l2.6 6.2 6.7.6-5.1 4.4 1.5 6.5L12 16.8 6.3 20.2l1.5-6.5-5.1-4.4 6.7-.6L12 2.5z"
      />
    </svg>
  );
}

function TrashIcon({ size = 14 }: { size?: number }) {
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

function ChevronUpIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden fill="currentColor">
      <path d="M10 6.5l5 5.5H5l5-5.5z" />
    </svg>
  );
}

function ChevronDownIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden fill="currentColor">
      <path d="M10 13.5L5 8h10l-5 5.5z" />
    </svg>
  );
}

function DragHandle({ compact }: { compact?: boolean }) {
  return (
    <span
      className={[
        "inline-flex cursor-grab touch-none select-none flex-col justify-center gap-0.5 text-xs opacity-40 active:cursor-grabbing",
        compact ? "px-0.5 py-1" : "px-0.5 py-2",
      ].join(" ")}
      aria-hidden
      title="Drag to reorder"
    >
      <span
        className={[
          "block rounded-full bg-current",
          compact ? "h-0.5 w-2.5" : "h-0.5 w-3",
        ].join(" ")}
      />
      <span
        className={[
          "block rounded-full bg-current",
          compact ? "h-0.5 w-2.5" : "h-0.5 w-3",
        ].join(" ")}
      />
      <span
        className={[
          "block rounded-full bg-current",
          compact ? "h-0.5 w-2.5" : "h-0.5 w-3",
        ].join(" ")}
      />
    </span>
  );
}

function AvatarThumb({
  src,
  name,
  compact,
}: {
  src: string | null | undefined;
  name: string;
  compact?: boolean;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={compact ? 40 : 48}
        height={compact ? 40 : 48}
        className={[
          "pointer-events-none shrink-0 object-contain",
          compact ? "h-10 w-10" : "h-12 w-12",
        ].join(" ")}
        draggable={false}
      />
    );
  }
  return (
    <div
      className={[
        "flex shrink-0 items-center justify-center rounded-md bg-surface-muted font-semibold uppercase tracking-wide opacity-50",
        compact
          ? "h-10 w-10 text-xs"
          : "h-12 w-12 text-[0.6rem]",
      ].join(" ")}
      aria-hidden
    >
      {name.slice(0, 2)}
    </div>
  );
}

export type RosterWeeklyBossProgress = {
  cleared: number;
  enabled: number;
};

function statusToneClass(
  tone: "neutral" | "good" | "warn" | "accent",
): string {
  if (tone === "good") {
    return "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  }
  if (tone === "warn") {
    return "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200";
  }
  if (tone === "accent") {
    return "border-accent/40 bg-accent/10 text-accent";
  }
  return "border-border/50 bg-surface-muted/40 opacity-55";
}

function StatusLinkChip({
  href,
  label,
  title,
  tone,
  compact,
  priority,
  onActivate,
}: {
  href: string;
  label: string;
  title: string;
  tone: "neutral" | "good" | "warn" | "accent";
  compact?: boolean;
  /** Hide on very small screens to keep row height down. */
  priority?: "always" | "sm";
  onActivate: () => void;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex shrink-0 items-center rounded-md border font-semibold tabular-nums transition hover:opacity-90",
        compact ? "px-2 py-0.5 text-xs" : "px-2 py-0.5 text-xs",
        statusToneClass(tone),
        priority === "sm" ? "hidden sm:inline-flex" : "",
      ].join(" ")}
      title={title}
      draggable={false}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onActivate();
      }}
    >
      {label}
    </Link>
  );
}

function WeeklyBossChip({
  progress,
  compact,
  onActivate,
}: {
  progress: RosterWeeklyBossProgress;
  compact?: boolean;
  onActivate: () => void;
}) {
  const { cleared, enabled } = progress;
  if (enabled <= 0) {
    return (
      <StatusLinkChip
        href="/calc/bosses"
        label="Bosses"
        title="Configure weekly bosses"
        tone="neutral"
        compact={compact}
        onActivate={onActivate}
      />
    );
  }
  const done = cleared >= enabled;
  const tone = done ? "good" : cleared > 0 ? "accent" : "warn";
  return (
    <StatusLinkChip
      href="/calc/bosses"
      label={`${cleared}/${enabled}`}
      title={`Weekly bosses ${cleared}/${enabled} — open tracker`}
      tone={tone}
      compact={compact}
      onActivate={onActivate}
    />
  );
}

function RosterStatusChips({
  status,
  compact,
  onActivate,
}: {
  status: RosterStatusSnapshot;
  compact?: boolean;
  onActivate: (href: string) => void;
}) {
  const hexaTone = status.hexa.hasData
    ? status.hexa.pct >= 100
      ? "good"
      : status.hexa.pct > 0
        ? "accent"
        : "warn"
    : "neutral";
  const anyLiberated =
    status.liberation.genesisLiberated || status.liberation.destinyLiberated;
  const libTone = anyLiberated
    ? "good"
    : status.liberation.hasData
      ? status.liberation.pct >= 100
        ? "good"
        : status.liberation.pct > 0
          ? "accent"
          : "warn"
      : "neutral";
  const gearTone =
    status.gear.equipCount > 0
      ? status.gear.paired
        ? "good"
        : "accent"
      : "neutral";
  const scoutTone = status.scouter.hasData
    ? status.scouter.paired
      ? "good"
      : "accent"
    : "neutral";

  const libLabel = anyLiberated
    ? [
        status.liberation.genesisLiberated ? "G" : null,
        status.liberation.destinyLiberated ? "D" : null,
      ]
        .filter(Boolean)
        .join("+")
    : status.liberation.hasData
      ? `Lib ${status.liberation.pct}%`
      : "Lib";
  const libTitle = anyLiberated
    ? [
        status.liberation.genesisLiberated ? "Genesis liberated" : null,
        status.liberation.destinyLiberated ? "Destiny liberated" : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : status.liberation.hasData
      ? `Liberation ${status.liberation.tab} ${status.liberation.pct}%`
      : "No liberation data — open calculator";

  return (
    <>
      <StatusLinkChip
        href="/calc/hexa-tracker"
        label={status.hexa.hasData ? `HEXA ${status.hexa.pct}%` : "HEXA"}
        title={
          status.hexa.hasData
            ? `HEXA ${status.hexa.levelsSum} levels · open tracker`
            : "No HEXA progress yet — open tracker"
        }
        tone={hexaTone}
        compact={compact}
        priority="always"
        onActivate={() => onActivate("/calc/hexa-tracker")}
      />
      <StatusLinkChip
        href="/calc/liberation"
        label={libLabel}
        title={libTitle}
        tone={libTone}
        compact={compact}
        priority="sm"
        onActivate={() => onActivate("/calc/liberation")}
      />
      <StatusLinkChip
        href="/calc/equips/setup"
        label={
          status.gear.equipCount > 0
            ? `${status.gear.equipCount}eq`
            : "Gear"
        }
        title={
          status.gear.equipCount > 0
            ? `${status.gear.equipCount} equips saved${status.gear.paired ? " · paired" : ""}`
            : "No gear saved — open equipment"
        }
        tone={gearTone}
        compact={compact}
        priority="always"
        onActivate={() => onActivate("/calc/equips/setup")}
      />
      <StatusLinkChip
        href="/calc/scouter"
        label={status.scouter.paired ? "Paired" : "Scout"}
        title={
          status.scouter.hasData
            ? status.scouter.paired
              ? "Scouter ready · paired"
              : "Scouter ready"
            : "No scouter yet — open Scouter"
        }
        tone={scoutTone}
        compact={compact}
        priority="sm"
        onActivate={() => onActivate("/calc/scouter")}
      />
    </>
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
  compact = false,
  weeklyBoss,
  status,
  drag,
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
  /** Denser layout for dashboard embed */
  compact?: boolean;
  /** Weekly boss clears for this character (dashboard combined section) */
  weeklyBoss?: RosterWeeklyBossProgress | null;
  /** HEXA / Liberation / gear / scouter chips */
  status?: RosterStatusSnapshot | null;
  drag?: RosterDragProps;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSetPrimary?: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const [pendingRemove, setPendingRemove] = useState(false);
  const name = character?.name ?? entry.name;
  const level = character?.level;
  const jobName = character?.jobName;
  const avatar = character?.characterImgURL;
  const profileHref = characterProfileHref(entry);
  const canMoveUp = reorderable && index > 0;
  const canMoveDown = reorderable && index < total - 1;
  const canDrag = Boolean(drag?.draggable);
  const iconSize = compact ? 12 : 14;
  const showStatus = weeklyBoss != null || status != null;

  function activateTool(href: string) {
    // While locked, keep sticky primary — tools open against the locked
    // active character (local tool lists can still browse alts separately).
    if (!isStickyActiveSwitchBlocked(entry)) {
      switchActiveCharacter(entry);
    }
    router.push(href);
  }

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
    <>
    <li
      draggable={canDrag}
      onDragStart={drag?.onDragStart}
      onDragOver={drag?.onDragOver}
      onDragLeave={drag?.onDragLeave}
      onDrop={drag?.onDrop}
      onDragEnd={drag?.onDragEnd}
      className={[
        "flex items-center rounded-xl border border-border/50 bg-surface transition",
        compact
          ? "gap-1.5 rounded-md px-2 py-1.5 sm:gap-2 sm:px-2.5"
          : "gap-3 px-3 py-2.5 sm:gap-4 sm:px-4",
        canDrag ? "cursor-grab active:cursor-grabbing" : "",
        drag?.isDragging ? "opacity-40 scale-[0.98]" : "",
        drag?.isDropTarget && !drag?.isDragging
          ? "border-accent/60 ring-2 ring-accent ring-offset-2 ring-offset-background"
          : "",
        error ? "border-danger/40 bg-danger/5" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {canDrag ? <DragHandle compact={compact} /> : null}

      <AvatarThumb src={avatar} name={name} compact={compact} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={profileHref}
            className={[
              "truncate font-semibold tracking-tight text-foreground hover:text-accent",
              compact ? "text-base" : "",
            ].join(" ")}
            title={`${name} (${entry.region.toUpperCase()})`}
            draggable={false}
          >
            {name}
          </Link>
          {isPrimary ? (
            <span
              className="inline-flex shrink-0 text-amber-400"
              title="Primary character"
            >
              <StarIcon size={iconSize} />
              <span className="sr-only">Primary</span>
            </span>
          ) : managing && onSetPrimary ? (
            <button
              type="button"
              onClick={onSetPrimary}
              className="inline-flex shrink-0 rounded p-0.5 text-foreground/25 transition hover:text-amber-400"
              title={
                isStickyActiveSwitchBlocked(entry)
                  ? UNLOCK_TO_CHANGE_ACTIVE_MSG
                  : "Set as primary"
              }
              aria-label={`Set ${name} as primary`}
            >
              <StarIcon size={iconSize} />
            </button>
          ) : null}
          {status ? (
            <LiberationStatusTags
              genesis={status.liberation.genesisLiberated}
              destiny={status.liberation.destinyLiberated}
              compact
            />
          ) : null}
        </div>
        <p
          className={[
            "truncate",
            compact ? "text-sm" : "text-sm",
            error ? "text-danger" : "opacity-55",
          ].join(" ")}
        >
          {secondary}
        </p>
        {error && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className={[
              "font-semibold text-accent underline-offset-2 hover:underline",
              compact ? "mt-0.5 text-xs" : "mt-1 text-xs",
            ].join(" ")}
          >
            Retry
          </button>
        ) : null}
      </div>

      {showStatus ? (
        <div
          className={[
            "flex max-w-[11rem] flex-wrap items-center justify-end gap-1 sm:max-w-[16rem]",
            compact ? "shrink" : "shrink-0",
          ].join(" ")}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {status != null ? (
            <RosterStatusChips
              status={status}
              compact={compact}
              onActivate={activateTool}
            />
          ) : null}
          {weeklyBoss != null ? (
            <WeeklyBossChip
              progress={weeklyBoss}
              compact={compact}
              onActivate={() => activateTool("/calc/bosses")}
            />
          ) : null}
        </div>
      ) : null}

      {managing && onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPendingRemove(true);
          }}
          className={[
            "inline-flex shrink-0 items-center justify-center rounded-lg border border-danger/35 text-danger transition hover:bg-danger/10",
            compact ? "h-7 w-7" : "h-8 w-8",
          ].join(" ")}
          title="Remove from roster"
          aria-label={`Remove ${name}`}
        >
          <TrashIcon size={compact ? 13 : 15} />
        </button>
      ) : null}

      {reorderable ? (
        <div
          className={[
            "flex shrink-0 items-center",
            compact ? "gap-1" : "gap-2",
          ].join(" ")}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span
            className={[
              "font-mono tabular-nums opacity-45",
              compact ? "text-xs" : "text-sm",
            ].join(" ")}
          >
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
              <ChevronUpIcon size={iconSize} />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="rounded p-0.5 opacity-55 transition hover:bg-surface-muted hover:opacity-100 disabled:pointer-events-none disabled:opacity-20"
              aria-label={`Move ${name} down`}
              title="Move down"
            >
              <ChevronDownIcon size={iconSize} />
            </button>
          </div>
        </div>
      ) : null}
    </li>

      <ConfirmModal
        open={pendingRemove}
        title="Remove from roster?"
        message={`Remove ${name} from your roster?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        titleId="roster-list-remove-confirm-title"
        onCancel={() => setPendingRemove(false)}
        onConfirm={() => {
          setPendingRemove(false);
          onRemove?.();
        }}
      />
    </>
  );
}
