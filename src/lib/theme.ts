/** Site-wide visual theme presets + localStorage persistence. */

export const THEME_STORAGE_KEY = "maplecompile-theme";
export const THEME_CHANGE_EVENT = "maplecompile-theme-change";

export const THEME_IDS = ["compile", "contrast", "light"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** Removed presets — remapped to Compile when reading stored prefs. */
const LEGACY_THEME_IDS = new Set(["maple", "mist", "night-grape"]);

export type ThemeScheme = "dark" | "light";

export type ThemePreset = {
  id: ThemeId;
  name: string;
  description: string;
  scheme: ThemeScheme;
  /** Default accent hex for the optional accent tweak UI. */
  defaultAccent: string;
};

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: "compile",
    name: "Compile",
    description: "Black canvas, white actions.",
    scheme: "dark",
    defaultAccent: "#f5f5f5",
  },
  {
    id: "contrast",
    name: "Contrast",
    description: "True black, true white, maximum clarity.",
    scheme: "dark",
    defaultAccent: "#ffffff",
  },
  {
    id: "light",
    name: "Light",
    description: "Paper canvas, black actions.",
    scheme: "light",
    defaultAccent: "#111111",
  },
] as const;

/** Opera-style wallpaper / mesh presets (CSS only — no large assets). */
export const BACKDROP_IDS = [
  "none",
  "deep-night",
  "teal-aurora",
  "amber-ember",
  "forest-mist",
  "horizon",
  "slate-mesh",
  "custom",
] as const;
export type BackdropId = (typeof BACKDROP_IDS)[number];

export type BackdropPreset = {
  id: Exclude<BackdropId, "custom">;
  name: string;
  /** Tiny CSS preview for the picker swatch. */
  preview: string;
};

export const BACKDROP_PRESETS: readonly BackdropPreset[] = [
  {
    id: "none",
    name: "None",
    preview: "#0a0a0a",
  },
  {
    id: "deep-night",
    name: "Deep Night",
    preview:
      "radial-gradient(circle at 20% 20%, #525252 0%, transparent 45%), linear-gradient(160deg, #0a0a0a, #141414 55%, #050505)",
  },
  {
    id: "teal-aurora",
    name: "Fog",
    preview:
      "radial-gradient(ellipse at 30% 0%, #ffffff33, transparent 55%), radial-gradient(ellipse at 90% 20%, #a3a3a344, transparent 50%), #141414",
  },
  {
    id: "amber-ember",
    name: "Highlight",
    preview:
      "radial-gradient(ellipse at 80% 10%, #ffffff44, transparent 45%), radial-gradient(ellipse at 10% 80%, #73737366, transparent 50%), #111111",
  },
  {
    id: "forest-mist",
    name: "Mist",
    preview:
      "radial-gradient(ellipse at 50% 0%, #52525277, transparent 55%), linear-gradient(180deg, #0a0a0a, #141414 60%, #050505)",
  },
  {
    id: "horizon",
    name: "Horizon",
    preview:
      "linear-gradient(185deg, #ffffff33 0%, transparent 40%), linear-gradient(0deg, #73737344 0%, transparent 35%), #141414",
  },
  {
    id: "slate-mesh",
    name: "Slate Mesh",
    preview:
      "radial-gradient(at 0% 0%, #52525277 0, transparent 50%), radial-gradient(at 100% 0%, #3a3a3a88 0, transparent 45%), radial-gradient(at 50% 100%, #26262644 0, transparent 50%), #141414",
  },
] as const;

/** Site-wide font stack presets (applied via data-font + CSS vars). */
export const FONT_IDS = ["geist", "inter", "jakarta"] as const;
export type FontId = (typeof FONT_IDS)[number];

/** Removed font presets — remapped to Geist when reading stored prefs. */
const LEGACY_FONT_IDS = new Set(["default", "sans", "serif", "mono"]);

function isLegacyFontId(value: unknown): boolean {
  return typeof value === "string" && LEGACY_FONT_IDS.has(value);
}

export type FontPreset = {
  id: FontId;
  name: string;
  description: string;
};

export const FONT_PRESETS: readonly FontPreset[] = [
  {
    id: "geist",
    name: "Geist",
    description: "Modern, clean, technical",
  },
  {
    id: "inter",
    name: "Inter",
    description: "Extremely readable",
  },
  {
    id: "jakarta",
    name: "Plus Jakarta Sans",
    description: "Slightly more personality",
  },
] as const;

