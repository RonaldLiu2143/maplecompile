"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BOSS_CRYSTALS,
  WEEKLY_CRYSTAL_LIMIT,
  defaultSelections,
  formatMesos,
  summarizeIncome,
  type BossClearSelection,
  type WorldType,
} from "@/lib/bosses";

const STORAGE_KEY = "maplecompile.boss-income.v1";
const inputClass =
  "rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent";

type Persisted = {
  world: WorldType;
  selections: BossClearSelection[];
};

function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { world: "heroic", selections: defaultSelections() };
    const parsed = JSON.parse(raw) as Persisted;
    const defaults = defaultSelections();
    const byId = new Map(parsed.selections?.map((s) => [s.bossId, s]) ?? []);
    return {
      world: parsed.world === "interactive" ? "interactive" : "heroic",
      selections: defaults.map((d) => byId.get(d.bossId) ?? d),
    };
  } catch {
    return { world: "heroic", selections: defaultSelections() };
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  "pre-lomien": "Pre-Lomien",
  "lomien-arcane": "Lomien + Arcane",
  grandis: "Grandis",
  seasonal: "Seasonal",
  unknown: "Other",
};

export default function BossesIncomePage() {
  const [ready, setReady] = useState(false);
  const [world, setWorld] = useState<WorldType>("heroic");
  const [selections, setSelections] = useState<BossClearSelection[]>(
    defaultSelections,
  );
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const loaded = loadState();
    setWorld(loaded.world);
    setSelections(loaded.selections);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ world, selections } satisfies Persisted),
      );
    } catch {
      /* ignore */
    }
  }, [world, selections, ready]);

  const summary = useMemo(
    () => summarizeIncome(selections, world),
    [selections, world],
  );

  const patch = (bossId: string, partial: Partial<BossClearSelection>) => {
    setSelections((prev) =>
      prev.map((s) => (s.bossId === bossId ? { ...s, ...partial } : s)),
    );
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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Boss Income
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Plan weekly crystal sells (14-crystal cap) and estimate meso income.
          Defaulted to Heroic (5× crystal values). Party size splits the crystal
          evenly. Multi-character roster tracking is deferred.
        </p>
      </header>

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
          onClick={() => {
            setSelections(defaultSelections());
            setCategoryFilter([]);
            setQuery("");
          }}
        >
          Reset
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
          Enable bosses you clear. Highest personal crystal value sells first up
          to {WEEKLY_CRYSTAL_LIMIT} weekly crystals. Monthly bosses (Black Mage)
          do not consume the weekly cap.
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
                    l.bossId === boss.id && l.difficulty === sel.difficulty,
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
                          <span className="font-semibold text-accent">Yes</span>
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

      <p className="text-xs opacity-60">
        Crystal values sourced from MapleHub boss data (Interactive base ×5 for
        Heroic). Not an official Nexon tool — verify after price patches.
      </p>
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
