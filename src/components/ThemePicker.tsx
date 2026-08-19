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
  THEME_HUE_PRESETS,
  THEME_PRESETS,
  WALLPAPER_DEFAULT_BLUR,
  WALLPAPER_DEFAULT_DIM,
  getFontPreset,
  getThemePreset,
  parseAccentHex,
  parseThemeHue,
  readThemePrefs,
  sanitizeBackdropUrl,
  subscribeThemePrefs,
  themeHueLabel,
  writeThemePrefs,
  type BackdropId,
  type FontId,
  type ThemeId,
  type ThemePrefs,
  type ThemeScheme,
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

function tint(hex: string, hue: number | null): string {
  if (hue == null) return hex;
  return `oklch(from ${hex} calc(l - 0.03) calc(c + 0.02) ${hue})`;
}

function HuePreview({
  hue,
  scheme,
  selected,
}: {
  hue: number | null;
  scheme: ThemeScheme;
  selected?: boolean;
}) {
  const dark = scheme === "dark";
  const canvas = tint(dark ? "#0a0a0a" : "#f4f4f4", hue);
  const frame = tint(dark ? "#050505" : "#ececec", hue);
  const raised = tint(dark ? "#141414" : "#ffffff", hue);
  const inset = tint(dark ? "#1c1c1c" : "#ececec", hue);
  const accent =
    hue == null
      ? dark
        ? "#f5f5f5"
        : "#111111"
      : dark
        ? `oklch(0.78 0.16 ${hue})`
        : `oklch(0.40 0.14 ${hue})`;
  const chart =
    hue == null
      ? dark
        ? "#737373"
        : "#a3a3a3"
      : `oklch(0.72 0.14 ${(hue + 240) % 360})`;

  return (
    <span
      className={[
        "relative block h-14 w-full overflow-hidden rounded-md border",
        selected ? "border-foreground" : "border-border/50",
      ].join(" ")}
      style={{ background: canvas }}
      aria-hidden
    >
      <span
        className="absolute inset-y-0 left-0 w-[22%]"
        style={{ background: frame }}
      >
        <span
          className="absolute left-0 top-1.5 h-3 w-full"
          style={{ background: `${accent}33`, borderLeft: `2px solid ${accent}` }}
        />
        <span
          className="absolute left-1 top-6 h-1 w-[70%] rounded-sm opacity-40"
          style={{ background: accent }}
        />
        <span
          className="absolute left-1 top-8 h-1 w-[55%] rounded-sm opacity-25"
          style={{ background: accent }}
        />
      </span>
      <span className="absolute inset-y-1 right-1 left-[26%] flex flex-col gap-0.5">
        <span
          className="flex h-[42%] items-center justify-between rounded-sm px-1"
          style={{ background: raised }}
        >
          <span
            className="h-1 w-[46%] rounded-sm opacity-50"
            style={{ background: accent }}
          />
          <span
            className="size-1.5 rounded-[2px]"
            style={{ background: accent }}
          />
        </span>
        <span
          className="flex h-[42%] items-end gap-0.5 rounded-sm px-1 pb-0.5"
          style={{ background: inset }}
        >
          <span
            className="h-[40%] w-[18%] rounded-[1px]"
            style={{ background: chart }}
          />
          <span
            className="h-[70%] w-[18%] rounded-[1px]"
            style={{ background: chart }}
          />
          <span
            className="h-[55%] w-[18%] rounded-[1px]"
            style={{ background: chart }}
          />
          <span
            className="h-[85%] w-[18%] rounded-[1px]"
            style={{ background: accent }}
          />
        </span>
      </span>
    </span>
  );
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
      className={["flex flex-col gap-1", disabled ? "opacity-40" : ""].join(" ")}
    >
      <span className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
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
    commit({ ...prefs, id });
  };

  const setFontId = (font: FontId) => {
    commit({ ...prefs, font });
  };

  const setHue = (hue: number | null) => {
    commit({ ...prefs, hue: parseThemeHue(hue), accent: null });
  };

  const applyCustomAccent = (raw?: string) => {
    const parsed = parseAccentHex(raw ?? accentDraft);
    if (!parsed) {
      setAccentError("Use a hex color like #f5f5f5.");
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
  const backdrop = prefs.backdrop ?? DEFAULT_BACKDROP_ID;
  const wallpaperOn = backdrop !== "none";
  const dim = prefs.dim ?? 0;
  const blur = prefs.blur ?? 0;
  const activeFont = prefs.font ?? DEFAULT_FONT_ID;
  const activeHue = parseThemeHue(prefs.hue ?? null);
  const scheme: ThemeScheme = preset.scheme;

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
      <div className="maple-scroll max-h-[min(70vh,32rem)] space-y-3 overflow-y-auto pr-0.5">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-foreground">
            Appearance
          </p>
          <div
            className="grid grid-cols-3 gap-1 rounded-lg border border-border/50 bg-background p-0.5"
            role="group"
            aria-label="Appearance"
          >
            {THEME_PRESETS.map((p) => {
              const active = prefs.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setThemeId(p.id)}
                  aria-pressed={active}
                  className={[
                    "rounded-md px-2 py-1.5 text-center text-[11px] font-semibold transition-colors",
                    active
                      ? "bg-accent text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent-soft hover:text-foreground",
                  ].join(" ")}
                >
                  {p.id === "compile"
                    ? "Dark"
                    : p.id === "contrast"
                      ? "Contrast"
                      : "Light"}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-foreground">Color</p>
          <div className="grid grid-cols-3 gap-1.5">
            {THEME_HUE_PRESETS.map((p) => {
              const selected = p.hue === activeHue;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setHue(p.hue)}
                  aria-pressed={selected}
                  aria-label={`Color ${p.name}`}
                  className={[
                    "flex flex-col gap-1 rounded-lg p-1 text-left transition",
                    selected
                      ? "bg-accent-soft"
                      : "hover:bg-surface-muted/60",
                  ].join(" ")}
                >
                  <HuePreview
                    hue={p.hue}
                    scheme={scheme}
                    selected={selected}
                  />
                  <span
                    className={[
                      "text-center text-[10px] font-semibold",
                      selected ? "text-foreground" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
          <label className="mt-2.5 flex flex-col gap-1">
            <span className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Hue</span>
              <span className="tabular-nums">
                {activeHue == null ? "Off" : `${activeHue}°`}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={359}
              step={1}
              value={activeHue ?? 0}
              aria-label="Theme hue"
              onChange={(e) => setHue(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-[var(--accent)]"
            />
          </label>
        </div>

        <details className="group border-t border-border/40 pt-2">
          <summary className="cursor-pointer list-none text-sm font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between">
              Type
              <span className="text-[11px] font-semibold text-muted-foreground">
                {fontPreset.name}
              </span>
            </span>
          </summary>
          <div className="mt-2 flex flex-col gap-1">
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
                      ? "bg-accent text-primary-foreground"
                      : "hover:bg-accent-soft hover:text-accent",
                  ].join(" ")}
                >
                  <span className="block text-sm font-semibold">{p.name}</span>
                  <span
                    className={[
                      "mt-0.5 block text-[11px] leading-snug",
                      active
                        ? "text-primary-foreground/90"
                        : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {p.description}
                  </span>
                </button>
              );
            })}
          </div>
        </details>

        <details className="group border-t border-border/40 pt-2">
          <summary className="cursor-pointer list-none text-sm font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between">
              Backdrop
              <span className="text-[11px] font-semibold text-muted-foreground">
                {wallpaperOn ? "On" : "None"}
              </span>
            </span>
          </summary>
          <div className="mt-2 space-y-2">
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
                      active ? "ring-2 ring-accent" : "hover:bg-surface-muted/60",
                    ].join(" ")}
                  >
                    <span
                      className="h-8 w-full rounded-md border border-border/40"
                      style={{ background: b.preview }}
                    />
                    <span className="w-full truncate text-center text-[10px] font-semibold text-muted-foreground">
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
                  className="flex h-8 w-full items-center justify-center rounded-md border border-dashed border-border/50 bg-surface-muted/40 text-[10px] font-bold text-muted-foreground"
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
                <span className="w-full truncate text-center text-[10px] font-semibold text-muted-foreground">
                  Custom
                </span>
              </button>
            </div>

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

            <div>
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
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Using custom wallpaper
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-muted-soft">
                  Direct image link (https). Apply or press Enter.
                </p>
              )}
            </div>
          </div>
        </details>

        <details className="group border-t border-border/40 pt-2">
          <summary className="cursor-pointer list-none text-sm font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between">
              Accent hex
              <span className="text-[11px] font-semibold text-muted-foreground">
                {prefs.accent ?? "Auto"}
              </span>
            </span>
          </summary>
          <div className="mt-2 flex items-center gap-1.5">
            <label
              className="relative flex size-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-border/40"
              style={{
                backgroundColor: prefs.accent ?? getThemePreset(prefs.id).defaultAccent,
              }}
              title="Custom accent"
            >
              <span className="sr-only">Custom accent color</span>
              <input
                type="color"
                value={
                  parseAccentHex(prefs.accent ?? getThemePreset(prefs.id).defaultAccent) ??
                  "#f5f5f5"
                }
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
              placeholder="#f5f5f5"
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
                  setAccentError("Use a hex color like #f5f5f5.");
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
          ) : (
            <p className="mt-1 text-[10px] text-muted-soft">
              Overrides the hue button color only. Neutrals stay tinted.
            </p>
          )}
        </details>
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
          {themeHueLabel(activeHue)}
          {activeFont !== DEFAULT_FONT_ID ? ` · ${fontPreset.name}` : ""}
          {wallpaperOn ? " · Wallpaper" : ""}
        </span>
      </button>
      {open ? <div className="mt-1">{panel}</div> : null}
    </div>
  );
}
