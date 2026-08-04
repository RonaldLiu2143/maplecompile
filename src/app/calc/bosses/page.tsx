"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BOSS_CRYSTALS,
  WEEKLY_CRYSTAL_LIMIT,
  defaultSelections,
  formatMesos,
  getCharacterBossState,
  maybeMigrateLocalToPrimary,
  readBossIncomeStore,
  resolveActiveBossKey,
  summarizeIncome,
  upsertCharacterState,
  writeBossIncomeStore,
  LOCAL_BOSS_KEY,
  type BossClearSelection,
  type BossIncomeStore,
  type WorldType,
} from "@/lib/bosses";
import {
  entryKey,
  isPrimary,
  readRosterState,
  type RosterEntry,
  type RosterPrimary,
} from "@/lib/dashboard/roster";

const inputClass =
  "rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent";

const CATEGORY_LABEL: Record<string, string> = {
  "pre-lomien": "Pre-Lomien",
  "lomien-arcane": "Lomien + Arcane",
  grandis: "Grandis",
  seasonal: "Seasonal",
  unknown: "Other",
};

export default function BossesIncomePage() {
  const [ready, setReady] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [primary, setPrimary] = useState<RosterPrimary | null>(null);
  const [store, setStore] = useState<BossIncomeStore>(() => ({
    version: 2,
    world: "heroic",
    activeKey: null,
    byCharacter: {},
  }));
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"weekly" | "daily">("weekly");

  useEffect(() => {
    const rosterState = readRosterState();
    setRoster(rosterState.entries);
    setPrimary(rosterState.primary);

    let next = readBossIncomeStore();
    const primaryKey = rosterState.primary
      ? entryKey(rosterState.primary)
      : null;
    next = maybeMigrateLocalToPrimary(next, primaryKey);
    const activeKey = resolveActiveBossKey(
      next,
      rosterState.entries,
      rosterState.primary,
    );
    next = { ...next, activeKey };
    // Ensure active character bucket exists so first save is clean.
    if (!next.byCharacter[activeKey]) {
      next = upsertCharacterState(next, activeKey, {
        selections: defaultSelections(),
      });
    }
    setStore(next);
    writeBossIncomeStore(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeBossIncomeStore(store);
  }, [store, ready]);

  const activeKey = store.activeKey ?? LOCAL_BOSS_KEY;
  const selections = getCharacterBossState(store, activeKey).selections;
  const world = store.world;

  const summary = useMemo(
    () => summarizeIncome(selections, world),
    [selections, world],
  );

  const setWorld = (next: WorldType) => {
    setStore((prev) => ({ ...prev, world: next }));
  };

  const setActiveCharacter = (key: string) => {
    setStore((prev) => {
      const withKey: BossIncomeStore = { ...prev, activeKey: key };
      if (withKey.byCharacter[key]) return withKey;
      return upsertCharacterState(withKey, key, {
        selections: defaultSelections(),
      });
    });
  };

  const patch = (bossId: string, partial: Partial<BossClearSelection>) => {
    setStore((prev) => {
      const current = getCharacterBossState(prev, activeKey);
      const selections = current.selections.map((s) =>
        s.bossId === bossId ? { ...s, ...partial } : s,
      );
      return upsertCharacterState(prev, activeKey, { selections });
    });
  };

  const resetActiveCharacter = () => {
    setStore((prev) =>
      upsertCharacterState(prev, activeKey, {
        selections: defaultSelections(),
      }),
    );
    setCategoryFilter([]);
    setQuery("");
  };

  const filtered = BOSS_CRYSTALS.filter((boss) => {
    if (
      categoryFilter.length > 0 &&
      !categoryFilter.includes(boss.category)
    ) {
      return false;
    }
    if (query && !boss.name.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }
    return true;
  });

  const toggleCategory = (cat: string) => {
    setCategoryFilter((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const activeEntry =
    roster.find((e) => entryKey(e) === activeKey) ?? null;
  const hasRoster = roster.length > 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Boss Income
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Track weekly crystal sells per roster character — 14-crystal cap,
          party splits, and Heroic (5×) prices by default. Switching characters
          loads that character&apos;s clear list from local storage.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
              Character
            </p>
            <p className="mt-0.5 text-sm opacity-70">
              {hasRoster
                ? "Clears and party sizes are saved per roster entry."
                : "No roster yet — using a local planner until you add characters."}
            </p>
          </div>
          <Link
            href="/roster"
            className="text-sm font-semibold text-accent hover:underline"
          >
            {hasRoster ? "Manage roster" : "Add to roster"}
          </Link>
        </div>

        {hasRoster ? (
          <div className="flex flex-wrap gap-1.5">
            {roster.map((entry) => {
              const key = entryKey(entry);
              const selected = key === activeKey;
              const primaryMark = isPrimary(entry, primary);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveCharacter(key)}
                  className={[
                    "rounded-lg px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "bg-accent font-semibold text-white dark:text-zinc-900"
                      : "border border-border/50 hover:bg-accent-soft hover:text-accent",
                  ].join(" ")}
                >
                  <span className="uppercase opacity-60">{entry.region}</span>{" "}
                  {entry.name}
                  {primaryMark ? (
                    <span className="ml-1 opacity-70" title="Primary">
                      ★
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border/50 bg-surface-muted/40 px-3 py-2 text-sm opacity-80">
            Planning as <span className="font-semibold">Local</span>. Add
            characters on the roster page to track clears separately for each
            mule or main.
          </p>
        )}

        {activeEntry ? (
          <p className="text-xs opacity-55">
            Editing clears for{" "}
            <span className="font-semibold opacity-90">
              {activeEntry.region.toUpperCase()} · {activeEntry.name}
            </span>
          </p>
        ) : null}
      </section>

      <section className="flex flex-wrap gap-1.5">
        {(
          [
            ["weekly", "Weekly crystals"],
            ["daily", "Daily bosses"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={[
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              view === id
                ? "bg-accent text-white dark:text-zinc-900"
                : "border border-border/50 hover:bg-accent-soft hover:text-accent",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </section>

      {view === "daily" ? (
        <section className="rounded-xl border border-dashed border-border/50 bg-surface/60 p-6">
          <h2 className="font-display text-lg font-semibold">
            Daily bosses (stub)
          </h2>
          <p className="mt-2 max-w-xl text-sm opacity-75">
            MapleHub tracks daily clear checklists with weekly/daily reset
            timers. MapleCompile v1 focuses on weekly crystal income + monthly
            Black Mage. Daily boss checklist and auto-reset will land in a later
            pass.
          </p>
        </section>
      ) : (
        <>
          <section className="flex flex-wrap items-end gap-4 rounded-xl border border-border/40 bg-surface/80 p-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Crystal prices
              </span>
              <div className="flex gap-1.5">
                {(
                  [
                    ["heroic", "Heroic"],
                    ["interactive", "Interactive"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setWorld(id)}
                    className={[
                      "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                      world === id
                        ? "bg-accent text-white dark:text-zinc-900"
                        : "border border-border/50 hover:bg-accent-soft hover:text-accent",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              Search
              <input
                className={`${inputClass} min-w-[12rem]`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Boss name…"
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Region
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(CATEGORY_LABEL)
                  .filter(([id]) => id !== "unknown" && id !== "seasonal")
                  .map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleCategory(id)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-sm transition-colors",
                        categoryFilter.length === 0 ||
                        categoryFilter.includes(id)
                          ? "bg-accent-soft font-semibold text-accent"
                          : "border border-border/40 opacity-70 hover:opacity-100",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
              </div>
            </div>
            <button
              type="button"
              className="text-sm text-accent hover:underline"
              onClick={resetActiveCharacter}
            >
              Reset character
            </button>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Weekly crystals"
              value={`${summary.weeklyCrystalsUsed} / ${summary.weeklyCrystalLimit}`}
            />
            <Stat
              label="Weekly mesos (sold)"
              value={formatMesos(summary.weeklyMesos)}
            />
            <Stat
              label="Monthly boss mesos"
              value={formatMesos(summary.monthlyMesos)}
            />
            <Stat
              label="Est. weekly + monthly/4"
              value={formatMesos(
                summary.weeklyMesos + summary.monthlyAsWeeklyMesos,
              )}
            />
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Boss clears</h2>
            <p className="text-xs opacity-70">
              Enable bosses this character clears. Highest personal crystal
              value sells first up to {WEEKLY_CRYSTAL_LIMIT} weekly crystals.
              Monthly bosses (Black Mage) do not consume the weekly cap.
            </p>
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="bg-surface-muted/80 text-xs uppercase tracking-wider opacity-70">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Clear</th>
                    <th className="px-3 py-2 font-semibold">Boss</th>
                    <th className="px-3 py-2 font-semibold">Difficulty</th>
                    <th className="px-3 py-2 font-semibold">Party</th>
                    <th className="px-3 py-2 font-semibold">Your crystal</th>
                    <th className="px-3 py-2 font-semibold">Sells?</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((boss) => {
                    const sel = selections.find((s) => s.bossId === boss.id)!;
                    const line = summary.lines.find(
                      (l) =>
                        l.bossId === boss.id &&
                        l.difficulty === sel.difficulty,
                    );
                    return (
                      <tr
                        key={boss.id}
                        className="border-t border-border/30 odd:bg-surface/40"
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={sel.enabled}
                            onChange={(e) =>
                              patch(boss.id, { enabled: e.target.checked })
                            }
                            aria-label={`Clear ${boss.name}`}
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {boss.name}
                          <span className="ml-2 text-xs opacity-55">
                            {boss.frequency}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className={inputClass}
                            value={sel.difficulty}
                            onChange={(e) =>
                              patch(boss.id, { difficulty: e.target.value })
                            }
                          >
                            {boss.difficulties.map((d) => (
                              <option key={d.name} value={d.name}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            max={6}
                            className={`${inputClass} w-16`}
                            value={sel.partySize}
                            onChange={(e) =>
                              patch(boss.id, {
                                partySize: Math.max(
                                  1,
                                  Math.min(6, Number(e.target.value) || 1),
                                ),
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {line ? formatMesos(line.crystalPersonal) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {sel.enabled ? (
                            line?.sells ? (
                              <span className="font-semibold text-accent">
                                Yes
                              </span>
                            ) : (
                              <span className="opacity-55">No (cap)</span>
                            )
                          ) : (
                            <span className="opacity-40">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="space-y-2 rounded-xl border border-border/30 bg-surface/50 p-4 text-xs opacity-70">
        <p className="font-semibold uppercase tracking-wider opacity-80">
          Parity notes
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            Ported: roster character switcher, per-character clear/party/difficulty
            persistence (`region:name`), Heroic/Interactive prices, 14-crystal
            weekly sell priority, monthly Black Mage, category filters.
          </li>
          <li>
            Stubbed: daily boss checklist, Thursday / monthly auto-reset timers,
            mule presets (NLomien / HLotus / Ctene), clear-history charts, card
            grid UX, finished/unfinished filters.
          </li>
          <li>
            Crystal values sourced from MapleHub boss data (Interactive base ×5
            for Heroic). Not an official Nexon tool — verify after price patches.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}
