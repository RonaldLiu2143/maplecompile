"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BOSS_CRYSTALS,
  DEFAULT_MAX_PARTY,
  WEEKLY_CRYSTAL_LIMIT,
  bossIconUrl,
  bossMaxParty,
  clampPartySize,
  compareBossesHardestFirst,
  formatMesos,
  personalCrystal,
  type BossClearSelection,
  type BossEntry,
  type BossFrequency,
  type WorldType,
} from "@/lib/bosses";

type Props = {
  open: boolean;
  characterLabel: string;
  selections: BossClearSelection[];
  world: WorldType;
  weeklyCount: number;
  onClose: () => void;
  onAdd: (args: {
    bossId: string;
    difficulty: string;
    partySize: number;
  }) => boolean;
  onRemove: (bossId: string) => void;
};

function defaultDifficulty(boss: BossEntry, sel?: BossClearSelection): string {
  if (sel?.enabled && sel.difficulty) return sel.difficulty;
  return boss.difficulties[boss.difficulties.length - 1]?.name ?? "";
}

function defaultParty(boss: BossEntry, sel?: BossClearSelection): number {
  return sel?.enabled ? clampPartySize(boss.id, sel.partySize || 1) : 1;
}

export function AddBossesModal({
  open,
  characterLabel,
  selections,
  world,
  weeklyCount,
  onClose,
  onAdd,
  onRemove,
}: Props) {
  const [frequency, setFrequency] = useState<BossFrequency>("weekly");
  const [query, setQuery] = useState("");
  const [brokenIcons, setBrokenIcons] = useState<Record<string, true>>({});
  /** Local draft difficulty / party per boss while browsing the catalog. */
  const [draftDiff, setDraftDiff] = useState<Record<string, string>>({});
  const [draftParty, setDraftParty] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    setFrequency("weekly");
    setQuery("");
    const nextDiff: Record<string, string> = {};
    const nextParty: Record<string, number> = {};
    for (const boss of BOSS_CRYSTALS) {
      const sel = selections.find((s) => s.bossId === boss.id);
      nextDiff[boss.id] = defaultDifficulty(boss, sel);
      nextParty[boss.id] = defaultParty(boss, sel);
    }
    setDraftDiff(nextDiff);
    setDraftParty(nextParty);
    // Seed drafts once when the modal opens (not on every selection toggle).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const bosses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BOSS_CRYSTALS.filter((boss) => {
      if (boss.frequency !== frequency) return false;
      if (q && !boss.name.toLowerCase().includes(q)) return false;
      return true;
    }).sort(compareBossesHardestFirst);
  }, [frequency, query]);

  if (!open) return null;

  const atWeeklyCap = weeklyCount >= WEEKLY_CRYSTAL_LIMIT;

  const setParty = (boss: BossEntry, next: number) => {
    const partySize = clampPartySize(boss.id, next);
    setDraftParty((prev) => ({ ...prev, [boss.id]: partySize }));
    const sel = selections.find((s) => s.bossId === boss.id);
    if (sel?.enabled) {
      onAdd({
        bossId: boss.id,
        difficulty: draftDiff[boss.id] ?? sel.difficulty,
        partySize,
      });
    }
  };

  const setDiff = (boss: BossEntry, difficulty: string) => {
    setDraftDiff((prev) => ({ ...prev, [boss.id]: difficulty }));
    const sel = selections.find((s) => s.bossId === boss.id);
    if (sel?.enabled) {
      onAdd({
        bossId: boss.id,
        difficulty,
        partySize: draftParty[boss.id] ?? sel.partySize,
      });
    }
  };

  const toggleBoss = (boss: BossEntry) => {
    const sel = selections.find((s) => s.bossId === boss.id);
    if (sel?.enabled) {
      onRemove(boss.id);
      return;
    }
    const difficulty = draftDiff[boss.id] ?? defaultDifficulty(boss, sel);
    const partySize = clampPartySize(
      boss.id,
      draftParty[boss.id] ?? 1,
    );
    onAdd({ bossId: boss.id, difficulty, partySize });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-bosses-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border/60 bg-surface shadow-xl">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-border/40 px-4 py-3 sm:px-5">
          <div>
            <h2
              id="add-bosses-title"
              className="font-display text-xl font-bold tracking-tight"
            >
              Edit bosses
            </h2>
            <p className="mt-0.5 text-xs opacity-65">
              {characterLabel} · Weekly {weeklyCount}/{WEEKLY_CRYSTAL_LIMIT}
              {atWeeklyCap ? " — limit reached" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1 text-sm opacity-70 hover:bg-surface-muted hover:opacity-100"
          >
            Close
          </button>
        </header>

        <div className="shrink-0 space-y-2 border-b border-border/30 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wider opacity-60">
              Search
              <input
                className="rounded border border-border bg-background px-2 py-1.5 text-sm font-normal normal-case tracking-normal opacity-100 outline-none focus:border-accent"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Boss name…"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["weekly", "Weekly"],
                  ["monthly", "Monthly"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFrequency(id)}
                  className={[
                    "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    frequency === id
                      ? "bg-accent-soft text-accent"
                      : "border border-border/40 opacity-65 hover:opacity-100",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {bosses.length === 0 ? (
            <p className="py-8 text-center text-sm opacity-60">
              No bosses match.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3">
              {bosses.map((boss) => {
                const sel = selections.find((s) => s.bossId === boss.id);
                const enabled = !!sel?.enabled;
                const difficulty =
                  draftDiff[boss.id] ?? defaultDifficulty(boss, sel);
                const partyMax = bossMaxParty(boss);
                const partySize = clampPartySize(
                  boss.id,
                  draftParty[boss.id] ?? defaultParty(boss, sel),
                );
                const diff = boss.difficulties.find((d) => d.name === difficulty);
                const est = diff
                  ? personalCrystal(diff.crystal, partySize, world)
                  : 0;
                const icon = bossIconUrl(boss);
                const showIcon = icon && !brokenIcons[boss.id];
                const blockedWeekly =
                  !enabled &&
                  boss.frequency === "weekly" &&
                  atWeeklyCap;

                return (
                  <div
                    key={boss.id}
                    className={[
                      "relative flex min-h-[200px] flex-col rounded-lg border-2 transition-all",
                      enabled
                        ? "border-accent bg-accent-soft/30 shadow-sm"
                        : "border-border/50 hover:border-accent/40",
                      blockedWeekly ? "opacity-55" : "",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      aria-label={enabled ? `Remove ${boss.name}` : `Add ${boss.name}`}
                      disabled={blockedWeekly}
                      onClick={() => toggleBoss(boss)}
                      className="absolute top-2 right-2 z-10 rounded-full p-1 transition-colors disabled:cursor-not-allowed"
                    >
                      {enabled ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white dark:text-zinc-900">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-border/60 bg-background" />
                      )}
                    </button>

                    <div
                      className="flex flex-1 cursor-pointer flex-col p-3 sm:p-4"
                      onClick={() => {
                        if (!blockedWeekly) toggleBoss(boss);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (!blockedWeekly) toggleBoss(boss);
                        }
                      }}
                      role="button"
                      tabIndex={blockedWeekly ? -1 : 0}
                    >
                      <div className="mb-2 flex shrink-0 justify-center">
                        <div className="rounded-lg border border-border/40 bg-background/70 p-1.5 sm:p-2">
                          {showIcon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={icon}
                              alt=""
                              width={24}
                              height={24}
                              className="h-5 w-5 object-contain sm:h-6 sm:w-6"
                              style={{ imageRendering: "pixelated" }}
                              onError={() =>
                                setBrokenIcons((prev) => ({
                                  ...prev,
                                  [boss.id]: true,
                                }))
                              }
                            />
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center text-[9px] font-semibold opacity-50 sm:h-6 sm:w-6">
                              {boss.name.slice(0, 2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="mb-2 truncate text-center text-xs font-semibold text-accent sm:text-sm">
                        {boss.name}
                      </h3>

                      <div
                        className="mb-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <select
                          aria-label={`Select ${boss.name} difficulty`}
                          className="h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none focus:border-accent"
                          value={difficulty}
                          onChange={(e) => setDiff(boss, e.target.value)}
                        >
                          {boss.difficulties.map((d) => (
                            <option key={d.name} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div
                        className="mb-2 flex shrink-0 items-center justify-between"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs opacity-60">
                          Party
                          {partyMax < DEFAULT_MAX_PARTY
                            ? ` · max ${partyMax}`
                            : ""}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded border border-border/50 text-xs hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => setParty(boss, partySize - 1)}
                            disabled={partySize <= 1}
                            aria-label="Decrease party size"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-xs tabular-nums">
                            {partySize}
                          </span>
                          <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded border border-border/50 text-xs hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => setParty(boss, partySize + 1)}
                            disabled={partySize >= partyMax}
                            aria-label={`Increase party size (max ${partyMax})`}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="mt-auto flex flex-1 flex-col justify-end text-center">
                        <p className="text-xs opacity-55">Est. Mesos</p>
                        <p className="text-xs font-semibold tabular-nums text-accent sm:text-sm">
                          {formatMesos(est)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-border/40 px-4 py-3 sm:px-5">
          <p className="text-xs opacity-60">
            Hardest first (max crystal). Toggle a card to add or remove; change
            difficulty and party on the card.
          </p>
        </footer>
      </div>
    </div>
  );
}
