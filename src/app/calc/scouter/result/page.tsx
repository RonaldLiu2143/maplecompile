"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  defaultBuffState,
  defaultHexaLevels,
  defaultLinkState,
  defaultScouterInput,
} from "@/lib/scouter";
import {
  DEFAULT_CHAR,
  DEFAULT_JOB,
  getCharName,
} from "@/lib/jobs";
import { storage } from "@/lib/storage";
import type { MapleScouterCalculatedData } from "@/lib/scouter/to-user-stat";

function formatNum(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function StatBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/50 bg-surface/90 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide opacity-60">
        {title}
      </h2>
      {children}
    </section>
  );
}

function MetricRow({
  label,
  value,
  digits = 0,
  sub,
}: {
  label: string;
  value: number | string;
  digits?: number;
  sub?: string;
}) {
  const display =
    typeof value === "number" ? formatNum(value, digits) : value;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/30 py-1.5 last:border-0">
      <span className="text-sm opacity-70">{label}</span>
      <div className="text-right">
        <span className="font-semibold tabular-nums">{display}</span>
        {sub ? (
          <p className="text-[11px] opacity-50 tabular-nums">{sub}</p>
        ) : null}
      </div>
    </div>
  );
}

function RadarChart({
  scores,
}: {
  scores: {
    label: string;
    value: number;
  }[];
}) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 78;
  const max = Math.max(...scores.map((s) => s.value), 1);
  const n = scores.length;
  const point = (i: number, r: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };
  const poly = scores
    .map((s, i) => {
      const p = point(i, (s.value / max) * radius);
      return `${p.x},${p.y}`;
    })
    .join(" ");
  const rings = [0.33, 0.66, 1];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto h-56 w-56"
      role="img"
      aria-label="Scouter hexagon graph"
    >
      {rings.map((t) => (
        <polygon
          key={t}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
          points={Array.from({ length: n }, (_, i) => {
            const p = point(i, radius * t);
            return `${p.x},${p.y}`;
          }).join(" ")}
        />
      ))}
      {scores.map((s, i) => {
        const p = point(i, radius);
        return (
          <line
            key={s.label}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="currentColor"
            strokeOpacity={0.12}
          />
        );
      })}
      <polygon
        points={poly}
        fill="var(--accent)"
        fillOpacity={0.28}
        stroke="var(--accent)"
        strokeWidth={2}
      />
      {scores.map((s, i) => {
        const p = point(i, radius + 16);
        return (
          <text
            key={s.label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current text-[10px] font-semibold opacity-70"
          >
            {s.label}
          </text>
        );
      })}
    </svg>
  );
}

