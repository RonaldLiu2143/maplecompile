"use client";

import { useMemo } from "react";
import {
  clampStarForce,
  defaultStarForceForEquip,
  equipCapabilities,
  getStarForceCap,
} from "@/lib/equip-capabilities";
import {
  getSelectableStats,
  getWeaponAtt,
} from "@/lib/flames";
import { defaultPotentialTier } from "@/lib/planner";
import {
  buildPotentialPreset,
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
    equip.starForce ?? defaultStarForceForEquip(equip),
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
      className="flex w-full max-w-sm flex-col overflow-hidden rounded-lg border border-border bg-surface"
      role="region"
      aria-label={`Edit ${equip.name}`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2.5">
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
            <div className="text-sm text-muted-foreground">
              {slotLabel}
            </div>
            <div className="truncate text-sm font-semibold">
              {equip.name}
            </div>
            <div className="text-sm text-muted-foreground">Lv. {equip.level}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded border border-border px-2 py-1 text-sm font-semibold hover:bg-muted"
        >
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onChangeItem}
          className="rounded border border-border px-2.5 py-1.5 text-sm font-semibold hover:bg-muted"
        >
          Change item
        </button>
        <button
          type="button"
          onClick={onUnequip}
          className="rounded border border-danger/40 px-2.5 py-1.5 text-sm font-semibold text-danger hover:bg-danger/10"
        >
          Unequip
        </button>
      </div>

      <div className="maple-scroll max-h-[36rem] space-y-4 p-3">
        {!showAnyEditor && (
          <p className="text-sm text-muted-foreground">
            This item cannot take Star Force, flames, or potential.
          </p>
        )}

        {caps.starForce && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
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
            <h3 className="text-sm font-semibold text-muted-foreground">
              Flames{" "}
              <span className="font-normal text-muted-foreground">
                ({lines.length}/4)
              </span>
            </h3>
            {lines.length > 0 && (
              <ul className="space-y-1 rounded border border-border bg-background px-2 py-1.5">
                {lines.map((line) => {
                  const stat = selectable.find((s) => s.id === line.id);
                  return (
                    <li
                      key={`${line.id}-${line.tierNum}`}
                      className="flex items-baseline justify-between gap-2 text-sm leading-snug"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {stat?.name ?? line.id}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        <span className="font-semibold">
                          +{line.value}
                        </span>
                        <span className="ml-1.5 text-sm text-muted-foreground">
                          T{line.tierNum}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div
              className="overflow-x-auto rounded border border-border bg-background p-1.5"
            >
              <div
                className="grid gap-x-1 gap-y-1"
                style={{
                  gridTemplateColumns: "minmax(4.75rem, 5.75rem) repeat(7, minmax(1.75rem, 1fr))",
                }}
              >
                <div className="px-1 py-0.5 text-sm font-semibold text-muted-foreground">
                  Stat
                </div>
                {[1, 2, 3, 4, 5, 6, 7].map((t) => (
                  <div
                    key={t}
                    className="py-0.5 text-center text-sm font-semibold tabular-nums text-muted-foreground"
                  >
                    T{t}
                  </div>
                ))}
                {selectable.map((stat) => (
                  <div key={stat.id} className="contents">
                    <div className="flex items-center px-1 text-sm font-medium leading-tight">
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
                          className={`flex h-11 items-center justify-center rounded border text-sm font-semibold tabular-nums transition ${
                            active
                              ? "border-accent bg-accent text-primary-foreground"
                              : "border-border bg-muted text-muted-foreground hover:border-foreground/40 hover:bg-surface-muted hover:text-foreground"
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
            <h3 className="text-sm font-semibold text-muted-foreground">
              Potential
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onChange({
                    potentialTier: 3,
                    potentialLines: buildPotentialPreset(equip, "3line", 3),
                  })
                }
                className="rounded border border-border px-2.5 py-1.5 text-sm font-semibold hover:bg-muted"
                title="3 main lines with 1 max/prime line (Legendary)"
              >
                3 Line
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    potentialTier: 3,
                    potentialLines: buildPotentialPreset(equip, "2prime", 3),
                  })
                }
                className="rounded border border-border px-2.5 py-1.5 text-sm font-semibold hover:bg-muted"
                title="2 max/prime potential lines (Legendary)"
              >
                2 prime
              </button>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              Tier
              <select
                value={potentialTier}
                onChange={(e) =>
                  onChange({
                    potentialTier: Number(e.target.value) as 0 | 1 | 2 | 3,
                  })
                }
                className="min-h-11 rounded border border-border bg-background px-2 py-1.5 text-sm font-semibold outline-none focus:border-accent"
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
                  className="flex flex-col gap-1 text-sm"
                >
                  Line {i + 1}
                  <select
                    value={line ? lineOptionKey(line) : ""}
                    onChange={(e) => setPotLine(i, e.target.value)}
                    className="min-h-11 rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent"
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
            <p className="text-sm leading-snug text-muted-foreground">
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
