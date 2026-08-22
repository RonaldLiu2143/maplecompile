"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MODE_STARS,
  PLAN_STARS,
  applyRateModifiers,
  boomPercent,
  compareFodder,
  destroyRecoverStar,
  optimizeFrontier,
  paidAttemptCost,
  planMetrics,
  runTrials,
  successProb,
  type EnhanceMode,
  type FodderCompareResult,
  type MvpTier,
  type SfEvent,
  type SimOpts,
  type SimSummary,
  type StarPlan,
  type StarPlanEntry,
} from "@/lib/starforce";

type Tab = "simple" | "perstar" | "optimizer" | "fodder";

const LEVEL_PRESETS = [120, 140, 150, 160, 200, 250];
const TRIAL_PRESETS = [100, 500, 1000, 5000, 10000, 50000, 100000];

const MVP_OPTIONS: { id: MvpTier; label: string }[] = [
  { id: "none", label: "None" },
  { id: "silver", label: "Silver — 3%" },
  { id: "gold", label: "Gold — 5%" },
  { id: "diamond", label: "Diamond — 10%" },
];

const EVENT_OPTIONS: { id: SfEvent; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fivetenfifteen", label: "5 / 10 / 15★ guaranteed" },
  { id: "thirtyOff", label: "30% off cost" },
  { id: "boomReduction", label: "30% boom reduction" },
  { id: "shiningStarForce", label: "Shining Star Force — 30% off + 30% boom red." },
];

const MODE_LABELS: Record<EnhanceMode, string> = {
  1: "Mode 1 — 1× cost · baseline (uses Safeguard)",
  2: "Mode 2 — higher cost · lower boom",
  3: "Mode 3 — higher cost · lower boom",
  4: "Mode 4 — highest cost · 0% boom (18–21★)",
};

const inputClass =
  "rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent";

function formatMesos(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return Math.round(n).toLocaleString();
}

function formatNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function defaultStarPlan(): StarPlan {
  const plan: StarPlan = {};
  for (const s of PLAN_STARS) plan[s] = { mode: 1, safeguard: s <= 17 };
  return plan;
}

function choiceKey(entry: StarPlanEntry): string {
  return `${entry.mode}:${entry.safeguard ? 1 : 0}`;
}

function parseChoice(key: string): StarPlanEntry {
  const [m, sg] = key.split(":");
  return {
    mode: (Number(m) || 1) as EnhanceMode,
    safeguard: sg === "1",
  };
}

function starChoiceOptions(star: number): { key: string; label: string }[] {
  const opts: { key: string; label: string }[] = [
    { key: "1:0", label: "Mode 1" },
  ];
  if (star <= 17) {
    opts.push({ key: "1:1", label: "Mode 1 + SG" });
    opts.push({ key: "2:0", label: "Mode 2" });
    opts.push({ key: "3:0", label: "Mode 3" });
  } else {
    opts.push({ key: "2:0", label: "Mode 2" });
    opts.push({ key: "3:0", label: "Mode 3" });
    opts.push({ key: "4:0", label: "Mode 4" });
  }
  return opts;
}

