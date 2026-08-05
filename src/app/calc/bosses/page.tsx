"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ACCOUNT_WEEKLY_CRYSTAL_LIMIT,
  BOSS_CRYSTALS,
  WEEKLY_CRYSTAL_LIMIT,
  bossIconUrl,
  countEnabledWeekly,
  defaultSelections,
  formatBossLabel,
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
import { AddBossesModal } from "./add-bosses-modal";

const inputClass =
  "rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent";

export default function BossesIncomePage() {
  const { hydrated, roster, primary, slots } = useRoster();
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<BossIncomeStore>(() => ({
    version: 2,
    world: "heroic",
    activeKey: null,
    byCharacter: {},
  }));
  const [modalKey, setModalKey] = useState<string | null>(null);
  const [capToast, setCapToast] = useState<string | null>(null);
  const [brokenIcons, setBrokenIcons] = useState<Record<string, true>>({});

  useEffect(() => {
    if (!hydrated) return;
    let next = readBossIncomeStore();
    const primaryKey = primary ? entryKey(primary) : null;
    next = maybeMigrateLocalToPrimary(next, primaryKey);

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
  ): boolean => {
    let applied = true;
    setStore((prev) => {
      const current = getCharacterBossState(prev, key);

      if (partial.enabled === true) {
        const boss = BOSS_CRYSTALS.find((b) => b.id === bossId);
        if (boss?.frequency === "weekly") {
          const already = countEnabledWeekly(current.selections);
          const wasEnabled = current.selections.some(
            (s) => s.bossId === bossId && s.enabled,
          );
          if (!wasEnabled && already >= WEEKLY_CRYSTAL_LIMIT) {
            applied = false;
            return prev;
          }
        }
      }

      const selections = current.selections.map((s) =>
        s.bossId === bossId ? { ...s, ...partial } : s,
      );
      return upsertCharacterState(prev, key, { selections });
    });
    if (!applied) {
      setCapToast(
        `Weekly boss limit reached (${WEEKLY_CRYSTAL_LIMIT}). Remove another boss first.`,
      );
    }
    return applied;
  };

  const resetCharacter = (key: string) => {
    setStore((prev) =>
      upsertCharacterState(prev, key, {
        selections: defaultSelections(),
      }),
    );
  };

  const hasRoster = roster.length > 0;
  const modalEntry =
    modalKey && modalKey !== LOCAL_BOSS_KEY
      ? (roster.find((e) => entryKey(e) === modalKey) ?? null)
      : null;
  const modalSelections = modalKey
    ? getCharacterBossState(store, modalKey).selections
    : null;
  const modalWeeklyCount = modalSelections
    ? countEnabledWeekly(modalSelections)
    : 0;
  const modalLabel =
    modalEntry?.name ??
    (modalKey === LOCAL_BOSS_KEY ? "Local" : "Character");

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
          character, account sell cap {ACCOUNT_WEEKLY_CRYSTAL_LIMIT}, Heroic
          (5×) prices by default.
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
                    brokenIcons={brokenIcons}
                    onBrokenIcon={(bossId) =>
                      setBrokenIcons((prev) => ({ ...prev, [bossId]: true }))
                    }
                    onAddBosses={() => setModalKey(key)}
                    onReset={() => resetCharacter(key)}
                    onPatch={(bossId, partial) =>
                      patchCharacter(key, bossId, partial)
                    }
                    onRemove={(bossId) =>
                      patchCharacter(key, bossId, { enabled: false })
                    }
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
                    brokenIcons={brokenIcons}
                    onBrokenIcon={(bossId) =>
                      setBrokenIcons((prev) => ({ ...prev, [bossId]: true }))
                    }
                    onAddBosses={() => setModalKey(LOCAL_BOSS_KEY)}
                    onReset={() => resetCharacter(LOCAL_BOSS_KEY)}
                    onPatch={(bossId, partial) =>
                      patchCharacter(LOCAL_BOSS_KEY, bossId, partial)
                    }
                    onRemove={(bossId) =>
                      patchCharacter(LOCAL_BOSS_KEY, bossId, {
                        enabled: false,
                      })
                    }
                  />
                );
              })()}
        </div>
      </section>

      {modalKey && modalSelections ? (
        <AddBossesModal
          open
          characterLabel={modalLabel}
          selections={modalSelections}
          world={world}
          weeklyCount={modalWeeklyCount}
          onClose={() => setModalKey(null)}
          onAdd={({ bossId, difficulty, partySize }) =>
            patchCharacter(modalKey, bossId, {
              enabled: true,
              difficulty,
              partySize,
            })
          }
          onRemove={(bossId) =>
            patchCharacter(modalKey, bossId, { enabled: false })
          }
        />
      ) : null}

      <section className="space-y-2 rounded-xl border border-border/30 bg-surface/50 p-4 text-xs opacity-70">
        <p className="font-semibold uppercase tracking-wider opacity-80">
          Caps
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <span className="font-semibold">{WEEKLY_CRYSTAL_LIMIT}</span> —
            max weekly boss crystals sold per character (GMS). This page
            hard-caps selections at {WEEKLY_CRYSTAL_LIMIT} and lists those
            bosses under each card.
          </li>
          <li>
            <span className="font-semibold">
              {ACCOUNT_WEEKLY_CRYSTAL_LIMIT}
            </span>{" "}
            — account/world weekly crystal sell limit (all crystal types).
            MapleHub shows roster weekly bosses as{" "}
            <span className="font-semibold">
              N / {ACCOUNT_WEEKLY_CRYSTAL_LIMIT}
            </span>
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
  onAddBosses,
  onReset,
  onPatch,
  onRemove,
  brokenIcons,
  onBrokenIcon,
  localLabel,
}: {
  entry: RosterEntry | null;
  character: CharacterLookupResult | null;
  loading: boolean;
  error: string | null;
  primaryMark: boolean;
  summary: IncomeSummary;
  onAddBosses: () => void;
  onReset: () => void;
  onPatch: (bossId: string, partial: Partial<BossClearSelection>) => void;
  onRemove: (bossId: string) => void;
  brokenIcons: Record<string, true>;
  onBrokenIcon: (bossId: string) => void;
  localLabel?: string;
}) {
  const name = character?.name ?? entry?.name ?? localLabel ?? "Character";
  const level = character?.level;
  const job = character?.jobName;
  const worldName = character?.worldName;
  const region = (character?.region ?? entry?.region)?.toUpperCase();
  const avatar = character?.characterImgURL;
  const profileHref = entry ? characterProfileHref(entry) : null;
  // MapleHub: personal crystal value desc (already applied in summarizeIncome).
  const listed = summary.weeklyListed;
  const monthly = summary.lines.filter((l) => l.frequency === "monthly");
  const rows = [...listed, ...monthly];
  const hasBosses = rows.length > 0;

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
          <button
            type="button"
            onClick={onReset}
            className="mt-1 text-xs opacity-60 hover:text-accent hover:opacity-100"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {!hasBosses ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm opacity-65">No bosses configured</p>
            <button
              type="button"
              onClick={onAddBosses}
              className="rounded-lg border border-border/50 px-3 py-1.5 text-sm font-semibold hover:bg-accent-soft hover:text-accent"
            >
              Add bosses
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              {/* Desktop: MapleHub columns Boss | Party | Value */}
              <table className="hidden w-full min-w-[28rem] text-left text-sm sm:table">
                <thead className="text-xs uppercase tracking-wider opacity-55">
                  <tr>
                    <th className="w-6 pb-2 pr-1 font-semibold">
                      <span className="sr-only">Remove</span>
                    </th>
                    <th className="pb-2 pr-2 font-semibold">Boss</th>
                    <th className="w-10 pb-2 pr-2 text-center font-semibold md:w-14">
                      Party
                    </th>
                    <th className="w-24 pb-2 text-right font-semibold md:w-28">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((line) => {
                    const boss = BOSS_CRYSTALS.find((b) => b.id === line.bossId);
                    const icon = boss ? bossIconUrl(boss) : null;
                    const showIcon = icon && !brokenIcons[line.bossId];
                    const label = formatBossLabel(
                      line.difficulty,
                      line.bossName,
                    );
                    return (
                      <tr
                        key={`${line.bossId}-${line.difficulty}-${line.frequency}`}
                        className="border-t border-border/20"
                      >
                        <td className="py-1 pr-1">
                          <button
                            type="button"
                            onClick={() => onRemove(line.bossId)}
                            className="rounded px-1 text-xs opacity-50 hover:text-red-500 hover:opacity-100"
                            aria-label={`Remove ${label}`}
                          >
                            ×
                          </button>
                        </td>
                        <td className="py-1 pr-2 font-medium text-accent">
                          <div className="flex min-w-0 items-center gap-1">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-muted/60">
                              {showIcon ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={icon}
                                  alt=""
                                  width={24}
                                  height={24}
                                  className="h-6 w-6 object-contain"
                                  style={{ imageRendering: "pixelated" }}
                                  onError={() => onBrokenIcon(line.bossId)}
                                />
                              ) : (
                                <span className="text-[9px] font-semibold opacity-50">
                                  {line.bossName.slice(0, 2)}
                                </span>
                              )}
                            </div>
                            <span className="truncate whitespace-nowrap text-sm">
                              {label}
                              {line.frequency === "monthly" ? (
                                <span className="ml-1.5 text-xs font-normal opacity-55">
                                  monthly
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </td>
                        <td className="py-1 pr-2 text-center">
                          <input
                            type="number"
                            min={1}
                            max={6}
                            className={`${inputClass} h-6 w-8 text-center text-xs`}
                            value={line.partySize}
                            onChange={(e) =>
                              onPatch(line.bossId, {
                                partySize: Math.max(
                                  1,
                                  Math.min(6, Number(e.target.value) || 1),
                                ),
                              })
                            }
                          />
                        </td>
                        <td className="py-1 text-right font-mono text-sm tabular-nums">
                          {formatMesos(line.crystalPersonal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/40">
                    <td />
                    <td
                      colSpan={2}
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

              {/* Mobile: MapleHub-style stacked rows */}
              <div className="space-y-2 sm:hidden">
                {rows.map((line) => {
                  const boss = BOSS_CRYSTALS.find((b) => b.id === line.bossId);
                  const icon = boss ? bossIconUrl(boss) : null;
                  const showIcon = icon && !brokenIcons[line.bossId];
                  const label = formatBossLabel(
                    line.difficulty,
                    line.bossName,
                  );
                  return (
                    <div
                      key={`m-${line.bossId}-${line.difficulty}-${line.frequency}`}
                      className="flex items-center justify-between gap-2 rounded border border-border/30 p-2"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onRemove(line.bossId)}
                          className="shrink-0 rounded px-1 text-xs opacity-50 hover:text-red-500 hover:opacity-100"
                          aria-label={`Remove ${label}`}
                        >
                          ×
                        </button>
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-muted/60">
                          {showIcon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={icon}
                              alt=""
                              width={24}
                              height={24}
                              className="h-6 w-6 object-contain"
                              style={{ imageRendering: "pixelated" }}
                              onError={() => onBrokenIcon(line.bossId)}
                            />
                          ) : (
                            <span className="text-[9px] font-semibold opacity-50">
                              {line.bossName.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <span className="truncate text-sm font-medium text-accent">
                          {label}
                        </span>
                      </div>
                      <div className="shrink-0 text-right text-xs">
                        <div className="flex flex-col items-end gap-1">
                          <span className="opacity-55">Party:</span>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            className={`${inputClass} h-6 w-8 text-center text-xs`}
                            value={line.partySize}
                            onChange={(e) =>
                              onPatch(line.bossId, {
                                partySize: Math.max(
                                  1,
                                  Math.min(6, Number(e.target.value) || 1),
                                ),
                              })
                            }
                          />
                          <span className="font-mono tabular-nums">
                            {formatMesos(line.crystalPersonal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                  <span className="font-semibold uppercase tracking-wider opacity-55">
                    Character total
                  </span>
                  <span className="font-semibold tabular-nums text-accent">
                    {formatMesos(
                      summary.maxPossibleMesos + summary.monthlyMesos,
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onAddBosses}
                className="rounded-lg border border-border/50 px-3 py-1.5 text-sm font-semibold hover:bg-accent-soft hover:text-accent"
              >
                Add bosses
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
