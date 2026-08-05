"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRoster } from "@/hooks/useRoster";
import { entryKey, isPrimary } from "@/lib/dashboard/roster";
import {
  DESTINY_CARRYOVER_CAP,
  GENESIS_CARRYOVER_CAP,
  NOT_DOING,
  TRACE_INPUT_MAX,
  bossIconSrc,
  bossesFor,
  calculateLiberation,
  clampPartySize,
  clampTracesHeld,
  defaultInputs,
  ensureCharacterBundle,
  getActiveInputs,
  getActiveKey,
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
  if (weeks == null) return "Select bosses";
  if (weeks === 0) return "0 weeks (0 months)";
  const w = Math.ceil(weeks * 10) / 10;
  const months = Math.floor((weeks / 4) * 10) / 10;
  return `${w} weeks (${months} months)`;
}

function bossCardClass(cleared: boolean, doing: boolean): string {
  const base =
    "relative flex flex-col gap-2.5 rounded-xl border p-3 transition select-none sm:flex-row sm:items-center";
  if (!doing) {
    return `${base} cursor-default border-border/30 bg-surface/50 opacity-75`;
  }
  return cleared
    ? `${base} cursor-pointer border-accent bg-accent-soft/40`
    : `${base} cursor-pointer border-border/45 bg-surface/80 hover:border-border/70`;
}