export default function StarforceCalculatorPage() {
  const [tab, setTab] = useState<Tab>("simple");

  const [itemLevel, setItemLevel] = useState(200);
  const [customLevel, setCustomLevel] = useState(false);
  const [trials, setTrials] = useState(1000);
  const [currentStar, setCurrentStar] = useState(17);
  const [targetStar, setTargetStar] = useState(22);

  const [mvp, setMvp] = useState<MvpTier>("none");
  const [event, setEvent] = useState<SfEvent>("none");
  const [enhanceMode, setEnhanceMode] = useState<EnhanceMode>(1);
  const [starCatching, setStarCatching] = useState(false);
  const [safeguard, setSafeguard] = useState(true);

  const [starPlan, setStarPlan] = useState<StarPlan>(() => defaultStarPlan());

  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SimSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [budgetBillions, setBudgetBillions] = useState(10);
  const [spares, setSpares] = useState(3);
  const [optPending, setOptPending] = useState(false);
  const [optResult, setOptResult] = useState<{
    plan: StarPlan;
    expCost: number;
    expBooms: number;
    successRate: number;
    evaluated: number;
  } | null>(null);

  const [fodderLevel, setFodderLevel] = useState(190);
  const [fodderSafeguard, setFodderSafeguard] = useState(true);
  const [showFodderPrices, setShowFodderPrices] = useState(false);
  const [fodderPriceM, setFodderPriceM] = useState(0);
  const [sparePriceM, setSparePriceM] = useState(0);
  const [fodderResult, setFodderResult] = useState<FodderCompareResult | null>(
    null,
  );

  const baseOpts: SimOpts = useMemo(
    () => ({
      mvp,
      event,
      starCatching,
      safeguard,
      enhanceMode,
    }),
    [mvp, event, starCatching, safeguard, enhanceMode],
  );

  const simOptsForTab = useCallback((): SimOpts => {
    if (tab === "perstar" || tab === "optimizer") {
      return { ...baseOpts, starPlan, enhanceMode: 1, safeguard: false };
    }
    return { ...baseOpts, starPlan: null };
  }, [tab, baseOpts, starPlan]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const canRun = targetStar > currentStar && itemLevel > 0 && trials > 0;

  const runSim = async () => {
    if (!canRun) {
      setError("Target star must be above current star.");
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setError(null);
    setPending(true);
    setProgress(0);
    setResult(null);
    try {
      const summary = await runTrials(
        {
          currentStar,
          targetStar,
          itemLevel,
          trials,
          ...simOptsForTab(),
        },
        {
          signal: ac.signal,
          onProgress: (done, total) => setProgress(done / total),
        },
      );
      setResult(summary);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setError("Simulation failed.");
      }
    } finally {
      setPending(false);
      setProgress(0);
    }
  };

  const runOptimize = () => {
    if (targetStar <= currentStar) {
      setError("Target star must be above current star.");
      return;
    }
    setError(null);
    setOptPending(true);
    setOptResult(null);
    // Yield so the button can show pending state
    setTimeout(() => {
      try {
        const frontier = optimizeFrontier({
          currentStar,
          targetStar,
          itemLevel,
          opts: { ...baseOpts, starPlan: null, enhanceMode: 1, safeguard: false },
          maxCandidates: 24,
        });
        if (frontier.empty || !frontier.candidates?.length) {
          setError("Nothing to optimize below your target (need target > 15★).");
          setOptPending(false);
          return;
        }

        const budgetMesos = budgetBillions * 1e9;
        const trialN = Math.min(2000, Math.max(400, trials));
        let best = frontier.candidates[0]!;
        let bestRate = -1;
        for (const c of frontier.candidates) {
          const rate = successProb(
            {
              currentStar,
              targetStar,
              itemLevel,
              ...baseOpts,
              starPlan: c.plan,
              enhanceMode: 1,
              safeguard: false,
            },
            budgetMesos,
            spares,
            trialN,
          );
          if (rate > bestRate) {
            bestRate = rate;
            best = c;
          }
        }

        setStarPlan(best.plan);
        setOptResult({
          plan: best.plan,
          expCost: best.expCost,
          expBooms: best.expBooms,
          successRate: bestRate,
          evaluated: frontier.evaluated ?? 0,
        });
        setTab("perstar");
      } catch {
        setError("Optimizer failed.");
      } finally {
        setOptPending(false);
      }
    }, 0);
  };

  const runFodder = () => {
    const goal = Math.min(22, Math.max(16, targetStar));
    const res = compareFodder({
      itemLevel,
      fodderLevel,
      goalStar: goal,
      fodderPrice: fodderPriceM * 1e6,
      sparePrice: sparePriceM * 1e6,
      fodderSafeguard,
      baseOpts: { mvp, event, starCatching },
    });
    setFodderResult(res);
  };

  const boomMatrixStars = [15, 16, 17, 18, 19, 20, 21] as const;

  const expectedPreview = useMemo(() => {
    if (targetStar <= currentStar) return null;
    try {
      return planMetrics(currentStar, targetStar, itemLevel, simOptsForTab());
    } catch {
      return null;
    }
  }, [currentStar, targetStar, itemLevel, simOptsForTab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "simple", label: "Simple" },
    { id: "perstar", label: "Per-star" },
    { id: "optimizer", label: "Optimizer" },
    { id: "fodder", label: "Fodder" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Star Force Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          GMS v269 Enhancement Modes — Monte Carlo meso and boom estimates,
          per-star plans, optimizer, and fodder transfer.
        </p>
      </header>

      <div
        className="flex flex-wrap gap-1 border-b border-border/40 pb-px"
        role="tablist"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border border-b-0 border-border/40 bg-surface/80 text-foreground"
                : "opacity-70 hover:opacity-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "simple" || tab === "perstar") && (
        <>
          <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
            <h2 className="font-display text-lg font-semibold">Equipment</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex flex-col gap-1">
                Item level
                <div className="flex flex-wrap gap-2">
                  <select
                    className={`${inputClass} min-w-[7rem]`}
                    value={customLevel ? "custom" : String(itemLevel)}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setCustomLevel(true);
                      } else {
                        setCustomLevel(false);
                        setItemLevel(Number(e.target.value));
                      }
                    }}
                  >
                    {LEVEL_PRESETS.map((lv) => (
                      <option key={lv} value={lv}>
                        {lv}
                      </option>
                    ))}
                    <option value="custom">Custom…</option>
                  </select>
                  {customLevel && (
                    <input
                      type="number"
                      className={`${inputClass} w-24`}
                      min={1}
                      max={300}
                      value={itemLevel}
                      onChange={(e) =>
                        setItemLevel(Number(e.target.value) || 0)
                      }
                    />
                  )}
                </div>
              </label>
              <label className="flex flex-col gap-1">
                Trials
                <select
                  className={`${inputClass} min-w-[7rem]`}
                  value={trials}
                  onChange={(e) => setTrials(Number(e.target.value))}
                >
                  {TRIAL_PRESETS.map((n) => (
                    <option key={n} value={n}>
                      {n.toLocaleString()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Current ★
                <input
                  type="number"
                  className={`${inputClass} w-20`}
                  min={0}
                  max={29}
                  value={currentStar}
                  onChange={(e) =>
                    setCurrentStar(
                      Math.max(0, Math.min(29, Number(e.target.value) || 0)),
                    )
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                Target ★
                <input
                  type="number"
                  className={`${inputClass} w-20`}
                  min={1}
                  max={30}
                  value={targetStar}
                  onChange={(e) =>
                    setTargetStar(
                      Math.max(1, Math.min(30, Number(e.target.value) || 0)),
                    )
                  }
                />
              </label>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
            <h2 className="font-display text-lg font-semibold">Modifiers</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex flex-col gap-1">
                MVP discount (up to 17★)
                <select
                  className={`${inputClass} min-w-[10rem]`}
                  value={mvp}
                  onChange={(e) => setMvp(e.target.value as MvpTier)}
                >
                  {MVP_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Event
                <select
                  className={`${inputClass} min-w-[14rem]`}
                  value={event}
                  onChange={(e) => setEvent(e.target.value as SfEvent)}
                >
                  {EVENT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {tab === "simple" && (
              <label className="flex flex-col gap-1 text-sm">
                Enhancement Mode (15★–21★)
                <select
                  className={`${inputClass} max-w-xl`}
                  value={enhanceMode}
                  onChange={(e) =>
                    setEnhanceMode(Number(e.target.value) as EnhanceMode)
                  }
                >
                  {([1, 2, 3, 4] as EnhanceMode[]).map((m) => (
                    <option key={m} value={m}>
                      {MODE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={starCatching}
                  onChange={(e) => setStarCatching(e.target.checked)}
                  className="size-4 accent-[var(--accent)]"
                />
                Star catching (+5% mult.)
              </label>
              {tab === "simple" && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={safeguard}
                    onChange={(e) => setSafeguard(e.target.checked)}
                    className="size-4 accent-[var(--accent)]"
                  />
                  Safeguard to 18★
                  {enhanceMode >= 2 && (
                    <span className="opacity-60">
                      (15–17★ uses Mode 1 + SG)
                    </span>
                  )}
                </label>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-border/30 pt-3">
              <button
                type="button"
                onClick={() => void runSim()}
                disabled={pending || !canRun}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {pending
                  ? `Running… ${Math.round(progress * 100)}%`
                  : "Run simulation"}
              </button>
              {expectedPreview && (
                <p className="text-xs opacity-70">
                  Expected (analytic): {formatMesos(expectedPreview.expCost)}{" "}
                  meso · {formatNum(expectedPreview.expBooms, 2)} booms
                </p>
              )}
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
          </section>

          {tab === "perstar" && (
            <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
              <h2 className="font-display text-lg font-semibold">
                Per-star mode
              </h2>
              <p className="text-xs opacity-70">
                Each step picks its own mode. Safeguard (15–17★) only stacks on
                Mode 1. Stars below your current ★ stay editable for re-climb
                after a boom (e.g. 22★ → {destroyRecoverStar(21)}★).
              </p>
              <div className="maple-table-scroll">
                <table className="w-full min-w-[28rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-left">
                      <th className="py-1.5 pr-3 font-semibold">★</th>
                      <th className="px-2 py-1.5 font-semibold">Mode</th>
                      <th className="px-2 py-1.5 text-right font-semibold">
                        Boom
                      </th>
                      <th className="px-2 py-1.5 text-right font-semibold">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODE_STARS.filter((s) => s < targetStar).map((star) => {
                      const entry = starPlan[star] ?? {
                        mode: 1 as EnhanceMode,
                        safeguard: false,
                      };
                      const opts = starChoiceOptions(star);
                      const stepOpts: SimOpts = {
                        ...baseOpts,
                        starPlan: { [star]: entry },
                        enhanceMode: 1,
                        safeguard: false,
                      };
                      const cost = paidAttemptCost(itemLevel, star, stepOpts);
                      const [, , b] = applyRateModifiers(star, stepOpts);
                      const reClimb = star < currentStar;
                      return (
                        <tr key={star} className="border-b border-border/20">
                          <td className="py-1.5 pr-3 tabular-nums">
                            {star} → {star + 1}
                            {reClimb && (
                              <span className="ml-1 text-xs opacity-60">
                                re-climb
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              className={inputClass}
                              value={choiceKey(entry)}
                              onChange={(e) => {
                                const next = parseChoice(e.target.value);
                                setStarPlan((prev) => ({
                                  ...prev,
                                  [star]: next,
                                }));
                              }}
                            >
                              {opts.map((o) => (
                                <option key={o.key} value={o.key}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {(b * 100).toFixed(2)}%
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {formatMesos(cost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
            <h2 className="font-display text-lg font-semibold">
              Boom rates by mode (15–21)
            </h2>
            <div className="maple-table-scroll">
              <table className="w-full min-w-[24rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left">
                    <th className="py-1.5 pr-3 font-semibold">Step</th>
                    {([1, 2, 3, 4] as EnhanceMode[]).map((m) => (
                      <th
                        key={m}
                        className="px-2 py-1.5 text-right font-semibold"
                      >
                        Mode {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {boomMatrixStars.map((star) => (
                    <tr key={star} className="border-b border-border/20">
                      <td className="py-1.5 pr-3 tabular-nums opacity-80">
                        {star} → {star + 1}
                      </td>
                      {([1, 2, 3, 4] as EnhanceMode[]).map((m) => {
                        const pct =
                          star <= 17 && m === 4
                            ? "—"
                            : `${boomPercent(star, m).toFixed(2)}%`;
                        return (
                          <td
                            key={m}
                            className="px-2 py-1.5 text-right tabular-nums"
                          >
                            {pct}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === "optimizer" && (
        <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
          <h2 className="font-display text-lg font-semibold">Optimizer</h2>
          <p className="text-sm opacity-75">
            Finds the mode &amp; safeguard plan with the best chance of reaching
            your target for your meso budget and spare count — searching
            combinations for stars 15–21 below your target, then filling the
            Per-star matrix. Uses item level, event, MVP, and star catching from
            Simple.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex flex-col gap-1">
              Meso budget (billions)
              <input
                type="number"
                className={`${inputClass} w-28`}
                min={0}
                step={0.1}
                value={budgetBillions}
                onChange={(e) =>
                  setBudgetBillions(Number(e.target.value) || 0)
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              Spare items (booms you can take)
              <input
                type="number"
                className={`${inputClass} w-28`}
                min={0}
                value={spares}
                onChange={(e) => setSpares(Number(e.target.value) || 0)}
              />
            </label>
            <label className="flex flex-col gap-1">
              Item level
              <input
                type="number"
                className={`${inputClass} w-24`}
                value={itemLevel}
                onChange={(e) => setItemLevel(Number(e.target.value) || 0)}
              />
            </label>
            <label className="flex flex-col gap-1">
              Current → Target
              <div className="flex gap-1">
                <input
                  type="number"
                  className={`${inputClass} w-16`}
                  value={currentStar}
                  onChange={(e) =>
                    setCurrentStar(Number(e.target.value) || 0)
                  }
                />
                <span className="self-center opacity-60">→</span>
                <input
                  type="number"
                  className={`${inputClass} w-16`}
                  value={targetStar}
                  onChange={(e) => setTargetStar(Number(e.target.value) || 0)}
                />
              </div>
            </label>
          </div>
          <button
            type="button"
            onClick={runOptimize}
            disabled={optPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {optPending ? "Optimizing…" : "Optimize"}
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
          {optResult && (
            <div className="space-y-2 rounded-lg border border-border/30 bg-background/50 p-3 text-sm">
              <p>
                Success chance:{" "}
                <span className="font-semibold tabular-nums text-accent">
                  {(optResult.successRate * 100).toFixed(1)}%
                </span>{" "}
                within {formatMesos(budgetBillions * 1e9)} and {spares} spares
              </p>
              <p className="opacity-80">
                Expected cost {formatMesos(optResult.expCost)} · expected booms{" "}
                {formatNum(optResult.expBooms, 2)} · searched{" "}
                {optResult.evaluated.toLocaleString()} plans
              </p>
              <p className="text-xs opacity-60">
                Best plan applied to the Per-star tab.
              </p>
            </div>
          )}
        </section>
      )}

      {tab === "fodder" && (
        <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
          <h2 className="font-display text-lg font-semibold">
            Fodder &amp; star transfer
          </h2>
          <p className="text-sm opacity-75">
            Compare enhancing a cheaper fodder and transferring stars onto the
            real item vs tapping the target directly. Goal capped at 22★ (zero-boom
            plan exists through 21★).
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex flex-col gap-1">
              Target item level
              <input
                type="number"
                className={`${inputClass} w-24`}
                value={itemLevel}
                onChange={(e) => setItemLevel(Number(e.target.value) || 0)}
              />
            </label>
            <label className="flex flex-col gap-1">
              Fodder item level
              <input
                type="number"
                className={`${inputClass} w-24`}
                value={fodderLevel}
                onChange={(e) => setFodderLevel(Number(e.target.value) || 0)}
              />
            </label>
            <label className="flex flex-col gap-1">
              Goal ★
              <input
                type="number"
                className={`${inputClass} w-20`}
                min={16}
                max={22}
                value={Math.min(22, Math.max(16, targetStar))}
                onChange={(e) =>
                  setTargetStar(
                    Math.min(22, Math.max(16, Number(e.target.value) || 16)),
                  )
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fodderSafeguard}
                onChange={(e) => setFodderSafeguard(e.target.checked)}
                className="size-4 accent-[var(--accent)]"
              />
              Safeguard fodder 15–17★
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showFodderPrices}
                onChange={(e) => setShowFodderPrices(e.target.checked)}
                className="size-4 accent-[var(--accent)]"
              />
              Set item prices
            </label>
          </div>
          {showFodderPrices && (
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex flex-col gap-1">
                Fodder copy price (millions · 0 to ignore)
                <input
                  type="number"
                  className={`${inputClass} w-32`}
                  min={0}
                  value={fodderPriceM}
                  onChange={(e) =>
                    setFodderPriceM(Number(e.target.value) || 0)
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                Target spare price (millions · 0 if priceless)
                <input
                  type="number"
                  className={`${inputClass} w-32`}
                  min={0}
                  value={sparePriceM}
                  onChange={(e) => setSparePriceM(Number(e.target.value) || 0)}
                />
              </label>
            </div>
          )}
          <button
            type="button"
            onClick={runFodder}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Compare
          </button>
          {fodderResult && (
            <div className="space-y-3 text-sm">
              {!fodderResult.levelGapOk && (
                <p className="text-danger">
                  Fodder must be ≤ target level and within 10 levels for
                  transfer.
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border/30 p-3">
                  <p className="font-semibold">Raw cheapest (Mode 1)</p>
                  <p className="tabular-nums opacity-80">
                    {formatMesos(fodderResult.rawCheap.mesos)} meso ·{" "}
                    {formatNum(fodderResult.rawCheap.spares, 2)} spares
                  </p>
                  {sparePriceM > 0 && (
                    <p className="text-xs opacity-60">
                      Total w/ spares:{" "}
                      {formatMesos(fodderResult.rawCheap.total)}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-border/30 p-3">
                  <p className="font-semibold">Raw zero-boom</p>
                  <p className="tabular-nums opacity-80">
                    {formatMesos(fodderResult.rawZero.mesos)} meso · 0 spares
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
                <p className="font-semibold text-accent">
                  Best transfer at {fodderResult.best.transferAt}★
                </p>
                <p className="tabular-nums opacity-90">
                  {formatMesos(fodderResult.best.total)} total ·{" "}
                  {formatNum(fodderResult.best.copies, 2)} fodder copies ·
                  finish from {fodderResult.best.startStar}★
                </p>
                <p className="text-xs opacity-60">
                  Fodder climb {formatMesos(fodderResult.best.fodderMesos)} +
                  finish {formatMesos(fodderResult.best.finishMesos)}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {result && (tab === "simple" || tab === "perstar") && (
        <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
          <h2 className="font-display text-lg font-semibold">Results</h2>
          <p className="text-xs opacity-60">
            {result.trials.toLocaleString()} trials
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Average cost", formatMesos(result.avgCost)],
                ["Median cost", formatMesos(result.medianCost)],
                ["Avg booms", formatNum(result.avgBooms, 2)],
                ["Median attempts", formatNum(result.medianAttempts, 0)],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-border/30 bg-background/40 p-3"
              >
                <p className="text-xs opacity-70">{label}</p>
                <p className="mt-1 font-display text-xl font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="maple-table-scroll">
            <table className="w-full min-w-[20rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left">
                  <th className="py-1.5 pr-3 font-semibold">Percentile</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["25%", result.p25],
                    ["75%", result.p75],
                    ["95%", result.p95],
                  ] as const
                ).map(([label, cost]) => (
                  <tr key={label} className="border-b border-border/20">
                    <td className="py-1.5 pr-3 opacity-80">{label}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatMesos(cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs opacity-60">
        Rates and costs sourced from{" "}
        <a
          href="https://starforce.tadeucci.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline"
        >
          starforce.tadeucci.dev
        </a>{" "}
        (GMS v269).
      </p>
    </div>
  );
}
