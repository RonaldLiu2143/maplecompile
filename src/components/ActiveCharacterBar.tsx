"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ACTIVE_CHARACTER_LOCK_KEY,
  isStickyActiveSwitchBlocked,
  readActiveCharacterLock,
  restoreLockedActiveCharacter,
  switchActiveCharacter,
  toggleActiveCharacterLock,
  UNLOCK_TO_CHANGE_ACTIVE_MSG,
} from "@/lib/active-character";
import { readSessionCharacter } from "@/lib/character/client";
import {
  entryKey,
  readRosterState,
  ROSTER_KEY,
  type RosterEntry,
  type RosterPrimary,
} from "@/lib/dashboard/roster";
import { subscribeMapleDataReload } from "@/lib/maple-events";
import { formatActivePresetLabel } from "@/lib/pairing";

type Props = {
  /**
   * Own the switch (e.g. `useRoster().handleSetPrimary`) so React roster state
   * stays in sync. When omitted, the bar calls `switchActiveCharacter` itself.
   */
  onSelect?: (entry: RosterEntry) => void;
  /** Extra work after the active character changes (reload page drafts, etc.). */
  onSwitched?: (entry: RosterEntry) => void;
  className?: string;
};

type BarState = {
  roster: RosterEntry[];
  primary: RosterPrimary | null;
  lock: RosterPrimary | null;
  presetLabel: string | null;
};

function readBarState(): BarState {
  const state = readRosterState();
  const primary = state.primary;
  return {
    roster: state.entries,
    primary,
    lock: readActiveCharacterLock(),
    presetLabel: primary
      ? formatActivePresetLabel(entryKey(primary))
      : null,
  };
}

