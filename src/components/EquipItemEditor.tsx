"use client";

import { useMemo } from "react";
import {
  clampStarForce,
  equipCapabilities,
  getStarForceCap,
} from "@/lib/equip-capabilities";
import {
  getSelectableStats,
  getWeaponAtt,
} from "@/lib/flames";
import { defaultPotentialTier, defaultStarForce } from "@/lib/planner";
import {
  lineOptionKey,
  normalizePotentialLines,
  parseLineOptionKey,
  potentialLineOptions,
  POTENTIAL_TIER_LABELS,
} from "@/lib/potential-lines";
import type { Equip, FlameLine, PotentialLine } from "@/lib/types";
import { StarForcePicker } from "@/components/StarForcePicker";

export type EquipItemPatch = {
  starForce?: number;
  potentialTier?: 0 | 1 | 2 | 3;
  potentialLines?: PotentialLine[];
  flames?: FlameLine[];
};

type Props = {
  slotLabel: string;
  equip: Equip;
  /** Authoritative flame lines (flameSetup), falling back to equip.flames. */
  flames: FlameLine[];
  onChange: (patch: EquipItemPatch) => void;
  onChangeItem: () => void;
  onUnequip: () => void;
  onClose: () => void;
};

export function EquipItemEditor({
  slotLabel,
  equip,
  flames,
  onChange,
  onChangeItem,
  onUnequip,
  onClose,
}: Props) {
  const caps = useMemo(() => equipCapabilities(equip), [equip]);
  const sfCap = getStarForceCap(equip);
  const starForce = clampStarForce(
    equip,
    equip.starForce ?? defaultStarForce(equip.level),
  );
  const potentialTier =
    equip.potentialTier ?? defaultPotentialTier(equip.level);
  const lines = flames;
  const potLines = normalizePotentialLines(equip.potentialLines);
  const potOptions = potentialLineOptions(equip, potLines, potentialTier);

  const selectable = useMemo(() => {
    if (!caps.flames) return [];
    return getSelectableStats({
      ...equip,
      isNormalFlame: equip.isNormalFlame,
      stats: {
        ...equip.stats,
        att: getWeaponAtt(equip),
        matt: getWeaponAtt(equip),
      },
    });
  }, [equip, caps.flames]);

  const toggleFlame = (
    statId: string,
    tierNum: number,
    value: number,
    mixedStats?: string[],
  ) => {
    if (!caps.flames) return;
    const current = [...lines];
    const existing = current.find((l) => l.id === statId);
    let next: FlameLine[];
    if (existing?.tierNum === tierNum) {
      next = current.filter((l) => l.id !== statId);
    } else if (existing) {
      next = current.map((l) =>
        l.id === statId ? { id: statId, tierNum, value, mixedStats } : l,
      );
    } else if (current.length >= 4) {
      return;
    } else {
      next = [...current, { id: statId, tierNum, value, mixedStats }];
    }
    onChange({ flames: next });
  };

  const setPotLine = (index: number, key: string) => {
    if (!caps.potential) return;
    const parsed = parseLineOptionKey(key);
    const next = [...potLines];
    next[index] = parsed;
    onChange({
      potentialLines: next.filter((l): l is PotentialLine => l != null),
    });
  };

  const showAnyEditor = caps.starForce || caps.flames || caps.potential;

  return (
    <div
      className="flex w-full max-w-md flex-col overflow-hidden rounded-lg border border-[#555] bg-[#2a2a2a] shadow-sm"
      role="region"
      aria-label={`Edit ${equip.name}`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-[#444] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={equip.imgUrl}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 object-contain"
          />
          <div className="min-w-0 leading-tight">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              {slotLabel}
            </div>
            <div className="truncate text-sm font-semibold text-zinc-100">
              {equip.name}
            </div>
            <div className="text-xs text-zinc-400">Lv. {equip.level}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded border border-[#666] px-2 py-0.5 text-xs font-semibold text-zinc-200 hover:bg-[#3a3a3a]"
        >
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-[#444] px-3 py-2">
        <button
          type="button"
          onClick={onChangeItem}
          className="rounded border border-[#666] px-2.5 py-1 text-xs font-semibold text-zinc-100 hover:bg-[#3a3a3a]"
        >
          Change item
        </button>
        <button
          type="button"
          onClick={onUnequip}
          className="rounded border border-rose-700/60 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-950/40"
        >
          Unequip
        </button>
      </div>

      <div className="max-h-[36rem] space-y-4 overflow-y-auto p-3">
        {!showAnyEditor && (
          <p className="text-xs text-zinc-500">
            This item cannot take Star Force, flames, or potential.
          </p>
        )}

        {caps.starForce && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">
              Star Force
            </h3>
            <StarForcePicker
              value={starForce}
              max={sfCap}
              onChange={(n) => onChange({ starForce: clampStarForce(equip, n) })}
            />
          </section>
        )}

        {caps.flames && (
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">
              Flames{" "}
              <span className="font-normal normal-case text-zinc-500">
                ({lines.length}/4)
              </span>
            </h3>
            {lines.length > 0 && (
              <ul className="space-y-1 rounded border border-[#3a3a3a] bg-[#1c1c1c] px-2 py-1.5">
                {lines.map((line) => {
                  const stat = selectable.find((s) => s.id === line.id);
                  return (
                    <li
                      key={`${line.id}-${line.tierNum}`}
                      className="flex items-baseline justify-between gap-2 text-[11px] leading-snug"
                    >
                      <span className="min-w-0 truncate font-medium text-zinc-200">
                        {stat?.name ?? line.id}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        <span className="font-semibold text-cyan-300">
                          +{line.value}
                        </span>
                        <span className="ml-1.5 text-[10px] font-semibold text-zinc-500">
                          T{line.tierNum}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div
              className="overflow-x-auto rounded border border-[#3a3a3a] bg-[#1c1c1c] p-1.5"
            >
              <div
                className="grid gap-x-1 gap-y-1"
                style={{
                  gridTemplateColumns: "minmax(4.75rem, 5.75rem) repeat(7, minmax(1.75rem, 1fr))",
                }}
              >
                <div className="px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Stat
                </div>
                {[1, 2, 3, 4, 5, 6, 7].map((t) => (
                  <div
                    key={t}
                    className="py-0.5 text-center text-[10px] font-semibold tabular-nums text-zinc-400"
                  >
                    T{t}
                  </div>
                ))}
                {selectable.map((stat) => (
                  <div key={stat.id} className="contents">
                    <div className="flex items-center px-1 text-[11px] font-medium leading-tight text-zinc-100">
                      {stat.name}
                    </div>
                    {stat.values.map((value, idx) => {
                      const tierNum = idx + 1;
                      const active = lines.some(
                        (l) => l.id === stat.id && l.tierNum === tierNum,
                      );
                      return (
                        <button
                          key={tierNum}
                          type="button"
                          onClick={() =>
                            toggleFlame(
                              stat.id,
                              tierNum,
                              value,
                              stat.mixedStats,
                            )
                          }
                          className={`flex h-8 items-center justify-center rounded border text-[11px] font-semibold tabular-nums transition ${
                            active
                              ? "border-cyan-400 bg-cyan-500 text-zinc-950 shadow-sm"
                              : "border-[#444] bg-[#252525] text-zinc-300 hover:border-[#666] hover:bg-[#353535] hover:text-zinc-100"
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {caps.potential && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">
              Potential
            </h3>
            <label className="flex flex-col gap-1 text-xs text-zinc-300">
              Tier
              <select
                value={potentialTier}
                onChange={(e) =>
                  onChange({
                    potentialTier: Number(e.target.value) as 0 | 1 | 2 | 3,
                  })
                }
                className="rounded border border-[#555] bg-[#1f1f1f] px-2 py-1.5 text-sm font-semibold text-zinc-100 outline-none focus:border-sky-500"
              >
                {POTENTIAL_TIER_LABELS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-1.5">
              {potLines.map((line, i) => (
                <label
                  key={i}
                  className="flex flex-col gap-1 text-xs text-zinc-300"
                >
                  Line {i + 1}
                  <select
                    value={line ? lineOptionKey(line) : ""}
                    onChange={(e) => setPotLine(i, e.target.value)}
                    className="rounded border border-[#555] bg-[#1f1f1f] px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500"
                  >
                    {potOptions.map((opt) => (
                      <option
                        key={lineOptionKey(opt) || "empty"}
                        value={lineOptionKey(opt)}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="text-[10px] leading-snug text-zinc-500">
              Lines from GMS cube pools for this slot and tier
              (level-adjusted). Invalid saved lines stay as (saved). Full
              rates: Cube Calculator.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
