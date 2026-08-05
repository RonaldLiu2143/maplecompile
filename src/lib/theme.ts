/** Site-wide visual theme presets + localStorage persistence. */

export const THEME_STORAGE_KEY = "maplecompile-theme";
export const THEME_CHANGE_EVENT = "maplecompile-theme-change";

export const THEME_IDS = ["compile", "contrast"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** Removed presets — remapped to Compile when reading stored prefs. */
const LEGACY_THEME_IDS = new Set(["maple", "mist"]);

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
    description: "Default dark zinc + sky — the familiar MapleCompile look.",
    scheme: "dark",
    defaultAccent: "#38bdf8",
  },
  {
    id: "contrast",
    name: "Contrast",
    description: "Near-black canvas, bright text, crisp cyan for max clarity.",
    scheme: "dark",
    defaultAccent: "#22d3ee",
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
    preview: "linear-gradient(135deg, #18181b, #27272a)",
  },
  {
    id: "deep-night",
    name: "Deep Night",
    preview:
      "radial-gradient(circle at 20% 20%, #1e3a5f 0%, transparent 45%), linear-gradient(160deg, #0b1220, #18181b 55%, #0f172a)",
  },
  {
    id: "teal-aurora",
    name: "Teal Aurora",
    preview:
      "radial-gradient(ellipse at 30% 0%, #0d9488aa, transparent 55%), radial-gradient(ellipse at 90% 20%, #38bdf866, transparent 50%), #0c1a1f",
  },
  {
    id: "amber-ember",
    name: "Amber Ember",
    preview:
      "radial-gradient(ellipse at 80% 10%, #f59e0b66, transparent 45%), radial-gradient(ellipse at 10% 80%, #b4530966, transparent 50%), #1a1208",
  },
  {
    id: "forest-mist",
    name: "Forest Mist",
    preview:
      "radial-gradient(ellipse at 50% 0%, #14532d88, transparent 55%), linear-gradient(180deg, #0a1f18, #102820 60%, #0c1a14)",
  },
  {
    id: "horizon",
    name: "Horizon",
    preview:
      "linear-gradient(185deg, #0ea5e966 0%, transparent 40%), linear-gradient(0deg, #f59e0b44 0%, transparent 35%), #0f172a",
  },
  {
    id: "slate-mesh",
    name: "Slate Mesh",
    preview:
      "radial-gradient(at 0% 0%, #33415588 0, transparent 50%), radial-gradient(at 100% 0%, #1e293b88 0, transparent 45%), radial-gradient(at 50% 100%, #0f766e55 0, transparent 50%), #111827",
  },
] as const;

export type ThemePrefs = {
  id: ThemeId;
  /** Optional accent override (hex). Null/undefined = use preset default. */
  accent?: string | null;
  /** Wallpaper preset. Default / omitted = none. */
  backdrop?: BackdropId;
  /** Custom image URL when backdrop === "custom" (http/https only). */
  backdropUrl?: string | null;
  /** Darken overlay 0–100. Default 0 when none, else typically ~40. */
  dim?: number;
  /** Backdrop blur in px 0–24. */
  blur?: number;
};

export const DEFAULT_THEME_ID: ThemeId = "compile";
export const DEFAULT_BACKDROP_ID: BackdropId = "none";
export const DEFAULT_DIM = 0;
export const DEFAULT_BLUR = 0;
/** Sensible readability when picking a wallpaper. */
export const WALLPAPER_DEFAULT_DIM = 42;
export const WALLPAPER_DEFAULT_BLUR = 8;
export const DIM_MAX = 85;
export const BLUR_MAX = 24;

/** Stable default for SSR / empty storage — useSyncExternalStore requires referential equality. */
export const DEFAULT_THEME_PREFS: ThemePrefs = { id: DEFAULT_THEME_ID };

const ACCENT_SWATCHES = [
  "#38bdf8",
  "#22d3ee",
  "#34d399",
  "#f59e0b",
  "#fb7185",
  "#a3e635",
  "#0369a1",
  "#e11d48",
] as const;

