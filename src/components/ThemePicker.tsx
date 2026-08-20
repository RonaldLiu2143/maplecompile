"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ColorGraph } from "@/components/theme/ColorGraph";
import {
  DEFAULT_THEME_COLOR,
  DEFAULT_THEME_HUE,
  DEFAULT_THEME_PREFS,
  FONT_PRESETS,
  THEME_HUE_PRESETS,
  THEME_PRESETS,
  hexToHue,
  matchThemeHuePreset,
  parseAccentHex,
  parseThemeHue,
  readThemePrefs,
  subscribeThemePrefs,
  themeHueLabel,
  writeThemePrefs,
  type FontId,
  type ThemeId,
  type ThemePrefs,
} from "@/lib/theme";
import { Contrast, Moon, Palette, Sun, Type } from "lucide-react";

function getServerThemePrefs(): ThemePrefs {
  return DEFAULT_THEME_PREFS;
}

const APPEARANCE_ICONS = {
  compile: Moon,
  contrast: Contrast,
  light: Sun,
} as const;

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
  const [customOpen, setCustomOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const matched = matchThemeHuePreset(prefs.hue);
  const showCustom = customOpen || matched == null;

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

  const setThemeId = (id: ThemeId) => {
    writeThemePrefs({ ...prefs, id });
  };

  const setFont = (font: FontId) => {
    writeThemePrefs({ ...prefs, font });
  };

  const setPreset = (preset: (typeof THEME_HUE_PRESETS)[number]) => {
    setCustomOpen(false);
    writeThemePrefs({
      ...prefs,
      hue: preset.hue,
      accent: preset.hex,
    });
  };

  const setColor = (hex: string) => {
    const parsed = parseAccentHex(hex);
    if (!parsed) return;
    const hue = hexToHue(parsed) ?? parseThemeHue(prefs.hue) ?? DEFAULT_THEME_HUE;
    setCustomOpen(true);
    writeThemePrefs({ ...prefs, accent: parsed, hue });
  };

  const activeHue = prefs.hue === null ? null : (parseThemeHue(prefs.hue) ?? DEFAULT_THEME_HUE);
  const activeColor =
    parseAccentHex(prefs.accent) ??
    matched?.hex ??
    DEFAULT_THEME_COLOR;
  const activeFont = prefs.font ?? DEFAULT_THEME_PREFS.font ?? "geist";

  const panel = (
    <div
      id={panelId}
      role="dialog"
      aria-label="Theme settings"
      className={[
        "rounded-xl border border-border/50 bg-surface p-3 shadow-lg",
        compact
          ? [
              "absolute z-50 w-80",
              placement === "above"
                ? "bottom-full left-0 mb-2"
                : "top-full right-0 mt-2",
            ].join(" ")
          : "w-full",
      ].join(" ")}
    >
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Sun className="size-3.5" aria-hidden />
            Appearance
          </p>
          <div
            className="grid grid-cols-3 gap-1 rounded-lg border border-border/50 bg-background p-0.5"
            role="group"
            aria-label="Appearance"
          >
            {THEME_PRESETS.map((p) => {
              const active = prefs.id === p.id;
              const Icon = APPEARANCE_ICONS[p.id];
              const label =
                p.id === "compile"
                  ? "Dark"
                  : p.id === "contrast"
                    ? "Contrast"
                    : "Light";
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setThemeId(p.id)}
                  aria-pressed={active}
                  className={[
                    "inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
                    active
                      ? "bg-accent text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent-soft hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Palette className="size-3.5" aria-hidden />
            Color
          </p>
          <div
            className="grid grid-cols-3 gap-1.5"
            role="group"
            aria-label="Color presets"
          >
            {THEME_HUE_PRESETS.map((p) => {
              const active = !showCustom && matched?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p)}
                  aria-pressed={active}
                  className={[
                    "flex flex-col items-center gap-1 rounded-lg border px-1.5 py-1.5 text-[10px] font-semibold transition-colors",
                    active
                      ? "border-accent bg-accent-soft text-foreground"
                      : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
                  ].join(" ")}
                >
                  <span
                    className="size-6 rounded-md border border-border/50"
                    style={{ backgroundColor: p.hex }}
                    aria-hidden
                  />
                  {p.name}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-pressed={showCustom}
            onClick={() => setCustomOpen(true)}
            className={[
              "mt-1.5 w-full rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition-colors",
              showCustom
                ? "border-accent bg-accent-soft text-foreground"
                : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
            ].join(" ")}
          >
            Custom color
          </button>
          {showCustom ? (
            <div className="mt-2">
              <ColorGraph color={activeColor} onChange={setColor} />
            </div>
          ) : null}
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Type className="size-3.5" aria-hidden />
            Type
          </p>
          <div className="flex flex-col gap-1" role="group" aria-label="Typeface">
            {FONT_PRESETS.map((p) => {
              const active = activeFont === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFont(p.id)}
                  aria-pressed={active}
                  className={[
                    "rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                    active
                      ? "border-accent bg-accent-soft"
                      : "border-border/50 hover:border-border",
                  ].join(" ")}
                >
                  <span className="block text-sm font-semibold">{p.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {p.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
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
          className="flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-accent-soft hover:text-accent"
        >
          <Palette className="size-[18px]" aria-hidden />
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
          <Palette className="size-[18px]" aria-hidden />
          Theme
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent opacity-90">
          <span
            className="size-3 rounded-sm border border-border/50"
            style={{ backgroundColor: activeColor }}
            aria-hidden
          />
          {themeHueLabel(activeHue)}
        </span>
      </button>
      {open ? <div className="mt-1">{panel}</div> : null}
    </div>
  );
}
