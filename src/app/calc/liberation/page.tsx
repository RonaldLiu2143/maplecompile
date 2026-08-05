"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  currencyLabel,
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
  "rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent";

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

    // Keep preview + ensure bundles for selected / primary
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
  const currency = currencyLabel(type);

  const result = useMemo(
    () =>
      calculateLiberation({
        type,
        tracesHeld: inputs.currentTraces,
        liberationQuest: inputs.liberationQuest,
        useGenesisPass: inputs.genesisPass,
        startDate: inputs.startDate,
        selections: inputs.bossSelections,
      }),
    [type, inputs],
  );

  // Persist completion % onto active character (MapleHub behavior)
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
  const activeDoing = inputs.bossSelections.filter(
    (s) => s.difficulty !== NOT_DOING,
  ).length;
  const achieved = result.remaining <= 0;
  const pct = Math.min(100, result.completionRate);

  const visibleChars =
    mode === "characters"
      ? eligible.filter((e) =>
          store.selectedCharacterIds.includes(entryKey(e)),
        )
      : [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Liberation Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Calculate how long it will take to complete your MapleStory liberation
          quest. Configure weekly boss clears and track progress toward Genesis
          or Destiny liberation (Heroic / GMS-oriented).
        </p>
      </header>

      {/* Mode */}
      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-surface/80 p-3">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider opacity-60">
          Mode
        </span>
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
        {mode === "preview" ? (
          <span className="ml-auto rounded-md border border-border/40 bg-surface-muted/60 px-2 py-1 text-xs font-medium opacity-70">
            Preview Mode
          </span>
        ) : (
          <Link
            href="/roster"
            className="ml-auto text-xs font-medium text-accent hover:underline"
          >
            Manage roster
          </Link>
        )}
      </section>

      {mode === "characters" && eligible.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {eligible.map((entry) => {
              const key = entryKey(entry);
              const selected = store.selectedCharacterIds.includes(key);
              const active = store.activeCharacterId === key;
              const slot = slots[key];
              const name =
                slot?.status === "ready" ? slot.character.name : entry.name;
              const rate =
                store.characterData[key]?.[
                  store.characterData[key]?.currentTab ?? "genesis"
                ]?.completionRate ?? 0;
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
                      selectedCharacterIds: prev.selectedCharacterIds.includes(
                        key,
                      )
                        ? prev.selectedCharacterIds
                        : [...prev.selectedCharacterIds, key],
                    }));
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleCharacterVisible(key);
                  }}
                  className={[
                    "min-w-[7.5rem] rounded-xl border px-3 py-2 text-left transition",
                    active
                      ? "border-accent bg-accent-soft/50"
                      : selected
                        ? "border-border/50 bg-surface/80 hover:border-accent/40"
                        : "border-dashed border-border/40 opacity-55 hover:opacity-80",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                        (
                          store.characterData[key]?.currentTab ?? "genesis"
                        ) === "destiny"
                          ? "bg-amber-600 text-white"
                          : "bg-emerald-700 text-white",
                      ].join(" ")}
                    >
                      {(store.characterData[key]?.currentTab ?? "genesis") ===
                      "destiny"
                        ? "D"
                        : "G"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{name}</p>
                      <p className="font-mono text-xs opacity-60">
                        {rate}%
                        {isPrimary(entry, primary) ? " · primary" : ""}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {visibleChars.length === 0 ? (
            <p className="text-xs opacity-65">
              Click a character to track liberation for them. Right-click to
              hide from the strip.
            </p>
          ) : null}
        </section>
      ) : null}

      {eligible.length === 0 && roster.length > 0 ? (
        <p className="text-xs opacity-65">
          Roster characters need level 255+ for My Characters mode (same as
          MapleHub). Use Preview until then, or{" "}
          <Link href="/roster" className="text-accent hover:underline">
            check roster
          </Link>
          .
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* Progress column */}
        <section className="space-y-4 rounded-xl border border-border/40 bg-surface/80 p-4 sm:p-5">
          <h2 className="font-display text-lg font-semibold">
            Liberation Progress
          </h2>

          <div className="text-center">
            <p className="font-display text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
              {achieved
                ? "Done"
                : formatDisplayDate(result.etaISO)}
            </p>
            <p className="mt-1 text-sm opacity-65">
              {achieved ? "Liberation achieved" : "Target liberation date"}
            </p>
          </div>

          {!achieved ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs opacity-65">
                <span>Current Progress</span>
                <span className="font-mono tabular-nums">
                  {result.progress.toLocaleString()} /{" "}
                  {result.target.toLocaleString()} traces
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-right text-xs font-semibold tabular-nums opacity-70">
                {pct}%
              </p>
            </div>
          ) : null}

          <div className="space-y-2 border-t border-border/30 pt-4">
            <h3 className="text-sm font-semibold">Trace Sources</h3>
            <Row
              label="Weekly traces"
              value={String(result.weeklyTraces)}
            />
            {type === "genesis" ? (
              <Row
                label="Black Mage (monthly)"
                value={String(result.monthlyTraces)}
              />
            ) : null}
            <Row
              label="4-week total"
              value={String(result.fourWeekTotal)}
            />
          </div>

          <div className="space-y-2 rounded-lg bg-surface-muted/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
              Detailed Statistics
            </p>
            <Row
              label={`Total acquisition ${type === "destiny" ? "Adversary's Determination" : "traces"}`}
              value={`${result.weeklyTraces} /week${type === "genesis" ? ` + ${result.monthlyTraces} /month` : ""}`}
            />
            <Row
              label={`Acquisition/demand ${currency}`}
              value={`${result.progress.toLocaleString()} / ${result.target.toLocaleString()}`}
            />
            <Row
              label="Expected liberation period"
              value={weeksLabel(result.weeksNeeded)}
            />
          </div>

          <div className="rounded-lg border border-border/30 bg-background/40 p-3 text-xs opacity-75">
            <p className="mb-1 font-semibold text-foreground opacity-90">
              Carryover Information
            </p>
            <p>
              {type === "destiny"
                ? `The game lets you hold up to ${DESTINY_CARRYOVER_CAP.toLocaleString()} Adversary's Determination across steps. Overshooting here simply accelerates the next step.`
                : `The game lets you hold up to ${GENESIS_CARRYOVER_CAP.toLocaleString()} traces across steps. Overshooting here simply accelerates the next step.`}
            </p>
          </div>
        </section>

        {/* Config column */}
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
                    "rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition-colors",
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

          <h2 className="font-display text-lg font-semibold">Configuration</h2>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium opacity-65">Current quest</span>
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

          <label className="flex flex-col gap-1 text-sm">
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
            <div className="text-xs opacity-75">
              <div className="flex justify-between">
                <span>Progress to {result.stepProgress.nextBossName}:</span>
                <span className="font-medium text-foreground">
                  {result.stepProgress.held} / {result.stepProgress.needed}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted">
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
            <span className="text-xs font-medium opacity-65">Start date</span>
            <input
              type="date"
              className={inputClass}
              value={inputs.startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium opacity-65">Genesis Pass</span>
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
        </section>
      </div>

      {/* Boss selection */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Boss Selection
            </h2>
            <p className="mt-1 text-sm opacity-70">
              Track your weekly boss clears. Mark bosses as &quot;Cleared&quot;
              when you complete them this week.
            </p>
          </div>
          <span className="rounded-md border border-border/40 px-2 py-1 text-xs font-medium tabular-nums opacity-75">
            {clearedCount} / {bosses.length} cleared this week
            {activeDoing > 0 ? ` · ${activeDoing} configured` : ""}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                  inputs.genesisPass,
                )
              : 0;
            const icon = bossIconSrc(boss);
            const broken = brokenIcons[boss.name];

            return (
              <div
                key={boss.name}
                className={[
                  "rounded-xl border p-3 transition",
                  doing
                    ? "border-border/50 bg-surface/90"
                    : "border-border/30 bg-surface/50 opacity-80",
                  sel.cleared ? "ring-1 ring-emerald-600/40" : "",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold leading-tight">
                          {boss.name}
                        </h3>
                        {boss.frequency === "monthly" ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-55">
                            monthly
                          </span>
                        ) : null}
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums text-accent">
                        {doing ? gained : 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                  <select
                    className={`${inputClass} w-full text-xs`}
                    value={sel.difficulty}
                    onChange={(e) =>
                      patchBoss(boss.name, {
                        difficulty: e.target.value,
                        cleared:
                          e.target.value === NOT_DOING ? false : sel.cleared,
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
                    className={`${inputClass} w-[4.5rem] text-xs`}
                    value={sel.partySize}
                    disabled={!doing}
                    onChange={(e) =>
                      patchBoss(boss.name, {
                        partySize: clampPartySize(Number(e.target.value)),
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

                <label className="mt-3 flex items-center justify-between gap-2 text-xs">
                  <span className="opacity-65">
                    {sel.cleared ? "Cleared" : "Not cleared"}
                  </span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--accent)]"
                    checked={sel.cleared}
                    disabled={!doing}
                    onChange={(e) =>
                      patchBoss(boss.name, { cleared: e.target.checked })
                    }
                    aria-label={`${boss.name} cleared this week`}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border/40 bg-surface/80 p-4">
        <h2 className="font-display text-lg font-semibold">Milestones</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {milestones.map((m) => {
            const done =
              parseInt(inputs.liberationQuest.split("|")[0] ?? "0", 10) >=
              m.requiredTraces;
            return (
              <li
                key={m.value}
                className={[
                  "flex items-center justify-between rounded-lg border border-border/30 px-3 py-2",
                  done ? "bg-accent-soft/40" : "opacity-70",
                ].join(" ")}
              >
                <span>{m.label}</span>
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {done ? "Reached" : "Locked"}
                </span>
              </li>
            );
          })}
          <li className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2">
            <span>
              Target — {result.target.toLocaleString()} ({type === "destiny" ? "Destiny" : "Genesis"})
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider">
              {achieved ? "Complete" : "In progress"}
            </span>
          </li>
        </ul>
      </section>

      <details className="rounded-xl border border-border/40 bg-surface/60 p-4 text-sm">
        <summary className="cursor-pointer font-display text-base font-semibold">
          Notes & stubs
        </summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs opacity-75">
          <li>
            Trace amounts, party split{" "}
            <code className="rounded bg-surface-muted px-1">
              floor(base ÷ party) × pass
            </code>
            , Thursday reset, and monthly Black Mage match MapleHub.
          </li>
          <li>
            Genesis Pass triples all configured boss traces. Destiny uses
            Adversary&apos;s Determination with a separate boss list.
          </li>
          <li>
            Cleared-this-week bosses are excluded from the ETA &quot;start
            total&quot; (assumed already reflected in held currency).
          </li>
          <li>
            Per-character state persists in localStorage; Preview is a shared
            sandbox. Characters must be 255+ for My Characters mode.
          </li>
          <li>
            Stubbed / not ported: mission fight sims (FD penalties, consumable
            limits), magnification scale / stepCollected fields MapleHub stores
            but does not expose in the main UI, Destiny material routes beyond
            Kaling milestones.
          </li>
        </ul>
      </details>
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
