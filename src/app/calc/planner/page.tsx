"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PairingBar } from "@/components/PairingBar";
import {
  DEFAULT_FLAME_PRICES,
  defaultPotentialTier,
  defaultStarForce,
  flattenEquips,
  type PlannerOverrides,
  type RankedUpgrade,
  type UpgradeKind,
} from "@/lib/planner";
import { clampStarForce, getStarForceCap } from "@/lib/equip-capabilities";
import {
  formatPairingLabel,
  resolvePairing,
  type ScouterEquipPairing,
} from "@/lib/pairing";
import { storage } from "@/lib/storage";
import type { EquipSetup, FlameSetup } from "@/lib/types";
import type { ScouterInput } from "@/lib/scouter/types";

const KIND_META: Record<UpgradeKind, { label: string; badge: string }> = {
  starforce: {
    label: "Star Force",
    badge: "bg-amber-600/90 text-white",
  },
  flame: {
    label: "Flame",
    badge: "bg-rose-600/90 text-white",
  },
  cube: {
    label: "Cube",
    badge: "bg-sky-700/90 text-white",
  },
};

function formatMeso(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return Math.round(n).toLocaleString();
}

function formatFd(n: number): string {
  return `${n.toLocaleString(undefined, {
    maximumFractionDigits: 3,
    minimumFractionDigits: 3,
  })}%`;
}

