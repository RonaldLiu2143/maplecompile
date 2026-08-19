"use client";

import type { ReactNode } from "react";
import type { BossClearFightMinutes } from "@/lib/scouter/boss-cuts";
import type { MapleScouterCalculatedData } from "@/lib/scouter/to-user-stat";

export type BossConvertedStatValues = {
  boss300Normal: number;
  boss300Hexa: number;
  boss380Normal: number;
  boss380Hexa: number;
};

export function bossConvertedFromMaple(
  data: MapleScouterCalculatedData,
): BossConvertedStatValues {
  const n300 = Math.round(Number(data.boss300_stat ?? 0) || 0);
  const n380 = Math.round(Number(data.boss380_stat ?? 0) || 0);
  return {
    boss300Normal: n300,
    boss300Hexa: Math.round(
      Number(data.boss300_hexaStat ?? data.boss300_stat ?? 0) || 0,
    ),
    boss380Normal: n380,
    boss380Hexa: Math.round(
      Number(data.boss380_hexaStat ?? data.boss380_stat ?? 0) || 0,
    ),
  };
}

function formatNum(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
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
    <div className="rounded-lg border border-border/30 bg-background/60 px-2 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-55">
        {label}
      </p>
      <p
        className={`mt-0.5 text-lg font-bold tabular-nums ${
          emphasize ? "text-accent" : ""
        }`}
      >
        {formatNum(value)}
      </p>
    </div>
  );
}

function PdrBlock({
  title,
  normal,
  hexa,
}: {
  title: string;
  normal: number;
  hexa: number;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold opacity-80">{title}</p>
      <div className="grid grid-cols-2 gap-1.5">
        <ConvertedStatCell label="Normal" value={normal} />
        <ConvertedStatCell label="HEXA" value={hexa} emphasize />
      </div>
    </div>
  );
}

/**
 * MapleScouter-style Boss Converted Stat panel (20/30 min + 300/380 NORMAL|HEXA).
 */
export function BossConvertedStatPanel({
  values,
  fightMinutes,
  onFightMinutesChange,
  loading,
  className,
}: {
  values: BossConvertedStatValues;
  fightMinutes: BossClearFightMinutes;
  onFightMinutesChange: (minutes: BossClearFightMinutes) => void;
  loading?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-border/50 bg-surface/95 p-3 shadow-sm sm:p-4 ${
        className ?? ""
      }`}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight">
            Boss Converted Stat
          </h2>
          <p className="mt-0.5 text-xs leading-snug opacity-60">
            20 min = MapleScouter / KMS default. 30 min = GMS (is30min + GMS HP
            clears).
          </p>
        </div>
        <div className="inline-flex overflow-hidden rounded-full border border-border/50 text-xs">
          <ToggleBtn
            active={fightMinutes === 20}
            onClick={() => onFightMinutesChange(20)}
            title="20 min · KMS HP · MapleScouter default BCS"
          >
            20 min
          </ToggleBtn>
          <ToggleBtn
            active={fightMinutes === 30}
            onClick={() => onFightMinutesChange(30)}
            title="30 min · GMS HP · GMS BCS (is30min)"
          >
            30 min
          </ToggleBtn>
        </div>
      </div>

      <div
        className={`space-y-3 transition-opacity ${
          loading ? "opacity-60" : "opacity-100"
        }`}
      >
        <PdrBlock
          title="Boss 300% PDR"
          normal={values.boss300Normal}
          hexa={values.boss300Hexa}
        />
        <PdrBlock
          title="Boss 380% PDR"
          normal={values.boss380Normal}
          hexa={values.boss380Hexa}
        />
      </div>
    </section>
  );
}

function ToggleBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`px-3 py-1.5 font-semibold transition ${
        active ? "bg-accent text-primary-foreground" : "bg-surface hover:bg-surface-muted"
      }`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