function LockIcon({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 11V8a5 5 0 0 1 10 0v3"
      />
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

/**
 * Compact active-character context for tool pages.
 * Switching here sets roster primary and runs the shared workspace/tool sync path.
 *
 * Lock: sticky primary stays put until unlock. Dropdown switches to other
 * characters are blocked with a clear message; "Switch back" still works if
 * primary somehow diverged from the lock.
 */
export function ActiveCharacterBar({
  onSelect,
  onSwitched,
  className,
}: Props) {
  const [state, setState] = useState<BarState>({
    roster: [],
    primary: null,
    lock: null,
    presetLabel: null,
  });
  const [ready, setReady] = useState(false);
  const [lockHint, setLockHint] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setState(readBarState());
    setReady(true);
  }, []);

  useEffect(() => {
    // Sticky default: restore locked character when entering a tool page.
    restoreLockedActiveCharacter();
    return subscribeMapleDataReload(refresh);
  }, [refresh]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key == null ||
        e.key === ROSTER_KEY ||
        e.key === ACTIVE_CHARACTER_LOCK_KEY
      ) {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  if (!ready) return null;

  const { roster, primary, lock, presetLabel } = state;
  const primaryKey = primary ? entryKey(primary) : "";
  const lockKey = lock ? entryKey(lock) : "";
  const locked = lock != null;
  const viewingTemporary =
    locked && primary != null && lockKey !== "" && primaryKey !== lockKey;
  const session = primary
    ? readSessionCharacter(primary.name, primary.region)
    : null;
  const avatar = session?.characterImgURL;
  const displayName = session?.name ?? primary?.name ?? "No primary";
  const lockedLabel = lock
    ? (readSessionCharacter(lock.name, lock.region)?.name ?? lock.name)
    : "";

  const applySelect = (entry: RosterEntry) => {
    if (onSelect) {
      onSelect(entry);
    } else {
      switchActiveCharacter(entry);
    }
    setState(readBarState());
    onSwitched?.(entry);
  };

  const handleSelect = (key: string) => {
    const entry = roster.find((e) => entryKey(e) === key);
    if (!entry) return;
    if (primary && entryKey(primary) === key) return;
    if (isStickyActiveSwitchBlocked(entry)) {
      setLockHint(UNLOCK_TO_CHANGE_ACTIVE_MSG);
      window.setTimeout(() => setLockHint(null), 2800);
      return;
    }
    setLockHint(null);
    applySelect(entry);
  };

  const handleToggleLock = () => {
    if (!primary) return;
    setLockHint(null);
    toggleActiveCharacterLock(primary);
    setState(readBarState());
  };

  const handleSwitchBack = () => {
    if (!lock) return;
    const entry = roster.find((e) => entryKey(e) === entryKey(lock));
    if (!entry) return;
    setLockHint(null);
    applySelect(entry);
  };

  if (roster.length === 0) {
    return (
      <div
        className={[
          "flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-border/60 py-2",
          className ?? "",
        ].join(" ")}
      >
        <p className="text-sm text-muted-foreground">
          No roster characters yet — tools stay local until you add one.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-semibold transition hover:bg-surface-muted"
        >
          Dashboard
        </Link>
      </div>
    );
  }

  const lockTitle = locked
    ? viewingTemporary
      ? `Default locked to ${lockedLabel}. Unlock or use Switch back to restore the sticky active character.`
      : `Locked as active character. Unlock to change the sticky default — tools can still browse other characters in a local view.`
    : "Lock as default active character. While locked, sticky switches are blocked until you unlock.";

  return (
    <div
      className={[
        "flex flex-col gap-2 border-b border-border/50 py-2 md:flex-row md:flex-wrap md:items-center",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 object-contain"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-muted text-[10px] font-bold uppercase opacity-55">
            {(displayName || "?").slice(0, 2)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            Active
            {locked ? (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-500">
                <LockIcon filled size={10} />
                Locked
              </span>
            ) : null}
          </p>
          <p className="truncate text-sm font-semibold">{displayName}</p>
          {presetLabel ? (
            <p className="truncate text-xs text-accent">{presetLabel}</p>
          ) : null}
          {viewingTemporary ? (
            <p className="truncate text-xs text-muted-foreground">
              Default: {lockedLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={handleToggleLock}
          disabled={!primary}
          title={lockTitle}
          aria-label={locked ? "Unlock active character" : "Lock active character"}
          aria-pressed={locked}
          className={[
            "inline-flex size-11 shrink-0 items-center justify-center rounded-md border transition",
            locked
              ? "border-amber-400/55 bg-amber-400/15 text-amber-500 hover:bg-amber-400/25"
              : "border-border bg-background text-foreground/45 hover:bg-surface-muted hover:text-foreground/80",
            !primary ? "cursor-not-allowed opacity-40" : "",
          ].join(" ")}
        >
          <LockIcon filled={locked} />
        </button>

        {viewingTemporary ? (
          <button
            type="button"
            onClick={handleSwitchBack}
            title={`Switch back to locked default (${lockedLabel})`}
            className="min-h-11 rounded-md border border-amber-400/45 bg-amber-400/10 px-3 text-sm font-semibold text-amber-600 transition hover:bg-amber-400/20"
          >
            Switch back
          </button>
        ) : null}

        <label className="min-w-0 flex-1">
          <span className="sr-only">Switch active character</span>
          <select
            value={primaryKey}
            onChange={(e) => handleSelect(e.target.value)}
            className="min-h-11 w-full rounded-md border border-border bg-background px-2 text-base font-semibold outline-none focus:border-accent md:text-sm"
          >
            {roster.map((entry) => {
              const key = entryKey(entry);
              const cached = readSessionCharacter(entry.name, entry.region);
              const label = cached?.name ?? entry.name;
              const isLockedOpt = lockKey === key;
              return (
                <option key={key} value={key}>
                  {label} ({entry.region.toUpperCase()})
                  {isLockedOpt ? " · locked" : ""}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      <div className="hidden flex-wrap items-center gap-1.5 md:flex">
        <Link
          href="/dashboard"
          className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
        >
          Dashboard
        </Link>
        <Link
          href="/roster"
          className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
        >
          Manager
        </Link>
      </div>

      {lockHint ? (
        <p
          role="status"
          className="w-full text-sm font-semibold text-amber-600"
        >
          {lockHint}
        </p>
      ) : null}
    </div>
  );
}