export type ThemePrefs = {
  id: ThemeId;
  /** Site font preset. Default / omitted = Geist. */
  font?: FontId;
  /**
   * OKLCH hue (0–359) that tints every neutral (Layer 4).
   * Null/undefined = ink, no tint.
   */
  hue?: number | null;
  /** Optional accent override (hex). Null/undefined = hue ramp or preset default. */
  accent?: string | null;
  /** Wallpaper preset. Default / omitted = Deep Night atmosphere. */
  backdrop?: BackdropId;
  /** Custom image URL when backdrop === "custom" (http/https only). */
  backdropUrl?: string | null;
  /** Darken overlay 0–100. Default 0 when none, else typically ~40. */
  dim?: number;
  /** Backdrop blur in px 0–24. */
  blur?: number;
};

export const DEFAULT_THEME_ID: ThemeId = "compile";
export const DEFAULT_FONT_ID: FontId = "geist";
/** Layer 4 Blue — default hue for neutrals. */
export const DEFAULT_THEME_HUE = 250;
/** Vivid blue for the color well and action ramp. */
export const DEFAULT_THEME_COLOR = "#3b82f6";
/** Flat canvas for new / unset prefs — ThemePicker can still pick a mesh. */
export const DEFAULT_BACKDROP_ID: BackdropId = "none";
export const DEFAULT_DIM = 0;
export const DEFAULT_BLUR = 0;
/** Sensible readability when picking a wallpaper. */
export const WALLPAPER_DEFAULT_DIM = 52;
export const WALLPAPER_DEFAULT_BLUR = 8;
export const DIM_MAX = 85;
export const BLUR_MAX = 24;

function defaultDimForBackdrop(backdrop: BackdropId): number {
  return backdrop === "none" ? DEFAULT_DIM : WALLPAPER_DEFAULT_DIM;
}

function defaultBlurForBackdrop(backdrop: BackdropId): number {
  return backdrop === "none" ? DEFAULT_BLUR : WALLPAPER_DEFAULT_BLUR;
}

/** Stable default for SSR / empty storage — useSyncExternalStore requires referential equality. */
export const DEFAULT_THEME_PREFS: ThemePrefs = {
  id: DEFAULT_THEME_ID,
  font: DEFAULT_FONT_ID,
  hue: DEFAULT_THEME_HUE,
  accent: DEFAULT_THEME_COLOR,
  backdrop: DEFAULT_BACKDROP_ID,
  dim: DEFAULT_DIM,
  blur: DEFAULT_BLUR,
};

/**
 * Layer 4 hue cards — same dashboard, different OKLCH hue.
 * Ink is chroma 0 (current neutrals). Named hues match the video’s red / green / blue.
 */
export const THEME_HUE_PRESETS = [
  { id: "ink", name: "Ink", hue: null, hex: "#f5f5f5" },
  { id: "red", name: "Red", hue: 25, hex: "#e18747" },
  { id: "orange", name: "Orange", hue: 55, hex: "#e1d447" },
  { id: "green", name: "Green", hue: 145, hex: "#47e187" },
  { id: "blue", name: "Blue", hue: 250, hex: "#3b82f6" },
  { id: "violet", name: "Violet", hue: 300, hex: "#e147e1" },
] as const;

export type ThemeHuePresetId = (typeof THEME_HUE_PRESETS)[number]["id"];

/** Kole Jain Layer 4: drop L by 0.03, raise C by 0.02, then set hue. */
export const THEME_TINT_DL = -0.03;
export const THEME_TINT_DC = 0.02;

/**
 * Named accent picks — ink white / black plus two gray steps.
 * Warm maple/gold/amber leftovers are stripped on read (see LEGACY_WARM_ACCENTS).
 */
export const THEME_ACCENT_PRESETS = [
  { hex: "#f5f5f5", name: "Ink" },
  { hex: "#ffffff", name: "White" },
  { hex: "#111111", name: "Black" },
  { hex: "#a3a3a3", name: "Silver" },
  { hex: "#737373", name: "Gray" },
] as const;

/** Previous maple-night defaults — drop so stored prefs pick up ink. */
const LEGACY_WARM_ACCENTS = new Set([
  "#c9a227",
  "#e8c547",
  "#7a5610",
  "#8a6410",
  "#ea580c",
  "#f59e0b",
]);