export default function LiberationPage() {
  const { hydrated, roster, primary, slots } = useRoster();
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<LiberationStore>(() =>
    readLiberationStore(),
  );
  const [brokenIcons, setBrokenIcons] = useState<Record<string, true>>({});

  const eligible = useMemo(() => {
    return roster.filter((entry) => {
      const slot = slots[entryKey(entry)];
      if (!slot || slot.status !== "ready") return false;
      return slot.character.level >= 255;
    });
  }, [roster, slots]);

  useEffect(() => {
    if (!hydrated) return;
    let next = readLiberationStore();

    const preferred =
      primary && eligible.some((e) => entryKey(e) === entryKey(primary))
        ? entryKey(primary)
        : eligible[0]
          ? entryKey(eligible[0])
          : null;

    for (const entry of eligible) {
      next = ensureCharacterBundle(next, entryKey(entry));
    }

    if (next.mode === "characters") {
      const stillValid = next.selectedCharacterIds.filter((id) =>
        eligible.some((e) => entryKey(e) === id),
      );
      next = { ...next, selectedCharacterIds: stillValid };
      if (stillValid.length === 0) {
        next = { ...next, mode: "preview", activeCharacterId: null };
      } else if (
        !next.activeCharacterId ||
        !stillValid.includes(next.activeCharacterId)
      ) {
        next = {
          ...next,
          activeCharacterId: preferred ?? stillValid[0] ?? null,
        };
      }
    }

    setStore(next);
    writeLiberationStore(next);
    setReady(true);
  }, [hydrated, eligible, primary]);

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
    if (inputs.completionRate === result.completionRate) return;
    setStore((prev) =>
      upsertActiveInputs(prev, { completionRate: result.completionRate }),
    );
  }, [ready, result.completionRate, inputs.completionRate]);

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

  const resetActive = () => {
    setStore((prev) => upsertActiveInputs(prev, defaultInputs(type)));
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
        prev.selectedCharacterIds.length > 0
          ? prev.selectedCharacterIds.filter((id) =>
              eligible.some((e) => entryKey(e) === id),
            )
          : eligible.map((e) => entryKey(e));
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

  const toggleCharacterVisible = (id: string) => {
    setStore((prev) => {
      const has = prev.selectedCharacterIds.includes(id);
      const selectedCharacterIds = has
        ? prev.selectedCharacterIds.filter((x) => x !== id)
        : [...prev.selectedCharacterIds, id];
      let s = ensureCharacterBundle(prev, id);
      s = { ...s, selectedCharacterIds };
      if (
        !selectedCharacterIds.includes(s.activeCharacterId ?? "") &&
        selectedCharacterIds.length > 0
      ) {
        s = { ...s, activeCharacterId: selectedCharacterIds[0]! };
      }
      if (selectedCharacterIds.length === 0) {
        s = { ...s, mode: "preview", activeCharacterId: null };
      }
      return s;
    });
  };

  const clearedCount = inputs.bossSelections.filter((s) => s.cleared).length;
  const achieved = result.remaining <= 0;
  const pct = Math.min(100, result.completionRate);
  const weeklyBars = [1, 2, 3, 4] as const;
  const weekBarMax = Math.max(1, result.weeklyTraces);

  const currencyShort =
    type === "destiny" ? "Adversary's Determination" : "Traces of Darkness";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Liberation Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Track Genesis / Destiny liberation progress from weekly bosses
          (Heroic / GMS-oriented).
        </p>
      </header>

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
                  ? "No level 255+ roster characters available"
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

          {/* Character strip */}
          {mode === "characters" && eligible.length > 0 ? (
            <section className="rounded-xl border border-border/40 bg-surface/80 p-3">
              <div className="overflow-x-auto">
                <div className="flex w-max gap-2">
                  {eligible.map((entry) => {
                    const key = entryKey(entry);
                    const selected = store.selectedCharacterIds.includes(key);
                    const active = store.activeCharacterId === key;
                    const slot = slots[key];
                    const character =
                      slot?.status === "ready" ? slot.character : null;
                    const name = character?.name ?? entry.name;
                    const avatar = character?.characterImgURL;
                    const rate =
                      store.characterData[key]?.[
                        store.characterData[key]?.currentTab ?? "genesis"
                      ]?.completionRate ?? 0;
                    const tab =
                      store.characterData[key]?.currentTab ?? "genesis";
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          if (!selected) toggleCharacterVisible(key);
                          setStore((prev) => ({
                            ...ensureCharacterBundle(prev, key),
                            mode: "characters",
                            activeCharacterId: key,
                            selectedCharacterIds:
                              prev.selectedCharacterIds.includes(key)
                                ? prev.selectedCharacterIds
                                : [...prev.selectedCharacterIds, key],
                          }));
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          toggleCharacterVisible(key);
                        }}
                        className={[
                          "relative flex w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-xl border px-1.5 py-2 transition",
                          active
                            ? "border-accent bg-accent-soft/45"
                            : selected
                              ? "border-border/50 bg-background/40 hover:border-accent/40"
                              : "border-dashed border-border/35 opacity-50 hover:opacity-80",
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
                          {rate}%
                          {isPrimary(entry, primary) ? " ★" : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="mt-2 text-[10px] opacity-55">
                Click to select · right-click to hide
              </p>
            </section>
          ) : null}

          {eligible.length === 0 && roster.length > 0 ? (
            <p className="text-xs opacity-65">
              Need level 255+ for My Characters.{" "}
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
                {achieved ? "Done" : formatDisplayDate(result.etaISO)}
              </p>
              <p className="mt-1 text-xs opacity-65">
                {achieved ? "Liberation achieved" : "Target liberation date"}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold tabular-nums text-accent">
                  {pct}%
                </span>
                <span className="font-mono tabular-nums opacity-70">
                  {result.progress.toLocaleString()} /{" "}
                  {result.target.toLocaleString()} {currencyShort}
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
              <h3 className="text-sm font-semibold">Trace Sources</h3>
              <Row
                label={
                  type === "destiny"
                    ? "Weekly Adversary's Determination"
                    : "Weekly traces"
                }
                value={String(result.weeklyTraces)}
              />
              {type === "genesis" ? (
                <Row
                  label="Black Mage (monthly)"
                  value={String(result.monthlyTraces)}
                />
              ) : null}
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="opacity-75">4-week total</span>
                <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-sm font-semibold tabular-nums text-accent">
                  {result.fourWeekTotal}
                </span>
              </div>
            </div>

            <div className="space-y-2 rounded-lg bg-surface-muted/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-55">
                Detailed Statistics
              </p>
              <Row
                label={`Total acquisition ${type === "destiny" ? "AD" : "traces"}`}
                value={`${result.weeklyTraces} /week${type === "genesis" && result.monthlyTraces > 0 ? ` + ${result.monthlyTraces} /mo` : ""}`}
              />
              <Row
                label={`Acquisition / demand`}
                value={`${result.progress.toLocaleString()} / ${result.target.toLocaleString()}`}
              />
              <Row
                label="Expected liberation period"
                value={weeksLabel(result.weeksNeeded)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold opacity-70">
                Weekly accumulation
              </p>
              <div className="grid grid-cols-4 gap-2">
                {weeklyBars.map((w) => (
                  <div key={w} className="space-y-1">
                    <div className="h-12 overflow-hidden rounded-md border border-border/30 bg-background/50">
                      <div
                        className="w-full bg-accent/70 transition-[height] duration-300"
                        style={{
                          height: `${Math.min(100, (result.weeklyTraces / weekBarMax) * 100)}%`,
                          marginTop: `${100 - Math.min(100, (result.weeklyTraces / weekBarMax) * 100)}%`,
                        }}
                        title={`Week ${w}: ${result.weeklyTraces}`}
                      />
                    </div>
                    <p className="text-center text-[10px] opacity-55">W{w}</p>
                    <p className="text-center font-mono text-[10px] tabular-nums opacity-75">
                      {result.weeklyTraces}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] leading-relaxed opacity-60">
              {type === "destiny"
                ? `Carryover tip: hold up to ${DESTINY_CARRYOVER_CAP.toLocaleString()} Adversary's Determination across steps.`
                : `Carryover tip: hold up to ${GENESIS_CARRYOVER_CAP.toLocaleString()} traces across steps.`}
            </p>
          </section>
        </aside>

        {/* ── Main column ── */}
        <div className="space-y-4">
          <section className="space-y-4 rounded-xl border border-border/40 bg-surface/80 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5">
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
              <button
                type="button"
                onClick={resetActive}
                className="text-xs font-semibold text-accent hover:underline"
              >
                Reset
              </button>
            </div>

            <h2 className="font-display text-lg font-semibold">
              Configuration
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-xs font-medium opacity-65">
                  Current quest
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
                    ? "Adversary's Determination held"
                    : "Traces of darkness held"}
                </span>
                <input
                  type="number"
                  min={0}
                  max={TRACE_INPUT_MAX}
                  className={`${inputClass} w-full`}
                  value={inputs.currentTraces || ""}
                  placeholder={`0 ~ ${TRACE_INPUT_MAX}`}
                  onChange={(e) =>
                    patch({
                      currentTraces: clampTracesHeld(
                        e.target.value === "" ? 0 : Number(e.target.value),
                      ),
                    })
                  }
                />
              </label>

              {result.stepProgress ? (
                <div className="space-y-1 text-xs opacity-75 sm:col-span-2">
                  <div className="flex justify-between">
                    <span>
                      Progress to {result.stepProgress.nextBossName}:
                    </span>
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
                  Start date
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
                    Genesis Pass
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

          {/* Bosses */}
          <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Boss Selection
                </h2>
                <p className="mt-0.5 text-xs opacity-65">
                  Click a card or the clear chip to mark this week&apos;s clears.
                </p>
              </div>
              <span className="rounded-md border border-border/40 px-2.5 py-1 text-xs font-semibold tabular-nums opacity-80">
                {clearedCount} / {bosses.length} cleared this week
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
                    role={doing ? "button" : undefined}
                    tabIndex={doing ? 0 : undefined}
                    onClick={() => {
                      if (!doing) return;
                      toggleCleared(boss.name);
                    }}
                    onKeyDown={(e) => {
                      if (!doing) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleCleared(boss.name);
                      }
                    }}
                    aria-pressed={doing ? sel.cleared : undefined}
                    className={bossCardClass(sel.cleared, doing)}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
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
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold leading-tight">
                              {boss.name}
                            </h3>
                            {boss.frequency === "monthly" ? (
                              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50">
                                monthly
                              </span>
                            ) : null}
                          </div>
                          <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-accent">
                            {doing ? gained : 0}
                          </span>
                        </div>
                        <div
                          className="grid grid-cols-[1fr_auto] gap-1.5"
                          onClick={stop}
                        >
                          <select
                            className={`${inputClass} w-full py-1 text-xs`}
                            value={sel.difficulty}
                            onChange={(e) =>
                              patchBoss(boss.name, {
                                difficulty: e.target.value,
                                cleared:
                                  e.target.value === NOT_DOING
                                    ? false
                                    : sel.cleared,
                              })
                            }
                            aria-label={`${boss.name} difficulty`}
                          >
                            <option value={NOT_DOING}>Not doing</option>
                            {boss.difficulties.map((d) => (
                              <option key={d.label} value={d.label}>
                                {d.label} ({d.baseTraces})
                              </option>
                            ))}
                          </select>
                          <select
                            className={`${inputClass} w-[4.25rem] py-1 text-xs`}
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
                                {n === 1 ? "Solo" : n}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {doing ? (
                      <div
                        className="flex shrink-0 items-center justify-end sm:pl-1"
                        onClick={stop}
                      >
                        <button
                          type="button"
                          onClick={() => toggleCleared(boss.name)}
                          className={[
                            "rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                            sel.cleared
                              ? "border-accent bg-accent text-white dark:text-zinc-900"
                              : "border-border/50 bg-surface-muted/60 opacity-80 hover:border-accent/50 hover:text-accent",
                          ].join(" ")}
                        >
                          {sel.cleared ? "Done" : "Not cleared"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
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
