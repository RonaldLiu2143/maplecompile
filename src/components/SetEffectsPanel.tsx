"use client";

import {
  calculateSetEffects,
  formatStatValue,
  SET_DISPLAY_NAMES,
  STAT_DISPLAY_ORDER,
  STAT_LABELS,
} from "@/lib/set-effects";
import type { EquipSetup, SetEffect } from "@/lib/types";

type Props = {
  setup: EquipSetup;
  setList: SetEffect[];
};

export function SetEffectsPanel({ setup, setList }: Props) {
  const { totals, breakdown } = calculateSetEffects(setup, setList);
  const activeStats = STAT_DISPLAY_ORDER.filter((id) => (totals[id] ?? 0) !== 0);
  const activeSets = breakdown.filter((b) => b.numEquipped > 0);

  return (
    <div className="space-y-4">
      <section>
        <h2 className="font-display text-base font-semibold">Total Set Effects</h2>
        {activeStats.length === 0 ? (
          <p className="mt-1 text-xs opacity-60">No set bonuses yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1">
            {activeStats.map((id) => (
              <div
                key={id}
                className="inline-flex items-baseline gap-1 rounded border border-accent/30 bg-accent-soft/50 px-1.5 py-0.5 text-xs"
              >
                <span className="opacity-70">{STAT_LABELS[id] ?? id}</span>
                <span className="font-semibold tabular-nums text-accent">
                  {formatStatValue(id, totals[id])}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-base font-semibold">
          Set Effects Breakdown
        </h2>
        {activeSets.length === 0 ? (
          <p className="mt-1 text-xs opacity-60">— No active sets —</p>
        ) : (
          <div className="mt-2 space-y-2">
            {activeSets.map((b) => {
              const name =
                SET_DISPLAY_NAMES[b.set.setType] ?? b.set.setType;
              const activeTiers = (b.set.effects ?? []).filter(
                (tier) => b.numEquipped >= tier.numEquipped,
              );
              return (
                <div
                  key={b.set.setType}
                  className="rounded-lg border border-border/40 bg-surface/80 px-2.5 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{name}</span>
                    <span className="text-[11px] opacity-60">
                      {b.numEquipped} eq
                      {b.luckyApplied ? " · lucky" : ""}
                    </span>
                    <div className="flex flex-wrap gap-0.5">
                      {b.equippedItems.map((item) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={item.id}
                          src={item.imgUrl}
                          alt={item.name}
                          title={item.name}
                          width={20}
                          height={20}
                          className="h-5 w-5 object-contain"
                        />
                      ))}
                    </div>
                  </div>
                  {activeTiers.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-[11px] leading-snug">
                      {activeTiers.map((tier) => (
                        <li key={tier.numEquipped}>
                          <span className="font-semibold text-accent">
                            {tier.numEquipped}:
                          </span>{" "}
                          {tier.list
                            .map(
                              (s) =>
                                `${STAT_LABELS[s.statId] ?? s.statId} ${formatStatValue(s.statId, s.val)}`,
                            )
                            .join(" · ")}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
