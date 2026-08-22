"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMapleDataReload } from "@/hooks/useMapleDataReload";
import {
  ensureActiveWorkspaceLoaded,
  persistLiveToWorkspace,
  activeCharacterKey,
} from "@/lib/character-workspace";
import { getCharName } from "@/lib/jobs";
import {
  DEFAULT_FLAME_PRICES,
  type PlannerInputs,
  type RankedUpgrade,
  type UpgradeKind,
} from "@/lib/planner";
import { hasEquipSetup, hasScouterStats, resolvePairing } from "@/lib/pairing";
import { countFilledSlots } from "@/lib/starter-loadouts";
import { storage } from "@/lib/storage";
import { formatMesosCompact } from "@/lib/bosses";

const KINDS: { id: UpgradeKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "starforce", label: "Star Force" },
  { id: "flame", label: "Flames" },
  { id: "cube", label: "Cubing" },
];

function formatFd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 10) return `${n.toFixed(1)}%`;
  if (Math.abs(n) >= 1) return `${n.toFixed(2)}%`;
  return `${n.toFixed(3)}%`;
}

function formatEff(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 100) return n.toFixed(1);
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

function kindLabel(kind: UpgradeKind): string {
  if (kind === "starforce") return "SF";
  if (kind === "flame") return "Flame";
  return "Cube";
}

export default function UpgradePlannerPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankedUpgrade[]>([]);
  const [pending, setPending] = useState(false);
  const [kindFilter, setKindFilter] = useState<UpgradeKind | "all">("all");
  const [meta, setMeta] = useState<{
    classLabel: string;
    equipCount: number;
    paired: boolean;
  }>({ classLabel: "", equipCount: 0, paired: false });

  const buildInputs = useCallback((): PlannerInputs | null => {
    ensureActiveWorkspaceLoaded();
    const resolved = resolvePairing();
    const last = storage.getScouterLast();
    const setup = storage.getEquipSetup();
    const flames = storage.getFlameSetup();
    const overrides = storage.getPlannerOverrides();
    const jobType =
      storage.getJobType() ||
      resolved?.jobType ||
      last?.input?.jobType ||
      "";
    const charType =
      storage.getCharType() ||
      resolved?.charType ||
      last?.input?.charType ||
      "";
    const scouter = resolved?.scouter ?? last?.input;
    if (!scouter) return null;
    if (countFilledSlots(setup) === 0) return null;
    return {
      scouter,
      setup: resolved?.setup ?? setup,
      flames,
      overrides,
      jobType,
      charType,
      flamePrices: { ...DEFAULT_FLAME_PRICES },
      topN: 50,
    };
  }, []);

  const refreshMeta = useCallback(() => {
    ensureActiveWorkspaceLoaded();
    const resolved = resolvePairing();
    const last = storage.getScouterLast();
    const setup = storage.getEquipSetup();
    const jobType =
      storage.getJobType() ||
      resolved?.jobType ||
      last?.input?.jobType ||
      "";
    const charType =
      storage.getCharType() ||
      resolved?.charType ||
      last?.input?.charType ||
      "";
    setMeta({
      classLabel:
        jobType && charType ? getCharName(jobType, charType) : "Unknown class",
      equipCount: countFilledSlots(setup),
      paired: Boolean(resolved),
    });
    setReady(true);
  }, []);

  useMapleDataReload(refreshMeta);

  const runRank = useCallback(async () => {
    setError(null);
    const inputs = buildInputs();
    if (!inputs) {
      setRanking([]);
      if (!hasScouterStats()) {
        setError("Enter Scouter stats for the active character first.");
      } else if (!hasEquipSetup()) {
        setError("Build an Equipment Setup for the active character first.");
      } else {
        setError("Need paired or live Scouter + Equipment data.");
      }
      return;
    }
    setPending(true);
    try {
      const { rankUpgrades } = await import("@/lib/planner/rank");
      const kinds =
        kindFilter === "all"
          ? undefined
          : ([kindFilter] as UpgradeKind[]);
      const ranked = rankUpgrades(inputs, { kinds, topN: 40 });
      setRanking(ranked);
      if (ranked.length === 0) {
        setError(
          "No positive-FD upgrades found for the current gear (try adding pieces or lowering SF).",
        );
      }
    } catch (err) {
      setRanking([]);
      setError(err instanceof Error ? err.message : "Ranking failed");
    } finally {
      setPending(false);
    }
  }, [buildInputs, kindFilter]);

  useEffect(() => {
    if (!ready) return;
    void runRank();
  }, [ready, kindFilter, runRank]);

  const onSwitched = () => {
    persistLiveToWorkspace(activeCharacterKey());
    ensureActiveWorkspaceLoaded();
    refreshMeta();
  };

  const filtered = useMemo(() => ranking, [ranking]);

  const canRun = meta.equipCount > 0 && hasScouterStats();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Upgrade Planner
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Rank Star Force, flame, and cubing upgrades by expected boss FD% per
          billion mesos using your active character&apos;s Scouter + Equipment
          Setup.
        </p>
      </header>