export default function ScouterDetailedResultPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MapleScouterCalculatedData | null>(null);
  const [level, setLevel] = useState(275);
  const [charLabel, setCharLabel] = useState("Adele");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const last = storage.getScouterLast();
        const job = last?.input?.jobType || DEFAULT_JOB;
        const char = last?.input?.charType || DEFAULT_CHAR;
        const input = {
          ...defaultScouterInput(job, char),
          ...(last?.input ?? {}),
        };
        const buffs = last?.buffs ?? defaultBuffState();
        const links = last?.links ?? defaultLinkState();
        const hexa = last?.hexa ?? defaultHexaLevels();

        if (!cancelled) {
          setLevel(input.level);
          setCharLabel(getCharName(input.jobType, input.charType));
        }

        const res = await fetch("/api/scouter/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, buffs, links, hexa }),
        });
        const json = (await res.json()) as {
          calculatedData?: MapleScouterCalculatedData | null;
          error?: string;
        };
        if (!res.ok || !json.calculatedData) {
          throw new Error(json.error || `Request failed (${res.status})`);
        }
        if (!cancelled) setData(json.calculatedData);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Result failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const eff = data?.specEfficiency ?? {};
  const scores = useMemo(() => {
    const c = data?.maple_scouter_const ?? {};
    return [
      { label: "STAT", value: c.stat_score ?? 0 },
      { label: "ATT", value: c.attack_score ?? 0 },
      { label: "ATT%", value: c.attackPer_score ?? 0 },
      { label: "DMG", value: c.damage_score ?? 0 },
      { label: "CD", value: c.criDamage_score ?? 0 },
      { label: "IED", value: c.def_score ?? 0 },
    ];
  }, [data]);

  const attPer40Bd =
    (eff.atkeff1 ?? 0) > 0 && (eff.dmgeff1 ?? 0) > 0
      ? (40 * (eff.dmgeff1 as number)) / (eff.atkeff1 as number)
      : 0;
  const attPer45Bd =
    (eff.atkeff1 ?? 0) > 0 && (eff.dmgeff1 ?? 0) > 0
      ? (45 * (eff.dmgeff1 as number)) / (eff.atkeff1 as number)
      : 0;
  const mainPerAtt =
    (eff.mainStateff1 ?? 0) > 0 && (eff.atkeff1 ?? 0) > 0
      ? (eff.atkeff1 as number) / (eff.mainStateff1 as number)
      : 0;
  const mainPerCd =
    (eff.mainStateff1 ?? 0) > 0 && (eff.cridmgeff1 ?? 0) > 0
      ? (eff.cridmgeff1 as number) / (eff.mainStateff1 as number)
      : 0;
  const mainPerAllStat =
    (eff.mainStateff1 ?? 0) > 0 && (eff.allStatEff ?? 0) > 0
      ? (eff.allStatEff as number) / (eff.mainStateff1 as number)
      : 0;
  const attPer40Ied =
    (eff.atkeff1 ?? 0) > 0 && (eff.igreffminus40 ?? 0) > 0
      ? ((eff.igreffminus40 as number) * 40) / (eff.atkeff1 as number)
      : 0;

  const hexaRows = useMemo(() => {
    const effect = data?.hexaEffect ?? {};
    const labels: Record<string, string> = {
      masteryCore1: "Mastery 1",
      masteryCore2: "Mastery 2",
      masteryCore3: "Mastery 3",
      masteryCore4: "Mastery 4",
      reinCore1: "Reinforcement 1",
      reinCore2: "Reinforcement 2",
      reinCore3: "Reinforcement 3",
      reinCore4: "Reinforcement 4",
      skillCore1: "Skill Core 1",
      skillCore2: "Skill Core 2",
      skillCore3: "Skill Core 3",
      generalCore2: "Sol Hecate",
      generalCore3: "Class Common",
      generalCore4: "General 4",
    };
    return Object.entries(labels)
      .map(([key, label]) => ({
        key,
        label,
        mult: effect[key] ?? 0,
      }))
      .filter((r) => r.mult > 0 && Math.abs(r.mult - 1) > 0.0001);
  }, [data]);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Detailed Information
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Lv.{level} {charLabel}
          </h1>
          <p className="mt-1 text-sm opacity-60">
            Full MapleScouter-style result breakdown
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/calc/scouter"
            className="rounded-md border-2 border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-surface-muted"
          >
            Edit
          </Link>
          <button
            type="button"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            disabled={loading}
            onClick={() => window.location.reload()}
          >
            {loading ? "Calculating…" : "Recalculate"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="rounded-lg border border-border/50 bg-surface/80 py-16 text-center text-sm opacity-70">
          Calculating via MapleScouter…
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-danger/40 bg-surface/80 px-4 py-6 text-center text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {!loading && !error && data ? (
        <>
          <StatBlock title="Boss Converted Stat">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold">Boss 300</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs opacity-60">Normal</p>
                    <p className="font-display text-3xl font-bold tabular-nums">
                      {formatNum(data.boss300_stat ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs opacity-60">HEXA</p>
                    <p className="font-display text-3xl font-bold tabular-nums">
                      {formatNum(data.boss300_hexaStat ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Boss 380</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs opacity-60">Normal</p>
                    <p className="font-display text-3xl font-bold tabular-nums">
                      {formatNum(data.boss380_stat ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs opacity-60">HEXA</p>
                    <p className="font-display text-3xl font-bold tabular-nums">
                      {formatNum(data.boss380_hexaStat ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </StatBlock>

          <div className="grid gap-3 lg:grid-cols-2">
            <StatBlock title="Scouter Graph">
              <RadarChart scores={scores} />
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                {scores.map((s) => (
                  <div key={s.label} className="rounded bg-surface-muted/50 px-1 py-1.5">
                    <p className="opacity-60">{s.label}</p>
                    <p className="font-semibold tabular-nums">
                      {formatNum(s.value)}
                    </p>
                  </div>
                ))}
              </div>
            </StatBlock>

            <StatBlock title="Stat Efficiency">
              <div className="space-y-0">
                <MetricRow
                  label="ATT/MATT per 40% BD"
                  value={attPer40Bd}
                  digits={1}
                />
                <MetricRow
                  label="ATT/MATT per 45% BD"
                  value={attPer45Bd}
                  digits={1}
                />
                <MetricRow
                  label="ATT/MATT per 40% IED"
                  value={attPer40Ied}
                  digits={1}
                />
                <MetricRow
                  label="STAT per 1 ATT/MATT"
                  value={mainPerAtt}
                  digits={2}
                />
                <MetricRow
                  label="STAT per 1% Crit Damage"
                  value={mainPerCd}
                  digits={2}
                />
                <MetricRow
                  label="STAT per 1% All Stat"
                  value={mainPerAllStat}
                  digits={2}
                />
                <MetricRow
                  label="Main Stat Eff."
                  value={eff.mainStateff1 ?? 0}
                  digits={2}
                />
                <MetricRow
                  label="ATT Eff."
                  value={eff.atkeff1 ?? 0}
                  digits={2}
                />
                <MetricRow
                  label="Crit Damage Eff."
                  value={eff.cridmgeff1 ?? 0}
                  digits={2}
                />
                <MetricRow
                  label="IED Eff."
                  value={eff.igreff1 ?? 0}
                  digits={2}
                />
              </div>
            </StatBlock>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <StatBlock title="Special Efficiency (Seed Rings)">
              <div className="space-y-0">
                <MetricRow
                  label="Restraint Ring"
                  value={`${formatNum(((data.restraintEff1 ?? 1) - 1) * 100, 2)}%`}
                  sub={`×${formatNum(data.restraintEff1 ?? 1, 3)}`}
                />
                <MetricRow
                  label="Weapon Jump Ring"
                  value={`${formatNum(((data.weaponEff1 ?? 1) - 1) * 100, 2)}%`}
                  sub={`×${formatNum(data.weaponEff1 ?? 1, 3)}`}
                />
              </div>
              <p className="mt-3 text-xs opacity-50">
                Efficiency vs continuous / alternate seed setups from MapleScouter
                CALC_DMG.
              </p>
            </StatBlock>

            <StatBlock title="HEXA Core Multipliers">
              {hexaRows.length === 0 ? (
                <p className="text-sm opacity-60">No active HEXA multipliers.</p>
              ) : (
                <div className="max-h-64 space-y-0 overflow-y-auto">
                  {hexaRows.map((r) => (
                    <MetricRow
                      key={r.key}
                      label={r.label}
                      value={`×${formatNum(r.mult, 4)}`}
                    />
                  ))}
                </div>
              )}
            </StatBlock>
          </div>

          <StatBlock title="Boss Clear (Cut)">
            <p className="mb-3 text-sm opacity-70">
              Reference converted stats used for boss standards. Compare these to
              MapleScouter boss cuts (Normal uses Boss 300 / 380).
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-border/40 bg-background/60 p-3">
                <p className="text-xs opacity-60">Boss 300 Normal</p>
                <p className="font-display text-2xl font-bold tabular-nums">
                  {formatNum(data.boss300_stat ?? 0)}
                </p>
              </div>
              <div className="rounded-md border border-border/40 bg-background/60 p-3">
                <p className="text-xs opacity-60">Boss 300 HEXA</p>
                <p className="font-display text-2xl font-bold tabular-nums">
                  {formatNum(data.boss300_hexaStat ?? 0)}
                </p>
              </div>
              <div className="rounded-md border border-border/40 bg-background/60 p-3">
                <p className="text-xs opacity-60">Boss 380 Normal</p>
                <p className="font-display text-2xl font-bold tabular-nums">
                  {formatNum(data.boss380_stat ?? 0)}
                </p>
              </div>
              <div className="rounded-md border border-border/40 bg-background/60 p-3">
                <p className="text-xs opacity-60">Boss 380 HEXA</p>
                <p className="font-display text-2xl font-bold tabular-nums">
                  {formatNum(data.boss380_hexaStat ?? 0)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs opacity-50">
              Full per-boss clear grid (party / solo / force checks) matches
              MapleScouter&apos;s boss standard tables and can be expanded later.
            </p>
          </StatBlock>
        </>
      ) : null}
    </div>
  );
}
