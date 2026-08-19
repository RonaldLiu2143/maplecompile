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
  isRelevantBossClear,
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

const FD_NEUTRAL_EPS = 0.005;
const TIP_MAX_WIDTH = 340;
const TIP_EDGE_PAD = 12;
const TIP_GAP = 8;
const TIP_ESTIMATED_HEIGHT = 420;
const TIP_FLIP_MIN = 260;
const TIP_POS_EPS = 0.5;

function fdTone(fd: number): { message: string; className: string } {
  if (Math.abs(fd) < FD_NEUTRAL_EPS) {
    return {
      message: "Receiving max Level / Force bonuses.",
      className: "text-emerald-400",
    };
  }
  if (fd < 0) {
    return {
      message: `Receiving a ${Math.abs(fd).toFixed(2)}% FD cut from Level/Force.`,
      className: "text-rose-500",
    };
  }
  return {
    message: `Receiving a ${fd.toFixed(2)}% FD bonus from Level/Force.`,
    className: "text-primary",
  };
}

function tipStyleUnchanged(a: CSSProperties, b: CSSProperties): boolean {
  return (
    Math.abs(Number(a.left ?? 0) - Number(b.left ?? 0)) < TIP_POS_EPS &&
    Math.abs(Number(a.width ?? 0) - Number(b.width ?? 0)) < TIP_POS_EPS &&
    Math.abs(Number(a.top ?? -1) - Number(b.top ?? -1)) < TIP_POS_EPS &&
    Math.abs(Number(a.bottom ?? -1) - Number(b.bottom ?? -1)) < TIP_POS_EPS
  );
}

/** Only one portaled boss tooltip at a time (avoids stuck tips when hopping cards). */
const BOSS_TIP_OPEN_EVENT = "mh-boss-tip-open";
let activeBossTipId: string | null = null;

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

function RateRow({
  label,
  boss,
  user,
  rate,
}: {
  label: string;
  boss: ReactNode;
  user: ReactNode;
  rate: number;
}) {
  const cell = "px-1.5 py-0.5 text-center text-[11px] tabular-nums text-white";
  return (
    <tr>
      <td className="px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
        {label}
      </td>
      <td className={cell}>{boss}</td>
      <td className={cell}>{user}</td>
      <td className={cell}>{(rate * 100).toFixed(0)}%</td>
    </tr>
  );
}