function formatEff(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  if (n >= 100) return n.toFixed(1);
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

export default function PlannerPage() {
  const [hydrated, setHydrated] = useState(false);
  const [pairing, setPairing] = useState<ScouterEquipPairing | null>(null);
  const [pairLabel, setPairLabel] = useState<string | null>(null);
  const [setup, setSetup] = useState<EquipSetup>({});
  const [flames, setFlames] = useState<FlameSetup>({});
  const [overrides, setOverrides] = useState<PlannerOverrides>({});
  const [scouter, setScouter] = useState<ScouterInput | null>(null);
  const [jobType, setJobType] = useState("warrior");
  const [charType, setCharType] = useState("adele");
  const [kinds, setKinds] = useState<Record<UpgradeKind, boolean>>({
    starforce: true,
    flame: true,
    cube: true,
  });
  const [slotFilter, setSlotFilter] = useState<string>("all");
  const [rrfPrice, setRrfPrice] = useState<number>(DEFAULT_FLAME_PRICES.rrf);
  const [crfPrice, setCrfPrice] = useState<number>(DEFAULT_FLAME_PRICES.crf);
  const [topN, setTopN] = useState(25);
  const [ranked, setRanked] = useState<RankedUpgrade[]>([]);
  const [ranking, setRanking] = useState(false);

  const loadPaired = useCallback(() => {
    const resolved = resolvePairing();
    const savedFlames = storage.getFlameSetup();
    const savedOverrides = storage.getPlannerOverrides();
    setFlames(savedFlames);
    setOverrides(savedOverrides);

    if (!resolved) {
      setPairing(null);
      setPairLabel(null);
      setScouter(null);
      setSetup(storage.getEquipSetup());
      return;
    }

    setPairing(resolved.pairing);
    setPairLabel(resolved.label);
    setScouter(resolved.scouter);
    setSetup(resolved.setup);
    setJobType(resolved.jobType);
    setCharType(resolved.charType);
  }, []);

  useEffect(() => {
    loadPaired();
    setHydrated(true);
  }, [loadPaired]);

  const pieces = useMemo(
    () =>
      hydrated && pairing ? flattenEquips(setup, flames, overrides) : [],
    [hydrated, pairing, setup, flames, overrides],
  );

  const equipCount = pieces.length;
  const isPaired = pairing != null && scouter != null;

  const activeKinds = useMemo(() => {
    return (Object.keys(kinds) as UpgradeKind[]).filter((k) => kinds[k]);
  }, [kinds]);

  useEffect(() => {
    if (
      !hydrated ||
      !isPaired ||
      !scouter ||
      equipCount === 0 ||
      activeKinds.length === 0
    ) {
      setRanked([]);
      return;
    }
    let cancelled = false;
    setRanking(true);
    (async () => {
      try {
        const { rankUpgrades } = await import("@/lib/planner/rank");
        let list = rankUpgrades(
          {
            scouter,
            setup,
            flames,
            overrides,
            jobType,
            charType,
            flamePrices: {
              ...DEFAULT_FLAME_PRICES,
              rrf: rrfPrice,
              crf: crfPrice,
            },
            topN: 80,
          },
          { kinds: activeKinds, topN: 80 },
        );
        if (slotFilter !== "all") {
          list = list.filter((r) => r.slotKey === slotFilter);
        }
        if (!cancelled) setRanked(list.slice(0, topN));
      } catch (e) {
        console.error(e);
        if (!cancelled) setRanked([]);
      } finally {
        if (!cancelled) setRanking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    hydrated,
    isPaired,
    scouter,
    setup,
    flames,
    overrides,
    jobType,
    charType,
    rrfPrice,
    crfPrice,
    activeKinds,
    slotFilter,
    topN,
    equipCount,
  ]);

  const persistOverride = useCallback(
    (slotKey: string, patch: Partial<PlannerOverrides[string]>) => {
      setOverrides((prev) => {
        const piece = pieces.find((p) => p.slotKey === slotKey);
        const cur = prev[slotKey] ?? {
          starForce: piece
            ? clampStarForce(
                piece.equip,
                piece.starForce ?? defaultStarForce(piece.equip.level),
              )
            : 0,
          potentialTier:
            piece?.potentialTier ??
            defaultPotentialTier(piece?.equip.level ?? 140),
        };
        const next = {
          ...prev,
          [slotKey]: { ...cur, ...patch },
        };
        storage.setPlannerOverrides(next);
        return next;
      });
    },
    [pieces],
  );

  const slotOptions = useMemo(() => {
    const keys = Array.from(new Set(pieces.map((p) => p.slotKey))).sort();
    return keys;
  }, [pieces]);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Upgrade Planner
        </h1>
        <p className="text-sm opacity-70">Loading saved setup…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Upgrade Planner
        </h1>
        <p className="mt-2 max-w-3xl text-sm opacity-75">
          Heroic ranking of Star Force, flame, and cube upgrades by{" "}
          <span className="font-semibold text-foreground">FD% per meso</span>{" "}
          using your paired Scouter stats + Equipment Setup.
        </p>
      </header>

      <PairingBar onChange={() => loadPaired()} />

      {!isPaired ? (
        <section className="rounded-xl border-2 border-dashed border-accent/40 bg-accent-soft/20 px-5 py-10 text-center">
          <h2 className="font-display text-xl font-semibold">
            Pair Scouter + Equipment to unlock rankings
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm opacity-75">
            Planner needs a linked character (scouter FD% baseline) and gear
            grid so upgrade deltas use your SF / flames / potential — not
            silent defaults.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href="/guide"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
            >
              Open start guide
            </Link>
            <Link
              href="/calc/scouter"
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-muted"
            >
              Scouter
            </Link>
            <Link
              href="/calc/equips/setup"
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-muted"
            >
              Equipment Setup
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-border/50 bg-surface/90 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Sources</h2>
                <p className="mt-1 text-xs font-semibold text-accent">
                  {pairLabel ?? (pairing ? formatPairingLabel(pairing) : "")}
                </p>
                <p className="mt-1 text-xs opacity-65">
                  {equipCount} equipped · job{" "}
                  <span className="font-semibold">{jobType}</span> /{" "}
                  <span className="font-semibold">{charType}</span>
                  {" · scouter FD% via calculateScouter"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/calc/equips/setup"
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
                >
                  Equipment Setup
                </Link>
                <Link
                  href="/calc/scouter"
                  className="rounded-lg border border-border/50 bg-background px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-muted"
                >
                  Scouter
                </Link>
              </div>
            </div>

            {equipCount === 0 && (
              <p className="mt-4 text-sm opacity-80">
                Paired, but Equipment Setup is empty. Add gear (or a starter
                loadout), then return — rankings need current SF / flames /
                potential.
              </p>
            )}
          </section>

          {equipCount > 0 && (
            <>
              <section className="rounded-xl border border-border/50 bg-surface/90 p-4 sm:p-5">
                <h2 className="font-display text-lg font-semibold">Filters</h2>
                <div className="mt-3 flex flex-wrap gap-4">
                  {(Object.keys(KIND_META) as UpgradeKind[]).map((k) => (
                    <label
                      key={k}
                      className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold"
                    >
                      <input
                        type="checkbox"
                        className="size-3.5 accent-[var(--accent,#c2410c)]"
                        checked={kinds[k]}
                        onChange={(e) =>
                          setKinds((prev) => ({
                            ...prev,
                            [k]: e.target.checked,
                          }))
                        }
                      />
                      {KIND_META[k].label}
                    </label>
                  ))}
                  <label className="inline-flex items-center gap-2 text-sm">
                    <span className="opacity-70">Slot</span>
                    <select
                      className="rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent"
                      value={slotFilter}
                      onChange={(e) => setSlotFilter(e.target.value)}
                    >
                      <option value="all">All pieces</option>
                      {slotOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <span className="opacity-70">Top</span>
                    <select
                      className="rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent"
                      value={topN}
                      onChange={(e) => setTopN(Number(e.target.value))}
                    >
                      {[15, 25, 40].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <span className="opacity-70">RRF meso</span>
                    <input
                      type="number"
                      min={0}
                      step={1_000_000}
                      className="w-28 rounded border border-border bg-background px-2 py-1 outline-none focus:border-accent"
                      value={rrfPrice}
                      onChange={(e) =>
                        setRrfPrice(Number(e.target.value) || 0)
                      }
                    />
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <span className="opacity-70">CRF meso</span>
                    <input
                      type="number"
                      min={0}
                      step={1_000_000}
                      className="w-28 rounded border border-border bg-background px-2 py-1 outline-none focus:border-accent"
                      value={crfPrice}
                      onChange={(e) =>
                        setCrfPrice(Number(e.target.value) || 0)
                      }
                    />
                  </label>
                </div>
                <p className="mt-2 text-[11px] opacity-55">
                  Efficiency = FD% ÷ (meso / 1B). SF costs use GMS wiki formulas
                  + EV with safeguard 15–17. Flame/cube FD deltas are
                  approximate.
                </p>
              </section>

              <section className="rounded-xl border border-border/50 bg-surface/90 p-4 sm:p-5">
                <h2 className="font-display text-lg font-semibold">
                  Gear SF / potential
                </h2>
                <p className="mt-1 text-xs opacity-60">
                  Current piece state from Equipment Setup (and overrides).
                  Upgrade deltas are measured against your paired scouter
                  baseline.
                </p>
                <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border/40">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <thead className="sticky top-0 bg-surface-muted text-xs uppercase tracking-wide opacity-70">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Piece</th>
                        <th className="px-3 py-2 font-semibold">Lv</th>
                        <th className="px-3 py-2 font-semibold">SF ★</th>
                        <th className="px-3 py-2 font-semibold">Potential</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pieces.map((p) => (
                        <tr
                          key={`${p.slotKey}-${p.equip.id}`}
                          className="border-t border-border/30"
                        >
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              {p.equip.imgUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={p.equip.imgUrl}
                                  alt=""
                                  width={28}
                                  height={28}
                                  className="size-7 object-contain"
                                />
                              ) : null}
                              <div>
                                <div className="font-medium leading-tight">
                                  {p.equip.name}
                                </div>
                                <div className="text-[11px] opacity-55">
                                  {p.slotKey}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-1.5 tabular-nums">
                            {p.equip.level}
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              min={0}
                              max={getStarForceCap(p.equip)}
                              className="w-16 rounded border border-border bg-background px-1.5 py-0.5 tabular-nums outline-none focus:border-accent"
                              value={p.starForce}
                              onChange={(e) =>
                                persistOverride(p.slotKey, {
                                  starForce: clampStarForce(
                                    p.equip,
                                    Number(e.target.value) || 0,
                                  ),
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <select
                              className="rounded border border-border bg-background px-1.5 py-0.5 outline-none focus:border-accent"
                              value={p.potentialTier}
                              onChange={(e) =>
                                persistOverride(p.slotKey, {
                                  potentialTier: Number(e.target.value) as
                                    | 0
                                    | 1
                                    | 2
                                    | 3,
                                })
                              }
                            >
                              <option value={0}>Rare</option>
                              <option value={1}>Epic</option>
                              <option value={2}>Unique</option>
                              <option value={3}>Legendary</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-xl border border-border/50 bg-surface/90 p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-semibold">
                      Ranked upgrades
                    </h2>
                    <p className="mt-0.5 text-xs opacity-60">
                      {ranking
                        ? "Calculating…"
                        : `${ranked.length} shown · sorted by FD% / billion meso`}
                    </p>
                  </div>
                </div>

                {ranked.length === 0 ? (
                  <p className="text-sm opacity-75">
                    No positive-FD candidates with the current filters. Check SF
                    / pot values, enable upgrade types, or adjust scouter
                    stats.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border/40">
                    <table className="w-full min-w-[44rem] text-left text-sm">
                      <thead className="bg-surface-muted text-xs uppercase tracking-wide opacity-70">
                        <tr>
                          <th className="px-3 py-2 font-semibold">#</th>
                          <th className="px-3 py-2 font-semibold">Upgrade</th>
                          <th className="px-3 py-2 text-right font-semibold">
                            Meso
                          </th>
                          <th className="px-3 py-2 text-right font-semibold">
                            FD %
                          </th>
                          <th className="px-3 py-2 text-right font-semibold">
                            FD%/B
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranked.map((row, i) => (
                          <tr
                            key={row.id}
                            className="border-t border-border/30 align-top"
                          >
                            <td className="px-3 py-2 tabular-nums opacity-60">
                              {i + 1}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${KIND_META[row.kind].badge}`}
                                >
                                  {KIND_META[row.kind].label}
                                </span>
                                <span className="font-semibold">
                                  {row.label}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs opacity-65">
                                {row.detail}
                              </p>
                              {row.notes ? (
                                <p className="mt-0.5 text-[10px] opacity-45">
                                  {row.notes}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-right font-medium tabular-nums">
                              {formatMeso(row.mesoCost)}
                            </td>
                            <td className="px-3 py-2 text-right font-display font-bold tabular-nums text-accent">
                              +{formatFd(row.fdPercent)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">
                              {formatEff(row.fdPerBillionMeso)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