export const THEME_ACCENT_SWATCHES: readonly string[] =
  THEME_ACCENT_PRESETS.map((p) => p.hex);

/**
 * Normalize a user/custom accent to `#rrggbb` (lowercase), or null if invalid.
 * Accepts `#rgb`, `#rrggbb`, and the same without a leading `#`.
 */
export function parseAccentHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let t = value.trim();
  if (!t || t.length > 16) return null;
  if (t[0] !== "#") t = `#${t}`;
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(t)) {
    const r = t[1]!;
    const g = t[2]!;
    const b = t[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

/**
 * RGB hex → hue in 0–359. Near-gray returns null (keep the previous hue).
 */
export function hexToHue(hex: string): number | null {
  const p = parseAccentHex(hex);
  if (!p) return null;
  const r = parseInt(p.slice(1, 3), 16) / 255;
  const g = parseInt(p.slice(3, 5), 16) / 255;
  const b = parseInt(p.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.02) return null;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return Math.round(h * 360) % 360;
}

/** Saturated hex from a hue, for the color well when only a slider moved. */
export function hueToHex(hue: number, sat = 0.72, light = 0.58): string {
  const h = ((hue % 360) + 360) % 360;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Wrap hue to 0–359, or null if missing / invalid. */
export function parseThemeHue(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return ((Math.round(n) % 360) + 360) % 360;
}

export function themeHueLabel(hue: number | null | undefined): string {
  if (hue == null) return "Ink";
  const parsed = parseThemeHue(hue);
  if (parsed == null) return "Ink";
  const named = THEME_HUE_PRESETS.find(
    (p) => p.hue != null && hueDistance(p.hue, parsed) <= 8,
  );
  if (named) return named.name;
  return "Custom";
}

export function matchThemeHuePreset(
  hue: number | null | undefined,
): (typeof THEME_HUE_PRESETS)[number] | null {
  if (hue == null) return THEME_HUE_PRESETS.find((p) => p.hue == null) ?? null;
  const parsed = parseThemeHue(hue);
  if (parsed == null) return THEME_HUE_PRESETS.find((p) => p.hue == null) ?? null;
  return (
    THEME_HUE_PRESETS.find(
      (p) => p.hue != null && hueDistance(p.hue, parsed) <= 8,
    ) ?? null
  );
}

function hueDistance(a: number, b: number): number {
  return Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
}

const HUE_ACCENT_PROPS = [
  "--accent",
  "--accent-soft",
  "--accent-foreground",
  "--primary",
  "--primary-hover",
  "--primary-active",
  "--primary-foreground",
  "--ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-ring",
] as const;

/** Saturated action ramp for a hue — 400/500 on light, 300/400 on dark. */
export function hueAccentVars(
  hue: number,
  scheme: ThemeScheme,
): Record<(typeof HUE_ACCENT_PROPS)[number], string> {
  if (scheme === "light") {
    const base = `oklch(0.40 0.14 ${hue})`;
    return {
      "--accent": base,
      "--accent-soft": `oklch(0.94 0.04 ${hue})`,
      "--accent-foreground": "#ffffff",
      "--primary": base,
      "--primary-hover": `oklch(0.32 0.15 ${hue})`,
      "--primary-active": `oklch(0.28 0.14 ${hue})`,
      "--primary-foreground": "#ffffff",
      "--ring": base,
      "--sidebar-primary": base,
      "--sidebar-primary-foreground": "#ffffff",
      "--sidebar-ring": base,
    };
  }
  const base = `oklch(0.78 0.16 ${hue})`;
  return {
    "--accent": base,
    "--accent-soft": `oklch(0.24 0.05 ${hue})`,
    "--accent-foreground": "#0a0a0a",
    "--primary": base,
    "--primary-hover": `oklch(0.84 0.14 ${hue})`,
    "--primary-active": `oklch(0.70 0.16 ${hue})`,
    "--primary-foreground": "#0a0a0a",
    "--ring": base,
    "--sidebar-primary": base,
    "--sidebar-primary-foreground": "#0a0a0a",
    "--sidebar-ring": base,
  };
}

/** Cache so getSnapshot returns the same object when localStorage is unchanged. */
let cachedStorageRaw: string | null | undefined;
let cachedPrefs: ThemePrefs = DEFAULT_THEME_PREFS;

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (THEME_IDS as readonly string[]).includes(value)
  );
}

export function isBackdropId(value: unknown): value is BackdropId {
  return (
    typeof value === "string" &&
    (BACKDROP_IDS as readonly string[]).includes(value)
  );
}

export function isFontId(value: unknown): value is FontId {
  return (
    typeof value === "string" &&
    (FONT_IDS as readonly string[]).includes(value)
  );
}

export function getThemePreset(id: ThemeId): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0]!;
}