function BossHoverTooltipBody({
  row,
  hpRegion,
  userLevel,
  userArcaneForce,
  userAuthenticForce,
}: {
  row: BossClearRow;
  hpRegion: BossHpRegion;
  userLevel: number;
  userArcaneForce: number;
  userAuthenticForce: number;
}) {
  const info = getBossHoverInfo(row.imgKey, hpRegion);
  const hpLabel = hpRegion === "kms" ? "Total HP (KMS)" : "Total HP (GMS)";
  const { message: fdMsg, className: fdClass } = fdTone(row.fdVsMaxPercent);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold tracking-wide">
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
                    drop.personal ? "text-rose-600" : "text-amber-800"
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
            <RateRow
              label="Level"
              boss={row.level}
              user={userLevel}
              rate={row.levelRate}
            />
            {row.arcaneForce > 0 ? (
              <RateRow
                label="Arcane Force"
                boss={row.arcaneForce}
                user={userArcaneForce}
                rate={row.arcaneRate}
              />
            ) : null}
            {row.authenticForce > 0 ? (
              <RateRow
                label="Sacred Force"
                boss={
                  row.authenticForce === 999 ? "?" : row.authenticForce
                }
                user={userAuthenticForce}
                rate={row.authenticRate}
              />
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

type BossUserForces = {
  userLevel: number;
  userArcaneForce: number;
  userAuthenticForce: number;
};

function computeTipStyle(el: HTMLElement): CSSProperties {
  const r = el.getBoundingClientRect();
  const tipWidth = Math.min(TIP_MAX_WIDTH, window.innerWidth - TIP_EDGE_PAD * 2);
  let left = r.left + r.width / 2 - tipWidth / 2;
  left = Math.max(
    TIP_EDGE_PAD,
    Math.min(left, window.innerWidth - tipWidth - TIP_EDGE_PAD),
  );

  const spaceBelow = window.innerHeight - r.bottom - TIP_GAP;
  const spaceAbove = r.top - TIP_GAP;
  const flipUp =
    spaceBelow < Math.min(TIP_ESTIMATED_HEIGHT, TIP_FLIP_MIN) &&
    spaceAbove > spaceBelow;

  return flipUp
    ? {
        position: "fixed",
        left,
        width: tipWidth,
        bottom: window.innerHeight - r.top + TIP_GAP,
        zIndex: 200,
      }
    : {
        position: "fixed",
        left,
        width: tipWidth,
        top: r.bottom + TIP_GAP,
        zIndex: 200,
      };
}

function BossClearCard({
  row,
  hpRegion,
  userLevel,
  userArcaneForce,
  userAuthenticForce,
}: {
  row: BossClearRow;
  hpRegion: BossHpRegion;
} & BossUserForces) {
  const tipId = `${row.id}-${row.difficulty}-${row.isPartyBoss ? "p" : "s"}-${row.rank}`;
  const cardRef = useRef<HTMLDivElement>(null);
  const tipStyleRef = useRef<CSSProperties | null>(null);
  const hoverOpenRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [tip, setTip] = useState<{ style: CSSProperties } | null>(null);

  const applyTipStyle = (next: CSSProperties, forceOpen: boolean) => {
    // Drop stale RAF / layout placements after pointer leave (stuck-tip race).
    if (!hoverOpenRef.current) return;
    const prev = tipStyleRef.current;
    if (!forceOpen && prev && tipStyleUnchanged(prev, next)) return;
    tipStyleRef.current = next;
    setTip({ style: next });
  };

  const closeTip = () => {
    hoverOpenRef.current = false;
    if (activeBossTipId === tipId) activeBossTipId = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    tipStyleRef.current = null;
    setTip(null);
  };

  const openTip = () => {
    activeBossTipId = tipId;
    hoverOpenRef.current = true;
    // Close any other card's portaled tip before opening this one.
    window.dispatchEvent(
      new CustomEvent(BOSS_TIP_OPEN_EVENT, { detail: tipId }),
    );
    const el = cardRef.current;
    if (!el) return;
    applyTipStyle(computeTipStyle(el), true);
  };

  useEffect(() => {
    const onOtherOpen = (e: Event) => {
      const openedId = (e as CustomEvent<string>).detail;
      if (openedId === tipId) return;
      hoverOpenRef.current = false;
      if (activeBossTipId === tipId) activeBossTipId = null;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      tipStyleRef.current = null;
      setTip(null);
    };
    window.addEventListener(BOSS_TIP_OPEN_EVENT, onOtherOpen);
    return () => {
      window.removeEventListener(BOSS_TIP_OPEN_EVENT, onOtherOpen);
      hoverOpenRef.current = false;
      if (activeBossTipId === tipId) activeBossTipId = null;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [tipId]);

  useLayoutEffect(() => {
    if (!tip) return;

    const place = () => {
      if (!hoverOpenRef.current) return;
      const el = cardRef.current;
      if (!el) return;
      applyTipStyle(computeTipStyle(el), false);
    };

    const placeRaf = () => {
      if (!hoverOpenRef.current) return;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        place();
      });
    };

    place();
    window.addEventListener("scroll", placeRaf, true);
    window.addEventListener("resize", placeRaf);
    return () => {
      window.removeEventListener("scroll", placeRaf, true);
      window.removeEventListener("resize", placeRaf);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // Reposition when tip opens or boss/region content may change height.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tip != null, hpRegion, row.imgKey]);

  const pctColor =
    row.clearPercent >= 200
      ? "text-primary"
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
    b.lv || b.arcane || b.sacred || row.forceBlocked || b.forceBonus;

  return (
    <div
      ref={cardRef}
      tabIndex={0}
      aria-label={`${row.difficulty} ${row.nameEn}`}
      onPointerEnter={openTip}
      onPointerLeave={closeTip}
      onFocus={openTip}
      onBlur={closeTip}
      className={`relative z-0 flex w-full flex-col items-center gap-0.5 rounded-md border bg-surface p-1 text-center shadow-sm transition hover:z-30 hover:-translate-y-0.5 hover:shadow-md focus-within:z-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${borderClass}`}
    >
      {tip && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none z-[9999] rounded-xl border border-border/60 bg-popover px-3 py-2.5 text-left text-popover-foreground shadow-2xl"
              style={tip.style}
              role="tooltip"
            >
              <BossHoverTooltipBody
                row={row}
                hpRegion={hpRegion}
                userLevel={userLevel}
                userArcaneForce={userArcaneForce}
                userAuthenticForce={userAuthenticForce}
              />
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
            {row.forceBlocked ? (
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
        className={`mt-0.5 font-bold tabular-nums ${
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
  userLevel,
  userArcaneForce,
  userAuthenticForce,
}: {
  rows: BossClearRow[];
  columnsClass: string;
  hpRegion: BossHpRegion;
} & BossUserForces) {
  return (
    <div className={`relative z-0 grid gap-1 overflow-visible ${columnsClass}`}>
      {rows.map((row) => (
        <BossClearCard
          key={`${row.id}-${row.difficulty}-${row.isPartyBoss ? "p" : "s"}-${row.rank}`}
          row={row}
          hpRegion={hpRegion}
          userLevel={userLevel}
          userArcaneForce={userArcaneForce}
          userAuthenticForce={userAuthenticForce}
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
  const [level, setLevel] = useState(0);
  const [charLabel, setCharLabel] = useState("Character");
  const [arcaneForce, setArcaneForce] = useState(0);
  const [authenticForce, setAuthenticForce] = useState(0);
  const [relevantOnly, setRelevantOnly] = useState(true);
  const [showDestinyChampion, setShowDestinyChampion] = useState(true);
  const [fightMinutes, setFightMinutes] = useState<BossClearFightMinutes>(
    BOSS_CLEAR_FIGHT_MINUTES_DEFAULT,
  );
  /** Applied Additional Spec Sim overlay; null = show live result. */
  const [simOverlay, setSimOverlay] = useState<SpecSimOverlay | null>(null);
  /** 20 min → KMS default; 30 min → GMS is30min + GMS HP clears. */
  const is30min = fightMinutes === 30;
  const hpRegion: BossHpRegion = fightMinutes === 30 ? "gms" : "kms";

  const displayData = simOverlay ? simOverlay.data : data;
  const displayLevel = simOverlay ? simOverlay.level : level;
  const displayArcane = simOverlay ? simOverlay.arcaneForce : arcaneForce;
  const displayAuthentic = simOverlay
    ? simOverlay.authenticForce
    : authenticForce;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSimOverlay(null);
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
          const hasDraft = Boolean(last?.input);
          setLevel(input.level);
          setCharLabel(
            hasDraft
              ? getCharName(input.jobType, input.charType)
              : "Character",
          );
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
    const base = relevantOnly
      ? allBossRows.filter(isRelevantBossClear)
      : allBossRows;
    // Keep Destiny/Champion out of Boss Clear — Hide only collapses that section.
    return base.filter((row) => !isDestinyOrChampion(row));
  }, [allBossRows, relevantOnly]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/40 bg-surface/90 p-4 shadow-sm sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Detailed Information
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Lv.{displayLevel} {charLabel}
            {simOverlay ? (
              <span className="ml-2 align-middle text-sm font-semibold text-accent">
                (sim)
              </span>
            ) : null}
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
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
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
                        ? "bg-accent text-primary-foreground"
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
                        ? "bg-accent text-primary-foreground"
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
                {simOverlay ? (
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
              hint={
                simOverlay
                  ? `Solo-mode Destiny and Champion · ${fightMinutes} min · Additional Spec Simulation`
                  : `Solo-mode Destiny and Champion · ${fightMinutes} min.`
              }
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
                    userLevel={displayLevel}
                    userArcaneForce={displayArcane}
                    userAuthenticForce={displayAuthentic}
                  columnsClass="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9"
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
              hint={
                simOverlay
                  ? `Clear % · ${fightMinutes} min · Additional Spec Simulation. Hover for HP, crystal, and drops.`
                  : `Clear % · ${fightMinutes} min. Hover for HP, crystal, and drops.`
              }
              action={
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1.5 font-semibold transition ${
                      relevantOnly
                        ? "bg-accent text-primary-foreground"
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
                        ? "bg-accent text-primary-foreground"
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
                  userLevel={displayLevel}
                  userArcaneForce={displayArcane}
                  userAuthenticForce={displayAuthentic}
                  columnsClass="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9"
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
              onSimulationChange={setSimOverlay}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}


