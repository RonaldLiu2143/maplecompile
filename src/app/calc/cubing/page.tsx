"use client";

import { useMemo, useState, useTransition } from "react";
import {
  buildDesiredStatGroups,
  canPickDesiredStat,
  maxCubeTier,
  runCubingCalc,
  suggestCubeType,
  type CubeType,
  type CubingResult,
  type ItemCategory,
  type StatType,
  type Tier,
} from "@/lib/cubing";

const ITEM_TYPES: { id: ItemCategory; label: string }[] = [
  { id: "accessory", label: "Accessory" },
  { id: "badge", label: "Badge" },
  { id: "belt", label: "Belt" },
  { id: "bottom", label: "Bottom" },
  { id: "cape", label: "Cape" },
  { id: "emblem", label: "Emblem" },
  { id: "gloves", label: "Gloves" },
  { id: "hat", label: "Hat" },
  { id: "heart", label: "Heart" },
  { id: "overall", label: "Overall" },
  { id: "top", label: "Top" },
  { id: "secondary", label: "Secondary" },
  { id: "shoes", label: "Shoes" },
  { id: "shoulder", label: "Shoulder" },
  { id: "weapon", label: "Weapon" },
];

const CUBE_TYPES: { id: CubeType; label: string }[] = [
  { id: "occult", label: "Mystical / Occult" },
  { id: "master", label: "Hard / Master" },
  { id: "meister", label: "Solid / Meister" },
  { id: "red", label: "Glowing / Red" },
  { id: "black", label: "Bright / Black" },
];

const TIERS: { id: Tier; label: string }[] = [
  { id: 0, label: "Rare" },
  { id: 1, label: "Epic" },
  { id: 2, label: "Unique" },
  { id: 3, label: "Legendary" },
];

const STAT_TYPES: { id: StatType; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "hp", label: "Max HP (Demon Avenger)" },
  { id: "allStat", label: "All Stat (Xenon)" },
];

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  return Math.round(n).toLocaleString();
}

