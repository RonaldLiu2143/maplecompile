"use client";

import { useMemo } from "react";
import {
  getSelectableStats,
  getWeaponAtt,
  isFlammable,
} from "@/lib/flames";
import {
  defaultPotentialTier,
  defaultStarForce,
} from "@/lib/planner";
import {
  lineOptionKey,
  normalizePotentialLines,
  parseLineOptionKey,
  potentialLineOptions,
  POTENTIAL_TIER_LABELS,
} from "@/lib/potential-lines";
import type { Equip, FlameLine, PotentialLine } from "@/lib/types";

const SF_PRESETS = [10, 12, 15, 17, 18, 20, 21, 22] as const;

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
  const starForce = equip.starForce ?? defaultStarForce(equip.level);
  const potentialTier =
    equip.potentialTier ?? defaultPotentialTier(equip.level);
  const lines = flames;
  const potLines = normalizePotentialLines(equip.potentialLines);
  const potOptions = useMemo(() => potentialLineOptions(equip), [equip]);
  const flammable = isFlammable(equip);

  const selectable = useMemo(() => {
    if (!flammable) return [];
    return getSelectableStats({
      ...equip,
      isNormalFlame: equip.isNormalFlame,
      stats: {
        ...equip.stats,
        att: getWeaponAtt(equip),
        matt: getWeaponAtt(equip),
      },
    });
  }, [equip, flammable]);

  const toggleFlame = (
    statId: string,
    tierNum: number,
    value: number,
    mixedStats?: string[],
  ) => {
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
    const parsed = parseLineOptionKey(key);
    const next = [...potLines];
    next[index] = parsed;
    onChange({
      potentialLines: next.filter((l): l is PotentialLine => l != null),
    });
  };

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

      <div className="max-h-[28rem] space-y-4 overflow-y-auto p-3">
        {/* Star Force */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">
            Star Force
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-zinc-200">
              <span className="opacity-70">★</span>
              <input
                type="number"
                min={0}
                max={30}
                value={starForce}
                onChange={(e) =>
                  onChange({
                    starForce: Math.max(
                      0,
                      Math.min(30, Number(e.target.value) || 0),
                    ),
                  })
                }
                className="w-16 rounded border border-[#555] bg-[#1f1f1f] px-2 py-1 text-sm font-semibold tabular-nums text-zinc-100 outline-none focus:border-sky-500"
              />
            </label>
            <div className="flex flex-wrap gap-1">
              {SF_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange({ starForce: n })}
                  className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition ${
                    starForce === n
                      ? "border-sky-400 bg-sky-500/30 text-sky-100"
                      : "border-[#555] text-zinc-300 hover:border-[#777] hover:bg-[#3a3a3a]"
                  }`}
                >
                  {n}★
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Flames */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">
            Flames{" "}
            {flammable ? (
              <span className="font-normal normal-case opacity-70">
                ({lines.length}/4)
              </span>
            ) : null}
          </h3>
          {!flammable ? (
            <p className="text-xs text-zinc-500">
              This slot does not take resurrection flames.
            </p>
          ) : (
            <>
              <div
                className="grid gap-0.5"
                style={{
                  gridTemplateColumns: "5.5rem repeat(7, minmax(0, 1fr))",
                }}
              >
                <div className="text-[9px] font-semibold text-zinc-500">
                  Stat
                </div>
                {[1, 2, 3, 4, 5, 6, 7].map((t) => (
                  <div
                    key={t}
                    className="text-center text-[9px] font-semibold text-zinc-500"
                  >
                    T{t}
                  </div>
                ))}
                {selectable.map((stat) => (
                  <div key={stat.id} className="contents">
                    <div className="flex items-center text-[10px] font-medium leading-tight text-zinc-200">
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
                          className={`flex h-7 items-center justify-center rounded border text-[10px] font-semibold tabular-nums transition ${
                            active
                              ? "border-sky-400 bg-sky-500 text-zinc-900"
                              : "border-[#444] bg-[#1f1f1f] text-zinc-200 hover:bg-[#353535]"
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              {lines.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lines.map((line) => {
                    const stat = selectable.find((s) => s.id === line.id);
                    return (
                      <span
                        key={`${line.id}-${line.tierNum}`}
                        className="inline-flex items-baseline gap-1 rounded border border-sky-500/30 bg-sky-950/40 px-1.5 py-0.5 text-[10px] text-zinc-100"
                      >
                        <span className="opacity-70">
                          {stat?.name ?? line.id}
                        </span>
                        <span className="font-semibold tabular-nums text-sky-300">
                          +{line.value}
                        </span>
                        <span className="opacity-40">T{line.tierNum}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        {/* Potential */}
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
            Common Heroic lines for this slot. Full cube rates stay on the Cube
            Calculator.
          </p>
        </section>
      </div>
    </div>
  );
}
