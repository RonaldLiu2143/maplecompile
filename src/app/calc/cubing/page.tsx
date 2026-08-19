"use client";

import { useEffect, useMemo, useState } from "react";
import { ActiveCharacterBar } from "@/components/ActiveCharacterBar";
import {
  buildDesiredStatGroups,
  canPickDesiredStat,
  isWseItem,
  maxCubeTier,
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

const inputClass =
  "rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent";

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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPick = canPickDesiredStat(currentTier, desiredTier, cubeType);
  const levelOk = itemLevel >= 71;
  const cubeSupportsTier = maxCubeTier[cubeType] >= desiredTier;
  const canCalculate = levelOk && cubeSupportsTier;

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

  const validStatValues = useMemo(() => {
    if (!canPick || !levelOk) return ["any"];
    return ["any", ...groups.flatMap((g) => g.options.map((o) => o.value))];
  }, [canPick, levelOk, groups]);

  useEffect(() => {
    if (!validStatValues.includes(desiredStat)) {
      setDesiredStat(validStatValues[0] ?? "any");
    }
  }, [validStatValues, desiredStat]);

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

  const calculate = async () => {
    if (!levelOk) {
      setError("Item level must be 71 or higher.");
      return;
    }
    if (!cubeSupportsTier) {
      setError("Selected cube cannot reach the desired tier.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      // Lazy-load rates + probability so the route chunk stays light
      const { runCubingCalc } = await import("@/lib/cubing/run");
      setResult(
        runCubingCalc({
          itemType,
          cubeType,
          currentTier,
          desiredTier,
          itemLevel,
          desiredStat,
          dmt,
        }),
      );
    } finally {
      setPending(false);
    }
  };

  const cubeShort =
    CUBE_TYPES.find((c) => c.id === cubeType)?.label.split(" / ")[1] ??
    cubeType;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Cubing Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Estimate cubes and mesos needed for your desired potential lines,
          including tier-ups and Double Miracle Time.
        </p>
      </header>

      <ActiveCharacterBar />

      <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
        <h2 className="font-display text-lg font-semibold">
          1) Cubing information
        </h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Item category
            <select
              className={`${inputClass} min-w-[9rem]`}
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
          <label className="flex flex-col gap-1">
            Cube type
            <select
              className={`${inputClass} min-w-[10rem]`}
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
          <label className="flex flex-col gap-1">
            Current tier
            <select
              className={`${inputClass} w-32`}
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
          <label className="flex flex-col gap-1">
            Item level
            <input
              type="number"
              className={`${inputClass} w-24`}
              value={itemLevel}
              min={1}
              max={300}
              onChange={(e) => setItemLevel(Number(e.target.value) || 0)}
            />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
        <h2 className="font-display text-lg font-semibold">2) Desired stats</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Desired tier
            <select
              className={`${inputClass} w-32`}
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
          <label className="flex flex-col gap-1">
            Stat type
            <select
              className={`${inputClass} min-w-[12rem]`}
              value={statType}
              disabled={isWseItem(itemType)}
              onChange={(e) => setStatType(e.target.value as StatType)}
            >
              {STAT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
            Desired stat
            <select
              className={inputClass}
              value={desiredStat}
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

        <div className="flex flex-wrap items-center gap-4 border-t border-border/30 pt-3">
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
            onClick={() => void calculate()}
            disabled={pending || !canCalculate}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Calculating…" : "Calculate"}
          </button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {!cubeSupportsTier && levelOk && (
          <p className="text-sm text-danger">
            This cube cannot reach the desired tier. Pick a higher cube or lower
            the desired tier.
          </p>
        )}
        {!canPick && levelOk && cubeSupportsTier && (
          <p className="text-sm opacity-70">
            Desired lines unlock when current tier matches desired tier and the
            cube can roll that tier. Until then, results are tier-up costs only.
          </p>
        )}
      </section>

      {result && (
        <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
          <div>
            <h2 className="font-display text-lg font-semibold">3) Results</h2>
            <p className="mt-1 text-sm opacity-70">
              Expected cubes and mesos for this roll
              {desiredStat !== "any" ? (
                <>
                  {" · "}
                  line chance{" "}
                  <span className="font-semibold tabular-nums text-accent">
                    {(result.probability * 100).toFixed(4)}%
                  </span>
                </>
              ) : null}
              .
            </p>
          </div>

          <div className="maple-table-scroll">
            <table className="w-full min-w-[28rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left">
                  <th className="py-1.5 pr-3 font-semibold">Metric</th>
                  <th className="px-2 py-1.5 text-right font-semibold">
                    {cubeShort} cubes
                  </th>
                  <th className="px-2 py-1.5 text-right font-semibold">Mesos</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Average", result.cubes.mean, result.mesos.mean],
                    ["Median", result.cubes.median, result.mesos.median],
                    [
                      "75% chance within",
                      result.cubes.seventy_fifth,
                      result.mesos.seventy_fifth,
                    ],
                    [
                      "85% chance within",
                      result.cubes.eighty_fifth,
                      result.mesos.eighty_fifth,
                    ],
                    [
                      "95% chance within",
                      result.cubes.nintey_fifth,
                      result.mesos.nintey_fifth,
                    ],
                  ] as const
                ).map(([label, cubes, mesos]) => (
                  <tr key={label} className="border-b border-border/20">
                    <td className="py-1.5 pr-3 opacity-80">{label}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatNum(cubes)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatNum(mesos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs opacity-60">
        Probability model adapted from{" "}
        <a
          href="https://brendonmay.github.io/cubingCalculator/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline"
        >
          MathBro&apos;s Cubing Calculator
        </a>
        .
      </p>
    </div>
  );
}
