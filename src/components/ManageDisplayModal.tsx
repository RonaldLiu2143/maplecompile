"use client";

import { useEffect, useState } from "react";
import type { RosterSlotState } from "@/hooks/useRoster";
import {
  entryKey,
  isPrimary,
  type RosterEntry,
  type RosterPrimary,
} from "@/lib/dashboard/roster";
import { toggleVisibleId } from "@/lib/display-prefs";

type Props = {
  open: boolean;
  title?: string;
  helper?: string;
  roster: RosterEntry[];
  primary: RosterPrimary | null;
  slots: Record<string, RosterSlotState>;
  /** Currently visible character keys (resolved for this page). */
  visibleIds: string[];
  onClose: () => void;
  /** Persist selection; `customized` should be true. */
  onSave: (visibleIds: string[]) => void;
};

function GearIcon({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden fill="none">
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      <path
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.92 4.7 1.65 1.65 0 0 0 10 3.18V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      />
    </svg>
  );
}

/** Compact gear button that opens {@link ManageDisplayModal}. */
export function ManageDisplayButton({
  onClick,
  disabled,
  label = "Manage display",
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/50 text-foreground/60 transition hover:border-accent/50 hover:bg-accent-soft hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      <GearIcon />
    </button>
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
        width={32}
        height={32}
        className="pointer-events-none h-8 w-8 shrink-0 object-contain"
        draggable={false}
      />
    );
  }
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-[0.5rem] font-semibold uppercase tracking-wide opacity-50"
      aria-hidden
    >
      {name.slice(0, 2)}
    </div>
  );
}

export function ManageDisplayModal({
  open,
  title = "Manage display",
  helper = "Tap a character to show or hide them on this page.",
  roster,
  primary,
  slots,
  visibleIds,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<string[]>(visibleIds);

  useEffect(() => {
    if (!open) return;
    setDraft(visibleIds);
  }, [open, visibleIds]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-display-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85vh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border/50 bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-border/40 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="manage-display-title"
                className="font-display text-lg font-bold tracking-tight"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-xs opacity-65">{helper}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border/50 px-2 py-1 text-xs font-semibold opacity-70 hover:bg-surface-muted hover:opacity-100"
              aria-label="Close"
            >
              Esc
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
          {roster.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/50 px-3 py-6 text-center text-sm opacity-65">
              No roster characters yet. Add some on the Roster page first.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {roster.map((entry) => {
                const key = entryKey(entry);
                const slot = slots[key];
                const character =
                  slot?.status === "ready" ? slot.character : null;
                const loading = !slot || slot.status === "loading";
                const error = slot?.status === "error" ? slot.error : null;
                const name = character?.name ?? entry.name;
                const avatar = character?.characterImgURL;
                const selected = draft.includes(key);
                const primaryMark = isPrimary(entry, primary);
                const secondary = error
                  ? error
                  : loading || !character
                    ? "Loading…"
                    : character.level != null && character.jobName
                      ? `Lv. ${character.level} • ${character.jobName}`
                      : character.level != null
                        ? `Lv. ${character.level}`
                        : (character.jobName ?? "—");

                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => toggleVisibleId(prev, key))
                      }
                      aria-pressed={selected}
                      className={[
                        "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition",
                        selected
                          ? "border-accent bg-accent-soft/45 ring-1 ring-accent/40"
                          : "border-border/50 bg-surface/80 opacity-70 hover:border-border/70 hover:opacity-100",
                      ].join(" ")}
                    >
                      <AvatarThumb src={avatar} name={name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-sm font-semibold tracking-tight">
                            {name}
                          </span>
                          {primaryMark ? (
                            <span
                              className="text-[10px] font-bold text-amber-500"
                              title="Primary"
                            >
                              ★
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={[
                            "truncate text-xs",
                            error ? "text-danger" : "opacity-55",
                          ].join(" ")}
                        >
                          {secondary}
                        </p>
                      </div>
                      <span
                        className={[
                          "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          selected
                            ? "bg-accent/20 text-accent"
                            : "bg-surface-muted opacity-55",
                        ].join(" ")}
                      >
                        {selected ? "Shown" : "Hidden"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border/40 px-4 py-3">
          <button
            type="button"
            onClick={() => setDraft(roster.map((e) => entryKey(e)))}
            className="text-xs font-semibold text-accent hover:underline"
          >
            Show all
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border/50 px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(draft);
                onClose();
              }}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white dark:text-zinc-900"
            >
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
