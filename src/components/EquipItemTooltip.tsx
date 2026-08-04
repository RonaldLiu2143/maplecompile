"use client";

import { useMemo } from "react";
import { canStarForce } from "@/lib/equip-capabilities";
import {
  buildEquipTooltipModel,
  type TooltipStatLine,
} from "@/lib/equip-tooltip-stats";
import {
  formatPotentialLineLabel,
  POTENTIAL_TIER_LABELS,
} from "@/lib/potential-lines";
import { defaultStarForce } from "@/lib/planner";
import type { Equip, FlameLine, PotentialLine } from "@/lib/types";

const C_BASE = "#FFFFFF";
const C_SF = "#FFCC00";
const C_FLAME = "#66FFFF";
const C_POT = "#CCFF00";
const C_MUTED = "#A0A0A0";
const C_ORANGE = "#FFAA44";

type Props = {
  equip: Equip;
  flames: FlameLine[];
  /** Override SF (defaults to equip.starForce / planner default). */
  starForce?: number;
  /** Compact mode for grid hover popovers. */
  compact?: boolean;
  className?: string;
};

function fmtNum(n: number, percent?: boolean): string {
  const body = percent ? `${n}%` : `${n}`;
  return n >= 0 ? `+${body}` : body;
}

/** Colored (base + SF + flame) segments; omit zero middle/flame sources. */
function Breakdown({ line }: { line: TooltipStatLine }) {
  const parts: { n: number; color: string }[] = [];
  const showBreak =
    line.starForce !== 0 || line.flame !== 0 || line.base !== line.total;

  if (!showBreak) return null;

  parts.push({ n: line.base, color: C_BASE });
  if (line.starForce !== 0) parts.push({ n: line.starForce, color: C_SF });
  if (line.flame !== 0) parts.push({ n: line.flame, color: C_FLAME });

  if (parts.length < 2 && line.base === line.total) return null;

  return (
    <span className="ml-1 tabular-nums">
      <span style={{ color: C_MUTED }}>(</span>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span style={{ color: C_MUTED }}> + </span>}
          <span style={{ color: p.color }}>
            {line.percent ? `${p.n}%` : p.n}
          </span>
        </span>
      ))}
      <span style={{ color: C_MUTED }}>)</span>
    </span>
  );
}

function StarRow({ count, max = 15 }: { count: number; max?: number }) {
  const filled = Math.min(count, max);
  return (
    <div className="flex flex-wrap justify-center gap-px" aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className="inline-block text-[9px] leading-none"
          style={{ color: i < filled ? C_SF : "#3a3a3a" }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

/**
 * MapleStory-style item tooltip: dark panel, REQ LEV, colored
 * base / Star Force / flame stat breakdown, potential lines.
 */
export function EquipItemTooltip({
  equip,
  flames,
  starForce,
  compact = false,
  className = "",
}: Props) {
  const stars = canStarForce(equip)
    ? (starForce ?? equip.starForce ?? defaultStarForce(equip.level))
    : 0;

  const model = useMemo(
    () => buildEquipTooltipModel(equip, { stars, flames }),
    [equip, stars, flames],
  );

  const potTier = equip.potentialTier;
  const potLines = (equip.potentialLines ?? []).filter(
    (l): l is PotentialLine => !!l?.id,
  );
  const showPotential = potLines.length > 0 || potTier !== undefined;

  return (
    <div
      className={`select-none rounded border border-[#6a6a6a] bg-[#1a1a1a]/95 text-[11px] text-white shadow-lg backdrop-blur-sm ${
        compact ? "w-[220px] p-2" : "w-full max-w-[280px] p-2.5"
      } ${className}`}
      role="img"
      aria-label={`${equip.name} item stats`}
    >
      {stars > 0 && (
        <div className="mb-1 space-y-0.5">
          <StarRow count={Math.min(stars, 15)} max={15} />
          {stars > 15 && (
            <StarRow count={stars - 15} max={Math.min(15, stars - 15)} />
          )}
        </div>
      )}

      <div className="text-center text-[13px] font-bold leading-tight tracking-wide">
        {model.name}
      </div>

      {model.setName && (
        <div
          className="mt-0.5 text-center text-[10px] leading-tight"
          style={{ color: C_MUTED }}
        >
          {model.setName}
        </div>
      )}

      <div className="mt-2 flex items-start gap-2 border-t border-[#333] pt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={model.imgUrl}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 object-contain"
        />
        <div className="min-w-0 flex-1 space-y-0.5 leading-snug">
          <div>
            Required Job:{" "}
            <span className="font-semibold">{model.jobLabel}</span>
          </div>
          <div>
            REQ LEV:{" "}
            <span className="font-semibold">Lv. {model.level}</span>
          </div>
          <div style={{ color: C_MUTED }}>{model.equipTypeLabel}</div>
        </div>
      </div>

      <div className="mt-2 space-y-0.5 border-t border-[#333] pt-2 font-medium leading-snug">
        {model.lines.length === 0 && (
          <p className="text-[10px]" style={{ color: C_MUTED }}>
            No catalog stats for this item.
          </p>
        )}
        {model.lines.map((line) => (
          <div key={line.id} className="flex flex-wrap items-baseline">
            <span style={{ color: C_MUTED }} className="mr-1 min-w-[5.5rem]">
              {line.label}
            </span>
            <span className="tabular-nums" style={{ color: C_BASE }}>
              : {fmtNum(line.total, line.percent)}
            </span>
            <Breakdown line={line} />
          </div>
        ))}
      </div>

      {showPotential && (
        <div className="mt-2 border-t border-[#333] pt-2">
          <div
            className="mb-1 flex items-center gap-1.5 text-[11px] font-bold"
            style={{ color: C_POT }}
          >
            <span
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-[8px] font-black text-black"
              style={{ background: C_POT }}
              aria-hidden
            >
              P
            </span>
            Potential
            {potTier !== undefined
              ? ` : ${POTENTIAL_TIER_LABELS[potTier] ?? "—"}`
              : ""}
          </div>
          {potLines.length === 0 ? (
            <p className="text-[10px]" style={{ color: C_MUTED }}>
              No lines set
            </p>
          ) : (
            <ul className="space-y-0.5 pl-1">
              {potLines.map((line, i) => (
                <li key={`${line.id}-${line.value}-${i}`} className="flex gap-1">
                  <span style={{ color: C_ORANGE }}>•</span>
                  <span>{formatPotentialLineLabel(line)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
