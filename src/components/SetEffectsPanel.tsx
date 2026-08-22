"use client";

import { useState } from "react";
import {
  formatStatValue,
  normalizeStatId,
  SET_DISPLAY_NAMES,
  STAT_DISPLAY_ORDER,
  STAT_LABELS,
  type SetBreakdown,
  type TotalsMap,
} from "@/lib/set-effects";

type TotalProps = {
  totals: TotalsMap;
};

type BreakdownProps = {
  breakdown: SetBreakdown[];
};

export function TotalSetEffects({ totals }: TotalProps) {
  const activeStats = STAT_DISPLAY_ORDER.filter((id) => (totals[id] ?? 0) !== 0);

  return (
    <section className="w-full min-w-0">
      <h2 className="font-display text-sm font-semibold">Total Set Effects</h2>
      {activeStats.length === 0 ? (
        <p className="mt-1 text-xs opacity-60">No set bonuses yet.</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1">
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
  );
}

function SetBreakdownBlock({ b }: { b: SetBreakdown }) {
  const [open, setOpen] = useState(true);
  const name = SET_DISPLAY_NAMES[b.set.setType] ?? b.set.setType;
  const tiers = b.set.effects ?? [];
  const headerId = `set-fx-${b.set.setType}`;
  const panelId = `${headerId}-panel`;

  const toggle = () => setOpen((v) => !v);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-controls={panelId}
      id={headerId}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      className={`flex w-full min-w-0 cursor-pointer flex-col rounded-md border border-border/40 bg-surface/80 px-1.5 py-1 text-left transition hover:bg-surface-muted/40 ${
        open ? "h-full min-h-0" : "self-start"
      }`}
    >
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span
          className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-xs opacity-60"
          aria-hidden
        >
          {open ? "▾" : "▸"}
        </span>
        <span className="text-[13px] font-semibold leading-tight">{name}</span>
        <span className="text-xs leading-tight opacity-60">
          {b.numEquipped} eq
          {b.luckyApplied ? " · lucky" : ""}
        </span>
        <div className="flex flex-wrap gap-px">
          {b.equippedItems.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.id}
              src={item.imgUrl}
              alt=""
              title={item.name}
              width={18}
              height={18}
              className="h-[18px] w-[18px] object-contain"
            />
          ))}
        </div>
      </div>
      {open && tiers.length > 0 ? (
        <ul
          id={panelId}
          className="mt-0.5 min-h-0 flex-1 space-y-0 pl-5 text-xs leading-tight"
          aria-labelledby={headerId}
        >
          {tiers.map((tier) => {
            const active = b.numEquipped >= tier.numEquipped;
            return (
              <li
                key={tier.numEquipped}
                className={active ? "" : "opacity-40"}
              >
                <span
                  className={
                    active
                      ? "font-semibold text-accent"
                      : "font-semibold opacity-70"
                  }
                >
                  {tier.numEquipped}:
                </span>{" "}
                <span className={active ? "" : "opacity-80"}>
                  {tier.list
                    .map((s) => {
                      const id = normalizeStatId(s.statId);
                      return `${STAT_LABELS[id] ?? id} ${formatStatValue(id, s.val)}`;
                    })
                    .join(" · ")}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function SetEffectsBreakdown({ breakdown }: BreakdownProps) {
  const activeSets = breakdown.filter((b) => b.numEquipped > 0);

  return (
    <section>
      <h2 className="font-display text-sm font-semibold">
        Set Effects Breakdown
      </h2>
      {activeSets.length === 0 ? (
        <p className="mt-0.5 text-xs opacity-60">— No active sets —</p>
      ) : (
        <div className="mt-1 grid grid-cols-1 items-stretch gap-1 sm:grid-cols-2 xl:grid-cols-3">
          {activeSets.map((b) => (
            <SetBreakdownBlock key={b.set.setType} b={b} />
          ))}
        </div>
      )}
    </section>
  );
}