/** Remembers last dark preset so Light ↔ Dark can restore Contrast. */
let lastDarkThemeId: ThemeId = "compile";

export function isLightThemeId(id: ThemeId): boolean {
  return getThemePreset(id).scheme === "light";
}

/** Dark side of the Light/Dark switch: Contrast if that was last, else Compile. */
export function preferredDarkThemeId(): ThemeId {
  return lastDarkThemeId === "contrast" ? "contrast" : "compile";
}

export function rememberDarkThemeId(id: ThemeId): void {
  if (!isLightThemeId(id)) lastDarkThemeId = id;
}

/**
 * Flip between Light and a dark preset (Compile, or Contrast if that was active).
 * Preserves accent / font / backdrop prefs.
 */
export function setThemeScheme(scheme: ThemeScheme): void {
  const prefs = readThemePrefs();
  if (scheme === "light") {
    if (!isLightThemeId(prefs.id)) rememberDarkThemeId(prefs.id);
    if (prefs.id === "light") {
      applyThemeToDocument(prefs);
      return;
    }
    writeThemePrefs({ ...prefs, id: "light" });
    return;
  }
  const darkId = preferredDarkThemeId();
  if (prefs.id === darkId) {
    applyThemeToDocument(prefs);
    return;
  }
  writeThemePrefs({ ...prefs, id: darkId });
}

export function getFontPreset(id: FontId): FontPreset {
  return FONT_PRESETS.find((p) => p.id === id) ?? FONT_PRESETS[0]!;
}

export function clampDim(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_DIM;
  return Math.max(0, Math.min(DIM_MAX, Math.round(n)));
}

export function clampBlur(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_BLUR;
  return Math.max(0, Math.min(BLUR_MAX, Math.round(n)));
}

/**
 * Allow only safe http(s) image URLs — no data:/blob: (quota + XSS).
 * Tolerates common paste noise: wrapping quotes/brackets, missing scheme.
 */
