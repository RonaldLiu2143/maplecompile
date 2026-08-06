"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { ActiveCharacterBar } from "@/components/ActiveCharacterBar";
import {
  ManageDisplayButton,
  ManageDisplayModal,
} from "@/components/ManageDisplayModal";
import { useRoster } from "@/hooks/useRoster";
import { entryKey, isPrimary } from "@/lib/dashboard/roster";
import {
  readLiberationDisplay,
  resolveVisibleIds,
  writeLiberationDisplay,
  type DisplayPrefs,
} from "@/lib/display-prefs";
import {
  NOT_DOING,
  bossIconSrc,
  bossesFor,
  calculateLiberation,
  clampPartySize,
  clampTracesHeld,
  defaultInputs,
  ensureCharacterBundle,
  getActiveInputs,
  getActiveKey,
  highestDifficulty,
  milestonesFor,
  readLiberationStore,
  tracesFromClear,
  upsertActiveInputs,
  writeLiberationStore,
  type LiberationCharacterInputs,
  type LiberationMode,
  type LiberationStore,
  type LiberationType,
  type TraceSelection,
} from "@/lib/liberation";

const inputClass =
  "rounded-md border border-border/50 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent";

const PARTY_SIZES = [1, 2, 3, 4, 5, 6] as const;

/** Fixed chip width so Done / Not cleared never shove the difficulty select. */
const CLEAR_CHIP_WIDTH = "w-[7.25rem]";

function formatDisplayDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(`${iso}T12:00:00`));
  } catch {
    return iso;
  }
}

function weeksLabel(weeks: number | null): string {
  if (weeks == null) return "Pick bosses below";
  if (weeks === 0) return "Ready now";
  const w = Math.ceil(weeks * 10) / 10;
  const months = Math.floor((weeks / 4) * 10) / 10;
  return `${w} weeks (~${months} months)`;
}

function bossCardClass(cleared: boolean, doing: boolean): string {
  const base =
    "relative flex flex-col gap-3 rounded-xl border p-3.5 transition select-none sm:flex-row sm:items-center sm:gap-4 cursor-pointer";
  if (!doing) {
    return `${base} border-border/30 bg-surface/50 opacity-75 hover:border-border/55 hover:opacity-90`;
  }
  return cleared
    ? `${base} border-accent bg-accent-soft/40`
    : `${base} border-border/45 bg-surface/80 hover:border-border/70`;
}

