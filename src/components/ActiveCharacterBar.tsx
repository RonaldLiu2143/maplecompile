"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { switchActiveCharacter } from "@/lib/active-character";
import { readSessionCharacter } from "@/lib/character/client";
import {
  entryKey,
  readRosterState,
  ROSTER_KEY,
  type RosterEntry,
  type RosterPrimary,
} from "@/lib/dashboard/roster";
import { subscribeMapleDataReload } from "@/lib/maple-events";

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
};

function readBarState(): BarState {
  const state = readRosterState();
  return { roster: state.entries, primary: state.primary };
}

/**
 * Compact active-character context for tool pages.
 * Switching here sets roster primary and runs the shared workspace/tool sync path.
 */
export function ActiveCharacterBar({
  onSelect,
  onSwitched,
  className,
}: Props) {
  const [state, setState] = useState<BarState>({ roster: [], primary: null });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setState(readBarState());
    setReady(true);
  }, []);

  useEffect(() => {
    return subscribeMapleDataReload(refresh);
  }, [refresh]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key == null || e.key === ROSTER_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  if (!ready) return null;

  const { roster, primary } = state;
  const primaryKey = primary ? entryKey(primary) : "";
  const session = primary
    ? readSessionCharacter(primary.name, primary.region)
    : null;
  const avatar = session?.characterImgURL;
  const displayName = session?.name ?? primary?.name ?? "No primary";

  const handleSelect = (key: string) => {
    const entry = roster.find((e) => entryKey(e) === key);
    if (!entry) return;
    if (primary && entryKey(primary) === key) return;
    if (onSelect) {
      onSelect(entry);
    } else {
      switchActiveCharacter(entry);
    }
    setState(readBarState());
    onSwitched?.(entry);
  };

  if (roster.length === 0) {
    return (
      <div
        className={[
          "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border/60 bg-surface/70 px-3 py-2",
          className ?? "",
        ].join(" ")}
      >
        <p className="text-xs opacity-70">
          No roster characters yet — tools stay local until you add one.
        </p>
        <Link
          href="/dashboard"
          className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted"
        >
          Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div
      className={[
        "flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-surface/90 px-3 py-2",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-[10px] font-bold uppercase opacity-55">
            {(displayName || "?").slice(0, 2)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-accent opacity-80">
            Active character
          </p>
          <p className="truncate text-sm font-semibold">{displayName}</p>
        </div>
      </div>

      <label className="flex items-center gap-1.5 text-xs">
        <span className="sr-only">Switch active character</span>
        <select
          value={primaryKey}
          onChange={(e) => handleSelect(e.target.value)}
          className="max-w-[11rem] rounded-md border border-border bg-background px-2 py-1.5 text-xs font-semibold outline-none focus:border-accent sm:max-w-[14rem]"
        >
          {roster.map((entry) => {
            const key = entryKey(entry);
            const cached = readSessionCharacter(entry.name, entry.region);
            const label = cached?.name ?? entry.name;
            return (
              <option key={key} value={key}>
                {label} ({entry.region.toUpperCase()})
              </option>
            );
          })}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-1.5">
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
    </div>
  );
}
