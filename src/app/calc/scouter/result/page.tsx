"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  defaultBuffState,
  defaultHexaLevels,
  defaultLinkState,
  defaultScouterInput,
} from "@/lib/scouter";
import {
  BOSS_CLEAR_FIGHT_MINUTES_DEFAULT,
  evaluateBossClears,
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
import { PairingBar } from "@/components/PairingBar";
import type { MapleScouterCalculatedData } from "@/lib/scouter/to-user-stat";
import {
  AdditionalSpecSimulation,
  type SpecSimOverlay,
} from "./additional-spec-sim";

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

function BossHoverTooltipBody({
  row,
  hpRegion,
}: {
  row: BossClearRow;
  hpRegion: BossHpRegion;
}) {
  const info = getBossHoverInfo(row.imgKey, hpRegion);
  const hpLabel = hpRegion === "kms" ? "Total HP (KMS)" : "Total HP (GMS)";
  const fd = row.fdVsMaxPercent;
  const fdMsg =
    Math.abs(fd) < 0.005
      ? "Receiving max Level / Force bonuses."
      : fd < 0
        ? `Receiving a ${Math.abs(fd).toFixed(2)}% FD cut from Level/Force.`
        : `Receiving a ${fd.toFixed(2)}% FD bonus from Level/Force.`;
  const fdClass =
    Math.abs(fd) < 0.005
      ? "text-emerald-400"
      : fd < 0
        ? "text-rose-500"
        : "text-sky-400";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
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

      {info?.hp ? (
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

      {info && info.crystalMeso > 0 ? (
        <div className="flex items-center justify-center gap-2 border-t border-white/10 pt-2">
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

      {info && info.drops.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-2 border-t border-white/10 pt-2">
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

      <div className="border-t border-white/10 pt-2">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-1.5 py-0.5 text-center text-[10px] font-medium text-white/80" />
              <th className="px-1.5 py-0.5 text-center text-[10px] font-medium text-white/80">
                Boss
              </th>
              <th className="px-1.5 py-0.5 text-center text-[10px] font-medium text-white/80">
                User
              </th>
              <th className="px-1.5 py-0.5 text-center text-[10px] font-medium text-white/80">
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
                Level
              </td>
              <td className="px-1.5 py-0.5 text-center text-[11px] tabular-nums text-white">
                {row.level}
              </td>
              <td className="px-1.5 py-0.5 text-center text-[11px] tabular-nums text-white">
                {row.userLevel}
              </td>
              <td className="px-1.5 py-0.5 text-center text-[11px] tabular-nums text-white">
                {(row.levelRate * 100).toFixed(0)}%
              </td>
            </tr>
            {row.arcaneForce > 0 ? (
              <tr>
                <td className="px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
                  Arcane Force
                </td>
                <td className="px-1.5 py-0.5 text-center text-[11px] tabular-nums text-white">
                  {row.arcaneForce}
                </td>
                <td className="px-1.5 py-0.5 text-center text-[11px] tabular-nums text-white">
                  {row.userArcaneForce}
                </td>
                <td className="px-1.5 py-0.5 text-center text-[11px] tabular-nums text-white">
                  {(row.arcaneRate * 100).toFixed(0)}%
                </td>
              </tr>
            ) : null}
            {row.authenticForce > 0 ? (
              <tr>
                <td className="px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
                  Sacred Force
                </td>
                <td className="px-1.5 py-0.5 text-center text-[11px] tabular-nums text-white">
                  {row.authenticForce === 999 ? "?" : row.authenticForce}
                </td>
                <td className="px-1.5 py-0.5 text-center text-[11px] tabular-nums text-white">
                  {row.userAuthenticForce}
                </td>
                <td className="px-1.5 py-0.5 text-center text-[11px] tabular-nums text-white">
                  {(row.authenticRate * 100).toFixed(0)}%
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <p className={`mt-1.5 text-center text-[11px] font-medium ${fdClass}`}>
          {fdMsg}
        </p>

        <div className="mt-1.5 flex w-full items-center justify-between border-t border-white/10 px-1 pt-1.5">
          <span className="text-[11px] font-semibold text-white">
            Ascent coefficient
          </span>
          <span className="text-[11px] font-medium tabular-nums text-white">
            {row.ascentDisplay.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

function PortraitBadge({
  label,
  title,
  tone = "red",
}: {
  label: string;
  title: string;
  tone?: "red" | "green";
}) {
  return (
    <span
      title={title}
      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white px-0.5 text-[9px] font-bold leading-none text-white shadow ${
        tone === "green" ? "bg-emerald-500" : "bg-rose-500"
      }`}
    >
      {label}
    </span>
  );
}

function BossClearCard({
  row,
  hpRegion,
}: {
  row: BossClearRow;
  hpRegion: BossHpRegion;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [tipStyle, setTipStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!hoverOpen) {
      setTipStyle(null);
      return;
    }

    const place = () => {
      const el = cardRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const tipWidth = Math.min(340, window.innerWidth - 24);
      let left = r.left + r.width / 2 - tipWidth / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - tipWidth - 12));

      const estimatedHeight = 420;
      const gap = 8;
      const spaceBelow = window.innerHeight - r.bottom - gap;
      const spaceAbove = r.top - gap;
      const flipUp =
        spaceBelow < Math.min(estimatedHeight, 260) && spaceAbove > spaceBelow;

      setTipStyle(
        flipUp
          ? {
              position: "fixed",
              left,
              width: tipWidth,
              bottom: window.innerHeight - r.top + gap,
              zIndex: 200,
            }
          : {
              position: "fixed",
              left,
              width: tipWidth,
              top: r.bottom + gap,
              zIndex: 200,
            },
      );
    };

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [hoverOpen, hpRegion, row.imgKey]);

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

  const b = row.badges;
  const showBadges =
    b.lv || b.arcane || b.sacred || b.force || b.forceBonus;

  return (
    <div
      ref={cardRef}
      tabIndex={0}
      aria-label={`${row.difficulty} ${row.nameEn}`}
      onMouseEnter={() => setHoverOpen(true)}
      onMouseLeave={() => setHoverOpen(false)}
      onFocus={() => setHoverOpen(true)}
      onBlur={() => setHoverOpen(false)}
      className={`relative z-0 flex w-full flex-col items-center gap-0.5 rounded-md border bg-surface p-1 text-center shadow-sm transition hover:z-30 hover:-translate-y-0.5 hover:shadow-md focus-within:z-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${borderClass}`}
    >
      {hoverOpen && tipStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none rounded-xl border border-border/60 bg-zinc-950 px-3 py-2.5 text-left text-white shadow-2xl"
              style={tipStyle}
              role="tooltip"
            >
              <BossHoverTooltipBody row={row} hpRegion={hpRegion} />
            </div>,
            document.body,
          )
        : null}

      <div className="relative w-full overflow-hidden rounded bg-surface-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.imgUrl}
          alt={`${row.difficulty} ${row.nameEn}`}
          width={64}
          height={64}
          className="aspect-square w-full object-cover"
          loading="lazy"
        />
        {showBadges ? (
          <div className="absolute left-0.5 top-0.5 flex flex-col items-start gap-0.5">
            {b.lv ? (
              <PortraitBadge
                label="LV"
                title="Below max Level damage bonus (120%)"
              />
            ) : null}
            {b.arcane ? (
              <PortraitBadge
                label="A"
                title="Below max Arcane Force damage bonus"
              />
            ) : null}
            {b.sacred ? (
              <PortraitBadge
                label="S"
                title="Below max Sacred Force damage bonus"
              />
            ) : null}
            {b.force ? (
              <PortraitBadge
                label="F"
                title="Force soft/hard cut — well below required ARC/AUT"
              />
            ) : null}
            {b.forceBonus ? (
              <PortraitBadge
                label="F"
                tone="green"
                title="Above soft Arcane Force max for this boss"
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="text-[11px] font-bold tabular-nums tracking-tight leading-tight">
        {formatNum(Math.round(row.userStat))}
      </p>

      <span
        className={`max-w-full truncate rounded-full px-1 py-px text-[9px] font-bold leading-tight ${labelPillClass(row.label)}`}
      >
        {row.label}
      </span>

      <p className={`text-[10px] font-bold tabular-nums leading-tight ${pctColor}`}>
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
    <div className={`relative z-0 grid gap-1 overflow-visible ${columnsClass}`}>
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
  /** MapleScouter simulatorData overlay — when active, BCS + clears use sim result. */
  const [simOverlay, setSimOverlay] = useState<SpecSimOverlay | null>(null);
  const [simActive, setSimActive] = useState(false);
  /** 20 min → KMS / MapleScouter default; 30 min → GMS is30min + GMS HP clears. */
  const is30min = fightMinutes === 30;
  const hpRegion: BossHpRegion = fightMinutes === 30 ? "gms" : "kms";

  const displayData =
    simActive && simOverlay ? simOverlay.data : data;
  const displayLevel =
    simActive && simOverlay ? simOverlay.level : level;
  const displayArcane =
    simActive && simOverlay ? simOverlay.arcaneForce : arcaneForce;
  const displayAuthentic =
    simActive && simOverlay ? simOverlay.authenticForce : authenticForce;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSimOverlay(null);
      setSimActive(false);
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
          body: JSON.stringify({
            input,
            buffs,
            links,
            hexa,
            is30min,
          }),
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
  }, [is30min]);

  const clearInput = useMemo(() => {
    if (!displayData) return null;
    const damage380 = Number(displayData.calculatedHexaDamage_380 ?? 0);
    return {
      boss300Stat: Number(
        displayData.boss300_hexaStat ?? displayData.boss300_stat ?? 0,
      ),
      boss380Stat: Number(
        displayData.boss380_hexaStat ?? displayData.boss380_stat ?? 0,
      ),
      damage300: Number(displayData.calculatedHexaDamage_300 ?? 0),
      damage380,
      damageKaling: Number(
        displayData.calculatedHexaDamage_kaling ?? damage380,
      ),
      damage380NonHexa: Number(
        displayData.calculatedDamage_380 ?? damage380,
      ),
      level: displayLevel,
      arcaneForce: displayArcane,
      authenticForce: displayAuthentic,
      spline300: displayData.spline_300 ?? null,
      spline380: displayData.spline_380 ?? null,
      ascentConst: Number(displayData.ascent_const ?? 0),
    };
  }, [displayArcane, displayAuthentic, displayData, displayLevel]);

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
    // Always keep Destiny/Champion out of Boss Clear — Hide only collapses
    // that section; it must not dump those cards into this list.
    return base.filter((row) => !isDestinyOrChampion(row));
  }, [allBossRows, clearInput, fightMinutes, relevantOnly]);

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
          <Link
            href="/calc/equips/setup"
            className="rounded-md border-2 border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-surface-muted"
          >
            Pair with Equipment
          </Link>
        </div>
      </div>

      <PairingBar compact />

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

      {!loading && !error && data && displayData ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <aside className="w-full shrink-0 lg:w-64 xl:w-72">
            <StatBlock
              title="Boss Converted Stat"
              hint="20 min = MapleScouter / KMS default. 30 min = GMS (is30min + GMS HP clears)."
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
                    title="20 min · KMS HP · MapleScouter default BCS"
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
                    title="30 min · GMS HP · GMS BCS (is30min)"
                  >
                    30 min
                  </button>
                </div>
              }
            >
              <div className="space-y-3">
                {simActive ? (
                  <p className="rounded-md bg-accent-soft/50 px-2 py-1 text-[11px] font-medium text-accent">
                    Showing Additional Spec Simulation
                  </p>
                ) : null}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold opacity-80">
                    Boss 300% PDR
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <ConvertedStatCell
                      compact
                      label="Normal"
                      value={Number(displayData.boss300_stat ?? 0)}
                    />
                    <ConvertedStatCell
                      compact
                      label="HEXA"
                      value={Number(displayData.boss300_hexaStat ?? 0)}
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
                      value={Number(displayData.boss380_stat ?? 0)}
                    />
                    <ConvertedStatCell
                      compact
                      label="HEXA"
                      value={Number(displayData.boss380_hexaStat ?? 0)}
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
              hint={`Solo-mode Destiny and Champion · ${fightMinutes} min.`}
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
                    columnsClass="grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9"
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
              hint={`Clear % · ${fightMinutes} min. Hover for HP, crystal, and drops.`}
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
              <div className="mb-2 flex flex-wrap gap-1.5 text-[10px]">
                <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-800 dark:text-emerald-300">
                  Easy / Possible
                </span>
                <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-800 dark:text-amber-300">
                  Solo Min (~90%+)
                </span>
                <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 font-semibold text-blue-800 dark:text-blue-300">
                  Party cuts
                </span>
                <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 font-semibold text-rose-800 dark:text-rose-300">
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
                  columnsClass="grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9"
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

            <AdditionalSpecSimulation
              key={is30min ? "30" : "20"}
              baseline={data}
              is30min={is30min}
              onSimulationChange={(overlay, active) => {
                setSimOverlay(overlay);
                setSimActive(active);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}


