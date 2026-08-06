"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BOSS_CRYSTALS,
  DEFAULT_MAX_PARTY,
  WEEKLY_CRYSTAL_LIMIT,
  applyPresetToSelections,
  bossIconUrl,
  bossMaxParty,
  clampPartySize,
  compareBossesHardestFirst,
  deleteBossPreset,
  formatMesos,
  loadBossPresets,
  personalCrystal,
  presetFromSelections,
  saveBossPresets,
  type BossClearSelection,
  type BossEntry,
  type BossFrequency,
  type BossPreset,
  type WorldType,
} from "@/lib/bosses";

type CharacterOption = {
  key: string;
  label: string;
};

type Props = {
  open: boolean;
  characterLabel: string;
  selections: BossClearSelection[];
  world: WorldType;
  weeklyCount: number;
  /** Roster (+ local) targets that presets can be applied to. */
  applyTargets: CharacterOption[];
  currentKey: string;
  onClose: () => void;
  onAdd: (args: {
    bossId: string;
    difficulty: string;
    partySize: number;
  }) => boolean;
  onRemove: (bossId: string) => void;
  /** Replace one or more characters' selection lists (used by presets). */
  onReplaceSelections: (
    updates: Array<{ key: string; selections: BossClearSelection[] }>,
  ) => void;
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
  applyTargets,
  currentKey,
  onClose,
  onAdd,
  onRemove,
  onReplaceSelections,
}: Props) {
  const [frequency, setFrequency] = useState<BossFrequency>("weekly");
  const [query, setQuery] = useState("");
  const [brokenIcons, setBrokenIcons] = useState<Record<string, true>>({});
  const [draftDiff, setDraftDiff] = useState<Record<string, string>>({});
  const [draftParty, setDraftParty] = useState<Record<string, number>>({});
  const [presets, setPresets] = useState<BossPreset[]>([]);
  const [presetId, setPresetId] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyKeys, setApplyKeys] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFrequency("weekly");
    setQuery("");
    setApplyOpen(false);
    setToast(null);
    setPresets(loadBossPresets());
    const nextDiff: Record<string, string> = {};
    const nextParty: Record<string, number> = {};
    for (const boss of BOSS_CRYSTALS) {
      const sel = selections.find((s) => s.bossId === boss.id);
      nextDiff[boss.id] = defaultDifficulty(boss, sel);
      nextParty[boss.id] = defaultParty(boss, sel);
    }
    setDraftDiff(nextDiff);
    setDraftParty(nextParty);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once on open
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (applyOpen) setApplyOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, applyOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const bosses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BOSS_CRYSTALS.filter((boss) => {
      if (boss.frequency !== frequency) return false;
      if (q && !boss.name.toLowerCase().includes(q)) return false;
      return true;
    }).sort(compareBossesHardestFirst);
  }, [frequency, query]);

  const selectedPreset = presets.find((p) => p.id === presetId) ?? null;
  const enabledCount = selections.filter((s) => s.enabled).length;

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
        partySize: draftParty[boss.id] ?? 1,
      });
    }
  };

  const toggleBoss = (boss: BossEntry) => {
    const sel = selections.find((s) => s.bossId === boss.id);
    if (sel?.enabled) {
      onRemove(boss.id);
      return;
    }
    const difficulty =
      draftDiff[boss.id] ??
      boss.difficulties[boss.difficulties.length - 1]?.name ??
      "";
    const partySize = clampPartySize(boss.id, draftParty[boss.id] ?? 1);
    setDraftDiff((prev) => ({ ...prev, [boss.id]: difficulty }));
    setDraftParty((prev) => ({ ...prev, [boss.id]: partySize }));
    onAdd({ bossId: boss.id, difficulty, partySize });
  };

  const saveCurrentAsPreset = () => {
    const name = window.prompt(
      "Preset name",
      `${characterLabel} bosses`,
    );
    if (name == null) return;
    const preset = presetFromSelections(selections, name);
    if (!preset) {
      setToast("Enable at least one boss before saving a preset.");
      return;
    }
    const next = [preset, ...presets];
    if (!saveBossPresets(next)) {
      setToast("Could not save preset — browser storage may be full.");
      return;
    }
    setPresets(next);
    setPresetId(preset.id);
    setToast(`Saved preset “${preset.name}” (${preset.bosses.length} bosses).`);
  };

  const applyPresetHere = () => {
    if (!selectedPreset) return;
    const next = applyPresetToSelections(selections, selectedPreset);
    onReplaceSelections([{ key: currentKey, selections: next }]);
    // Refresh drafts from applied preset
    const nextDiff: Record<string, string> = { ...draftDiff };
    const nextParty: Record<string, number> = { ...draftParty };
    for (const b of selectedPreset.bosses) {
      nextDiff[b.bossId] = b.difficulty;
      nextParty[b.bossId] = b.partySize;
    }
    setDraftDiff(nextDiff);
    setDraftParty(nextParty);
    setToast(`Applied “${selectedPreset.name}” to ${characterLabel}.`);
  };

  const openApplyMulti = () => {
    if (!selectedPreset) return;
    setApplyKeys(
      applyTargets.some((t) => t.key === currentKey)
        ? [currentKey]
        : applyTargets.map((t) => t.key),
    );
    setApplyOpen(true);
  };

  const confirmApplyMulti = () => {
    if (!selectedPreset || applyKeys.length === 0) return;
    onReplaceSelections(
      applyKeys.map((key) => ({
        key,
        selections: applyPresetToSelections([], selectedPreset),
      })),
    );
    setApplyOpen(false);
    setToast(
      `Applied “${selectedPreset.name}” to ${applyKeys.length} character${applyKeys.length === 1 ? "" : "s"}.`,
    );
  };

  const removePreset = () => {
    if (!selectedPreset) return;
    const ok = window.confirm(`Delete preset “${selectedPreset.name}”?`);
    if (!ok) return;
    const next = deleteBossPreset(presets, selectedPreset.id);
    if (!saveBossPresets(next)) {
      setToast("Could not delete preset — browser storage may be full.");
      return;
    }
    setPresets(next);
    setPresetId("");
    setToast("Preset deleted.");
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

        <div className="shrink-0 space-y-2.5 border-b border-border/30 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex w-[9.5rem] shrink-0 flex-col gap-1 text-xs font-semibold uppercase tracking-wider opacity-60 sm:w-40">
              Search
              <input
                className="rounded border border-border bg-background px-2 py-1.5 text-sm font-normal normal-case tracking-normal opacity-100 outline-none focus:border-accent"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name…"
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

          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border/40 bg-background/50 p-2">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-[0.65rem] font-semibold uppercase tracking-wider opacity-60">
              Preset
              <select
                className="rounded border border-border bg-background px-2 py-1.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-accent"
                value={presetId}
                onChange={(e) => setPresetId(e.target.value)}
              >
                <option value="">Select a preset…</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.bosses.length})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={saveCurrentAsPreset}
              disabled={enabledCount === 0}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-surface-muted disabled:opacity-40"
              title="Save currently enabled bosses as a reusable preset"
            >
              Save as preset
            </button>
            <button
              type="button"
              onClick={applyPresetHere}
              disabled={!selectedPreset}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-surface-muted disabled:opacity-40"
            >
              Apply here
            </button>
            <button
              type="button"
              onClick={openApplyMulti}
              disabled={!selectedPreset || applyTargets.length === 0}
              className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40 dark:text-zinc-900"
            >
              Apply to characters…
            </button>
            <button
              type="button"
              onClick={removePreset}
              disabled={!selectedPreset}
              className="rounded-lg border border-danger/35 px-2.5 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-40"
            >
              Delete
            </button>
          </div>
          {toast ? (
            <p className="text-xs font-medium text-accent" role="status">
              {toast}
            </p>
          ) : (
            <p className="text-[11px] opacity-55">
              Save this character&apos;s boss list as a preset, then autofill
              other characters with the same set.
            </p>
          )}
        </div>

        <div className="maple-scroll min-h-0 flex-1 px-4 py-3 sm:px-5">
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
                const diff = boss.difficulties.find(
                  (d) => d.name === difficulty,
                );
                const est = diff
                  ? personalCrystal(diff.crystal, partySize, world)
                  : 0;
                const icon = bossIconUrl(boss);
                const showIcon = icon && !brokenIcons[boss.id];
                const blockedWeekly =
                  !enabled && boss.frequency === "weekly" && atWeeklyCap;

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
                      aria-label={
                        enabled ? `Remove ${boss.name}` : `Add ${boss.name}`
                      }
                      disabled={blockedWeekly}
                      onClick={() => toggleBoss(boss)}
                      className="absolute top-2 right-2 z-10 rounded-full p-1 transition-colors disabled:cursor-not-allowed"
                    >
                      {enabled ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white dark:text-zinc-900">
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden
                          >
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
                          {boss.difficulties
                            .slice()
                            .reverse()
                            .map((d) => (
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

      {applyOpen && selectedPreset ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-preset-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setApplyOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-xl">
            <h3
              id="apply-preset-title"
              className="font-display text-lg font-bold tracking-tight"
            >
              Apply “{selectedPreset.name}”
            </h3>
            <p className="mt-1 text-xs opacity-65">
              Autofill these characters with the preset bosses (clears their
              previous list). Weekly cap of {WEEKLY_CRYSTAL_LIMIT} still
              applies.
            </p>
            <ul className="maple-scroll mt-3 max-h-56 space-y-1.5">
              {applyTargets.map((t) => {
                const checked = applyKeys.includes(t.key);
                return (
                  <li key={t.key}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm hover:bg-surface-muted/50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setApplyKeys((prev) =>
                            checked
                              ? prev.filter((k) => k !== t.key)
                              : [...prev, t.key],
                          )
                        }
                      />
                      <span className="truncate font-medium">{t.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                className="font-semibold text-accent hover:underline"
                onClick={() => setApplyKeys(applyTargets.map((t) => t.key))}
              >
                Select all
              </button>
              <button
                type="button"
                className="font-semibold opacity-70 hover:underline"
                onClick={() => setApplyKeys([])}
              >
                Clear
              </button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApplyOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={applyKeys.length === 0}
                onClick={confirmApplyMulti}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 dark:text-zinc-900"
              >
                Apply ({applyKeys.length})
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
