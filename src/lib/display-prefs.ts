/** Per-page roster visibility (which characters appear in strips / pickers). */

export const LIBERATION_DISPLAY_KEY = "maplecompile-liberation-display";
export const HEXA_DISPLAY_KEY = "maplecompile-hexa-display";

export type DisplayPrefs = {
  /** Character keys (`region:name`) marked visible. Empty / missing ⇒ show all. */
  visibleIds: string[];
  /** True once the user has opened Manage display and saved a choice. */
  customized: boolean;
};

function defaultPrefs(): DisplayPrefs {
  return { visibleIds: [], customized: false };
}

function readPrefs(key: string): DisplayPrefs {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Partial<DisplayPrefs>;
    const visibleIds = Array.isArray(parsed.visibleIds)
      ? parsed.visibleIds.filter((x): x is string => typeof x === "string")
      : [];
    return {
      visibleIds,
      customized: !!parsed.customized,
    };
  } catch {
    return defaultPrefs();
  }
}

function writePrefs(key: string, prefs: DisplayPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}

/**
 * Resolve which character keys should appear.
 * First visit / never customized → all available.
 * After customize with none selected → fall back to all (sensible default).
 */
export function resolveVisibleIds(
  prefs: DisplayPrefs,
  availableIds: string[],
): string[] {
  if (availableIds.length === 0) return [];
  if (!prefs.customized) return availableIds;
  const set = new Set(prefs.visibleIds);
  const filtered = availableIds.filter((id) => set.has(id));
  return filtered.length > 0 ? filtered : availableIds;
}

export function isIdVisible(
  prefs: DisplayPrefs,
  availableIds: string[],
  id: string,
): boolean {
  return resolveVisibleIds(prefs, availableIds).includes(id);
}

export function readLiberationDisplay(): DisplayPrefs {
  return readPrefs(LIBERATION_DISPLAY_KEY);
}

export function writeLiberationDisplay(prefs: DisplayPrefs): void {
  writePrefs(LIBERATION_DISPLAY_KEY, prefs);
}

export function readHexaDisplay(): DisplayPrefs {
  return readPrefs(HEXA_DISPLAY_KEY);
}

export function writeHexaDisplay(prefs: DisplayPrefs): void {
  writePrefs(HEXA_DISPLAY_KEY, prefs);
}

/** Toggle one id in a working selection set (for the modal). */
export function toggleVisibleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}