export function sanitizeBackdropUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  // Strip wrapping quotes / angle brackets from chat or markdown pastes.
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("<") && trimmed.endsWith(">"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  if (!trimmed || trimmed.length > 2048) return null;
  // Protocol-relative or bare host/path → assume https.
  if (trimmed.startsWith("//")) {
    trimmed = `https:${trimmed}`;
  } else if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // Reject obvious non-http(s) leftovers and empty hosts.
    if (!u.hostname) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** CSS value for --mc-wallpaper-image (quoted url()). */
export function wallpaperImageCssValue(url: string): string {
  return `url(${JSON.stringify(url)})`;
}

function prefsEqual(a: ThemePrefs, b: ThemePrefs): boolean {
  const aBack = a.backdrop ?? DEFAULT_BACKDROP_ID;
  const bBack = b.backdrop ?? DEFAULT_BACKDROP_ID;
  return (
    a.id === b.id &&
    (a.font ?? DEFAULT_FONT_ID) === (b.font ?? DEFAULT_FONT_ID) &&
    (a.hue ?? null) === (b.hue ?? null) &&
    (a.accent ?? null) === (b.accent ?? null) &&
    aBack === bBack &&
    (a.backdropUrl ?? null) === (b.backdropUrl ?? null) &&
    clampDim(a.dim ?? defaultDimForBackdrop(aBack)) ===
      clampDim(b.dim ?? defaultDimForBackdrop(bBack)) &&
    clampBlur(a.blur ?? defaultBlurForBackdrop(aBack)) ===
      clampBlur(b.blur ?? defaultBlurForBackdrop(bBack))
  );
}

function isDefaultPrefs(prefs: ThemePrefs): boolean {
  const backdrop = prefs.backdrop ?? DEFAULT_BACKDROP_ID;
  return (
    prefs.id === DEFAULT_THEME_ID &&
    (prefs.font ?? DEFAULT_FONT_ID) === DEFAULT_FONT_ID &&
    (prefs.hue ?? DEFAULT_THEME_HUE) === DEFAULT_THEME_HUE &&
    (prefs.accent ?? DEFAULT_THEME_COLOR).toLowerCase() ===
      DEFAULT_THEME_COLOR &&
    backdrop === DEFAULT_BACKDROP_ID &&
    (prefs.backdropUrl ?? null) == null &&
    clampDim(prefs.dim ?? defaultDimForBackdrop(backdrop)) ===
      defaultDimForBackdrop(DEFAULT_BACKDROP_ID) &&
    clampBlur(prefs.blur ?? defaultBlurForBackdrop(backdrop)) ===
      defaultBlurForBackdrop(DEFAULT_BACKDROP_ID)
  );
}

function canonicalize(prefs: ThemePrefs): ThemePrefs {
  let backdrop = prefs.backdrop ?? DEFAULT_BACKDROP_ID;
  let backdropUrl = prefs.backdropUrl ?? null;
  if (backdrop === "custom") {
    backdropUrl = sanitizeBackdropUrl(backdropUrl);
    if (!backdropUrl) {
      backdrop = DEFAULT_BACKDROP_ID;
      backdropUrl = null;
    }
  } else {
    backdropUrl = null;
  }
  const font = prefs.font ?? DEFAULT_FONT_ID;
  const hue =
    prefs.hue === null ? null : (parseThemeHue(prefs.hue ?? null) ?? DEFAULT_THEME_HUE);
  const inkHex = THEME_HUE_PRESETS.find((p) => p.hue == null)?.hex ?? "#f5f5f5";
  const accent =
    parseAccentHex(prefs.accent) ??
    (hue == null ? inkHex : DEFAULT_THEME_COLOR);
  const next: ThemePrefs = {
    id: prefs.id,
    font,
    hue,
    accent,
    backdrop,
    backdropUrl,
    dim: clampDim(prefs.dim ?? defaultDimForBackdrop(backdrop)),
    blur: clampBlur(prefs.blur ?? defaultBlurForBackdrop(backdrop)),
  };
  if (isDefaultPrefs(next)) return DEFAULT_THEME_PREFS;
  return next;
}

export function normalizeThemePrefs(raw: unknown): ThemePrefs {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_THEME_PREFS;
  }
  const stored = raw as Record<string, unknown>;
  const obj = stored as Partial<ThemePrefs> & { id?: unknown };
  // Mist/Maple/Night Grape (and any unknown id) → Compile.
  const id = isThemeId(obj.id) ? obj.id : DEFAULT_THEME_ID;
  const font = isFontId(obj.font) ? obj.font : DEFAULT_FONT_ID;
  const hasHue = Object.prototype.hasOwnProperty.call(stored, "hue");
  let hue: number | null;
  if (!hasHue) {
    hue = DEFAULT_THEME_HUE;
  } else if (stored.hue == null || stored.hue === "") {
    hue = null;
  } else {
    hue = parseThemeHue(stored.hue) ?? DEFAULT_THEME_HUE;
  }
  const accentRaw = parseAccentHex(obj.accent);
  let accent =
    accentRaw && LEGACY_WARM_ACCENTS.has(accentRaw)
      ? DEFAULT_THEME_COLOR
      : (accentRaw ?? DEFAULT_THEME_COLOR);
  if (!hasHue && THEME_ACCENT_SWATCHES.includes(accent)) {
    accent = DEFAULT_THEME_COLOR;
  }
  if (hue == null) {
    const inkHex = THEME_HUE_PRESETS.find((p) => p.hue == null)?.hex ?? "#f5f5f5";
    if (!accentRaw || THEME_ACCENT_SWATCHES.includes(accent)) {
      accent = inkHex;
    }
  }
  let backdrop: BackdropId = isBackdropId(obj.backdrop)
    ? obj.backdrop
    : DEFAULT_BACKDROP_ID;
  const backdropUrl = sanitizeBackdropUrl(obj.backdropUrl);
  if (backdrop === "custom" && !backdropUrl) {
    backdrop = DEFAULT_BACKDROP_ID;
  }
  // Explicit backdrop:none keeps flat canvas; missing dim/blur follow backdrop.
  const dim = clampDim(
    typeof obj.dim === "number"
      ? obj.dim
      : defaultDimForBackdrop(backdrop),
  );
  const blur = clampBlur(
    typeof obj.blur === "number"
      ? obj.blur
      : defaultBlurForBackdrop(backdrop),
  );
  return canonicalize({
    id,
    font,
    hue,
    accent,
    backdrop,
    backdropUrl: backdrop === "custom" ? backdropUrl : null,
    dim,
    blur,
  });
}

