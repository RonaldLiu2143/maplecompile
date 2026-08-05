/** Site-wide visual theme presets + localStorage persistence. */

export const THEME_STORAGE_KEY = "maplecompile-theme";
export const THEME_CHANGE_EVENT = "maplecompile-theme-change";

export const THEME_IDS = ["compile", "contrast", "maple", "mist"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

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
  {
    id: "maple",
    name: "Maple",
    description: "Deep teal forest with amber-gold accents — Maple-flavored.",
    scheme: "dark",
    defaultAccent: "#f59e0b",
  },
  {
    id: "mist",
    name: "Mist",
    description: "Soft light blue-gray surfaces for daytime browsing.",
    scheme: "light",
    defaultAccent: "#0369a1",
  },
] as const;

export type ThemePrefs = {
  id: ThemeId;
  /** Optional accent override (hex). Null/undefined = use preset default. */
  accent?: string | null;
};

export const DEFAULT_THEME_ID: ThemeId = "compile";

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

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (THEME_IDS as readonly string[]).includes(value)
  );
}

export function getThemePreset(id: ThemeId): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0]!;
}

export function normalizeThemePrefs(raw: unknown): ThemePrefs {
  if (!raw || typeof raw !== "object") {
    return { id: DEFAULT_THEME_ID };
  }
  const obj = raw as Partial<ThemePrefs>;
  const id = isThemeId(obj.id) ? obj.id : DEFAULT_THEME_ID;
  const accent =
    typeof obj.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(obj.accent)
      ? obj.accent
      : null;
  return { id, accent };
}

export function readThemePrefs(): ThemePrefs {
  if (typeof window === "undefined") return { id: DEFAULT_THEME_ID };
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return { id: DEFAULT_THEME_ID };
    return normalizeThemePrefs(JSON.parse(raw));
  } catch {
    return { id: DEFAULT_THEME_ID };
  }
}

function notifyThemeChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function writeThemePrefs(prefs: ThemePrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({
        id: prefs.id,
        accent: prefs.accent ?? null,
      }),
    );
  } catch {
    /* ignore quota */
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
  root.setAttribute("data-theme", prefs.id);
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
}

/** Inline script source for FOUC-free boot (keep in sync with applyThemeToDocument). */
export function themeBootScript(): string {
  return `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var ids=${JSON.stringify([...THEME_IDS])};var schemes={compile:"dark",contrast:"dark",maple:"dark",mist:"light"};var raw=localStorage.getItem(k);var prefs=raw?JSON.parse(raw):{};var id=ids.indexOf(prefs.id)>=0?prefs.id:"compile";var accent=typeof prefs.accent==="string"&&/^#[0-9a-fA-F]{6}$/.test(prefs.accent)?prefs.accent:null;var scheme=schemes[id]||"dark";var r=document.documentElement;r.setAttribute("data-theme",id);r.style.colorScheme=scheme;if(scheme==="dark")r.classList.add("dark");else r.classList.remove("dark");if(accent){r.style.setProperty("--accent",accent);var hr=parseInt(accent.slice(1,3),16),hg=parseInt(accent.slice(3,5),16),hb=parseInt(accent.slice(5,7),16);var soft=scheme==="dark"?"rgb("+Math.round(hr*0.22)+" "+Math.round(hg*0.22)+" "+Math.round(hb*0.28)+")":"rgb("+Math.min(255,Math.round(hr+(255-hr)*0.72))+" "+Math.min(255,Math.round(hg+(255-hg)*0.72))+" "+Math.min(255,Math.round(hb+(255-hb)*0.65))+")";r.style.setProperty("--accent-soft",soft)}}catch(e){var d=document.documentElement;d.setAttribute("data-theme","compile");d.classList.add("dark");d.style.colorScheme="dark"}})();`;
}
