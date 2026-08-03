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
  BOSS_CLEAR_FIGHT_MINUTES_DEFAULT,
  evaluateBossClears,
  difficultyRibbonClass,
  labelPillClass,
  type BossClearFightMinutes,
  type BossClearRow,
} from "@/lib/scouter/boss-cuts";
import {
  BOSS_CRYSTAL_ICON,
  formatBossHp,
  formatCrystalMeso,
  getBossHoverInfo,
  type BossHpRegion,
} from "@/lib/scouter/boss-info";
import {
  DEFAULT_CHAR,
  DEFAULT_JOB,
  getCharName,
} from "@/lib/jobs";
import { storage } from "@/lib/storage";
import type { MapleScouterCalculatedData } from "@/lib/scouter/to-user-stat";
import { AdditionalSpecSimulation } from "./additional-spec-sim";

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

function BossHoverPanel({
  row,
  hpRegion,
}: {
  row: BossClearRow;
  hpRegion: BossHpRegion;
}) {
  const info = getBossHoverInfo(row.imgKey, hpRegion);
  if (!info) return null;
  const hpLabel = hpRegion === "kms" ? "Total HP (KMS)" : "Total HP (GMS)";

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-40 w-[min(20rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl border border-border/60 bg-zinc-950 px-3 py-2.5 text-left text-white opacity-0 shadow-2xl transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      role="tooltip"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-300">
            {row.difficulty}
          </p>
          <p className="text-sm font-semibold leading-tight">{row.nameEn}</p>
        </div>
        <p className="shrink-0 text-[11px] font-medium opacity-70">
          Party {row.partyLimit}
        </p>
      </div>

      {info.hp ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="text-xs font-semibold">{hpLabel}</span>
            <span className="text-xs font-bold tabular-nums">
              {formatBossHp(info.hp.totalHp)}
            </span>
          </div>
          <div className="space-y-1">
            {info.hp.phases.map((phase) => {
              const multi = phase.entities.length > 1;
              return (
                <div key={phase.label} className="space-y-0.5">
                  <div className="flex items-center justify-between rounded-md bg-white/10 px-1.5 py-0.5">
                    <span className="text-[11px] font-medium">{phase.label}</span>
                    {multi ? (
                      <span className="text-[11px] font-semibold tabular-nums">
                        {formatBossHp(phase.total)}
                      </span>
                    ) : null}
                  </div>
                  {multi ? (
                    <div className="flex gap-1">
                      {phase.entities.map((hp, i) => (
                        <div
                          key={`${phase.label}-${i}`}
                          className="flex h-4 min-w-0 flex-1 items-center justify-center overflow-hidden rounded bg-rose-600 px-1 text-[9px] font-semibold tabular-nums text-white"
                        >
                          {formatBossHp(hp)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-4 items-center justify-center rounded bg-rose-600 px-1.5 text-[10px] font-semibold tabular-nums text-white">
                      {formatBossHp(phase.total)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {info.crystalMeso > 0 ? (
        <div className="mt-2 flex items-center justify-center gap-2 border-t border-white/10 pt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BOSS_CRYSTAL_ICON}
            alt=""
            width={22}
            height={22}
            className="h-[22px] w-[22px]"
          />
          <span className="text-sm font-bold tabular-nums">
            × {formatCrystalMeso(info.crystalMeso)}
          </span>
        </div>
      ) : null}

      {info.drops.length > 0 ? (
        <div className="mt-2 flex flex-wrap justify-center gap-2 border-t border-white/10 pt-2">
          {info.drops.map((drop) => (
            <div
              key={`${drop.name}-${drop.amount}-${drop.personal}`}
              className="relative"
              title={`${drop.name}${drop.amount > 1 ? ` ×${drop.amount}` : ""}${drop.personal ? " (personal)" : ""}`}
            >
              {drop.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={drop.img}
                  alt={drop.name}
                  width={28}
                  height={28}
                  className="h-7 w-7"
                />
              ) : (
                <span className="inline-flex h-7 max-w-[4.5rem] items-center rounded bg-white/10 px-1 text-[9px] leading-tight">
                  {drop.name}
                </span>
              )}
              {drop.amount > 1 ? (
                <span
                  className={`absolute -bottom-1 -right-1 min-w-[1.1rem] rounded-full border border-black bg-white px-0.5 text-center text-[9px] font-bold leading-4 ${
                    drop.personal ? "text-rose-600" : "text-sky-700"
                  }`}
                >
                  {drop.amount}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BossClearCard({
  row,
  hpRegion,
}: {
  row: BossClearRow;
  hpRegion: BossHpRegion;
}) {
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

  return (
    <div
      tabIndex={0}
      className={`group relative z-0 flex w-full flex-col items-center gap-1 rounded-lg border bg-surface p-1.5 text-center shadow-sm transition hover:z-30 hover:-translate-y-0.5 hover:shadow-md focus-within:z-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${borderClass}`}
    >
      <BossHoverPanel row={row} hpRegion={hpRegion} />

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
  compact,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-border/30 bg-background/60 ${
        compact ? "px-2 py-1.5" : "px-3 py-2.5"
      }`}
    >
      <p
        className={`font-medium uppercase tracking-wide opacity-55 ${
          compact ? "text-[10px]" : "text-[11px]"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-0.5 font-display font-bold tabular-nums ${
          compact
            ? emphasize
              ? "text-lg text-accent"
              : "text-base"
            : emphasize
              ? "text-2xl text-accent sm:text-3xl"
              : "text-xl sm:text-2xl"
        }`}
      >
        {formatNum(value)}
      </p>
    </div>
  );
}

function BossCardGrid({
  rows,
  columnsClass,
  hpRegion,
}: {
  rows: BossClearRow[];
  columnsClass: string;
  hpRegion: BossHpRegion;
}) {
  return (
    <div className={`relative z-0 grid gap-2 overflow-visible ${columnsClass}`}>
      {rows.map((row) => (
        <BossClearCard
          key={`${row.id}-${row.difficulty}-${row.isPartyBoss ? "p" : "s"}-${row.rank}`}
          row={row}
          hpRegion={hpRegion}
        />
      ))}
    </div>
  );
}

function isDestinyOrChampion(row: BossClearRow): boolean {
  return row.difficulty === "Destiny" || row.difficulty === "Champion";
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
  const [showDestinyChampion, setShowDestinyChampion] = useState(true);
  const [fightMinutes, setFightMinutes] = useState<BossClearFightMinutes>(
    BOSS_CLEAR_FIGHT_MINUTES_DEFAULT,
  );
  const hpRegion: BossHpRegion = fightMinutes === 30 ? "gms" : "kms";
  const fightLabel =
    fightMinutes === 30 ? "30 min · GMS HP" : "20 min · KMS HP";

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

  const clearInput = useMemo(() => {
    if (!data) return null;
    return {
      boss300Stat: Number(data.boss300_hexaStat ?? data.boss300_stat ?? 0),
      boss380Stat: Number(data.boss380_hexaStat ?? data.boss380_stat ?? 0),
      damage300: Number(data.calculatedHexaDamage_300 ?? 0),
      damage380: Number(data.calculatedHexaDamage_380 ?? 0),
      level,
      arcaneForce,
      authenticForce,
      spline300: data.spline_300 ?? null,
      spline380: data.spline_380 ?? null,
      ascentConst: Number(data.ascent_const ?? 0),
    };
  }, [data, level, arcaneForce, authenticForce]);

  const allBossRows = useMemo(() => {
    if (!clearInput) return [];
    return evaluateBossClears({
      ...clearInput,
      fightMinutes,
      relevantOnly: false,
    });
  }, [clearInput, fightMinutes]);

  const destinyChampionRows = useMemo(
    () => allBossRows.filter(isDestinyOrChampion),
    [allBossRows],
  );

  const bossRows = useMemo(() => {
    if (!clearInput) return [];
    const base = relevantOnly
      ? evaluateBossClears({
          ...clearInput,
          fightMinutes,
          relevantOnly: true,
        })
      : allBossRows;
    if (showDestinyChampion) {
      return base.filter((row) => !isDestinyOrChampion(row));
    }
    return base;
  }, [allBossRows, clearInput, fightMinutes, relevantOnly, showDestinyChampion]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <aside className="w-full shrink-0 lg:w-64 xl:w-72">
            <StatBlock
              title="Boss Converted Stat"
              hint={`HEXA drives clear %. Clear window: ${fightLabel}.`}
              action={
                <div className="inline-flex overflow-hidden rounded-full border border-border/50 text-xs">
                  <button
                    type="button"
                    className={`px-3 py-1.5 font-semibold transition ${
                      fightMinutes === 20
                        ? "bg-accent text-white"
                        : "bg-surface hover:bg-surface-muted"
                    }`}
                    onClick={() => setFightMinutes(20)}
                    title="MapleScouter parity · KMS HP"
                  >
                    20 min
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 font-semibold transition ${
                      fightMinutes === 30
                        ? "bg-accent text-white"
                        : "bg-surface hover:bg-surface-muted"
                    }`}
                    onClick={() => setFightMinutes(30)}
                    title="GMS HP scaled clear"
                  >
                    30 min
                  </button>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold opacity-80">
                    Boss 300% PDR
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <ConvertedStatCell
                      compact
                      label="Normal"
                      value={Number(data.boss300_stat ?? 0)}
                    />
                    <ConvertedStatCell
                      compact
                      label="HEXA"
                      value={Number(data.boss300_hexaStat ?? 0)}
                      emphasize
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold opacity-80">
                    Boss 380% PDR
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <ConvertedStatCell
                      compact
                      label="Normal"
                      value={Number(data.boss380_stat ?? 0)}
                    />
                    <ConvertedStatCell
                      compact
                      label="HEXA"
                      value={Number(data.boss380_hexaStat ?? 0)}
                      emphasize
                    />
                  </div>
                </div>
              </div>
            </StatBlock>
          </aside>

          <div className="min-w-0 flex-1 space-y-3">
            <StatBlock
              title="Destiny & Champion"
              hint={`Solo-mode Destiny and Champion · ${fightLabel}.`}
              action={
                <button
                  type="button"
                  className="rounded-full border border-border/50 bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-surface-muted"
                  onClick={() => setShowDestinyChampion((v) => !v)}
                >
                  {showDestinyChampion ? "Hide" : "Show"}
                </button>
              }
            >
              {showDestinyChampion ? (
                destinyChampionRows.length === 0 ? (
                  <p className="py-6 text-center text-sm opacity-60">
                    No Destiny or Champion bosses in the list.
                  </p>
                ) : (
                  <BossCardGrid
                    rows={destinyChampionRows}
                    hpRegion={hpRegion}
                    columnsClass="grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6"
                  />
                )
              ) : (
                <p className="py-2 text-center text-xs opacity-55">
                  Hidden — press Show to view Destiny & Champion clears.
                </p>
              )}
            </StatBlock>

            <StatBlock
              title="Boss Clear (Cut)"
              hint={`Clear % · ${fightLabel}. Hover for HP, crystal, and drops.`}
              action={
                <div className="flex flex-wrap items-center gap-2 text-xs">
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
                <BossCardGrid
                  rows={bossRows}
                  hpRegion={hpRegion}
                  columnsClass="grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6"
                />
              )}

              <p className="mt-3 text-xs opacity-55">
                Hardest bosses first · {bossRows.length} shown
                {showDestinyChampion
                  ? ` · ${destinyChampionRows.length} Destiny/Champion above`
                  : ""}{" "}
                · [Party] means the party cut table
              </p>
            </StatBlock>

            <AdditionalSpecSimulation baseline={data} />
          </div>
        </div>
      ) : null}
    </div>
  );
}