function isLegacyThemeId(value: unknown): boolean {
  return typeof value === "string" && LEGACY_THEME_IDS.has(value);
}

function serializePrefs(prefs: ThemePrefs): string {
  const c = canonicalize(prefs);
  return JSON.stringify({
    id: c.id,
    font: c.font ?? DEFAULT_FONT_ID,
    hue: c.hue === null ? null : (c.hue ?? DEFAULT_THEME_HUE),
    accent: c.accent ?? DEFAULT_THEME_COLOR,
    backdrop: c.backdrop ?? DEFAULT_BACKDROP_ID,
    backdropUrl: c.backdropUrl ?? null,
    dim: clampDim(
      c.dim ?? defaultDimForBackdrop(c.backdrop ?? DEFAULT_BACKDROP_ID),
    ),
    blur: clampBlur(
      c.blur ?? defaultBlurForBackdrop(c.backdrop ?? DEFAULT_BACKDROP_ID),
    ),
  });
}

export function readThemePrefs(): ThemePrefs {
  if (typeof window === "undefined") return DEFAULT_THEME_PREFS;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === cachedStorageRaw) return cachedPrefs;
    cachedStorageRaw = raw;
    let parsed: unknown = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }
    const next = parsed ? normalizeThemePrefs(parsed) : DEFAULT_THEME_PREFS;
    // Persist migration when stored id/font was legacy, or shape lacked new fields.
    if (parsed && typeof parsed === "object") {
      const p = parsed as Partial<ThemePrefs>;
      const needsRewrite =
        isLegacyThemeId(p.id) ||
        isLegacyFontId(p.font) ||
        !("hue" in p) ||
        p.hue == null ||
        !("backdrop" in p) ||
        !("dim" in p) ||
        !("blur" in p);
      if (needsRewrite) {
        const serialized = serializePrefs(next);
        try {
          localStorage.setItem(THEME_STORAGE_KEY, serialized);
        } catch {
          /* ignore quota */
        }
        cachedStorageRaw = serialized;
      }
    }
    // Keep previous object identity when values are unchanged.
    if (prefsEqual(next, cachedPrefs)) return cachedPrefs;
    cachedPrefs = next;
    return cachedPrefs;
  } catch {
    cachedStorageRaw = undefined;
    cachedPrefs = DEFAULT_THEME_PREFS;
    return cachedPrefs;
  }
}

function notifyThemeChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function writeThemePrefs(prefs: ThemePrefs): void {
  if (typeof window === "undefined") return;
  const next = canonicalize(prefs);
  const serialized = serializePrefs(next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, serialized);
  } catch {
    /* ignore quota */
  }
  cachedStorageRaw = serialized;
  if (!prefsEqual(next, cachedPrefs)) {
    cachedPrefs = next;
  }
  notifyThemeChange();
}