export const THEME_ACCENT_SWATCHES: readonly string[] = ACCENT_SWATCHES;

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

export function getThemePreset(id: ThemeId): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0]!;
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
  return (
    a.id === b.id &&
    (a.accent ?? null) === (b.accent ?? null) &&
    (a.backdrop ?? DEFAULT_BACKDROP_ID) === (b.backdrop ?? DEFAULT_BACKDROP_ID) &&
    (a.backdropUrl ?? null) === (b.backdropUrl ?? null) &&
    clampDim(a.dim ?? DEFAULT_DIM) === clampDim(b.dim ?? DEFAULT_DIM) &&
    clampBlur(a.blur ?? DEFAULT_BLUR) === clampBlur(b.blur ?? DEFAULT_BLUR)
  );
}

function isDefaultPrefs(prefs: ThemePrefs): boolean {
  return (
    prefs.id === DEFAULT_THEME_ID &&
    (prefs.accent ?? null) == null &&
    (prefs.backdrop ?? DEFAULT_BACKDROP_ID) === DEFAULT_BACKDROP_ID &&
    (prefs.backdropUrl ?? null) == null &&
    clampDim(prefs.dim ?? DEFAULT_DIM) === DEFAULT_DIM &&
    clampBlur(prefs.blur ?? DEFAULT_BLUR) === DEFAULT_BLUR
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
  const next: ThemePrefs = {
    id: prefs.id,
    accent: prefs.accent ?? null,
    backdrop,
    backdropUrl,
    dim: clampDim(prefs.dim ?? DEFAULT_DIM),
    blur: clampBlur(prefs.blur ?? DEFAULT_BLUR),
  };
  if (isDefaultPrefs(next)) return DEFAULT_THEME_PREFS;
  return next;
}

export function normalizeThemePrefs(raw: unknown): ThemePrefs {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_THEME_PREFS;
  }
  const obj = raw as Partial<ThemePrefs> & { id?: unknown };
  // Mist/Maple (and any unknown id) → Compile.
  const id = isThemeId(obj.id) ? obj.id : DEFAULT_THEME_ID;
  const accent =
    typeof obj.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(obj.accent)
      ? obj.accent
      : null;
  let backdrop: BackdropId = isBackdropId(obj.backdrop)
    ? obj.backdrop
    : DEFAULT_BACKDROP_ID;
  const backdropUrl = sanitizeBackdropUrl(obj.backdropUrl);
  if (backdrop === "custom" && !backdropUrl) {
    backdrop = DEFAULT_BACKDROP_ID;
  }
  const dim = clampDim(
    typeof obj.dim === "number" ? obj.dim : DEFAULT_DIM,
  );
  const blur = clampBlur(
    typeof obj.blur === "number" ? obj.blur : DEFAULT_BLUR,
  );
  return canonicalize({
    id,
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
    accent: c.accent ?? null,
    backdrop: c.backdrop ?? DEFAULT_BACKDROP_ID,
    backdropUrl: c.backdropUrl ?? null,
    dim: clampDim(c.dim ?? DEFAULT_DIM),
    blur: clampBlur(c.blur ?? DEFAULT_BLUR),
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
    // Persist migration when stored id was Mist/Maple, or shape lacked new fields.
    if (parsed && typeof parsed === "object") {
      const p = parsed as Partial<ThemePrefs>;
      const needsRewrite =
        isLegacyThemeId(p.id) ||
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
  const backdrop = prefs.backdrop ?? DEFAULT_BACKDROP_ID;
  const dim = clampDim(prefs.dim ?? DEFAULT_DIM);
  const blur = clampBlur(prefs.blur ?? DEFAULT_BLUR);
  const url =
    backdrop === "custom" ? sanitizeBackdropUrl(prefs.backdropUrl) : null;
  const activeBackdrop: BackdropId =
    backdrop === "custom" ? (url ? "custom" : "none") : backdrop;

  root.setAttribute("data-theme", prefs.id);
  root.setAttribute("data-backdrop", activeBackdrop);
  root.style.colorScheme = preset.scheme;
  if (preset.scheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  if (prefs.accent) {
    root.style.setProperty("--accent", prefs.accent);
    root.style.setProperty(
      "--accent-soft",
      softAccentFrom(prefs.accent, preset.scheme),
    );
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-soft");
  }

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
  // Legacy maple/mist ids fall through to compile (not in `ids`).
  // Backdrop / dim / blur applied so wallpaper paints before React.
  // URL sanitize mirrors sanitizeBackdropUrl (quotes / missing scheme).
  return `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var ids=${JSON.stringify([...THEME_IDS])};var backs=${JSON.stringify([...BACKDROP_IDS])};var schemes={compile:"dark",contrast:"dark"};var raw=localStorage.getItem(k);var prefs=raw?JSON.parse(raw):{};var id=ids.indexOf(prefs.id)>=0?prefs.id:"compile";var accent=typeof prefs.accent==="string"&&/^#[0-9a-fA-F]{6}$/.test(prefs.accent)?prefs.accent:null;var backdrop=backs.indexOf(prefs.backdrop)>=0?prefs.backdrop:"none";var url=null;if(typeof prefs.backdropUrl==="string"){var t=prefs.backdropUrl.trim();if((t.charAt(0)==='"'&&t.charAt(t.length-1)==='"')||(t.charAt(0)==="'"&&t.charAt(t.length-1)==="'")||(t.charAt(0)==="<"&&t.charAt(t.length-1)===">"))t=t.slice(1,-1).trim();if(t.indexOf("//")===0)t="https:"+t;else if(!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t))t="https://"+t;if(t&&t.length<=2048){try{var u=new URL(t);if((u.protocol==="http:"||u.protocol==="https:")&&u.hostname)url=u.href}catch(e){}}}if(backdrop==="custom"&&!url)backdrop="none";var dim=typeof prefs.dim==="number"&&isFinite(prefs.dim)?Math.max(0,Math.min(${DIM_MAX},Math.round(prefs.dim))):0;var blur=typeof prefs.blur==="number"&&isFinite(prefs.blur)?Math.max(0,Math.min(${BLUR_MAX},Math.round(prefs.blur))):0;var scheme=schemes[id]||"dark";var r=document.documentElement;r.setAttribute("data-theme",id);r.setAttribute("data-backdrop",backdrop);r.style.colorScheme=scheme;if(scheme==="dark")r.classList.add("dark");else r.classList.remove("dark");if(accent){r.style.setProperty("--accent",accent);var hr=parseInt(accent.slice(1,3),16),hg=parseInt(accent.slice(3,5),16),hb=parseInt(accent.slice(5,7),16);var soft=scheme==="dark"?"rgb("+Math.round(hr*0.22)+" "+Math.round(hg*0.22)+" "+Math.round(hb*0.28)+")":"rgb("+Math.min(255,Math.round(hr+(255-hr)*0.72))+" "+Math.min(255,Math.round(hg+(255-hg)*0.72))+" "+Math.min(255,Math.round(hb+(255-hb)*0.65))+")";r.style.setProperty("--accent-soft",soft)}if(backdrop==="none"){r.style.setProperty("--mc-dim","0");r.style.setProperty("--mc-blur","0px");r.style.removeProperty("--mc-wallpaper-image")}else{r.style.setProperty("--mc-dim",String(dim/100));r.style.setProperty("--mc-blur",blur+"px");if(backdrop==="custom"&&url)r.style.setProperty("--mc-wallpaper-image","url("+JSON.stringify(url)+")");else r.style.removeProperty("--mc-wallpaper-image")}}catch(e){var d=document.documentElement;d.setAttribute("data-theme","compile");d.setAttribute("data-backdrop","none");d.classList.add("dark");d.style.colorScheme="dark"}})();`;
}
