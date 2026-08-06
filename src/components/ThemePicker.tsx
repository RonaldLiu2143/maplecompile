"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  BACKDROP_PRESETS,
  BLUR_MAX,
  DEFAULT_BACKDROP_ID,
  DEFAULT_FONT_ID,
  DEFAULT_THEME_PREFS,
  DIM_MAX,
  FONT_PRESETS,
  THEME_ACCENT_PRESETS,
  THEME_ACCENT_SWATCHES,
  THEME_PRESETS,
  WALLPAPER_DEFAULT_BLUR,
  WALLPAPER_DEFAULT_DIM,
  getFontPreset,
  getThemePreset,
  parseAccentHex,
  readThemePrefs,
  sanitizeBackdropUrl,
  subscribeThemePrefs,
  writeThemePrefs,
  type BackdropId,
  type FontId,
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

function SliderRow({
  label,
  value,
  max,
  unit,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  disabled?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <label
      className={[
        "flex flex-col gap-1",
        disabled ? "opacity-40" : "",
      ].join(" ")}
    >
      <span className="flex items-center justify-between text-[11px] font-semibold text-muted">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed"
      />
    </label>
  );
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
  const [customDraft, setCustomDraft] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [accentDraft, setAccentDraft] = useState("");
  const [accentError, setAccentError] = useState<string | null>(null);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setCustomDraft(prefs.backdropUrl ?? "");
    setUrlError(null);
    const presetAccent = getThemePreset(prefs.id).defaultAccent;
    setAccentDraft(prefs.accent ?? presetAccent);
    setAccentError(null);
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
  }, [open, prefs.backdropUrl, prefs.accent, prefs.id]);

  const commit = (next: ThemePrefs) => {
    writeThemePrefs(next);
  };

  const setThemeId = (id: ThemeId) => {
    commit({ ...prefs, id, accent: null });
  };

  const setFontId = (font: FontId) => {
    commit({ ...prefs, font });
  };

  const setAccent = (accent: string | null) => {
    const next = accent == null ? null : parseAccentHex(accent);
    if (accent != null && !next) return;
    setAccentError(null);
    if (next) setAccentDraft(next);
    else setAccentDraft(getThemePreset(prefs.id).defaultAccent);
    commit({ ...prefs, accent: next });
  };

  const applyCustomAccent = (raw?: string) => {
    const parsed = parseAccentHex(raw ?? accentDraft);
    if (!parsed) {
      setAccentError("Use a hex color like #38bdf8.");
      return;
    }
    setAccentError(null);
    setAccentDraft(parsed);
    commit({ ...prefs, accent: parsed });
  };

  const setBackdrop = (backdrop: BackdropId) => {
    if (backdrop === "none") {
      setUrlError(null);
      commit({
        ...prefs,
        backdrop: "none",
        backdropUrl: null,
        dim: 0,
        blur: 0,
      });
      return;
    }
    if (backdrop === "custom") {
      const url = sanitizeBackdropUrl(customDraft || prefs.backdropUrl);
      if (!url) {
        setUrlError("Paste an https image URL, then Apply.");
        return;
      }
      setUrlError(null);
      setCustomDraft(url);
      commit({
        ...prefs,
        backdrop: "custom",
        backdropUrl: url,
        dim: prefs.dim && prefs.dim > 0 ? prefs.dim : WALLPAPER_DEFAULT_DIM,
        blur: prefs.blur && prefs.blur > 0 ? prefs.blur : WALLPAPER_DEFAULT_BLUR,
      });
      return;
    }
    setUrlError(null);
    const fromNone = (prefs.backdrop ?? DEFAULT_BACKDROP_ID) === "none";
    commit({
      ...prefs,
      backdrop,
      backdropUrl: null,
      dim: fromNone ? WALLPAPER_DEFAULT_DIM : (prefs.dim ?? WALLPAPER_DEFAULT_DIM),
      blur: fromNone
        ? WALLPAPER_DEFAULT_BLUR
        : (prefs.blur ?? WALLPAPER_DEFAULT_BLUR),
    });
  };

  const applyCustomUrl = () => {
    const url = sanitizeBackdropUrl(customDraft);
    if (!url) {
      setUrlError("Need a valid http(s) image URL.");
      return;
    }
    setUrlError(null);
    setCustomDraft(url);
    commit({
      ...prefs,
      backdrop: "custom",
      backdropUrl: url,
      dim: prefs.dim && prefs.dim > 0 ? prefs.dim : WALLPAPER_DEFAULT_DIM,
      blur: prefs.blur && prefs.blur > 0 ? prefs.blur : WALLPAPER_DEFAULT_BLUR,
    });
  };

  const preset = getThemePreset(prefs.id);
  const fontPreset = getFontPreset(prefs.font ?? DEFAULT_FONT_ID);
  const activeAccent = prefs.accent ?? preset.defaultAccent;
  const backdrop = prefs.backdrop ?? DEFAULT_BACKDROP_ID;
  const wallpaperOn = backdrop !== "none";
  const dim = prefs.dim ?? 0;
  const blur = prefs.blur ?? 0;
  const activeFont = prefs.font ?? DEFAULT_FONT_ID;

  const panel = (
    <div
      id={panelId}
      role="dialog"
      aria-label="Theme settings"
      className={[
        "rounded-xl border border-border/50 bg-surface p-3 shadow-lg",
        compact
          ? [
              "absolute z-50 w-72",
              placement === "above"
                ? "bottom-full left-0 mb-2"
                : "top-full right-0 mt-2",
            ].join(" ")
          : "w-full",
      ].join(" ")}
    >
      <div className="maple-scroll max-h-[min(70vh,28rem)] space-y-3 overflow-y-auto pr-0.5">
        <div>
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-soft">
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
                      active ? "text-white/90 dark:text-zinc-900/85" : "text-muted",
                    ].join(" ")}
                  >
                    {p.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-soft">
            Font
          </p>
          <div className="flex flex-col gap-1">
            {FONT_PRESETS.map((p) => {
              const active = activeFont === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFontId(p.id)}
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
                      active ? "text-white/90 dark:text-zinc-900/85" : "text-muted",
                    ].join(" ")}
                  >
                    {p.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-soft">
            Accent
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {THEME_ACCENT_PRESETS.map(({ hex, name }) => {
              const selected = activeAccent.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  title={`${name} (${hex})`}
                  aria-label={`Accent ${name}`}
                  aria-pressed={selected}
                  onClick={() => setAccent(hex)}
                  className={[
                    "flex flex-col items-center gap-0.5 rounded-md p-0.5 transition",
                    selected ? "scale-105" : "opacity-90 hover:opacity-100",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "size-6 rounded-md border-2",
                      selected
                        ? "border-foreground"
                        : "border-border/40",
                    ].join(" ")}
                    style={{ backgroundColor: hex }}
                  />
                  <span
                    className={[
                      "text-[9px] font-semibold leading-none",
                      selected ? "text-accent" : "text-muted-soft",
                    ].join(" ")}
                  >
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-muted-soft">
            Sky is Compile default · Maple is the warm orange option
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <label
              className={[
                "relative flex size-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 transition",
                prefs.accent != null &&
                !THEME_ACCENT_SWATCHES.some(
                  (h) => h.toLowerCase() === activeAccent.toLowerCase(),
                )
                  ? "border-foreground scale-110"
                  : "border-border/40 hover:border-border",
              ].join(" ")}
              style={{ backgroundColor: activeAccent }}
              title="Custom accent"
            >
              <span className="sr-only">Custom accent color</span>
              <input
                type="color"
                value={parseAccentHex(activeAccent) ?? preset.defaultAccent}
                aria-label="Pick custom accent"
                onChange={(e) => applyCustomAccent(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              aria-label="Custom accent hex"
              placeholder="#38bdf8"
              value={accentDraft}
              onChange={(e) => {
                setAccentDraft(e.target.value);
                if (accentError) setAccentError(null);
              }}
              onBlur={() => {
                if (!accentDraft.trim()) return;
                const parsed = parseAccentHex(accentDraft);
                if (parsed && parsed !== (prefs.accent ?? "").toLowerCase()) {
                  applyCustomAccent(parsed);
                } else if (accentDraft.trim() && !parsed) {
                  setAccentError("Use a hex color like #38bdf8.");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyCustomAccent();
                }
              }}
              className="min-w-0 flex-1 rounded-md border border-border/50 bg-background px-2 py-1 text-xs font-mono outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => applyCustomAccent()}
              className="shrink-0 rounded-md border border-border/50 px-2 py-1 text-[11px] font-semibold hover:bg-accent-soft hover:text-accent"
            >
              Apply
            </button>
          </div>
          {accentError ? (
            <p className="mt-1 text-[10px] text-danger">{accentError}</p>
          ) : prefs.accent == null ? (
            <p className="mt-1 text-[10px] text-muted-soft">
              Theme default ({preset.defaultAccent})
            </p>
          ) : (
            <p className="mt-1 text-[10px] text-muted">Custom accent applied</p>
          )}
        </div>

        <div className="border-t border-border/40 pt-3">
          <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-soft">
            Backdrop
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {BACKDROP_PRESETS.map((b) => {
              const active = backdrop === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  title={b.name}
                  aria-label={`Backdrop ${b.name}`}
                  aria-pressed={active}
                  onClick={() => setBackdrop(b.id)}
                  className={[
                    "flex flex-col items-center gap-1 rounded-lg p-1 transition",
                    active
                      ? "ring-2 ring-accent"
                      : "hover:bg-surface-muted/60",
                  ].join(" ")}
                >
                  <span
                    className="h-8 w-full rounded-md border border-border/40"
                    style={{ background: b.preview }}
                  />
                  <span className="w-full truncate text-center text-[10px] font-semibold text-muted">
                    {b.name}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              title="Custom image"
              aria-label="Backdrop Custom"
              aria-pressed={backdrop === "custom"}
              onClick={() => setBackdrop("custom")}
              className={[
                "flex flex-col items-center gap-1 rounded-lg p-1 transition",
                backdrop === "custom"
                  ? "ring-2 ring-accent"
                  : "hover:bg-surface-muted/60",
              ].join(" ")}
            >
              <span
                className="flex h-8 w-full items-center justify-center rounded-md border border-dashed border-border/50 bg-surface-muted/40 text-[10px] font-bold text-muted"
                style={
                  backdrop === "custom" && prefs.backdropUrl
                    ? {
                        backgroundImage: `linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.35)), url(${JSON.stringify(prefs.backdropUrl)})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        borderStyle: "solid",
                      }
                    : undefined
                }
              >
                {backdrop === "custom" && prefs.backdropUrl ? "" : "URL"}
              </span>
              <span className="w-full truncate text-center text-[10px] font-semibold text-muted">
                Custom
              </span>
            </button>
          </div>

          <div className="mt-2.5 space-y-2">
            <SliderRow
              label="Dim"
              value={dim}
              max={DIM_MAX}
              unit="%"
              disabled={!wallpaperOn}
              onChange={(n) => commit({ ...prefs, dim: n })}
            />
            <SliderRow
              label="Blur"
              value={blur}
              max={BLUR_MAX}
              unit="px"
              disabled={!wallpaperOn}
              onChange={(n) => commit({ ...prefs, blur: n })}
            />
          </div>

          <div className="mt-2.5">
            <p className="mb-1 text-[11px] font-semibold text-muted-soft">
              Custom image URL
            </p>
            <div className="flex gap-1.5">
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://…/image.jpg"
                value={customDraft}
                onChange={(e) => {
                  setCustomDraft(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                onBlur={() => {
                  // Apply when leaving the field if the draft is a valid URL.
                  if (!customDraft.trim()) return;
                  const url = sanitizeBackdropUrl(customDraft);
                  if (
                    url &&
                    (backdrop !== "custom" || url !== prefs.backdropUrl)
                  ) {
                    applyCustomUrl();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCustomUrl();
                  }
                }}
                className="min-w-0 flex-1 rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={applyCustomUrl}
                className="shrink-0 rounded-md border border-border/50 px-2 py-1 text-[11px] font-semibold hover:bg-accent-soft hover:text-accent"
              >
                Apply
              </button>
            </div>
            {urlError ? (
              <p className="mt-1 text-[10px] text-danger">{urlError}</p>
            ) : backdrop === "custom" ? (
              <p className="mt-1 text-[10px] text-muted">
                Using custom wallpaper
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-muted-soft">
                Direct image link (https). Apply or press Enter.
              </p>
            )}
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
          {activeFont !== DEFAULT_FONT_ID ? ` · ${fontPreset.name}` : ""}
          {wallpaperOn ? " · Wallpaper" : ""}
        </span>
      </button>
      {open ? <div className="mt-1">{panel}</div> : null}
    </div>
  );
}