export default function CubingCalculatorPage() {
  const [itemType, setItemType] = useState<ItemCategory>("shoes");
  const [cubeType, setCubeType] = useState<CubeType>("red");
  const [currentTier, setCurrentTier] = useState<Tier>(3);
  const [desiredTier, setDesiredTier] = useState<Tier>(3);
  const [itemLevel, setItemLevel] = useState(150);
  const [statType, setStatType] = useState<StatType>("normal");
  const [desiredStat, setDesiredStat] = useState("any");
  const [dmt, setDmt] = useState(false);
  const [result, setResult] = useState<CubingResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canPick = canPickDesiredStat(currentTier, desiredTier, cubeType);
  const levelOk = itemLevel >= 71;

  const groups = useMemo(() => {
    if (!canPick || !levelOk) return [];
    return buildDesiredStatGroups({
      itemType,
      itemLevel,
      desiredTier,
      cubeType,
      statType,
    });
  }, [canPick, levelOk, itemType, itemLevel, desiredTier, cubeType, statType]);

  const flatOptions = useMemo(() => {
    if (!canPick || !levelOk) {
      return [{ value: "any", label: "Any (tier-up only)" }];
    }
    return [
      { value: "any", label: "Any" },
      ...groups.flatMap((g) =>
        g.options.map((o) => ({ value: o.value, label: `${g.label}: ${o.label}` })),
      ),
    ];
  }, [canPick, levelOk, groups]);

  // Keep desiredStat valid when options change
  const selectedStat = flatOptions.some((o) => o.value === desiredStat)
    ? desiredStat
    : flatOptions[0]?.value ?? "any";

  const onCurrentTier = (tier: Tier) => {
    setCurrentTier(tier);
    const nextDesired = desiredTier < tier ? tier : desiredTier;
    setDesiredTier(nextDesired);
    setCubeType(suggestCubeType(nextDesired, tier, cubeType));
  };

  const onDesiredTier = (tier: Tier) => {
    setDesiredTier(tier);
    const nextCurrent = currentTier > tier ? tier : currentTier;
    setCurrentTier(nextCurrent);
    setCubeType(suggestCubeType(tier, nextCurrent, cubeType));
  };

  const calculate = () => {
    if (!levelOk) {
      setError("Item level must be 71 or higher.");
      return;
    }
    if (maxCubeTier[cubeType] < desiredTier) {
      setError("Selected cube cannot reach the desired tier.");
      return;
    }
    setError(null);
    startTransition(() => {
      const next = runCubingCalc({
        itemType,
        cubeType,
        currentTier,
        desiredTier,
        itemLevel,
        desiredStat: selectedStat,
        dmt,
      });
      setResult(next);
    });
  };

  const cubeLabel =
    CUBE_TYPES.find((c) => c.id === cubeType)?.label.split(" / ")[1] ??
    cubeType;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Cubing Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Estimate cubes and mesos to hit your desired potential lines, including
          tier-ups. Rates follow community / Nexon probability data.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-border/40 bg-surface/80 p-4">
        <h2 className="font-display text-lg font-semibold">Cubing information</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            Item category
            <select
              className={fieldClass}
              value={itemType}
              onChange={(e) => setItemType(e.target.value as ItemCategory)}
            >
              {ITEM_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Cube type
            <select
              className={fieldClass}
              value={cubeType}
              onChange={(e) => setCubeType(e.target.value as CubeType)}
            >
              {CUBE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Current tier
            <select
              className={fieldClass}
              value={currentTier}
              onChange={(e) => onCurrentTier(Number(e.target.value) as Tier)}
            >
              {TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Item level
            <input
              type="number"
              className={fieldClass}
              value={itemLevel}
              min={1}
              max={300}
              onChange={(e) => setItemLevel(Number(e.target.value) || 0)}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border/40 bg-surface/80 p-4">
        <h2 className="font-display text-lg font-semibold">Desired stats</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Desired tier
            <select
              className={fieldClass}
              value={desiredTier}
              onChange={(e) => onDesiredTier(Number(e.target.value) as Tier)}
            >
              {TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Stat type
            <select
              className={fieldClass}
              value={statType}
              disabled={
                itemType === "weapon" ||
                itemType === "secondary" ||
                itemType === "emblem"
              }
              onChange={(e) => setStatType(e.target.value as StatType)}
            >
              {STAT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-1">
            Desired stat
            <select
              className={fieldClass}
              value={selectedStat}
              disabled={!levelOk}
              onChange={(e) => setDesiredStat(e.target.value)}
            >
              {!levelOk ? (
                <option value="any">Item level must be 71+</option>
              ) : canPick ? (
                <>
                  <option value="any">Any</option>
                  {groups.map((g) => (
                    <optgroup key={g.id} label={g.label}>
                      {g.options.map((o) => (
                        <option key={`${g.id}-${o.value}`} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </>
              ) : (
                <option value="any">Any (tier-up only)</option>
              )}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dmt}
              onChange={(e) => setDmt(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            Double Miracle Time
          </label>
          <button
            type="button"
            onClick={calculate}
            disabled={pending || !levelOk}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 dark:text-zinc-900"
          >
            {pending ? "Calculating…" : "Calculate"}
          </button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {!canPick && levelOk && (
          <p className="text-sm opacity-70">
            Desired lines unlock when current tier matches desired tier and the
            cube can roll that tier. Until then, results are tier-up costs only.
          </p>
        )}
      </section>

      {result && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Results</h2>
          {selectedStat !== "any" && (
            <p className="text-sm opacity-70">
              Line probability:{" "}
              <span className="font-semibold tabular-nums text-accent">
                {(result.probability * 100).toFixed(4)}%
              </span>
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/40 bg-surface/80 p-4">
              <h3 className="font-display text-base font-semibold">Mesos</h3>
              <p className="mt-2 space-y-1 text-sm tabular-nums">
                <span className="block">
                  Average: {formatNum(result.mesos.mean)}
                </span>
                <span className="block">
                  Median: {formatNum(result.mesos.median)}
                </span>
              </p>
              <p className="mt-3 space-y-1 border-t border-border/30 pt-3 text-sm tabular-nums opacity-90">
                <span className="block">
                  75% within {formatNum(result.mesos.seventy_fifth)}
                </span>
                <span className="block">
                  85% within {formatNum(result.mesos.eighty_fifth)}
                </span>
                <span className="block">
                  95% within {formatNum(result.mesos.nintey_fifth)}
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-surface/80 p-4">
              <h3 className="font-display text-base font-semibold">
                {cubeLabel} cubes
              </h3>
              <p className="mt-2 space-y-1 text-sm tabular-nums">
                <span className="block">
                  Average: {formatNum(result.cubes.mean)}
                </span>
                <span className="block">
                  Median: {formatNum(result.cubes.median)}
                </span>
              </p>
              <p className="mt-3 space-y-1 border-t border-border/30 pt-3 text-sm tabular-nums opacity-90">
                <span className="block">
                  75% within {formatNum(result.cubes.seventy_fifth)}
                </span>
                <span className="block">
                  85% within {formatNum(result.cubes.eighty_fifth)}
                </span>
                <span className="block">
                  95% within {formatNum(result.cubes.nintey_fifth)}
                </span>
              </p>
            </div>
          </div>
        </section>
      )}

      <p className="text-xs opacity-60">
        Probability model adapted from{" "}
        <a
          href="https://brendonmay.github.io/cubingCalculator/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-accent"
        >
          MathBro&apos;s Cubing Calculator
        </a>
        .
      </p>
    </div>
  );
}
