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
  const digits = n >= 1000 ? 0 : n >= 100 ? 1 : 2;
  return `${n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}%`;
}

function StatBlock({
  title,
  children,
  action,
  hint,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  hint?: string;
}) {
  return (
    <section className="rounded-xl border border-border/50 bg-surface/95 p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight sm:text-lg">
            {title}
          </h2>
          {hint ? <p className="mt-0.5 text-xs opacity-60">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function BossClearCard({ row }: { row: BossClearRow }) {
  const pctColor =
    row.clearPercent >= 200
      ? "text-sky-700 dark:text-sky-300"
      : row.clearPercent >= 100
        ? "text-emerald-700 dark:text-emerald-300"
        : row.clearPercent >= 90
          ? "text-amber-700 dark:text-amber-300"
          : "text-rose-700 dark:text-rose-300";

  const borderClass =
    row.label === "Can't Enter" || row.label === "Impossible"
      ? "border-rose-400/80"
      : row.difficulty === "Champion"
        ? "border-orange-400/80"
        : "border-border/40";

  const tip = [
    `${row.difficulty} ${row.nameEn}`,
    `Status: ${row.label}`,
    `Your stat: ${formatNum(Math.round(row.userStat))}`,
    `Clear: ${formatPercent(row.clearPercent)}`,
    `Cut: ${formatNum(row.cut)}`,
    row.isPartyBoss ? "Party cut" : "Solo cut",
    row.cantEnter ? "Force or level gap" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      title={tip}
      className={`group flex w-full flex-col items-center gap-1 rounded-lg border bg-surface p-1.5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderClass}`}
    >
      <div className="relative w-full overflow-hidden rounded-md bg-surface-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.imgUrl}
          alt={`${row.difficulty} ${row.nameEn}`}
          width={80}
          height={80}
          className="aspect-square w-full object-cover"
          loading="lazy"
        />
        {row.cantEnter ? (
          <div className="absolute left-1 top-1 flex gap-0.5">
            <span className="rounded-full bg-rose-600 px-1.5 text-[9px] font-bold leading-4 text-white shadow">
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

      <p className="line-clamp-1 w-full px-0.5 text-[10px] font-semibold leading-tight opacity-80">
        {row.nameEn}
      </p>

      <span
        className={`max-w-full truncate rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-tight ${labelPillClass(row.label)}`}
      >
        {row.label}
      </span>

      <p className="text-xs font-bold tabular-nums tracking-tight">
        {formatNum(Math.round(row.userStat))}
      </p>

      <p className={`text-[11px] font-bold tabular-nums ${pctColor}`}>
        {row.isPartyBoss ? (
          <span className="opacity-70">[Party] </span>
        ) : null}
        {formatPercent(row.clearPercent)}
      </p>
    </div>
  );
}

function ConvertedStatCell({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/30 bg-background/60 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-55">
        {label}
      </p>
      <p
        className={`mt-1 font-display font-bold tabular-nums ${
          emphasize ? "text-2xl text-accent sm:text-3xl" : "text-xl sm:text-2xl"
        }`}
      >
        {formatNum(value)}
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
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/40 bg-surface/90 p-4 shadow-sm sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Detailed Information
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Lv.{level} {charLabel}
          </h1>
          <p className="mt-1 max-w-xl text-sm opacity-65">
            Converted boss stats and clear standards for your current scouter
            draft.
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
        <p className="rounded-xl border border-border/50 bg-surface/80 py-16 text-center text-sm opacity-70">
          Calculating via MapleScouter…
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-danger/40 bg-surface/80 px-4 py-6 text-center text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {!loading && !error && data ? (
        <>
          <StatBlock
            title="Boss Converted Stat"
            hint="HEXA values are used for clear %. Higher is stronger."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Boss 300% PDR</p>
                <div className="grid grid-cols-2 gap-2">
                  <ConvertedStatCell
                    label="Normal"
                    value={Number(data.boss300_stat ?? 0)}
                  />
                  <ConvertedStatCell
                    label="HEXA"
                    value={Number(data.boss300_hexaStat ?? 0)}
                    emphasize
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Boss 380% PDR</p>
                <div className="grid grid-cols-2 gap-2">
                  <ConvertedStatCell
                    label="Normal"
                    value={Number(data.boss380_stat ?? 0)}
                  />
                  <ConvertedStatCell
                    label="HEXA"
                    value={Number(data.boss380_hexaStat ?? 0)}
                    emphasize
                  />
                </div>
              </div>
            </div>
          </StatBlock>

          <StatBlock
            title="Boss Clear (Cut)"
            hint="Hover a card for full details. Green/blue % = comfortable, red = under cut."
            action={
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  className={`rounded-full px-3 py-1.5 font-semibold transition ${
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
                  className={`rounded-full px-3 py-1.5 font-semibold transition ${
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
            <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-emerald-500/15 px-2 py-1 font-semibold text-emerald-800 dark:text-emerald-300">
                Easy / Possible
              </span>
              <span className="rounded-full bg-amber-500/15 px-2 py-1 font-semibold text-amber-800 dark:text-amber-300">
                Solo Min (~90%+)
              </span>
              <span className="rounded-full bg-blue-500/15 px-2 py-1 font-semibold text-blue-800 dark:text-blue-300">
                Party cuts
              </span>
              <span className="rounded-full bg-rose-500/15 px-2 py-1 font-semibold text-rose-800 dark:text-rose-300">
                Under cut
              </span>
            </div>

            {bossRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/50 py-10 text-center text-sm opacity-60">
                No bosses in this range — switch to{" "}
                <button
                  type="button"
                  className="font-semibold text-accent underline"
                  onClick={() => setRelevantOnly(false)}
                >
                  All bosses
                </button>
                .
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                {bossRows.map((row) => (
                  <BossClearCard
                    key={`${row.id}-${row.difficulty}-${row.isPartyBoss ? "p" : "s"}-${row.rank}`}
                    row={row}
                  />
                ))}
              </div>
            )}

            <p className="mt-3 text-xs opacity-55">
              Hardest bosses first · {bossRows.length} shown · [Party] means the
              party cut table
            </p>
          </StatBlock>
        </>
      ) : null}
    </div>
  );
}
