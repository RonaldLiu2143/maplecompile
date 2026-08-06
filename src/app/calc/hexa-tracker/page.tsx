"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActiveCharacterBar } from "@/components/ActiveCharacterBar";
import {
  ManageDisplayButton,
  ManageDisplayModal,
} from "@/components/ManageDisplayModal";
import { useMapleDataReload } from "@/hooks/useMapleDataReload";
import { useRoster } from "@/hooks/useRoster";
import {
  isActiveCharacterLocked,
  isStickyActiveSwitchBlocked,
  UNLOCK_TO_CHANGE_ACTIVE_MSG,
} from "@/lib/active-character";
import { getWorkspace } from "@/lib/character-workspace";
import { readSessionCharacter } from "@/lib/character/client";
import { entryKey, isPrimary } from "@/lib/dashboard/roster";
import {
  readHexaDisplay,
  resolveVisibleIds,
  writeHexaDisplay,
  type DisplayPrefs,
} from "@/lib/display-prefs";
import {
  GMS_HEXA_SLOT_INDICES,
  WEEKLY_DUNGEON_OPTIONS,
  WEEKLY_QUEST_FRAGMENTS,
  costBetween,
  groupConsecutiveUpgradeRuns,
  dailyFragmentRate,
  estimateCompletion,
  summarizeHexaProgress,
  type FragmentRateSettings,
  type WeeklyDungeonId,
  HEXA_STAT_MAX_LEVEL,
  HEXA_CORE_MAX_LEVEL,
} from "@/lib/hexa-costs";
import {
  DEFAULT_BOSS_CONVERTED_STAT,
  bestScoreNextUpgrade,
  buildScoreUpgradePath,
  clampBossConvertedStatDigits,
  normalizeBossConvertedStat,
} from "@/lib/hexa-priority";
import { hexaSlotLabels } from "@/lib/hexa-skill-labels";
import {
  HEXA_MAX_LEVEL,
  clearHexaScouterPairing,
  formatHexaPairingLabel,
  getHexaScouterPairing,
  importLevelsFromPairedScouter,
  listRosterOptions,
  loadHexaTracker,
  pairHexaWithScouter,
  primaryRosterKey,
  saveHexaTracker,
  type HexaScouterPairing,
  type HexaTrackerState,
} from "@/lib/hexa-tracker";
import { CLASS_OPTIONS, classFromJobName } from "@/lib/jobs";
import { hasScouterStats } from "@/lib/pairing";
import {
  GMS_UNAVAILABLE_HEXA_INDICES,
  SCOUTER_CDN,
  getHexaSlots,
} from "@/lib/scouter";
import { storage } from "@/lib/storage";
import type { RosterEntry } from "@/lib/dashboard/roster";

const inputClass =
  "rounded-md border border-border/50 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent";

/** MapleHub CDN item icons for Sol Erda resources. */
const FRAGMENT_ICON =
  "https://cdn.maplehub.app/skill-images/fragment.webp";
const SOL_ERDA_ICON =
  "https://cdn.maplehub.app/skill-images/sol_erda.webp";

type ViewMode = "characters" | "preview";

/** Resolve HEXA job class for a roster key without switching sticky primary. */
function charTypeForRosterKey(
  key: string,
  entry: RosterEntry | undefined,
): string {
  if (!key) return storage.getCharType() || "adele";
  const ws = getWorkspace(key);
  if (ws?.charType) return ws.charType;
  if (entry) {
    const session = readSessionCharacter(entry.name, entry.region);
    const mapped = classFromJobName(session?.jobName);
    if (mapped?.charType) return mapped.charType;
  }
  return storage.getCharType() || "adele";
}