export function subscribeThemePrefs(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

/** Soft companion color for accent-soft surfaces. */
export function softAccentFrom(hex: string, scheme: ThemeScheme): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (scheme === "dark") {
    return `rgb(${Math.round(r * 0.22)} ${Math.round(g * 0.22)} ${Math.round(b * 0.28)})`;
  }
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * 0.72))} ${Math.min(255, Math.round(g + (255 - g) * 0.72))} ${Math.min(255, Math.round(b + (255 - b) * 0.65))})`;
}

/** Apply theme attrs/classes to <html>. Safe to call before React hydrates. */
export function applyThemeToDocument(prefs: ThemePrefs): void {
  if (typeof document === "undefined") return;
  const preset = getThemePreset(prefs.id);
  const root = document.documentElement;
  const font = prefs.font ?? DEFAULT_FONT_ID;
  const backdrop = prefs.backdrop ?? DEFAULT_BACKDROP_ID;
  const dim = clampDim(prefs.dim ?? defaultDimForBackdrop(backdrop));
  const blur = clampBlur(prefs.blur ?? defaultBlurForBackdrop(backdrop));
  const url =
    backdrop === "custom" ? sanitizeBackdropUrl(prefs.backdropUrl) : null;
  const activeBackdrop: BackdropId =
    backdrop === "custom" ? (url ? "custom" : "none") : backdrop;

  root.setAttribute("data-theme", prefs.id);
  root.setAttribute("data-font", font);
  root.setAttribute("data-backdrop", activeBackdrop);
  root.style.colorScheme = preset.scheme;
  if (preset.scheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  const hue =
    prefs.hue === null ? null : (parseThemeHue(prefs.hue ?? null) ?? DEFAULT_THEME_HUE);

  if (hue == null) {
    root.removeAttribute("data-tint");
    root.style.removeProperty("--tint-h");
    for (const prop of HUE_ACCENT_PROPS) {
      root.style.removeProperty(prop);
    }
  } else {
    root.setAttribute("data-tint", "");
    root.style.setProperty("--tint-h", String(hue));
    const ramp = hueAccentVars(hue, preset.scheme);
    for (const prop of HUE_ACCENT_PROPS) {
      root.style.setProperty(prop, ramp[prop]);
    }
  }

  const inkHex = THEME_HUE_PRESETS.find((p) => p.hue == null)?.hex ?? "#f5f5f5";
  const accent =
    parseAccentHex(prefs.accent) ?? (hue == null ? inkHex : DEFAULT_THEME_COLOR);
  root.style.setProperty("--accent", accent);
  root.style.setProperty(
    "--accent-soft",
    softAccentFrom(accent, preset.scheme),
  );

  if (activeBackdrop === "none") {
    root.style.setProperty("--mc-dim", "0");
    root.style.setProperty("--mc-blur", "0px");
    root.style.removeProperty("--mc-wallpaper-image");
  } else {
    root.style.setProperty("--mc-dim", String(dim / 100));
    root.style.setProperty("--mc-blur", `${blur}px`);
    if (activeBackdrop === "custom" && url) {
      root.style.setProperty(
        "--mc-wallpaper-image",
        wallpaperImageCssValue(url),
      );
    } else {
      root.style.removeProperty("--mc-wallpaper-image");
    }
  }
}

/** Inline script source for FOUC-free boot (keep in sync with applyThemeToDocument). */
export function themeBootScript(): string {
  // Legacy maple/mist/night-grape ids fall through to compile (not in `ids`).
  // Missing / legacy font → geist. Backdrop / dim / blur before React.
  // URL sanitize mirrors sanitizeBackdropUrl (quotes / missing scheme).
  // Unset backdrop → None (flat canvas); explicit meshes keep wallpaper dim/blur.
  const defBack = DEFAULT_BACKDROP_ID;
  const wDim = WALLPAPER_DEFAULT_DIM;
  const wBlur = WALLPAPER_DEFAULT_BLUR;
  const defHue = DEFAULT_THEME_HUE;
  const defAccent = DEFAULT_THEME_COLOR;
  return `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var ids=${JSON.stringify([...THEME_IDS])};var fonts=${JSON.stringify([...FONT_IDS])};var backs=${JSON.stringify([...BACKDROP_IDS])};var schemes={compile:"dark",contrast:"dark",light:"light"};var raw=localStorage.getItem(k);var prefs=raw?JSON.parse(raw):{};var id=ids.indexOf(prefs.id)>=0?prefs.id:"compile";var font=fonts.indexOf(prefs.font)>=0?prefs.font:${JSON.stringify(DEFAULT_FONT_ID)};var defAccent=${JSON.stringify(defAccent)};var accent=typeof prefs.accent==="string"&&/^#[0-9a-fA-F]{6}$/.test(prefs.accent)?prefs.accent.toLowerCase():defAccent;var warm=["#c9a227","#e8c547","#7a5610","#8a6410","#ea580c","#f59e0b"];if(warm.indexOf(accent)>=0)accent=defAccent;var hue=${defHue};var hasHue=Object.prototype.hasOwnProperty.call(prefs,"hue");if(!hasHue){var inkAccents=["#f5f5f5","#ffffff","#111111","#a3a3a3","#737373"];if(inkAccents.indexOf(accent)>=0)accent=defAccent}else if(prefs.hue==null||prefs.hue===""){hue=null}else if(typeof prefs.hue==="number"&&isFinite(prefs.hue)){hue=((Math.round(prefs.hue)%360)+360)%360}var backdrop=backs.indexOf(prefs.backdrop)>=0?prefs.backdrop:${JSON.stringify(defBack)};var url=null;if(typeof prefs.backdropUrl==="string"){var t=prefs.backdropUrl.trim();if((t.charAt(0)==='"'&&t.charAt(t.length-1)==='"')||(t.charAt(0)==="'"&&t.charAt(t.length-1)==="'")||(t.charAt(0)==="<"&&t.charAt(t.length-1)===">"))t=t.slice(1,-1).trim();if(t.indexOf("//")===0)t="https:"+t;else if(!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t))t="https://"+t;if(t&&t.length<=2048){try{var u=new URL(t);if((u.protocol==="http:"||u.protocol==="https:")&&u.hostname)url=u.href}catch(e){}}}if(backdrop==="custom"&&!url)backdrop=${JSON.stringify(defBack)};var dimDef=backdrop==="none"?0:${wDim};var blurDef=backdrop==="none"?0:${wBlur};var dim=typeof prefs.dim==="number"&&isFinite(prefs.dim)?Math.max(0,Math.min(${DIM_MAX},Math.round(prefs.dim))):dimDef;var blur=typeof prefs.blur==="number"&&isFinite(prefs.blur)?Math.max(0,Math.min(${BLUR_MAX},Math.round(prefs.blur))):blurDef;var scheme=schemes[id]||"dark";var r=document.documentElement;r.setAttribute("data-theme",id);r.setAttribute("data-font",font);r.setAttribute("data-backdrop",backdrop);r.style.colorScheme=scheme;if(scheme==="dark")r.classList.add("dark");else r.classList.remove("dark");if(hue==null){r.removeAttribute("data-tint");r.style.removeProperty("--tint-h");["--accent","--accent-soft","--accent-foreground","--primary","--primary-hover","--primary-active","--primary-foreground","--ring","--sidebar-primary","--sidebar-primary-foreground","--sidebar-ring"].forEach(function(p){r.style.removeProperty(p)})}else{r.setAttribute("data-tint","");r.style.setProperty("--tint-h",String(hue));var base=scheme==="light"?"oklch(0.40 0.14 "+hue+")":"oklch(0.78 0.16 "+hue+")";var fg=scheme==="light"?"#ffffff":"#0a0a0a";r.style.setProperty("--accent",base);r.style.setProperty("--accent-soft",scheme==="light"?"oklch(0.94 0.04 "+hue+")":"oklch(0.24 0.05 "+hue+")");r.style.setProperty("--accent-foreground",fg);r.style.setProperty("--primary",base);r.style.setProperty("--primary-hover",scheme==="light"?"oklch(0.32 0.15 "+hue+")":"oklch(0.84 0.14 "+hue+")");r.style.setProperty("--primary-active",scheme==="light"?"oklch(0.28 0.14 "+hue+")":"oklch(0.70 0.16 "+hue+")");r.style.setProperty("--primary-foreground",fg);r.style.setProperty("--ring",base);r.style.setProperty("--sidebar-primary",base);r.style.setProperty("--sidebar-primary-foreground",fg);r.style.setProperty("--sidebar-ring",base)}if(accent){r.style.setProperty("--accent",accent);var hr=parseInt(accent.slice(1,3),16),hg=parseInt(accent.slice(3,5),16),hb=parseInt(accent.slice(5,7),16);var soft=scheme==="dark"?"rgb("+Math.round(hr*0.22)+" "+Math.round(hg*0.22)+" "+Math.round(hb*0.28)+")":"rgb("+Math.min(255,Math.round(hr+(255-hr)*0.72))+" "+Math.min(255,Math.round(hg+(255-hg)*0.72))+" "+Math.min(255,Math.round(hb+(255-hb)*0.65))+")";r.style.setProperty("--accent-soft",soft)}if(backdrop==="none"){r.style.setProperty("--mc-dim","0");r.style.setProperty("--mc-blur","0px");r.style.removeProperty("--mc-wallpaper-image")}else{r.style.setProperty("--mc-dim",String(dim/100));r.style.setProperty("--mc-blur",blur+"px");if(backdrop==="custom"&&url)r.style.setProperty("--mc-wallpaper-image","url("+JSON.stringify(url)+")");else r.style.removeProperty("--mc-wallpaper-image")}}catch(e){var d=document.documentElement;d.setAttribute("data-theme","compile");d.setAttribute("data-font",${JSON.stringify(DEFAULT_FONT_ID)});d.setAttribute("data-backdrop",${JSON.stringify(defBack)});d.setAttribute("data-tint","");d.style.setProperty("--tint-h",String(${defHue}));d.classList.add("dark");d.style.colorScheme="dark";d.style.setProperty("--mc-dim","0");d.style.setProperty("--mc-blur","0px")}})();`;
}
