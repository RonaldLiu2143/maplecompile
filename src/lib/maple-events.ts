/** Same-tab invalidation for pairing / equip / scouter localStorage writes. */

export const MAPLE_DATA_CHANGED_EVENT = "maplecompile-data-changed";

export type MapleDataChangedDetail = {
  source:
    | "pairing"
    | "equipSetup"
    | "flameSetup"
    | "scouterLast"
    | "scouterPresets"
    | "plannerOverrides"
    | "jobClass"
    | "other";
};

export function notifyMapleDataChanged(
  source: MapleDataChangedDetail["source"] = "other",
) {
  if (typeof window === "undefined") return;
  // Defer so callers can finish React setState updaters before listeners re-read.
  queueMicrotask(() => {
    try {
      window.dispatchEvent(
        new CustomEvent<MapleDataChangedDetail>(MAPLE_DATA_CHANGED_EVENT, {
          detail: { source },
        }),
      );
    } catch {
      /* ignore */
    }
  });
}

/**
 * Re-run `onReload` when paired scouter/equip data may have changed:
 * mount, focus/visibility, cross-tab `storage`, and same-tab custom events
 * from Pair / equip / scouter saves. Call again when the route changes.
 */
export function subscribeMapleDataReload(onReload: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  const runNow = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
    onReload();
  };
  const runDebounced = () => {
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onReload();
    }, 80);
  };

  runNow();

  const onCustom = () => runDebounced();
  const onStorage = (e: StorageEvent) => {
    if (
      e.key == null ||
      e.key === "maplecompile-scouter-equip-pair" ||
      e.key === "maplecompile-scouter-equip-pair-by-char-v1" ||
      e.key === "maplecompile-hexa-scouter-pair" ||
      e.key === "maplecompile-hexa-scouter-pair-by-char-v1" ||
      e.key === "maplecompile-hexa-tracker-v1" ||
      e.key === "maplecompile-hexa-tracker-by-char-v1" ||
      e.key === "maplecompile-diary-v1" ||
      e.key === "equipSetup" ||
      e.key === "flameSetup" ||
      e.key === "maplecompile-scouter-last" ||
      e.key === "maplehub-scouter-last" ||
      e.key === "maplecompile-character-workspace-v1" ||
      e.key === "maplecompile-scouter-presets" ||
      e.key === "maplecompile-planner-overrides" ||
      e.key === "maplecompile-roster" ||
      e.key === "maplecompile.boss-income.v2" ||
      e.key === "maplecompile.liberation.v2" ||
      e.key === "jobType" ||
      e.key === "charType"
    ) {
      runDebounced();
    }
  };
  const onFocus = () => runDebounced();
  const onVisibility = () => {
    if (document.visibilityState === "visible") runDebounced();
  };
  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) runNow();
  };

  window.addEventListener(MAPLE_DATA_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pageshow", onPageShow);

  return () => {
    if (timer != null) clearTimeout(timer);
    window.removeEventListener(MAPLE_DATA_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pageshow", onPageShow);
  };
}
