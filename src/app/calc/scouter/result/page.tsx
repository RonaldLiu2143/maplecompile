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
  evaluateBossClears,
  difficultyRibbonClass,
  labelPillClass,
  type BossClearRow,
} from "@/lib/scouter/boss-cuts";
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

function formatPercent(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString(undefined, {
    maximumFractionDigits: n >= 100 ? 1 : 2,
    minimumFractionDigits: n >= 100 ? 1 : 2,
  })}%`;
}

function StatBlock({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/50 bg-surface/90 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide opacity-60">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function BossClearCard({ row }: { row: BossClearRow }) {
  const pctColor =
    row.clearPercent >= 200
      ? "text-sky-400"
      : row.clearPercent >= 100
        ? "text-sky-500"
        : row.clearPercent >= 90
          ? "text-amber-500"
          : "text-rose-500";

  const borderClass =
    row.label === "Can't Enter" || row.label === "Impossible"
      ? "border-rose-500/70"
      : row.difficulty === "Champion"
        ? "border-orange-400/70"
        : "border-border/50";

  return (
    <div
      className={`flex w-full flex-col items-center gap-1 rounded-md border bg-zinc-950/80 p-1.5 text-center dark:bg-zinc-900/80 ${borderClass}`}
    >
      <div className="relative w-full overflow-hidden rounded-sm bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.imgUrl}
          alt={`${row.difficulty} ${row.nameEn}`}
          width={72}
          height={72}
          className="aspect-square w-full object-cover"
          loading="lazy"
        />
        {row.cantEnter ? (
          <div className="absolute left-0.5 top-0.5 flex gap-0.5">
            <span className="rounded-full bg-rose-600 px-1 text-[8px] font-bold leading-4 text-white">
              {row.level > 0 ? "LV" : "F"}
            </span>
          </div>
        ) : null}
        <div
          className={`absolute inset-x-0 bottom-0 py-0.5 text-center text-[9px] font-extrabold uppercase tracking-wide ${difficultyRibbonClass(row.difficulty)}`}
        >
          {row.difficulty}
        </div>
      </div>

      <span
        className={`max-w-full truncate rounded px-1.5 py-0.5 text-[9px] font-bold leading-tight ${labelPillClass(row.label)}`}
        title={row.label}
      >
        {row.label}
      </span>

      <p className="text-[11px] font-semibold tabular-nums text-zinc-100">
        {formatNum(Math.round(row.userStat))}
      </p>

      <p className={`text-[10px] font-bold tabular-nums ${pctColor}`}>
        {row.isPartyBoss ? "[Party] " : ""}
        {formatPercent(row.clearPercent)}
      </p>
    </div>
  );
}

export default function ScouterDetailedResultPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MapleScouterCalculatedData | null>(null);
  const [level, setLevel] = useState(275);
  const [charLabel, setCharLabel] = useState("Adele");
  const [arcaneForce, setArcaneForce] = useState(0);
  const [authenticForce, setAuthenticForce] = useState(0);
  const [relevantOnly, setRelevantOnly] = useState(true);

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
          setArcaneForce(input.arcaneForce);
          setAuthenticForce(input.sacredForce);
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

  const bossRows = useMemo(() => {
    if (!data) return [];
    const boss300 = Number(data.boss300_hexaStat ?? data.boss300_stat ?? 0);
    const boss380 = Number(data.boss380_hexaStat ?? data.boss380_stat ?? 0);
    const damage300 = Number(data.calculatedHexaDamage_300 ?? 0);
    const damage380 = Number(data.calculatedHexaDamage_380 ?? 0);
    return evaluateBossClears({
      boss300Stat: boss300,
      boss380Stat: boss380,
      damage300,
      damage380,
      level,
      arcaneForce,
      authenticForce,
      spline300: data.spline_300 ?? null,
      spline380: data.spline_380 ?? null,
      ascentConst: Number(data.ascent_const ?? 0),
      relevantOnly,
    });
  }, [data, level, arcaneForce, authenticForce, relevantOnly]);

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
            MapleScouter-style boss clear standards
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
                <div className="space-y-3">
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
                <div className="space-y-3">
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

          <StatBlock
            title="Boss Clear (Cut)"
            action={
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1 font-semibold transition ${
                    relevantOnly
                      ? "bg-accent text-white"
                      : "border border-border/50 bg-surface hover:bg-surface-muted"
                  }`}
                  onClick={() => setRelevantOnly(true)}
                >
                  Relevant
                </button>
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1 font-semibold transition ${
                    !relevantOnly
                      ? "bg-accent text-white"
                      : "border border-border/50 bg-surface hover:bg-surface-muted"
                  }`}
                  onClick={() => setRelevantOnly(false)}
                >
                  All bosses
                </button>
              </div>
            }
          >
            <p className="mb-3 text-xs opacity-60">
              Icons and cut table from MapleScouter GMS. Clear % uses their
              damage-spline formula (HEXA expected damage × force/level gaps ÷
              cut).
            </p>
            {bossRows.length === 0 ? (
              <p className="py-8 text-center text-sm opacity-60">
                No bosses in range — try All bosses.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
                {bossRows.map((row) => (
                  <BossClearCard
                    key={`${row.id}-${row.difficulty}-${row.isPartyBoss ? "p" : "s"}-${row.rank}`}
                    row={row}
                  />
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] opacity-60">
              <span>Sorted by MapleScouter boss difficulty (hardest first)</span>
              <span>
                <span className="rounded bg-accent px-1 text-[9px] font-bold text-white">
                  [Party]
                </span>{" "}
                party cut
              </span>
            </div>
          </StatBlock>
        </>
      ) : null}
    </div>
  );
}
