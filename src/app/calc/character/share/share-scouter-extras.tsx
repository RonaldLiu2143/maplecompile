"use client";

import { useMemo } from "react";
import {
  BUFF_DEFS,
  getHexaSlots,
  getVisibleOzRings,
  INNER_ABILITY_OPTIONS,
  LINK_DEFS,
  OZ_CONTINUOUS_STATUS,
  resolveOzRingStats,
  SCOUTER_CDN,
  type BuffState,
  type LinkState,
  type ScouterInput,
  type StatKey,
} from "@/lib/scouter";

const labelCell =
  "border border-border/50 bg-surface-muted/50 px-2 py-1 text-xs font-medium";
const valueCell =
  "border border-border/50 bg-surface-muted/40 px-2 py-1 text-right text-xs tabular-nums text-foreground/80";

const STAT_LABELS: Record<StatKey, string> = {
  str: "STR",
  dex: "DEX",
  int: "INT",
  luk: "LUK",
  hp: "Max HP",
};

function CdnIcon({
  src,
  alt,
  fallback,
  size = 24,
}: {
  src: string | null;
  alt: string;
  fallback?: string;
  size?: number;
}) {
  if (!src) {
    return (
      <div
        className="flex items-center justify-center rounded bg-surface-muted text-[8px] font-bold tracking-tight"
        style={{ width: size, height: size }}
        title={alt}
      >
        {fallback ?? alt.slice(0, 3).toUpperCase()}
      </div>
    );
  }
  const href =
    src.startsWith("http://") || src.startsWith("https://")
      ? src
      : `${SCOUTER_CDN}${src}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={href}
      alt={alt}
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

function LevelBadge({ value }: { value: number | string }) {
  return (
    <span className="w-full rounded border border-border/40 bg-background px-0 py-0 text-center text-[10px] tabular-nums">
      {value}
    </span>
  );
}

/** Read-only Buffs / Links / HEXA / Artifact / Oz — icons match Scouter. */
export function ShareScouterExtrasPanel({
  input,
  buffs,
  links,
  hexa,
}: {
  input: ScouterInput;
  buffs: BuffState;
  links: LinkState;
  hexa: number[];
}) {
  const hexaSlots = useMemo(
    () => getHexaSlots(input.charType),
    [input.charType],
  );
  const { keys: ozStatKeys, weaponLabel: ozWeaponLabel } = useMemo(
    () => resolveOzRingStats(input),
    [input],
  );
  const continuousLabel =
    OZ_CONTINUOUS_STATUS.find((o) => o.id === input.ozContinuousStatus)
      ?.label ?? input.ozContinuousStatus;
  const innerLabel =
    INNER_ABILITY_OPTIONS.find((o) => o.id === input.specialInnerAbility)
      ?.label ?? input.specialInnerAbility;

  return (
    <div className="space-y-2">
      <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
        <div className="border-b border-border/40 px-2 py-1">
          <h2 className="text-xs font-semibold">Buffs</h2>
        </div>
        <div className="grid grid-cols-8 gap-1 p-1.5 sm:grid-cols-10">
          {BUFF_DEFS.map((b) => {
            const st = buffs[b.id] ?? { on: false, level: 0 };
            const active = b.control === "check" ? st.on : st.level > 0;
            const tip = `${b.label} — ${b.bonus}`;
            return (
              <div
                key={b.id}
                title={tip}
                className={`flex flex-col items-center gap-0.5 rounded border p-1 ${
                  active
                    ? "border-accent bg-accent-soft/40"
                    : "border-border/40 bg-background opacity-55"
                }`}
              >
                <CdnIcon src={b.icon} alt={b.label} size={24} />
                {b.control === "check" ? (
                  <span
                    className={`inline-block size-2.5 rounded-sm border ${
                      st.on
                        ? "border-accent bg-accent"
                        : "border-border/60 bg-background"
                    }`}
                    aria-hidden
                  />
                ) : (
                  <LevelBadge value={st.level} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
        <div className="border-b border-border/40 px-2 py-1">
          <h2 className="text-xs font-semibold">Links/Legion</h2>
        </div>
        <div className="grid grid-cols-8 gap-1 p-1.5 sm:grid-cols-10">
          {LINK_DEFS.map((l) => {
            const level = links[l.id] ?? 0;
            const tip = `${l.label} — ${l.bonus}`;
            return (
              <div
                key={l.id}
                title={tip}
                className={`flex flex-col items-center gap-0.5 rounded border p-1 ${
                  level > 0
                    ? "border-accent/50 bg-accent-soft/25"
                    : "border-border/40 bg-background opacity-55"
                }`}
              >
                <CdnIcon
                  src={l.icon}
                  alt={l.label}
                  fallback={l.short}
                  size={24}
                />
                <LevelBadge value={level} />
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-[1fr_4.5rem] border-t border-border/30">
          <div className={labelCell}>Wild Hunter Legion</div>
          <div className={valueCell}>{input.wildHunterLegion}</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
        <div className="border-b border-border/40 px-2 py-1">
          <h2 className="text-xs font-semibold">HEXA Enhancement</h2>
        </div>
        <div className="grid grid-cols-6 gap-1 p-1.5 sm:grid-cols-7">
          {hexaSlots.map((slot, i) => {
            const locked = !!slot.unavailableInGms;
            const level = locked ? 0 : (hexa[i] ?? 0);
            return (
              <div
                key={slot.id}
                title={
                  locked
                    ? `${slot.label} (not available in GMS)`
                    : `${slot.label} · Lv. ${level}`
                }
                className={`flex flex-col items-center gap-0.5 rounded border border-border/40 p-1 ${
                  locked
                    ? "bg-surface-muted/40 opacity-40 grayscale"
                    : level > 0
                      ? "bg-background"
                      : "bg-background opacity-55"
                }`}
              >
                <CdnIcon
                  src={slot.iconSuffix}
                  alt={slot.label}
                  fallback={slot.label.slice(0, 3)}
                  size={24}
                />
                <LevelBadge value={level} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
        <div className="border-b border-border/40 px-2 py-1">
          <h2 className="text-xs font-semibold">Legion Artifact</h2>
        </div>
        <div className="space-y-1.5 p-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 ${
              input.legionArtifactAdditionalExp ? "" : "opacity-45"
            }`}
          >
            <span
              className={`inline-block size-3 rounded-sm border ${
                input.legionArtifactAdditionalExp
                  ? "border-accent bg-accent"
                  : "border-border/60 bg-background"
              }`}
              aria-hidden
            />
            Additional EXP (+1 Mob Targeted)
          </span>
          <div className="grid grid-cols-[1fr_4.5rem]">
            <div className={labelCell}>Final Attack</div>
            <div className={valueCell}>{input.legionArtifactFinalAttack}</div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
        <div className="border-b border-border/40 px-2 py-1">
          <h2 className="text-xs font-semibold">Special Inner Ability</h2>
        </div>
        <div className="px-2 py-1.5 text-xs opacity-90">{innerLabel}</div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
        <div className="border-b border-border/40 px-2 py-1">
          <h2 className="text-xs font-semibold">Oz Ring</h2>
        </div>
        <div className="space-y-1.5 p-1.5">
          <p className="text-xs opacity-75">
            Continuous Use Status: {continuousLabel}
          </p>
          <div className="grid grid-cols-3 gap-1">
            {getVisibleOzRings(input.ozContinuousStatus).map((ring) => (
              <div
                key={ring.id}
                title={ring.label}
                className="flex flex-col items-center gap-0.5 rounded border border-border/40 bg-background p-1"
              >
                <CdnIcon src={ring.icon} alt={ring.label} size={24} />
                <LevelBadge value={input[ring.field]} />
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded border border-border/40">
            <div className="grid grid-cols-[1fr_4.5rem]">
              <div className={labelCell}>Weapon Total {ozWeaponLabel}</div>
              <div className={valueCell}>{input.ozWeaponTotalAtt}</div>
            </div>
            {ozStatKeys.slice(0, 2).map((key, i) => (
              <div key={key} className="grid grid-cols-[1fr_4.5rem]">
                <div className={labelCell}>{STAT_LABELS[key]}</div>
                <div className={valueCell}>
                  {i === 0 ? input.ozPrimaryStat : input.ozSecondaryStat}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
