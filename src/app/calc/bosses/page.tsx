"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACCOUNT_WEEKLY_CRYSTAL_LIMIT,
  BOSS_CRYSTALS,
  WEEKLY_CRYSTAL_LIMIT,
  bossIconUrl,
  clampPartySize,
  countEnabledWeekly,
  defaultSelections,
  formatBossLabel,
  formatMesos,
  formatMesosCompact,
  getCharacterBossState,
  maybeMigrateLocalToPrimary,
  readBossIncomeStore,
  summarizeIncome,
  summarizeRosterIncome,
  upsertCharacterState,
  worldTypeFromCharacter,
  writeBossIncomeStore,
  LOCAL_BOSS_KEY,
  type BossClearSelection,
  type BossIncomeStore,
  type IncomeLine,
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

  const displayKeys = useMemo(() => {
    if (roster.length > 0) return roster.map((e) => entryKey(e));
    return [LOCAL_BOSS_KEY];
  }, [roster]);

  const worldByKey = useMemo(() => {
    const map: Record<string, WorldType> = {};
    for (const key of displayKeys) {
      if (key === LOCAL_BOSS_KEY) {
        map[key] = "heroic";
        continue;
      }
      const slot = slots[key];
      const character =
        slot?.status === "ready" ? slot.character : null;
      map[key] = worldTypeFromCharacter(character);
    }
    return map;
  }, [displayKeys, slots]);

  const rosterSummary = useMemo(() => {
    const bySelections: Record<string, BossClearSelection[]> = {};
    for (const key of displayKeys) {
      bySelections[key] = getCharacterBossState(store, key).selections;
    }
    return summarizeRosterIncome(bySelections, worldByKey, displayKeys);
  }, [displayKeys, store, worldByKey]);

  const worldForKey = (key: string): WorldType =>
    worldByKey[key] ?? "heroic";

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

      const selections = current.selections.map((s) => {
        if (s.bossId !== bossId) return s;
        const next = { ...s, ...partial };
        if (partial.partySize != null) {
          next.partySize = clampPartySize(bossId, partial.partySize);
        }
        if (partial.enabled === false) {
          next.cleared = false;
        }
        return next;
      });
      return upsertCharacterState(prev, key, { selections });
    });
    if (!applied) {
      setCapToast(
        `Weekly boss limit reached (${WEEKLY_CRYSTAL_LIMIT}). Remove another boss first.`,
      );
    }
    return applied;
  };

  const setListedCleared = (key: string, cleared: boolean) => {
    const world = worldForKey(key);
    setStore((prev) => {
      const current = getCharacterBossState(prev, key);
      const summary = summarizeIncome(current.selections, world);
      const listedIds = new Set(
        [...summary.weeklyListed, ...summary.lines.filter((l) => l.frequency === "monthly")].map(
          (l) => l.bossId,
        ),
      );
      const selections = current.selections.map((s) =>
        listedIds.has(s.bossId) && s.enabled ? { ...s, cleared } : s,
      );
      return upsertCharacterState(prev, key, { selections });
    });
  };

  const resetClears = (key: string) => {
    setStore((prev) => {
      const current = getCharacterBossState(prev, key);
      const selections = current.selections.map((s) => ({
        ...s,
        cleared: false,
      }));
      return upsertCharacterState(prev, key, { selections });
    });
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
          character, account sell cap {ACCOUNT_WEEKLY_CRYSTAL_LIMIT}. Crystal
          prices follow each character&apos;s world (Heroic 5× / Interactive);
          unknown world defaults to Heroic.
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

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="rounded-xl border border-border/40 bg-surface/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
            Roster
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              href="/roster"
              className="text-sm font-semibold text-accent hover:underline"
            >
              {hasRoster ? "Manage roster" : "Add to roster"}
            </Link>
            <Link
              href="/calc/boss-schedule"
              className="ml-auto text-sm font-semibold text-accent hover:underline"
            >
              Boss Schedule
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {hasRoster
            ? roster.map((entry) => {
                const key = entryKey(entry);
                const slot = slots[key];
                const character =
                  slot?.status === "ready" ? slot.character : null;
                const charState = getCharacterBossState(store, key);
                const charWorld = worldForKey(key);
                const summary =
                  rosterSummary.characters.find((c) => c.key === key)
                    ?.summary ??
                  summarizeIncome(defaultSelections(), charWorld);
                return (
                  <CharacterBossCard
                    key={key}
                    entry={entry}
                    character={character}
                    loading={slot?.status === "loading"}
                    error={slot?.status === "error" ? slot.error : null}
                    primaryMark={isPrimary(entry, primary)}
                    priceWorld={charWorld}
                    selections={charState.selections}
                    summary={summary}
                    brokenIcons={brokenIcons}
                    onBrokenIcon={(bossId) =>
                      setBrokenIcons((prev) => ({ ...prev, [bossId]: true }))
                    }
                    onAddBosses={() => setModalKey(key)}
                    onResetClears={() => resetClears(key)}
                    onToggleCleared={(bossId) => {
                      const sel = charState.selections.find(
                        (s) => s.bossId === bossId,
                      );
                      if (!sel?.enabled) return;
                      patchCharacter(key, bossId, {
                        cleared: !sel.cleared,
                      });
                    }}
                    onCheckAll={(cleared) => setListedCleared(key, cleared)}
                  />
                );
              })
            : (() => {
                const charState = getCharacterBossState(store, LOCAL_BOSS_KEY);
                const summary =
                  rosterSummary.characters.find((c) => c.key === LOCAL_BOSS_KEY)
                    ?.summary ??
                  summarizeIncome(defaultSelections(), "heroic");
                return (
                  <CharacterBossCard
                    key={LOCAL_BOSS_KEY}
                    entry={null}
                    character={null}
                    loading={false}
                    error={null}
                    primaryMark={false}
                    priceWorld="heroic"
                    selections={charState.selections}
                    summary={summary}
                    localLabel="Local"
                    brokenIcons={brokenIcons}
                    onBrokenIcon={(bossId) =>
                      setBrokenIcons((prev) => ({ ...prev, [bossId]: true }))
                    }
                    onAddBosses={() => setModalKey(LOCAL_BOSS_KEY)}
                    onResetClears={() => resetClears(LOCAL_BOSS_KEY)}
                    onToggleCleared={(bossId) => {
                      const sel = charState.selections.find(
                        (s) => s.bossId === bossId,
                      );
                      if (!sel?.enabled) return;
                      patchCharacter(LOCAL_BOSS_KEY, bossId, {
                        cleared: !sel.cleared,
                      });
                    }}
                    onCheckAll={(cleared) =>
                      setListedCleared(LOCAL_BOSS_KEY, cleared)
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
          world={worldForKey(modalKey)}
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

function listedRows(summary: IncomeSummary): IncomeLine[] {
  const monthly = summary.lines.filter((l) => l.frequency === "monthly");
  return [...summary.weeklyListed, ...monthly];
}

function CharacterBossCard({
  entry,
  character,
  loading,
  error,
  primaryMark,
  priceWorld,
  selections,
  summary,
  onAddBosses,
  onResetClears,
  onToggleCleared,
  onCheckAll,
  brokenIcons,
  onBrokenIcon,
  localLabel,
}: {
  entry: RosterEntry | null;
  character: CharacterLookupResult | null;
  loading: boolean;
  error: string | null;
  primaryMark: boolean;
  priceWorld: WorldType;
  selections: BossClearSelection[];
  summary: IncomeSummary;
  onAddBosses: () => void;
  onResetClears: () => void;
  onToggleCleared: (bossId: string) => void;
  onCheckAll: (cleared: boolean) => void;
  brokenIcons: Record<string, true>;
  onBrokenIcon: (bossId: string) => void;
  localLabel?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const name = character?.name ?? entry?.name ?? localLabel ?? "Character";
  const level = character?.level;
  const job = character?.jobName;
  const worldName = character?.worldName;
  const avatar = character?.characterImgURL;
  const expPct = character?.expPercent;
  const profileHref = entry ? characterProfileHref(entry) : null;
  const rows = listedRows(summary);
  const hasBosses = rows.length > 0;

  const clearedById = new Map<string, boolean>();
  for (const s of selections) {
    clearedById.set(s.bossId, !!s.cleared && s.enabled);
  }

  const clearedCount = rows.filter((r) => clearedById.get(r.bossId)).length;
  const allCleared = hasBosses && clearedCount === rows.length;
  const clearedValue = rows.reduce(
    (sum, line) =>
      clearedById.get(line.bossId) ? sum + line.crystalPersonal : sum,
    0,
  );
  const totalValue = rows.reduce((sum, line) => sum + line.crystalPersonal, 0);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border/40 bg-surface/80">
      <div className="flex items-start gap-2.5 border-b border-border/30 p-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 object-contain"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface-muted text-[10px] font-semibold uppercase opacity-50">
            {loading ? "…" : name.slice(0, 2)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {profileHref ? (
                <Link
                  href={profileHref}
                  className="truncate text-sm font-semibold tracking-tight text-accent hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <h3 className="truncate text-sm font-semibold tracking-tight">
                  {name}
                </h3>
              )}
              {primaryMark ? (
                <span className="text-[10px] opacity-60" title="Primary">
                  ★
                </span>
              ) : null}
              {hasBosses ? (
                <span
                  className={[
                    "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white dark:text-zinc-900",
                    clearedCount === rows.length
                      ? "bg-emerald-600 dark:bg-emerald-400"
                      : "bg-accent",
                  ].join(" ")}
                  title="Cleared / configured this week"
                >
                  {clearedCount}/{rows.length}
                </span>
              ) : null}
            </div>

            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                aria-label="More actions"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border/50 text-sm opacity-70 transition-colors hover:bg-surface-muted hover:opacity-100"
              >
                ⋮
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-1 min-w-[9.5rem] overflow-hidden rounded-lg border border-border/50 bg-surface py-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent-soft hover:text-accent"
                    onClick={() => {
                      setMenuOpen(false);
                      onAddBosses();
                    }}
                  >
                    Edit bosses
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent-soft hover:text-accent"
                    onClick={() => {
                      setMenuOpen(false);
                      onResetClears();
                    }}
                  >
                    Reset clears
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <p className="mt-0.5 text-xs opacity-70">
            {level != null ? (
              <>
                Lv. {level}
                {expPct != null ? ` (${expPct}%)` : ""}
              </>
            ) : loading ? (
              "Loading character…"
            ) : error ? (
              <span className="opacity-70">{error}</span>
            ) : (
              "Level unknown"
            )}
          </p>
          {job ? <p className="text-xs opacity-70">{job}</p> : null}
          <p className="text-[11px] opacity-55">
            {worldName ? `${worldName} · ` : ""}
            {priceWorld === "heroic" ? "Heroic prices" : "Interactive prices"}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        {!hasBosses ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <p className="text-sm opacity-65">No bosses configured</p>
            <button
              type="button"
              onClick={onAddBosses}
              className="cursor-pointer rounded-lg border border-border/50 bg-background px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors hover:border-accent/50 hover:bg-accent-soft hover:text-accent"
            >
              Add bosses
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left text-sm leading-tight">
                <thead className="text-[11px] uppercase tracking-wider opacity-55">
                  <tr>
                    <th className="w-6 p-0.5 font-semibold">
                      <span className="sr-only">Cleared</span>
                    </th>
                    <th className="p-0.5 font-semibold">Boss</th>
                    <th className="w-10 p-0.5 text-center font-semibold md:w-12">
                      Party
                    </th>
                    <th className="w-24 p-0.5 text-right font-semibold md:w-28">
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
                    const cleared = !!clearedById.get(line.bossId);
                    return (
                      <tr
                        key={`${line.bossId}-${line.difficulty}-${line.frequency}`}
                        className="h-7 cursor-pointer border-t border-border/15 transition-colors hover:bg-surface-muted/40"
                        onClick={() => onToggleCleared(line.bossId)}
                      >
                        <td className="p-0">
                          <div
                            className="flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={cleared}
                              onChange={() => onToggleCleared(line.bossId)}
                              aria-label={`Mark ${label} cleared`}
                              className="h-3.5 w-3.5 accent-[var(--accent)]"
                            />
                          </div>
                        </td>
                        <td className="p-0.5 font-medium text-accent">
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
                                <span className="ml-1 text-[10px] font-normal opacity-55">
                                  monthly
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </td>
                        <td className="p-0.5 text-center tabular-nums">
                          {line.partySize}
                        </td>
                        <td className="p-0.5 text-right font-mono text-xs tabular-nums md:text-sm">
                          {formatMesos(line.crystalPersonal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/30 pt-2.5">
              <button
                type="button"
                onClick={() => onCheckAll(!allCleared)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-background px-2 py-1 text-xs font-semibold opacity-90 transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
              >
                <input
                  type="checkbox"
                  checked={allCleared}
                  readOnly
                  tabIndex={-1}
                  className="pointer-events-none h-3.5 w-3.5 accent-[var(--accent)]"
                  aria-hidden
                />
                {allCleared ? "Uncheck all" : "Check all"}
              </button>
              <span
                className={[
                  "font-mono text-sm tabular-nums",
                  clearedValue === totalValue && totalValue > 0
                    ? "text-emerald-500"
                    : "opacity-70",
                ].join(" ")}
              >
                {formatMesosCompact(clearedValue)} /{" "}
                {formatMesosCompact(totalValue)}
              </span>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
