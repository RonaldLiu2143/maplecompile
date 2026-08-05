"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ACCOUNT_WEEKLY_CRYSTAL_LIMIT,
  BOSS_CRYSTALS,
  WEEKLY_CRYSTAL_LIMIT,
  countEnabledWeekly,
  defaultSelections,
  formatMesos,
  getCharacterBossState,
  maybeMigrateLocalToPrimary,
  readBossIncomeStore,
  summarizeIncome,
  summarizeRosterIncome,
  upsertCharacterState,
  writeBossIncomeStore,
  LOCAL_BOSS_KEY,
  type BossClearSelection,
  type BossIncomeStore,
  type IncomeSummary,
  type WorldType,
} from "@/lib/bosses";
import { characterProfileHref } from "@/lib/character/client";
import type { CharacterLookupResult } from "@/lib/character/lookup";
import {
  entryKey,
  isPrimary,
  type RosterEntry,
} from "@/lib/dashboard/roster";
import { useRoster } from "@/hooks/useRoster";

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
  const { hydrated, roster, primary, slots } = useRoster();
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<BossIncomeStore>(() => ({
    version: 2,
    world: "heroic",
    activeKey: null,
    byCharacter: {},
  }));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [capToast, setCapToast] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    let next = readBossIncomeStore();
    const primaryKey = primary ? entryKey(primary) : null;
    next = maybeMigrateLocalToPrimary(next, primaryKey);

    // Ensure every roster character has a bucket.
    for (const entry of roster) {
      const key = entryKey(entry);
      if (!next.byCharacter[key]) {
        next = upsertCharacterState(next, key, {
          selections: defaultSelections(),
        });
      }
    }
    if (roster.length === 0 && !next.byCharacter[LOCAL_BOSS_KEY]) {
      next = upsertCharacterState(next, LOCAL_BOSS_KEY, {
        selections: defaultSelections(),
      });
    }

    setStore(next);
    writeBossIncomeStore(next);
    setReady(true);
  }, [hydrated, roster, primary]);

  useEffect(() => {
    if (!ready) return;
    writeBossIncomeStore(store);
  }, [store, ready]);

  useEffect(() => {
    if (!capToast) return;
    const t = window.setTimeout(() => setCapToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [capToast]);

  const world = store.world;
  const displayKeys = useMemo(() => {
    if (roster.length > 0) return roster.map((e) => entryKey(e));
    return [LOCAL_BOSS_KEY];
  }, [roster]);

  const rosterSummary = useMemo(() => {
    const bySelections: Record<string, BossClearSelection[]> = {};
    for (const key of displayKeys) {
      bySelections[key] = getCharacterBossState(store, key).selections;
    }
    return summarizeRosterIncome(bySelections, world, displayKeys);
  }, [displayKeys, store, world]);

  const setWorld = (next: WorldType) => {
    setStore((prev) => ({ ...prev, world: next }));
  };

  const patchCharacter = (
    key: string,
    bossId: string,
    partial: Partial<BossClearSelection>,
  ) => {
    setStore((prev) => {
      const current = getCharacterBossState(prev, key);

      // Hard cap: at most 14 enabled weekly bosses per character.
      if (partial.enabled === true) {
        const boss = BOSS_CRYSTALS.find((b) => b.id === bossId);
        if (boss?.frequency === "weekly") {
          const already = countEnabledWeekly(current.selections);
          const wasEnabled = current.selections.some(
            (s) => s.bossId === bossId && s.enabled,
          );
          if (!wasEnabled && already >= WEEKLY_CRYSTAL_LIMIT) {
            queueMicrotask(() =>
              setCapToast(
                `Weekly boss limit reached (${WEEKLY_CRYSTAL_LIMIT}). Remove another boss first.`,
              ),
            );
            return prev;
          }
        }
      }

      const selections = current.selections.map((s) =>
        s.bossId === bossId ? { ...s, ...partial } : s,
      );
      return upsertCharacterState(prev, key, { selections });
    });
  };

  const resetCharacter = (key: string) => {
    setStore((prev) =>
      upsertCharacterState(prev, key, {
        selections: defaultSelections(),
      }),
    );
  };

  const filteredBosses = BOSS_CRYSTALS.filter((boss) => {
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

  const hasRoster = roster.length > 0;
  const editingEntry =
    editingKey && editingKey !== LOCAL_BOSS_KEY
      ? (roster.find((e) => entryKey(e) === editingKey) ?? null)
      : null;
  const editingSelections = editingKey
    ? getCharacterBossState(store, editingKey).selections
    : null;
  const editingWeeklyCount = editingSelections
    ? countEnabledWeekly(editingSelections)
    : 0;

  if (!hydrated || !ready) {
    return (
      <div className="rounded-xl border border-border/40 bg-surface/80 px-4 py-10 text-center text-sm opacity-70">
        Loading boss income…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Boss Income
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Roster crystal planner — {WEEKLY_CRYSTAL_LIMIT} weekly bosses per
          character, account sell cap{" "}
          {ACCOUNT_WEEKLY_CRYSTAL_LIMIT}, Heroic (5×) prices by default.
        </p>
      </header>

      {capToast ? (
        <p
          role="status"
          className="rounded-lg border border-accent/40 bg-accent-soft/40 px-3 py-2 text-sm font-medium text-accent"
        >
          {capToast}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Max possible mesos"
          value={formatMesos(rosterSummary.maxPossibleMesos)}
          hint="Top weekly crystals across roster (party-split)"
        />
        <Stat
          label="Weekly crystals"
          value={`${rosterSummary.weeklyCrystalsUsed} / ${rosterSummary.accountCrystalLimit}`}
          hint={`${WEEKLY_CRYSTAL_LIMIT} per character · ${ACCOUNT_WEEKLY_CRYSTAL_LIMIT} account/world`}
          warn={
            rosterSummary.weeklyCrystalsUsed >
            rosterSummary.accountCrystalLimit
          }
        />
        <div className="rounded-xl border border-border/40 bg-surface/80 p-4 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
            Crystal prices
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
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
            <Link
              href="/roster"
              className="ml-auto text-sm font-semibold text-accent hover:underline"
            >
              {hasRoster ? "Manage roster" : "Add to roster"}
            </Link>
          </div>
        </div>
      </section>

      {!hasRoster ? (
        <p className="rounded-xl border border-dashed border-border/50 bg-surface/60 px-4 py-3 text-sm opacity-80">
          No roster yet — configuring a{" "}
          <span className="font-semibold">Local</span> planner. Add characters
          on the roster page to track each mule separately.
        </p>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Characters</h2>
            <p className="text-xs opacity-70">
              Up to {WEEKLY_CRYSTAL_LIMIT} weekly bosses listed per character.
              Combined roster total:{" "}
              <span className="font-semibold tabular-nums text-accent">
                {formatMesos(rosterSummary.maxPossibleMesos)}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {hasRoster
            ? roster.map((entry) => {
                const key = entryKey(entry);
                const slot = slots[key];
                const character =
                  slot?.status === "ready" ? slot.character : null;
                const summary =
                  rosterSummary.characters.find((c) => c.key === key)
                    ?.summary ?? summarizeIncome(defaultSelections(), world);
                return (
                  <CharacterBossCard
                    key={key}
                    entry={entry}
                    character={character}
                    loading={slot?.status === "loading"}
                    error={slot?.status === "error" ? slot.error : null}
                    primaryMark={isPrimary(entry, primary)}
                    summary={summary}
                    editing={editingKey === key}
                    onEdit={() =>
                      setEditingKey((prev) => (prev === key ? null : key))
                    }
                    onReset={() => resetCharacter(key)}
                  />
                );
              })
            : (() => {
                const summary =
                  rosterSummary.characters.find((c) => c.key === LOCAL_BOSS_KEY)
                    ?.summary ?? summarizeIncome(defaultSelections(), world);
                return (
                  <CharacterBossCard
                    key={LOCAL_BOSS_KEY}
                    entry={null}
                    character={null}
                    loading={false}
                    error={null}
                    primaryMark={false}
                    summary={summary}
                    localLabel="Local"
                    editing={editingKey === LOCAL_BOSS_KEY}
                    onEdit={() =>
                      setEditingKey((prev) =>
                        prev === LOCAL_BOSS_KEY ? null : LOCAL_BOSS_KEY,
                      )
                    }
                    onReset={() => resetCharacter(LOCAL_BOSS_KEY)}
                  />
                );
              })()}
        </div>
      </section>

      {editingKey && editingSelections ? (
        <section className="space-y-3 rounded-xl border border-accent/30 bg-surface/90 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold">
                Configure bosses
                {editingEntry ? (
                  <span className="ml-2 text-base font-medium opacity-70">
                    · {editingEntry.name}
                  </span>
                ) : editingKey === LOCAL_BOSS_KEY ? (
                  <span className="ml-2 text-base font-medium opacity-70">
                    · Local
                  </span>
                ) : null}
              </h2>
              <p className="mt-0.5 text-xs opacity-70">
                Weekly selected: {editingWeeklyCount} / {WEEKLY_CRYSTAL_LIMIT}
                {editingWeeklyCount >= WEEKLY_CRYSTAL_LIMIT
                  ? " — limit reached"
                  : ""}
                . Monthly bosses (Black Mage) do not use the weekly slot.
              </p>
            </div>
            <button
              type="button"
              className="text-sm text-accent hover:underline"
              onClick={() => {
                setEditingKey(null);
                setQuery("");
                setCategoryFilter([]);
              }}
            >
              Done
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
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
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/40">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-surface-muted/80 text-xs uppercase tracking-wider opacity-70">
                <tr>
                  <th className="px-3 py-2 font-semibold">Clear</th>
                  <th className="px-3 py-2 font-semibold">Boss</th>
                  <th className="px-3 py-2 font-semibold">Difficulty</th>
                  <th className="px-3 py-2 font-semibold">Party</th>
                  <th className="px-3 py-2 font-semibold">Your crystal</th>
                </tr>
              </thead>
              <tbody>
                {filteredBosses.map((boss) => {
                  const sel = editingSelections.find(
                    (s) => s.bossId === boss.id,
                  )!;
                  const personalLine = summarizeIncome(
                    [
                      {
                        ...sel,
                        enabled: true,
                      },
                    ],
                    world,
                  ).lines[0];
                  const atCap =
                    !sel.enabled &&
                    boss.frequency === "weekly" &&
                    editingWeeklyCount >= WEEKLY_CRYSTAL_LIMIT;
                  return (
                    <tr
                      key={boss.id}
                      className="border-t border-border/30 odd:bg-surface/40"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={sel.enabled}
                          disabled={atCap}
                          onChange={(e) =>
                            patchCharacter(editingKey, boss.id, {
                              enabled: e.target.checked,
                            })
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
                            patchCharacter(editingKey, boss.id, {
                              difficulty: e.target.value,
                            })
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
                            patchCharacter(editingKey, boss.id, {
                              partySize: Math.max(
                                1,
                                Math.min(6, Number(e.target.value) || 1),
                              ),
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {personalLine
                          ? formatMesos(personalLine.crystalPersonal)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="space-y-2 rounded-xl border border-border/30 bg-surface/50 p-4 text-xs opacity-70">
        <p className="font-semibold uppercase tracking-wider opacity-80">
          Caps
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <span className="font-semibold">{WEEKLY_CRYSTAL_LIMIT}</span> —
            max weekly boss crystals sold per character (GMS). This page hard-caps
            selections at {WEEKLY_CRYSTAL_LIMIT} and lists those bosses under each
            card.
          </li>
          <li>
            <span className="font-semibold">
              {ACCOUNT_WEEKLY_CRYSTAL_LIMIT}
            </span>{" "}
            — account/world weekly crystal sell limit (all crystal types). MapleHub
            shows roster weekly bosses as{" "}
            <span className="font-semibold">N / {ACCOUNT_WEEKLY_CRYSTAL_LIMIT}</span>
            ; we match that display.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
        {label}
      </p>
      <p
        className={[
          "mt-1 font-display text-xl font-semibold tabular-nums",
          warn ? "text-red-500" : "",
        ].join(" ")}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs opacity-55">{hint}</p> : null}
    </div>
  );
}

function CharacterBossCard({
  entry,
  character,
  loading,
  error,
  primaryMark,
  summary,
  editing,
  onEdit,
  onReset,
  localLabel,
}: {
  entry: RosterEntry | null;
  character: CharacterLookupResult | null;
  loading: boolean;
  error: string | null;
  primaryMark: boolean;
  summary: IncomeSummary;
  editing: boolean;
  onEdit: () => void;
  onReset: () => void;
  localLabel?: string;
}) {
  const name = character?.name ?? entry?.name ?? localLabel ?? "Character";
  const level = character?.level;
  const job = character?.jobName;
  const worldName = character?.worldName;
  const region = (character?.region ?? entry?.region)?.toUpperCase();
  const avatar = character?.characterImgURL;
  const profileHref = entry ? characterProfileHref(entry) : null;
  const listed = summary.weeklyListed;
  const monthly = summary.lines.filter((l) => l.frequency === "monthly");

  return (
    <article className="overflow-hidden rounded-xl border border-border/40 bg-surface/80">
      <div className="flex flex-wrap items-start gap-3 border-b border-border/30 p-3 sm:p-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 object-contain"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-xs font-semibold uppercase opacity-50">
              {loading ? "…" : name.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {profileHref ? (
                <Link
                  href={profileHref}
                  className="font-display text-lg font-bold tracking-tight hover:text-accent"
                >
                  {name}
                </Link>
              ) : (
                <h3 className="font-display text-lg font-bold tracking-tight">
                  {name}
                </h3>
              )}
              {primaryMark ? (
                <span className="text-xs opacity-60" title="Primary">
                  ★
                </span>
              ) : null}
            </div>
            <p className="text-sm opacity-75">
              {level != null ? (
                <>
                  Lv. {level}
                  {job ? ` · ${job}` : ""}
                  {worldName ? ` · ${worldName}` : ""}
                  {region ? ` · ${region}` : ""}
                </>
              ) : loading ? (
                "Loading character…"
              ) : error ? (
                <span className="opacity-70">{error}</span>
              ) : (
                <>
                  {job ?? "Class unknown"}
                  {worldName ? ` · ${worldName}` : ""}
                  {region ? ` · ${region}` : ""}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-55">
            Character total
          </p>
          <p className="font-display text-lg font-semibold tabular-nums text-accent">
            {formatMesos(summary.maxPossibleMesos)}
          </p>
          <p className="text-xs opacity-55">
            {summary.weeklyCrystalsUsed}/{summary.weeklyCrystalLimit} weekly
          </p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className={[
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                editing
                  ? "bg-accent text-white dark:text-zinc-900"
                  : "border border-border/50 hover:bg-accent-soft hover:text-accent",
              ].join(" ")}
            >
              {editing
                ? "Editing…"
                : listed.length === 0
                  ? "Add bosses"
                  : "Configure"}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="text-xs opacity-60 hover:text-accent hover:opacity-100"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {listed.length === 0 && monthly.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm opacity-65">No bosses configured</p>
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-border/50 px-3 py-1.5 text-sm font-semibold hover:bg-accent-soft hover:text-accent"
            >
              Add bosses
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider opacity-55">
                <tr>
                  <th className="pb-2 pr-2 font-semibold">Difficulty</th>
                  <th className="pb-2 pr-2 font-semibold">Boss</th>
                  <th className="pb-2 pr-2 text-center font-semibold">Party</th>
                  <th className="pb-2 text-right font-semibold">Crystal</th>
                </tr>
              </thead>
              <tbody>
                {listed.map((line) => (
                  <tr
                    key={`${line.bossId}-${line.difficulty}`}
                    className="border-t border-border/20"
                  >
                    <td className="py-1.5 pr-2 text-xs font-semibold uppercase opacity-70">
                      {line.difficulty}
                    </td>
                    <td className="py-1.5 pr-2 font-medium">{line.bossName}</td>
                    <td className="py-1.5 pr-2 text-center tabular-nums">
                      {line.partySize}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {formatMesos(line.crystalPersonal)}
                    </td>
                  </tr>
                ))}
                {monthly.map((line) => (
                  <tr
                    key={`${line.bossId}-${line.difficulty}-m`}
                    className="border-t border-border/20 opacity-80"
                  >
                    <td className="py-1.5 pr-2 text-xs font-semibold uppercase opacity-70">
                      {line.difficulty}
                    </td>
                    <td className="py-1.5 pr-2 font-medium">
                      {line.bossName}
                      <span className="ml-1.5 text-xs opacity-55">monthly</span>
                    </td>
                    <td className="py-1.5 pr-2 text-center tabular-nums">
                      {line.partySize}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {formatMesos(line.crystalPersonal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/40">
                  <td
                    colSpan={3}
                    className="pt-2 text-xs font-semibold uppercase tracking-wider opacity-55"
                  >
                    Character total
                  </td>
                  <td className="pt-2 text-right font-semibold tabular-nums text-accent">
                    {formatMesos(
                      summary.maxPossibleMesos + summary.monthlyMesos,
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </article>
  );
}
