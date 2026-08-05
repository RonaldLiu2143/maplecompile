"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BOSS_CRYSTALS,
  WEEKLY_CRYSTAL_LIMIT,
  bossIconUrl,
  formatMesos,
  personalCrystal,
  type BossClearSelection,
  type BossEntry,
  type WorldType,
} from "@/lib/bosses";

const CATEGORY_LABEL: Record<string, string> = {
  "pre-lomien": "Pre-Lomien",
  "lomien-arcane": "Lomien + Arcane",
  grandis: "Grandis",
  seasonal: "Seasonal",
  unknown: "Other",
};

const CATEGORY_ORDER = ["pre-lomien", "lomien-arcane", "grandis", "seasonal", "unknown"];

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string>("");
  const [partySize, setPartySize] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [brokenIcons, setBrokenIcons] = useState<Record<string, true>>({});

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setDifficulty("");
    setPartySize(1);
    setCategoryFilter([]);
    setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectedBoss = useMemo(
    () => BOSS_CRYSTALS.find((b) => b.id === selectedId) ?? null,
    [selectedId],
  );

  const selectedSel = selectedId
    ? selections.find((s) => s.bossId === selectedId)
    : null;

  useEffect(() => {
    if (!selectedBoss) return;
    const sel = selections.find((s) => s.bossId === selectedBoss.id);
    if (sel?.enabled) {
      setDifficulty(sel.difficulty);
      setPartySize(sel.partySize);
    } else {
      const top = selectedBoss.difficulties[selectedBoss.difficulties.length - 1];
      setDifficulty(top?.name ?? "");
      setPartySize(1);
    }
  }, [selectedBoss, selections]);

  const filtered = useMemo(() => {
    return BOSS_CRYSTALS.filter((boss) => {
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
  }, [categoryFilter, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, BossEntry[]>();
    for (const boss of filtered) {
      const list = map.get(boss.category) ?? [];
      list.push(boss);
      map.set(boss.category, list);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      bosses: map.get(c)!,
    }));
  }, [filtered]);

  if (!open) return null;

  const atWeeklyCap = weeklyCount >= WEEKLY_CRYSTAL_LIMIT;
  const alreadyEnabled = !!selectedSel?.enabled;
  const canAddWeekly =
    !selectedBoss ||
    selectedBoss.frequency !== "weekly" ||
    alreadyEnabled ||
    !atWeeklyCap;

  const previewCrystal =
    selectedBoss && difficulty
      ? (() => {
          const diff = selectedBoss.difficulties.find((d) => d.name === difficulty);
          if (!diff) return null;
          return personalCrystal(diff.crystal, partySize, world);
        })()
      : null;

  const toggleCategory = (cat: string) => {
    setCategoryFilter((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleAdd = () => {
    if (!selectedBoss || !difficulty) return;
    const ok = onAdd({
      bossId: selectedBoss.id,
      difficulty,
      partySize,
    });
    if (ok) {
      // Keep selection so user can tweak party / re-add quickly
    }
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
              Add bosses
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
              {Object.entries(CATEGORY_LABEL)
                .filter(([id]) => id !== "unknown" && id !== "seasonal")
                .map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleCategory(id)}
                    className={[
                      "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                      categoryFilter.length === 0 || categoryFilter.includes(id)
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
          {grouped.length === 0 ? (
            <p className="py-8 text-center text-sm opacity-60">No bosses match.</p>
          ) : (
            <div className="space-y-5">
              {grouped.map(({ category, bosses }) => (
                <div key={category}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider opacity-55">
                    {CATEGORY_LABEL[category] ?? category}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {bosses.map((boss) => {
                      const sel = selections.find((s) => s.bossId === boss.id);
                      const enabled = !!sel?.enabled;
                      const active = selectedId === boss.id;
                      const icon = bossIconUrl(boss);
                      const showIcon = icon && !brokenIcons[boss.id];
                      return (
                        <button
                          key={boss.id}
                          type="button"
                          onClick={() => setSelectedId(boss.id)}
                          className={[
                            "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-colors",
                            active
                              ? "border-accent bg-accent-soft/50 ring-1 ring-accent"
                              : enabled
                                ? "border-accent/40 bg-accent-soft/25"
                                : "border-border/40 bg-surface-muted/40 hover:border-border hover:bg-surface-muted/70",
                          ].join(" ")}
                        >
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-background/60">
                            {showIcon ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={icon}
                                alt=""
                                width={56}
                                height={56}
                                className="h-14 w-14 object-contain"
                                style={{ imageRendering: "pixelated" }}
                                onError={() =>
                                  setBrokenIcons((prev) => ({
                                    ...prev,
                                    [boss.id]: true,
                                  }))
                                }
                              />
                            ) : (
                              <span className="px-1 text-[10px] font-semibold leading-tight opacity-55">
                                {boss.name}
                              </span>
                            )}
                          </div>
                          <span className="line-clamp-2 text-[11px] font-semibold leading-tight">
                            {boss.name}
                          </span>
                          {enabled ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                              Added
                            </span>
                          ) : boss.frequency === "monthly" ? (
                            <span className="text-[10px] opacity-50">Monthly</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="shrink-0 space-y-3 border-t border-border/40 bg-surface-muted/30 px-4 py-3 sm:px-5">
          {selectedBoss ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{selectedBoss.name}</p>
                {selectedBoss.frequency === "monthly" ? (
                  <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase opacity-70">
                    Monthly · no weekly slot
                  </span>
                ) : null}
                {previewCrystal != null ? (
                  <span className="ml-auto text-xs tabular-nums opacity-70">
                    Your crystal · {formatMesos(previewCrystal)}
                  </span>
                ) : null}
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider opacity-55">
                  Difficulty
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedBoss.difficulties.map((d) => (
                    <button
                      key={d.name}
                      type="button"
                      onClick={() => setDifficulty(d.name)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                        difficulty === d.name
                          ? "bg-accent text-white dark:text-zinc-900"
                          : "border border-border/50 hover:bg-accent-soft hover:text-accent",
                      ].join(" ")}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider opacity-55">
                  Party size
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPartySize(n)}
                      className={[
                        "h-9 w-9 rounded-lg text-sm font-semibold tabular-nums transition-colors",
                        partySize === n
                          ? "bg-accent text-white dark:text-zinc-900"
                          : "border border-border/50 hover:bg-accent-soft hover:text-accent",
                      ].join(" ")}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {alreadyEnabled ? (
                  <button
                    type="button"
                    onClick={() => onRemove(selectedBoss.id)}
                    className="rounded-lg border border-border/50 px-3 py-2 text-sm font-semibold opacity-80 hover:border-red-400/50 hover:text-red-500"
                  >
                    Remove
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!difficulty || !canAddWeekly}
                  onClick={handleAdd}
                  className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-900"
                >
                  {alreadyEnabled
                    ? "Update"
                    : !canAddWeekly
                      ? `Weekly limit (${WEEKLY_CRYSTAL_LIMIT})`
                      : "Add to list"}
                </button>
              </div>
            </>
          ) : (
            <p className="py-1 text-sm opacity-60">
              Select a boss, then choose difficulty and party size.
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