export default function LiberationPage() {
  const { hydrated, roster, primary, slots, handleSetPrimary } = useRoster();
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<LiberationStore>(() =>
    readLiberationStore(),
  );
  const [brokenIcons, setBrokenIcons] = useState<Record<string, true>>({});
  const [displayPrefs, setDisplayPrefs] = useState<DisplayPrefs>(() =>
    readLiberationDisplay(),
  );
  const [manageOpen, setManageOpen] = useState(false);

  const eligible = useMemo(() => {
    return roster.filter((entry) => {
      const slot = slots[entryKey(entry)];
      if (!slot || slot.status !== "ready") return false;
      return slot.character.level >= 255;
    });
  }, [roster, slots]);

  const eligibleIds = useMemo(
    () => eligible.map((e) => entryKey(e)),
    [eligible],
  );

  const visibleIds = useMemo(
    () => resolveVisibleIds(displayPrefs, eligibleIds),
    [displayPrefs, eligibleIds],
  );

  const visibleEntries = useMemo(
    () => eligible.filter((e) => visibleIds.includes(entryKey(e))),
    [eligible, visibleIds],
  );

  useEffect(() => {
    if (!hydrated) return;
    let next = readLiberationStore();
    const prefs = readLiberationDisplay();
    setDisplayPrefs(prefs);

    const preferred =
      primary && eligible.some((e) => entryKey(e) === entryKey(primary))
        ? entryKey(primary)
        : eligible[0]
          ? entryKey(eligible[0])
          : null;

    for (const entry of eligible) {
      next = ensureCharacterBundle(next, entryKey(entry));
    }

    const shown = resolveVisibleIds(prefs, eligibleIds);

    if (next.mode === "characters") {
      let stillValid = next.selectedCharacterIds.filter((id) =>
        eligibleIds.includes(id),
      );
      // Prefer display prefs when customized; otherwise keep / seed all shown.
      if (prefs.customized) {
        stillValid = shown.filter((id) => eligibleIds.includes(id));
      } else if (stillValid.length === 0) {
        stillValid = shown;
      }
      next = { ...next, selectedCharacterIds: stillValid };
      if (stillValid.length === 0) {
        next = { ...next, mode: "preview", activeCharacterId: null };
      } else {
        // Keep Liberation focus aligned with roster primary when possible.
        const active =
          preferred && stillValid.includes(preferred)
            ? preferred
            : stillValid.includes(next.activeCharacterId ?? "")
              ? next.activeCharacterId
              : stillValid[0]!;
        next = { ...next, activeCharacterId: active };
      }
    }

    setStore(next);
    writeLiberationStore(next);
    setReady(true);
  }, [hydrated, eligible, eligibleIds, primary]);

  useEffect(() => {
    if (!ready) return;
    writeLiberationStore(store);
  }, [store, ready]);

  const mode = store.mode;
  const inputs = getActiveInputs(store);
  const type = inputs.liberationType;
  const bosses = bossesFor(type);
  const milestones = milestonesFor(type);
  const useGenesisPass = type === "genesis" && inputs.genesisPass;

  const result = useMemo(
    () =>
      calculateLiberation({
        type,
        tracesHeld: inputs.currentTraces,
        liberationQuest: inputs.liberationQuest,
        useGenesisPass,
        startDate: inputs.startDate,
        selections: inputs.bossSelections,
      }),
    [type, inputs, useGenesisPass],
  );

  useEffect(() => {
    if (!ready) return;
    const nextRate = inputs.liberated ? 100 : result.completionRate;
    if (inputs.completionRate === nextRate) return;
    setStore((prev) =>
      upsertActiveInputs(prev, { completionRate: nextRate }),
    );
  }, [
    ready,
    result.completionRate,
    inputs.completionRate,
    inputs.liberated,
  ]);

  const patch = (partial: Partial<LiberationCharacterInputs>) => {
    setStore((prev) => upsertActiveInputs(prev, partial));
  };

  const setType = (next: LiberationType) => {
    setStore((prev) => {
      const key = getActiveKey(prev);
      const bundle = prev.characterData[key] ?? {
        genesis: defaultInputs("genesis"),
        destiny: defaultInputs("destiny"),
        currentTab: "genesis" as const,
      };
      return {
        ...prev,
        characterData: {
          ...prev.characterData,
          [key]: { ...bundle, currentTab: next },
        },
      };
    });
  };

  const patchBoss = (bossName: string, partial: Partial<TraceSelection>) => {
    setStore((prev) => {
      const current = getActiveInputs(prev);
      const bossSelections = current.bossSelections.map((s) =>
        s.bossName === bossName ? { ...s, ...partial } : s,
      );
      return upsertActiveInputs(prev, { bossSelections });
    });
  };

  const toggleCleared = (bossName: string) => {
    setStore((prev) => {
      const current = getActiveInputs(prev);
      const bossSelections = current.bossSelections.map((s) => {
        if (s.bossName !== bossName) return s;
        if (s.difficulty === NOT_DOING) return s;
        return { ...s, cleared: !s.cleared };
      });
      return upsertActiveInputs(prev, { bossSelections });
    });
  };

  /** Card click: enable at highest+Solo, or toggle clear when already selected. */
  const onBossCardActivate = (bossName: string) => {
    setStore((prev) => {
      const current = getActiveInputs(prev);
      const typeNow = current.liberationType;
      const boss = bossesFor(typeNow).find((b) => b.name === bossName);
      if (!boss) return prev;
      const bossSelections = current.bossSelections.map((s) => {
        if (s.bossName !== bossName) return s;
        if (s.difficulty === NOT_DOING) {
          return {
            ...s,
            difficulty: highestDifficulty(boss),
            partySize: 1,
            cleared: false,
          };
        }
        return { ...s, cleared: !s.cleared };
      });
      return upsertActiveInputs(prev, { bossSelections });
    });
  };

  const resetActive = () => {
    setStore((prev) => upsertActiveInputs(prev, defaultInputs(type)));
  };

  const applyDisplayIds = (ids: string[]) => {
    const nextPrefs: DisplayPrefs = {
      visibleIds: ids,
      customized: true,
    };
    setDisplayPrefs(nextPrefs);
    writeLiberationDisplay(nextPrefs);

    const shown = resolveVisibleIds(nextPrefs, eligibleIds);
    setStore((prev) => {
      let s = prev;
      for (const id of shown) s = ensureCharacterBundle(s, id);
      const active =
        s.activeCharacterId && shown.includes(s.activeCharacterId)
          ? s.activeCharacterId
          : (shown[0] ?? null);
      if (shown.length === 0) {
        return {
          ...s,
          mode: "preview",
          selectedCharacterIds: [],
          activeCharacterId: null,
        };
      }
      return {
        ...s,
        mode: s.mode === "preview" ? s.mode : "characters",
        selectedCharacterIds: shown,
        activeCharacterId: active,
      };
    });
  };

  const setMode = (next: LiberationMode) => {
    setStore((prev) => {
      if (next === "preview") {
        return {
          ...prev,
          mode: "preview",
          activeCharacterId: null,
        };
      }
      let s = prev;
      const ids =
        visibleIds.length > 0 ? visibleIds : eligible.map((e) => entryKey(e));
      for (const id of ids) s = ensureCharacterBundle(s, id);
      const active =
        (primary && ids.includes(entryKey(primary))
          ? entryKey(primary)
          : ids[0]) ?? null;
      return {
        ...s,
        mode: "characters",
        selectedCharacterIds: ids,
        activeCharacterId: active,
      };
    });
  };

  const clearedCount = inputs.bossSelections.filter((s) => s.cleared).length;
  const liberated = inputs.liberated;
  const achieved = liberated || result.remaining <= 0;
  const pct = liberated ? 100 : Math.min(100, result.completionRate);

  const currencyShort =
    type === "destiny" ? "Adversary's Determination" : "Traces of Darkness";
  const currencyTiny = type === "destiny" ? "AD" : "traces";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Liberation Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          See how many weeks until Genesis or Destiny liberation from your
          weekly bosses.
        </p>
      </header>

      <ActiveCharacterBar onSelect={handleSetPrimary} />

      <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.55fr)]">
        {/* ── Left column ── */}
        <aside className="space-y-4">
          {/* Mode */}
          <section className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-surface/80 p-3">
            <button
              type="button"
              onClick={() => setMode("characters")}
              disabled={eligible.length === 0}
              title={
                eligible.length === 0
                  ? "Need a level 255+ character on your roster"
                  : undefined
              }
              className={[
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                mode === "characters"
                  ? "bg-accent text-white dark:text-zinc-900"
                  : "border border-border/50 hover:bg-accent-soft hover:text-accent",
              ].join(" ")}
            >
              My Characters
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={[
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                mode === "preview"
                  ? "bg-accent text-white dark:text-zinc-900"
                  : "border border-border/50 hover:bg-accent-soft hover:text-accent",
              ].join(" ")}
            >
              Preview
            </button>
            {mode === "characters" ? (
              <Link
                href="/roster"
                className="ml-auto text-xs font-medium text-accent hover:underline"
                title="Manage roster"
              >
                Roster
              </Link>
            ) : (
              <span className="ml-auto rounded-md border border-border/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                Preview
              </span>
            )}
          </section>

          {/* Character strip — only displayed characters */}
          {mode === "characters" && eligible.length > 0 ? (
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
                      const active = store.activeCharacterId === key;
                      const slot = slots[key];
                      const character =
                        slot?.status === "ready" ? slot.character : null;
                      const name = character?.name ?? entry.name;
                      const avatar = character?.characterImgURL;
                      const bundle = store.characterData[key];
                      const tab = bundle?.currentTab ?? "genesis";
                      const tabInputs = bundle?.[tab];
                      const rate = tabInputs?.liberated
                        ? 100
                        : (tabInputs?.completionRate ?? 0);
                      const isLib = !!tabInputs?.liberated;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setStore((prev) => ({
                              ...ensureCharacterBundle(prev, key),
                              mode: "characters",
                              activeCharacterId: key,
                              selectedCharacterIds: visibleIds.includes(key)
                                ? visibleIds
                                : [...visibleIds, key],
                            }));
                          }}
                          className={[
                            "relative flex w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-xl border px-1.5 py-2 transition",
                            active
                              ? "border-accent bg-accent-soft/45"
                              : "border-border/50 bg-background/40 hover:border-accent/40",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white",
                              tab === "destiny"
                                ? "bg-amber-600"
                                : "bg-emerald-700",
                            ].join(" ")}
                            title={tab === "destiny" ? "Destiny" : "Genesis"}
                          >
                            {tab === "destiny" ? "D" : "G"}
                          </span>
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={avatar}
                              alt=""
                              width={48}
                              height={48}
                              className="mt-1 h-12 w-12 object-contain"
                            />
                          ) : (
                            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted text-[10px] font-bold uppercase opacity-50">
                              {name.slice(0, 2)}
                            </div>
                          )}
                          <p className="w-full truncate text-center text-[10px] font-semibold leading-tight">
                            {name}
                          </p>
                          <p className="font-mono text-[10px] tabular-nums opacity-65">
                            {isLib
                              ? "Liberated"
                              : `${rate}%`}
                            {isPrimary(entry, primary) ? " ★" : ""}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="mt-2 text-[10px] opacity-55">
                Tap a character to edit · Gear icon to show/hide
              </p>
            </section>
          ) : null}

          {eligible.length === 0 && roster.length > 0 ? (
            <p className="text-xs opacity-65">
              Characters need level 255+ for My Characters.{" "}
              <Link href="/roster" className="text-accent hover:underline">
                Check roster
              </Link>
              .
            </p>
          ) : null}

          {/* Progress */}
          <section className="space-y-4 rounded-xl border border-border/40 bg-surface/80 p-4">
            <div className="text-center">
              <p className="font-display text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
                {liberated
                  ? "Liberated!"
                  : achieved
                    ? "Done!"
                    : formatDisplayDate(result.etaISO)}
              </p>
              <p className="mt-1 text-xs opacity-65">
                {liberated
                  ? type === "destiny"
                    ? "Destiny weapon liberated"
                    : "Genesis weapon liberated"
                  : achieved
                    ? "Liberation finished"
                    : "When you should finish (estimate)"}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold tabular-nums text-accent">
                  {pct}% done
                </span>
                <span className="font-mono tabular-nums opacity-70">
                  {result.progress.toLocaleString()} /{" "}
                  {result.target.toLocaleString()} {currencyTiny}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-border/30 pt-3">
              <h3 className="text-sm font-semibold">What you earn</h3>
              <Row
                label={
                  type === "destiny" ? "Each week (AD)" : "Each week (traces)"
                }
                value={String(result.weeklyTraces)}
              />
              {type === "genesis" ? (
                <Row
                  label="Black Mage (once a month)"
                  value={String(result.monthlyTraces)}
                />
              ) : null}
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="opacity-75">In 4 weeks</span>
                <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-sm font-semibold tabular-nums text-accent">
                  {result.fourWeekTotal}
                </span>
              </div>
            </div>

            <div className="space-y-2 rounded-lg bg-surface-muted/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-55">
                Quick numbers
              </p>
              <Row
                label={`Have / need (${currencyTiny})`}
                value={`${result.progress.toLocaleString()} / ${result.target.toLocaleString()}`}
              />
              <Row label="Time left" value={weeksLabel(result.weeksNeeded)} />
            </div>

            <p className="text-[11px] leading-relaxed opacity-60">
              Tip: this mission needs up to{" "}
              {result.missionCap.toLocaleString()} {currencyShort}. Extra
              carryover accelerates the next step after you advance the quest.
            </p>
          </section>
        </aside>

        {/* ── Main column ── */}
        <div className="space-y-4">
          <section className="space-y-4 rounded-xl border border-border/40 bg-surface/80 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["genesis", "GENESIS"],
                    ["destiny", "DESTINY"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setType(id)}
                    className={[
                      "rounded-lg px-4 py-2 text-xs font-bold tracking-wide transition-colors",
                      type === id
                        ? "bg-accent text-white dark:text-zinc-900"
                        : "border border-border/50 hover:bg-accent-soft hover:text-accent",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => patch({ liberated: !liberated })}
                  aria-pressed={liberated}
                  className={[
                    "rounded-md border px-3 py-2 text-xs font-semibold transition-colors",
                    liberated
                      ? "border-accent bg-accent text-white dark:text-zinc-900"
                      : "border-border/50 bg-surface-muted/60 opacity-80 hover:border-accent/50 hover:text-accent",
                  ].join(" ")}
                  title={
                    liberated
                      ? `Unmark ${type === "destiny" ? "Destiny" : "Genesis"} as liberated`
                      : `Mark ${type === "destiny" ? "Destiny" : "Genesis"} weapon as liberated`
                  }
                >
                  {liberated ? "Liberated" : "Mark liberated"}
                </button>
                <button
                  type="button"
                  onClick={resetActive}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Reset
                </button>
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold">Your setup</h2>
              <p className="mt-0.5 text-xs opacity-65">
                Tell us where you are in the quest and how many {currencyTiny}{" "}
                you already have.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-xs font-medium opacity-65">
                  Current quest step
                </span>
                <select
                  className={inputClass}
                  value={inputs.liberationQuest}
                  onChange={(e) => patch({ liberationQuest: e.target.value })}
                >
                  {milestones.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-xs font-medium opacity-65">
                  {type === "destiny"
                    ? "Adversary's Determination you have"
                    : "Traces of Darkness you have"}
                </span>
                <input
                  type="number"
                  min={0}
                  max={result.missionCap}
                  inputMode="numeric"
                  className={`${inputClass} w-full placeholder:text-foreground/25`}
                  value={
                    inputs.currentTraces === 0 ? "" : inputs.currentTraces
                  }
                  placeholder="0"
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    if (raw === "") {
                      patch({ currentTraces: 0 });
                      return;
                    }
                    const n = Number(raw);
                    if (!Number.isFinite(n)) return;
                    patch({
                      currentTraces: clampTracesHeld(
                        n,
                        type,
                        inputs.liberationQuest,
                      ),
                    });
                  }}
                />
                <span className="text-[11px] opacity-50">
                  Leave blank for 0 · this mission max{" "}
                  {result.missionCap.toLocaleString()}
                </span>
              </label>

              {result.stepProgress ? (
                <div className="space-y-1 text-xs opacity-75 sm:col-span-2">
                  <div className="flex justify-between">
                    <span>Progress to {result.stepProgress.nextBossName}:</span>
                    <span className="font-medium text-foreground">
                      {result.stepProgress.held} / {result.stepProgress.needed}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          (result.stepProgress.held /
                            Math.max(1, result.stepProgress.needed)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium opacity-65">
                  Start counting from
                </span>
                <input
                  type="date"
                  className={inputClass}
                  value={inputs.startDate}
                  onChange={(e) => patch({ startDate: e.target.value })}
                />
              </label>

              {type === "genesis" ? (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium opacity-65">
                    Genesis Pass?
                  </span>
                  <select
                    className={inputClass}
                    value={inputs.genesisPass ? "yes" : "no"}
                    onChange={(e) =>
                      patch({ genesisPass: e.target.value === "yes" })
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes (3× traces)</option>
                  </select>
                </label>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {/* Full-width weekly bosses — room for difficulty labels */}
      <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Weekly bosses
            </h2>
            <p className="mt-0.5 text-xs opacity-65">
              Pick difficulty &amp; party size (defaults to highest + Solo).
              Tap the card to clear, or tap an idle card to add that boss.
            </p>
          </div>
          <span className="rounded-md border border-border/40 px-2.5 py-1 text-xs font-semibold tabular-nums opacity-80">
            {clearedCount} / {bosses.length} cleared
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {bosses.map((boss) => {
            const sel = inputs.bossSelections.find(
              (s) => s.bossName === boss.name,
            ) ?? {
              bossName: boss.name,
              difficulty: NOT_DOING,
              partySize: 1,
              cleared: false,
            };
            const doing = sel.difficulty !== NOT_DOING;
            const gained = doing
              ? tracesFromClear(
                  type,
                  boss.name,
                  sel.difficulty,
                  sel.partySize,
                  useGenesisPass,
                )
              : 0;
            const icon = bossIconSrc(boss);
            const broken = brokenIcons[boss.name];
            const stop = (e: MouseEvent) => e.stopPropagation();

            return (
              <div
                key={boss.name}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  const t = e.target as HTMLElement;
                  if (t.closest("button, select, input, a, textarea, label")) {
                    return;
                  }
                  onBossCardActivate(boss.name);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onBossCardActivate(boss.name);
                  }
                }}
                aria-pressed={doing ? sel.cleared : false}
                className={bossCardClass(sel.cleared, doing)}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                    {!broken ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={icon}
                        alt=""
                        className="h-full w-full object-contain"
                        onError={() =>
                          setBrokenIcons((prev) => ({
                            ...prev,
                            [boss.name]: true,
                          }))
                        }
                      />
                    ) : (
                      <span className="text-sm font-bold opacity-50">
                        {boss.name.slice(0, 1)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h3 className="text-sm font-semibold leading-tight">
                        {boss.name}
                      </h3>
                      <span
                        className="shrink-0 font-mono text-sm font-bold tabular-nums text-accent"
                        title={`${currencyTiny} per clear`}
                      >
                        {doing ? gained : 0}
                      </span>
                      {boss.frequency === "monthly" ? (
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider opacity-50">
                          monthly
                        </span>
                      ) : null}
                    </div>

                    <div
                      className="flex min-w-0 flex-wrap items-center gap-2"
                      onClick={stop}
                    >
                      <select
                        className={`${inputClass} min-w-[11rem] flex-1 py-1.5 text-sm`}
                        value={sel.difficulty}
                        onChange={(e) => {
                          const difficulty = e.target.value;
                          const enabling =
                            sel.difficulty === NOT_DOING &&
                            difficulty !== NOT_DOING;
                          patchBoss(boss.name, {
                            difficulty,
                            partySize: enabling
                              ? 1
                              : clampPartySize(sel.partySize),
                            cleared:
                              difficulty === NOT_DOING ? false : sel.cleared,
                          });
                        }}
                        aria-label={`${boss.name} difficulty`}
                      >
                        <option value={NOT_DOING}>Not doing</option>
                        {[...boss.difficulties].reverse().map((d) => (
                          <option key={d.label} value={d.label}>
                            {d.label} ({d.baseTraces})
                          </option>
                        ))}
                      </select>
                      <select
                        className={`${inputClass} w-[5.5rem] shrink-0 py-1.5 text-sm`}
                        value={sel.partySize}
                        disabled={!doing}
                        onChange={(e) =>
                          patchBoss(boss.name, {
                            partySize: clampPartySize(
                              Number(e.target.value),
                            ),
                          })
                        }
                        aria-label={`${boss.name} party size`}
                      >
                        {PARTY_SIZES.map((n) => (
                          <option key={n} value={n}>
                            {n === 1 ? "Solo" : `${n}p`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div
                  className="flex shrink-0 self-stretch sm:items-center"
                  onClick={stop}
                >
                  {doing ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCleared(boss.name);
                      }}
                      className={[
                        "rounded-md border px-2.5 py-2 text-center text-xs font-semibold transition-colors",
                        CLEAR_CHIP_WIDTH,
                        sel.cleared
                          ? "border-accent bg-accent text-white dark:text-zinc-900"
                          : "border-border/50 bg-surface-muted/60 opacity-80 hover:border-accent/50 hover:text-accent",
                      ].join(" ")}
                    >
                      {sel.cleared ? "Done" : "Not cleared"}
                    </button>
                  ) : (
                    <span
                      className={`hidden text-center text-xs opacity-40 sm:flex sm:items-center sm:justify-center ${CLEAR_CHIP_WIDTH}`}
                    >
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <ManageDisplayModal
        open={manageOpen}
        helper="Tap characters to show or hide them in the strip above. Highlighted = shown."
        roster={eligible}
        primary={primary}
        slots={slots}
        visibleIds={visibleIds}
        onClose={() => setManageOpen(false)}
        onSave={applyDisplayIds}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="opacity-75">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