function iconUrl(suffix: string | null): string {
  if (!suffix) return "";
  if (suffix.startsWith("http")) return suffix;
  return `${SCOUTER_CDN}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

function ResourceCost({
  kind,
  amount,
  className,
}: {
  kind: "fragment" | "erda";
  amount: number;
  className?: string;
}) {
  const src = kind === "fragment" ? FRAGMENT_ICON : SOL_ERDA_ICON;
  const label = kind === "fragment" ? "Fragment" : "Sol Erda";
  return (
    <span
      className={[
        "inline-flex items-center gap-1 tabular-nums",
        className ?? "",
      ].join(" ")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={14} height={14} className="shrink-0" />
      <span>
        {amount.toLocaleString()} {label}
        {kind === "fragment" && amount !== 1 ? "s" : ""}
      </span>
    </span>
  );
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

function ProgressBar({
  label,
  current,
  max,
  leftLabel,
}: {
  label: string;
  current: number;
  max: number;
  leftLabel?: string;
}) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const left = Math.max(0, max - current);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-medium opacity-70">{label}</span>
        <span className="tabular-nums font-semibold">
          {current.toLocaleString()} / {max.toLocaleString()}
          {leftLabel ? (
            <span className="ml-1 font-normal opacity-60">
              · {left.toLocaleString()} {leftLabel}
            </span>
          ) : null}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CompactLevelInput({
  value,
  max,
  ariaLabel,
  onChange,
}: {
  value: number;
  max: number;
  ariaLabel: string;
  onChange: (n: number) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      value={value === 0 ? "" : value}
      placeholder="0"
      aria-label={ariaLabel}
      onChange={(e) => {
        const raw = e.target.value.trim();
        if (raw === "") {
          onChange(0);
          return;
        }
        const n = Number(raw);
        if (!Number.isFinite(n)) return;
        onChange(Math.max(0, Math.min(max, Math.floor(n))));
      }}
      className={`${inputClass} h-8 w-12 px-1 text-center text-xs placeholder:text-foreground/25 sm:w-14`}
    />
  );
}

function SkillNodeCard({
  icon,
  label,
  current,
  target,
  maxLevel,
  fragmentsNeeded,
  solErdaNeeded,
  onCurrent,
  onTarget,
}: {
  icon: string;
  label: string;
  current: number;
  target: number;
  maxLevel: number;
  fragmentsNeeded: number;
  solErdaNeeded: number;
  onCurrent: (n: number) => void;
  onTarget: (n: number) => void;
}) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const done = current >= target && target > 0;
  return (
    <div
      className={[
        "rounded-lg border px-3 py-2.5 transition",
        done
          ? "border-accent/50 bg-accent-soft/30"
          : "border-border/45 bg-surface/80",
      ].join(" ")}
    >
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-2.5">
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={icon}
            alt=""
            width={32}
            height={32}
            className="shrink-0 rounded"
          />
        ) : (
          <div className="h-8 w-8 shrink-0 rounded bg-surface-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold leading-tight">{label}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] opacity-70">
            <ResourceCost kind="fragment" amount={fragmentsNeeded} />
            {solErdaNeeded > 0 ? (
              <ResourceCost kind="erda" amount={solErdaNeeded} />
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <CompactLevelInput
            value={current}
            max={maxLevel}
            ariaLabel={`${label} current`}
            onChange={onCurrent}
          />
          <span className="text-xs opacity-40">→</span>
          <CompactLevelInput
            value={target}
            max={maxLevel}
            ariaLabel={`${label} target`}
            onChange={onTarget}
          />
        </div>
      </div>
    </div>
  );
}

export default function HexaTrackerPage() {
  const { hydrated, roster, primary, slots, handleSetPrimary } = useRoster();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<HexaTrackerState | null>(null);
  const [pairing, setPairing] = useState<HexaScouterPairing | null>(null);
  const [presets, setPresets] = useState<{ id: string; name: string }[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [rosterKey, setRosterKey] = useState("");
  const [rosterOptions, setRosterOptions] = useState<
    { key: string; label: string; primary: boolean }[]
  >([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [charType, setCharType] = useState("adele");
  const [viewMode, setViewMode] = useState<ViewMode>("characters");
  const [previewCharType, setPreviewCharType] = useState("adele");
  const [previewState, setPreviewState] = useState<HexaTrackerState | null>(
    null,
  );
  const [displayPrefs, setDisplayPrefs] = useState<DisplayPrefs>(() =>
    readHexaDisplay(),
  );
  const [manageOpen, setManageOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);
  const [showUpgradePath, setShowUpgradePath] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [bcsDraft, setBcsDraft] = useState(String(DEFAULT_BOSS_CONVERTED_STAT));

  const activeCharType =
    viewMode === "preview" ? previewCharType : charType;
  const activeState =
    viewMode === "preview" ? previewState : state;

  const slotsHexa = useMemo(
    () => getHexaSlots(activeCharType),
    [activeCharType],
  );
  const labels = useMemo(
    () => hexaSlotLabels(activeCharType),
    [activeCharType],
  );

  const allRosterIds = useMemo(() => roster.map((e) => entryKey(e)), [roster]);

  const visibleIds = useMemo(
    () => resolveVisibleIds(displayPrefs, allRosterIds),
    [displayPrefs, allRosterIds],
  );

  const visibleEntries = useMemo(
    () => roster.filter((e) => visibleIds.includes(entryKey(e))),
    [roster, visibleIds],
  );

  const filteredRosterOptions = useMemo(() => {
    const set = new Set(visibleIds);
    return rosterOptions.filter((o) => set.has(o.key));
  }, [rosterOptions, visibleIds]);

  const refresh = useCallback(() => {
    const options = listRosterOptions();
    setRosterOptions(options);
    setPresets(
      storage.listScouterPresets().map((p) => ({ id: p.id, name: p.name })),
    );
    const ct = storage.getCharType() || "adele";
    setCharType(ct);
    setPreviewCharType((prev) => prev || ct);
    const prefs = readHexaDisplay();
    setDisplayPrefs(prefs);
    const available = options.map((o) => o.key);
    const shown = resolveVisibleIds(prefs, available);
    const preferred =
      primaryRosterKey() || shown[0] || available[0] || "";
    const key =
      preferred && shown.includes(preferred)
        ? preferred
        : shown[0] || preferred || "";
    setRosterKey(key);
    const tracker = loadHexaTracker(key || null);
    setState(tracker);
    setPairing(getHexaScouterPairing(key || null));
    setPreviewState((prev) => prev ?? loadHexaTracker("__preview__"));
    setReady(true);
  }, []);

  useMapleDataReload(refresh);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 2800);
  };

  const persist = (next: HexaTrackerState, key = rosterKey) => {
    if (viewMode === "preview") {
      const saved = saveHexaTracker(next, "__preview__");
      setPreviewState(saved);
      return;
    }
    const saved = saveHexaTracker(next, key || null);
    setState(saved);
  };

  const setLevel = (index: number, level: number) => {
    if (!activeState) return;
    if ((GMS_UNAVAILABLE_HEXA_INDICES as readonly number[]).includes(index)) {
      return;
    }
    const levels = [...activeState.levels];
    levels[index] = level;
    const targets = [...activeState.targets];
    if ((targets[index] ?? 0) < level) targets[index] = level;
    persist({ ...activeState, levels, targets });
  };

  const setTarget = (index: number, target: number) => {
    if (!activeState) return;
    if ((GMS_UNAVAILABLE_HEXA_INDICES as readonly number[]).includes(index)) {
      return;
    }
    const targets = [...activeState.targets];
    targets[index] = target;
    const levels = [...activeState.levels];
    if ((levels[index] ?? 0) > target) levels[index] = target;
    persist({ ...activeState, levels, targets });
  };

  const selectRosterCharacter = (key: string) => {
    const entry = roster.find((e) => entryKey(e) === key);
    // Sticky primary only when unlocked (or selecting the locked character).
    // While locked, My Characters is a local temporary view — do not call
    // switchActiveCharacter / handleSetPrimary.
    if (entry && !isStickyActiveSwitchBlocked(entry)) {
      handleSetPrimary(entry);
    }
    setRosterKey(key);
    setViewMode("characters");
    const tracker = loadHexaTracker(key || null);
    setState(tracker);
    setPairing(getHexaScouterPairing(key || null));
    setCharType(charTypeForRosterKey(key, entry));
  };

  const applyDisplayIds = (ids: string[]) => {
    const nextPrefs: DisplayPrefs = {
      visibleIds: ids,
      customized: true,
    };
    setDisplayPrefs(nextPrefs);
    writeHexaDisplay(nextPrefs);
    const shown = resolveVisibleIds(nextPrefs, allRosterIds);
    if (rosterKey && !shown.includes(rosterKey)) {
      const next = shown[0] || "";
      if (next) selectRosterCharacter(next);
      else {
        setRosterKey("");
        setState(loadHexaTracker(null));
      }
    }
  };

  const onPair = () => {
    try {
      if (!selectedPresetId && !hasScouterStats()) {
        flash("Enter scouter stats or pick a preset first");
        return;
      }
      const next = pairHexaWithScouter({
        scouterPresetId: selectedPresetId || null,
        rosterKey: rosterKey || null,
        syncLevelsToScouter: true,
      });
      setPairing(next);
      flash("Paired HEXA ↔ Scouter");
      refresh();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Pairing failed");
    }
  };

  const onUnpair = () => {
    clearHexaScouterPairing(rosterKey || null);
    setPairing(null);
    flash("Unpaired");
  };

  const onImport = () => {
    const next = importLevelsFromPairedScouter(rosterKey || null);
    if (!next) {
      flash("No hexa levels found on paired scouter");
      return;
    }
    setState(next);
    flash("Imported levels from Scouter");
  };

  const onBarSelect = (entry: RosterEntry) => {
    if (isStickyActiveSwitchBlocked(entry)) {
      flash(UNLOCK_TO_CHANGE_ACTIVE_MSG);
      return;
    }
    handleSetPrimary(entry);
    const key = entryKey(entry);
    setRosterKey(key);
    setViewMode("characters");
    setState(loadHexaTracker(key));
    setPairing(getHexaScouterPairing(key));
    setCharType(charTypeForRosterKey(key, entry));
  };

  const progress = useMemo(() => {
    if (!activeState) return null;
    return summarizeHexaProgress({
      levels: activeState.levels,
      targets: activeState.targets,
      hexaStatLevel: activeState.hexaStatLevel,
      hexaStatTarget: activeState.hexaStatTarget,
      fragmentsHeld: activeState.fragments,
      erdaHeld: activeState.erda,
      activeSlotIndices: [...GMS_HEXA_SLOT_INDICES],
      labels,
      includeHexaStat: true,
    });
  }, [activeState, labels]);

  const rate = activeState?.rate;
  const dailyRate = rate ? dailyFragmentRate(rate) : 0;
  const eta = progress
    ? estimateCompletion({
        fragmentsRemaining: progress.fragmentsRemainingAfterInventory,
        dailyRate,
      })
    : null;
  const bossConvertedStat =
    activeState?.bossConvertedStat ?? DEFAULT_BOSS_CONVERTED_STAT;

  useEffect(() => {
    if (!activeState) return;
    setBcsDraft(String(activeState.bossConvertedStat));
  }, [activeState?.bossConvertedStat, rosterKey, viewMode, activeCharType]);

  const nextUp = progress
    ? bestScoreNextUpgrade(
        progress.nodes,
        activeCharType,
        bossConvertedStat,
      )
    : null;
  const nextUpIcon =
    nextUp?.node.slotIndex != null
      ? iconUrl(slotsHexa[nextUp.node.slotIndex]?.iconSuffix ?? null)
      : "";
  const nextCost =
    nextUp != null
      ? costBetween(
          nextUp.node.skillType,
          nextUp.node.current,
          nextUp.nextLevel,
        )
      : null;

  const upgradePathRuns = useMemo(() => {
    if (!progress) return [];
    return groupConsecutiveUpgradeRuns(
      buildScoreUpgradePath(
        progress.nodes,
        activeCharType,
        bossConvertedStat,
      ),
    );
  }, [progress, activeCharType, bossConvertedStat]);

  const commitBossConvertedStat = (raw: string) => {
    if (!activeState) return;
    // Persist the exact entered score; nearest FD band is chosen only inside
    // priority ranking (orderForClass), never written back into the input.
    const next = normalizeBossConvertedStat(
      raw.trim() === "" ? DEFAULT_BOSS_CONVERTED_STAT : raw,
    );
    setBcsDraft(String(next));
    if (next === activeState.bossConvertedStat) return;
    persist({ ...activeState, bossConvertedStat: next });
  };

  const groups = useMemo(() => {
    if (!progress) return [];
    const byType = {
      skill: progress.nodes.filter(
        (n) => n.skillType === "Origin" || n.skillType === "Ascent",
      ),
      mastery: progress.nodes.filter((n) => n.skillType === "Mastery"),
      boost: progress.nodes.filter((n) => n.skillType === "Boost"),
      common: progress.nodes.filter((n) => n.skillType === "Common"),
      hexaStat: progress.nodes.filter((n) => n.skillType === "Hexa Stat"),
    };
    return [
      { key: "skill", label: "Skill Node", nodes: byType.skill },
      { key: "mastery", label: "Mastery Node", nodes: byType.mastery },
      { key: "boost", label: "Boost Node", nodes: byType.boost },
      { key: "common", label: "Common Node", nodes: byType.common },
      { key: "hexaStat", label: "Hexa Stat", nodes: byType.hexaStat },
    ].filter((g) => g.nodes.length > 0);
  }, [progress]);

  if (!ready || !activeState || !hydrated || !progress) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          HEXA / Fragment Tracker
        </h1>
        <p className="text-sm opacity-60">Loading…</p>
      </div>
    );
  }

  const updateRate = (patch: Partial<FragmentRateSettings>) => {
    persist({
      ...activeState,
      rate: { ...activeState.rate, ...patch },
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          HEXA / Fragment Tracker
        </h1>
        <p className="mt-1 text-sm opacity-70">
          Track Sol Erda fragments, core levels, and time-to-goal — per
          character. Pair with Scouter when you want levels synced.
        </p>
      </div>

      <ActiveCharacterBar onSelect={onBarSelect} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border/50 bg-surface/80 p-0.5">
          {(
            [
              ["characters", "My Characters"],
              ["preview", "Job Preview"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setViewMode(id);
                if (id === "preview" && !previewState) {
                  setPreviewState(loadHexaTracker("__preview__"));
                }
              }}
              className={[
                "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                viewMode === id
                  ? "bg-accent text-white dark:text-zinc-900"
                  : "opacity-70 hover:opacity-100",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
        {viewMode === "preview" ? (
          <label className="flex items-center gap-2 text-xs font-semibold opacity-70">
            Job class
            <select
              value={
                CLASS_OPTIONS.find((o) => o.charType === previewCharType)
                  ?.value ?? `warrior:${previewCharType}`
              }
              onChange={(e) => {
                const opt = CLASS_OPTIONS.find((o) => o.value === e.target.value);
                if (opt) setPreviewCharType(opt.charType);
              }}
              className={inputClass}
            >
              {CLASS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {viewMode === "characters" ? (
        roster.length > 0 ? (
          <section className="rounded-xl border border-border/40 bg-surface/80 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider opacity-60">
                My Characters
              </h2>
              <ManageDisplayButton onClick={() => setManageOpen(true)} />
            </div>
            {visibleEntries.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/50 px-3 py-4 text-center text-xs opacity-65">
                All characters are hidden. Use the gear icon to show some.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex w-max gap-2">
                  {visibleEntries.map((entry) => {
                    const key = entryKey(entry);
                    const active = rosterKey === key;
                    const slot = slots[key];
                    const character =
                      slot?.status === "ready" ? slot.character : null;
                    const name = character?.name ?? entry.name;
                    const avatar = character?.characterImgURL;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectRosterCharacter(key)}
                        className={[
                          "flex w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-xl border px-1.5 py-2 transition",
                          active
                            ? "border-accent bg-accent-soft/45"
                            : "border-border/50 bg-background/40 hover:border-accent/40",
                        ].join(" ")}
                      >
                        {avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatar}
                            alt=""
                            width={48}
                            height={48}
                            className="h-12 w-12 object-contain"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted text-[10px] font-bold uppercase opacity-50">
                            {name.slice(0, 2)}
                          </div>
                        )}
                        <p className="w-full truncate text-center text-[10px] font-semibold leading-tight">
                          {name}
                        </p>
                        <p className="font-mono text-[10px] tabular-nums opacity-65">
                          {character?.level != null
                            ? `Lv.${character.level}`
                            : "—"}
                          {isPrimary(entry, primary) ? " ★" : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {isActiveCharacterLocked() &&
            primary &&
            rosterKey &&
            entryKey(primary) !== rosterKey ? (
              <p className="mt-2 text-[10px] text-amber-600 opacity-90">
                Viewing temporarily — Active character stays locked
              </p>
            ) : (
              <p className="mt-2 text-[10px] opacity-55">
                Tap a character to edit HEXA · ★ is the active default
              </p>
            )}
          </section>
        ) : (
          <p className="text-xs opacity-65">
            No roster yet.{" "}
            <Link href="/roster" className="text-accent hover:underline">
              Add characters
            </Link>{" "}
            or use Job Preview to plan a class.
          </p>
        )
      ) : (
        <p className="text-xs opacity-65">
          Previewing{" "}
          <span className="font-semibold text-accent">
            {CLASS_OPTIONS.find((o) => o.charType === previewCharType)?.name ??
              previewCharType}
          </span>{" "}
          — levels save locally as a sandbox, not tied to a roster character.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)]">
        {/* —— Summary / rate —— */}
        <div className="space-y-3">
          <section className="rounded-xl border border-border/45 bg-surface/90 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">HEXA Progress</h2>
              <p className="text-lg font-bold tabular-nums text-accent">
                {progress.completionPct.toFixed(1)}%
              </p>
            </div>
            <div className="mt-3 space-y-2.5">
              <ProgressBar
                label="Fragments"
                current={progress.fragmentsSpent}
                max={progress.fragmentsTotal}
                leftLabel="left"
              />
              <ProgressBar
                label="Sol Erda"
                current={progress.solErdaSpent}
                max={progress.solErdaTotal}
                leftLabel="left"
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-background/50 px-2.5 py-2">
                <p className="opacity-55">Remaining frags</p>
                <p className="text-base font-bold tabular-nums">
                  {progress.fragmentsLeft.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-background/50 px-2.5 py-2">
                <p className="opacity-55">Remaining Sol Erda</p>
                <p className="text-base font-bold tabular-nums">
                  {progress.solErdaLeft.toLocaleString()}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/45 bg-surface/90 p-4">
            <h2 className="text-sm font-semibold">Fragment Rate Calculator</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold opacity-70">
                Fragments per WAP
                <input
                  type="number"
                  min={0}
                  value={activeState.rate.fragPerWap || ""}
                  placeholder="0"
                  onChange={(e) =>
                    updateRate({
                      fragPerWap: Math.max(
                        0,
                        Math.floor(Number(e.target.value) || 0),
                      ),
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-xs font-semibold opacity-70">
                WAPs per day
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={activeState.rate.wapsPerDay || ""}
                  placeholder="0"
                  onChange={(e) =>
                    updateRate({
                      wapsPerDay: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-55">
                Additional sources
              </p>
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={activeState.rate.weeklyQuestEnabled}
                    onChange={(e) =>
                      updateRate({ weeklyQuestEnabled: e.target.checked })
                    }
                    className="accent-[var(--accent)]"
                  />
                  Weekly Quest
                </span>
                <span className="text-xs opacity-60">
                  +{WEEKLY_QUEST_FRAGMENTS} fragments
                </span>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold opacity-70">
                Weekly Dungeon
                <select
                  value={activeState.rate.weeklyDungeon}
                  onChange={(e) =>
                    updateRate({
                      weeklyDungeon: e.target.value as WeeklyDungeonId,
                    })
                  }
                  className={inputClass}
                >
                  {WEEKLY_DUNGEON_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-background/50 px-2 py-2">
                <p className="opacity-55">Daily rate</p>
                <p className="text-sm font-bold tabular-nums">
                  {dailyRate.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg bg-background/50 px-2 py-2">
                <p className="opacity-55">Days left</p>
                <p className="text-sm font-bold tabular-nums">
                  {eta && dailyRate > 0
                    ? Math.ceil(eta.daysLeft).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-background/50 px-2 py-2">
                <p className="opacity-55">Completion</p>
                <p className="text-sm font-bold tabular-nums">
                  {formatDate(eta?.completionDate ?? null)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[10px] opacity-55">
              Based on remaining fragment costs (
              {progress.fragmentsRemainingAfterInventory.toLocaleString()}{" "}
              frags).
            </p>
          </section>

          <section className="rounded-xl border border-border/45 bg-surface/90 p-4">
            <h2 className="text-sm font-semibold">HEXA Converted</h2>
            <label className="mt-3 block space-y-1 text-xs font-semibold opacity-70">
              HEXA Converted score
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={bcsDraft}
                placeholder={String(DEFAULT_BOSS_CONVERTED_STAT)}
                aria-label="HEXA Converted"
                title="HEXA Converted (max 6 digits)"
                onChange={(e) =>
                  setBcsDraft(clampBossConvertedStatDigits(e.target.value))
                }
                onBlur={(e) => commitBossConvertedStat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitBossConvertedStat(
                      (e.target as HTMLInputElement).value,
                    );
                  }
                }}
                className={inputClass}
              />
            </label>
            <p className="mt-2 text-[10px] opacity-55">
              Base {DEFAULT_BOSS_CONVERTED_STAT.toLocaleString()} (max 6 digits).
              Priority uses the nearest class FD band for this score without
              changing the value you entered.
            </p>
          </section>

          <section className="rounded-xl border border-border/45 bg-surface/90 p-4">
            <div className="relative flex items-center justify-between gap-2 pr-8">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-accent"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
                Next Upgrade Priority
              </h2>
              <button
                type="button"
                onClick={() => setInfoOpen((v) => !v)}
                className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full border border-border/50 text-[10px] font-bold opacity-55 transition hover:opacity-100"
                aria-label="About upgrade priority"
                aria-expanded={infoOpen}
              >
                i
              </button>
            </div>
            {infoOpen ? (
              <p className="mt-2 rounded-lg bg-background/50 px-2.5 py-2 text-[11px] leading-relaxed opacity-70">
                Priorities follow MapleHub class FD leveling bands for your HEXA
                Converted score (base{" "}
                {DEFAULT_BOSS_CONVERTED_STAT.toLocaleString()}
                ). Rank is by highest path score (
                <span className="font-semibold">1000 − order index</span>
                ); fragment cost is the tiebreaker. Next applies one priority
                step.
              </p>
            ) : null}
            {nextUp && nextCost ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    {nextUpIcon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={nextUpIcon}
                        alt=""
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded border border-border/50"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded border border-border/50 bg-surface-muted" />
                    )}
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white dark:text-zinc-900">
                      {nextUp.node.current}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {nextUp.node.label}
                        </p>
                        <p className="text-xs opacity-60">
                          Level {nextUp.node.current} → {nextUp.nextLevel}
                        </p>
                      </div>
                      {nextUp.score > 0 ? (
                        <span
                          className="shrink-0 rounded-md bg-accent-soft/50 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-accent"
                          title="MapleHub path priority score (1000 − order index)"
                        >
                          +{nextUp.score}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                      <ResourceCost
                        kind="fragment"
                        amount={nextCost.fragments}
                        className="font-semibold text-accent"
                      />
                      {nextCost.solErda > 0 ? (
                        <ResourceCost
                          kind="erda"
                          amount={nextCost.solErda}
                          className="font-semibold"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                {upgradePathRuns.length > 1 ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowUpgradePath((v) => !v)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-medium transition hover:bg-background/40"
                    >
                      <span>
                        Show all ({upgradePathRuns.length})
                      </span>
                      <svg
                        viewBox="0 0 24 24"
                        className={[
                          "h-4 w-4 opacity-55 transition",
                          showUpgradePath ? "rotate-180" : "",
                        ].join(" ")}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    {showUpgradePath ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1 rounded-lg bg-background/40 p-3">
                        {upgradePathRuns.map((run, idx) => {
                          const icon =
                            run.slotIndex != null
                              ? iconUrl(
                                  slotsHexa[run.slotIndex]?.iconSuffix ?? null,
                                )
                              : "";
                          return (
                            <div
                              key={`${run.nodeId}-${run.toLevel}-${idx}`}
                              className="flex items-center gap-1"
                            >
                              <div
                                className="group relative"
                                title={`${run.label}: Lv.${run.fromLevel} → ${run.toLevel}`}
                              >
                                <div className="relative h-8 w-8">
                                  {icon ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={icon}
                                      alt=""
                                      width={32}
                                      height={32}
                                      className="h-8 w-8 rounded border border-border/50"
                                    />
                                  ) : (
                                    <div className="h-8 w-8 rounded border border-border/50 bg-surface-muted" />
                                  )}
                                  <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-0.5 text-[9px] font-bold leading-none text-white dark:text-zinc-900">
                                    {run.toLevel}
                                  </span>
                                  {idx === 0 ? (
                                    <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full border border-background bg-accent" />
                                  ) : null}
                                </div>
                              </div>
                              {idx < upgradePathRuns.length - 1 ? (
                                <span className="px-0.5 text-sm opacity-40">
                                  →
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    if (nextUp.node.slotIndex != null) {
                      setLevel(nextUp.node.slotIndex, nextUp.nextLevel);
                    } else {
                      persist({
                        ...activeState,
                        hexaStatLevel: nextUp.nextLevel,
                      });
                    }
                  }}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
                >
                  Next
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm opacity-65">
                All nodes at target — nice work.
              </p>
            )}
          </section>

          {viewMode === "characters" ? (
            <section className="rounded-xl border border-border/45 bg-surface/90 px-4 py-3">
              <button
                type="button"
                onClick={() => setPairOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold"
              >
                <span>
                  {pairing
                    ? formatHexaPairingLabel(pairing)
                    : "Scouter pairing (optional)"}
                </span>
                <span className="text-xs opacity-55">
                  {pairOpen ? "Hide" : "Show"}
                </span>
              </button>
              {pairOpen ? (
                <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
                  {msg ? (
                    <p className="text-xs font-medium text-accent">{msg}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {pairing ? (
                      <>
                        <button
                          type="button"
                          onClick={onImport}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
                        >
                          Import levels from Scouter
                        </button>
                        <button
                          type="button"
                          onClick={onUnpair}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
                        >
                          Unpair
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={onPair}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 dark:text-zinc-900"
                      >
                        Pair with Scouter
                      </button>
                    )}
                    <Link
                      href="/calc/scouter"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
                    >
                      Open Scouter
                    </Link>
                  </div>
                  {!pairing ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-xs font-semibold opacity-70">
                        Scouter source
                        <select
                          value={selectedPresetId}
                          onChange={(e) => setSelectedPresetId(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Current draft</option>
                          {presets.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-semibold opacity-70">
                        Roster character
                        <select
                          value={rosterKey}
                          onChange={(e) =>
                            selectRosterCharacter(e.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">None</option>
                          {filteredRosterOptions.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.label}
                              {o.primary ? " ★" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        {/* —— Skills —— */}
        <section className="rounded-xl border border-border/45 bg-surface/90 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Skills Configuration</h2>
            <button
              type="button"
              onClick={() => {
                const targets = activeState.targets.map((t, i) =>
                  (GMS_UNAVAILABLE_HEXA_INDICES as readonly number[]).includes(i)
                    ? 0
                    : HEXA_CORE_MAX_LEVEL,
                );
                persist({
                  ...activeState,
                  targets,
                  hexaStatTarget: HEXA_STAT_MAX_LEVEL,
                });
              }}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Max all goals
            </button>
          </div>

          <div className="mt-3 space-y-4">
            {groups.map((group) => (
              <div key={group.key} className="space-y-2">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wider opacity-55">
                  {group.label}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.nodes.map((node) => {
                    if (node.slotIndex == null) {
                      return (
                        <SkillNodeCard
                          key={node.id}
                          icon=""
                          label={node.label}
                          current={node.current}
                          target={node.target}
                          maxLevel={HEXA_STAT_MAX_LEVEL}
                          fragmentsNeeded={node.fragmentsNeeded}
                          solErdaNeeded={node.solErdaNeeded}
                          onCurrent={(n) =>
                            persist({
                              ...activeState,
                              hexaStatLevel: n,
                              hexaStatTarget: Math.max(
                                activeState.hexaStatTarget,
                                n,
                              ),
                            })
                          }
                          onTarget={(n) =>
                            persist({
                              ...activeState,
                              hexaStatTarget: n,
                              hexaStatLevel: Math.min(
                                activeState.hexaStatLevel,
                                n,
                              ),
                            })
                          }
                        />
                      );
                    }
                    const slot = slotsHexa[node.slotIndex];
                    return (
                      <SkillNodeCard
                        key={node.id}
                        icon={iconUrl(slot?.iconSuffix ?? null)}
                        label={node.label}
                        current={node.current}
                        target={node.target}
                        maxLevel={HEXA_MAX_LEVEL}
                        fragmentsNeeded={node.fragmentsNeeded}
                        solErdaNeeded={node.solErdaNeeded}
                        onCurrent={(n) => setLevel(node.slotIndex!, n)}
                        onTarget={(n) => setTarget(node.slotIndex!, n)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ManageDisplayModal
        open={manageOpen}
        helper="Tap characters to show or hide them on this page. Highlighted = shown."
        roster={roster}
        primary={primary}
        slots={slots}
        visibleIds={visibleIds}
        onClose={() => setManageOpen(false)}
        onSave={applyDisplayIds}
      />
    </div>
  );
}