<section className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-surface/90 px-3 py-2.5">
        <span className="text-xs font-semibold opacity-70">
          {meta.classLabel || "—"}
        </span>
        <span className="text-xs opacity-50">·</span>
        <span className="text-xs font-semibold opacity-70">
          {meta.equipCount > 0
            ? `${meta.equipCount} equips`
            : "No equips"}
        </span>
        <span className="text-xs opacity-50">·</span>
        <span
          className={[
            "text-xs font-semibold",
            meta.paired ? "text-accent" : "opacity-60",
          ].join(" ")}
        >
          {meta.paired ? "Paired" : "Using live draft"}
        </span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <Link
            href="/calc/scouter"
            className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted"
          >
            Scouter
          </Link>
          <Link
            href="/calc/equips/setup"
            className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted"
          >
            Equipment
          </Link>
          <button
            type="button"
            onClick={() => void runRank()}
            disabled={pending || !canRun}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "Ranking…" : "Re-rank"}
          </button>
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKindFilter(k.id)}
            className={[
              "rounded-md border px-2.5 py-1.5 text-xs font-semibold transition",
              kindFilter === k.id
                ? "border-accent bg-accent/15 text-accent"
                : "border-border/50 hover:bg-surface-muted",
            ].join(" ")}
          >
            {k.label}
          </button>
        ))}
      </div>

      {error ? (
        <p
          role="status"
          className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm"
        >
          {error}{" "}
          {!canRun ? (
            <>
              <Link href="/calc/scouter" className="font-semibold text-accent hover:underline">
                Open Scouter
              </Link>
              {" · "}
              <Link
                href="/calc/equips/setup"
                className="font-semibold text-accent hover:underline"
              >
                Equipment Setup
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      {!pending && filtered.length > 0 ? (
        <div className="maple-table-scroll rounded-xl border border-border/50">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead className="bg-surface-muted/60 text-xs uppercase tracking-wide opacity-70">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Upgrade</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold tabular-nums">FD%</th>
                <th className="px-3 py-2 font-semibold tabular-nums">Cost</th>
                <th className="px-3 py-2 font-semibold tabular-nums">
                  FD% / B
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={row.id}
                  className="border-t border-border/40 odd:bg-surface/40"
                >
                  <td className="px-3 py-2 tabular-nums opacity-55">
                    {i + 1}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-semibold">{row.label}</p>
                    <p className="text-xs opacity-60">{row.detail}</p>
                    {row.notes ? (
                      <p className="text-[10px] opacity-45">{row.notes}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded border border-border/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                      {kindLabel(row.kind)}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-semibold tabular-nums text-accent">
                    +{formatFd(row.fdPercent)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatMesosCompact(row.mesoCost)}
                  </td>
                  <td className="px-3 py-2 font-semibold tabular-nums">
                    {formatEff(row.fdPerBillionMeso)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {pending ? (
        <p className="text-sm opacity-60">Ranking upgrades…</p>
      ) : null}

      <p className="text-[10px] opacity-50">
        Costs are Heroic / GMS approximations. Efficiency = FD% per 1B mesos.
        Pair Scouter + Equipment for the most accurate base.
      </p>
    </div>
  );
}
