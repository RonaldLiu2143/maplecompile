"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME_PREFS,
  THEME_ACCENT_SWATCHES,
  THEME_PRESETS,
  applyThemeToDocument,
  getThemePreset,
  readThemePrefs,
  subscribeThemePrefs,
  writeThemePrefs,
  type ThemeId,
  type ThemePrefs,
} from "@/lib/theme";

function ThemeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="9" cy="9" r="6.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9 2.75v12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M9 2.75a6.25 6.25 0 0 1 0 12.5"
        fill="currentColor"
        opacity="0.35"
      />
    </svg>
  );
}

function getServerThemePrefs(): ThemePrefs {
  return DEFAULT_THEME_PREFS;
}

export function ThemePicker({
  compact = false,
  placement = "above",
}: {
  compact?: boolean;
  /** Where the compact popover opens relative to the trigger. */
  placement?: "above" | "below";
}) {
  const prefs = useSyncExternalStore(
    subscribeThemePrefs,
    readThemePrefs,
    getServerThemePrefs,
  );
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep <html> tokens in sync when prefs change (boot script handles first paint).
  useEffect(() => {
    applyThemeToDocument(prefs);
  }, [prefs]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commit = (next: ThemePrefs) => {
    writeThemePrefs(next);
    applyThemeToDocument(next);
  };

  const setThemeId = (id: ThemeId) => {
    commit({ id, accent: null });
  };

  const setAccent = (accent: string | null) => {
    commit({ ...prefs, accent });
  };

  const preset = getThemePreset(prefs.id);
  const activeAccent = prefs.accent ?? preset.defaultAccent;

  const panel = (
    <div
      id={panelId}
      role="dialog"
      aria-label="Theme settings"
      className={[
        "rounded-xl border border-border/50 bg-surface p-3 shadow-lg",
        compact
          ? [
              "absolute z-50 w-64",
              placement === "above"
                ? "bottom-full left-0 mb-2"
                : "top-full right-0 mt-2",
            ].join(" ")
          : "w-full",
      ].join(" ")}
    >
      <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider opacity-55">
        Theme
      </p>
      <div className="flex flex-col gap-1">
        {THEME_PRESETS.map((p) => {
          const active = prefs.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setThemeId(p.id)}
              className={[
                "rounded-lg px-2.5 py-2 text-left transition-colors",
                active
                  ? "bg-accent text-white dark:text-zinc-900"
                  : "hover:bg-accent-soft hover:text-accent",
              ].join(" ")}
            >
              <span className="block text-sm font-semibold">{p.name}</span>
              <span
                className={[
                  "mt-0.5 block text-[11px] leading-snug",
                  active ? "opacity-80" : "opacity-55",
                ].join(" ")}
              >
                {p.description}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mb-1.5 mt-3 text-[0.7rem] font-semibold uppercase tracking-wider opacity-55">
        Accent
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {THEME_ACCENT_SWATCHES.map((hex) => {
          const selected = activeAccent.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              title={hex}
              aria-label={`Accent ${hex}`}
              aria-pressed={selected}
              onClick={() => setAccent(hex)}
              className={[
                "size-6 rounded-md border-2 transition",
                selected
                  ? "border-foreground scale-110"
                  : "border-border/40 hover:border-border",
              ].join(" ")}
              style={{ backgroundColor: hex }}
            />
          );
        })}
        <button
          type="button"
          onClick={() => setAccent(null)}
          className="rounded-md border border-border/50 px-2 py-1 text-[11px] font-semibold opacity-70 hover:bg-surface-muted hover:opacity-100"
        >
          Reset
        </button>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div ref={rootRef} className="relative flex justify-center py-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          title="Theme"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 transition-colors hover:bg-accent-soft hover:text-accent"
        >
          <ThemeIcon />
          <span className="sr-only">Theme</span>
        </button>
        {open ? panel : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="border-t border-border/40 px-2 py-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors hover:bg-accent-soft hover:text-accent"
      >
        <span className="flex items-center gap-2">
          <ThemeIcon />
          Theme
        </span>
        <span className="text-xs font-semibold text-accent opacity-90">
          {preset.name}
        </span>
      </button>
      {open ? <div className="mt-1">{panel}</div> : null}
    </div>
  );
}
