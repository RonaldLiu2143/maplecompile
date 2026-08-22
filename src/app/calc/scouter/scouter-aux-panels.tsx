"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  BUFF_DEFS,
  clampHexaForGms,
  HEXA_MAX_LEVEL,
  INNER_ABILITY_OPTIONS,
  LINK_DEFS,
  OZ_CONTINUOUS_STATUS,
  OZ_RING_MAX,
  getVisibleOzRings,
  type BuffState,
  type LinkState,
  type ScouterInput,
  type StatKey,
} from "@/lib/scouter";
import {
  ScouterCdnIcon,
  ScouterLevelInput,
  ScouterNumInput,
  scouterCellClass,
  scouterLabelCellClass,
} from "./scouter-field-primitives";

const STAT_LABELS: Record<StatKey, string> = {
  str: "STR",
  dex: "DEX",
  int: "INT",
  luk: "LUK",
  hp: "Max HP",
};

export type ScouterAuxPanelsProps = {
  buffs: BuffState;
  setBuffs: Dispatch<SetStateAction<BuffState>>;
  links: LinkState;
  setLinks: Dispatch<SetStateAction<LinkState>>;
  hexa: number[];
  setHexa: Dispatch<SetStateAction<number[]>>;
  input: ScouterInput;
  patch: (partial: Partial<ScouterInput>) => void;
  hexaSlots: ReturnType<typeof import("@/lib/scouter").getHexaSlots>;
  allBuffsOn: boolean;
  toggleSelectAllBuffs: () => void;
  setBuffChecked: (id: string, on: boolean) => void;
  toggleLevelBuff: (id: string) => void;
  ozWeaponLabel: string;
  ozStatKeys: StatKey[];
};

/** Buffs, links, HEXA, legion artifact, inner ability, Oz ring — code-split from main Scouter page. */
export function ScouterAuxPanels({
  buffs,
  setBuffs,
  links,
  setLinks,
  hexa,
  setHexa,
  input,
  patch,
  hexaSlots,
  allBuffsOn,
  toggleSelectAllBuffs,
  setBuffChecked,
  toggleLevelBuff,
  ozWeaponLabel,
  ozStatKeys,
}: ScouterAuxPanelsProps) {
  const labelCell = scouterLabelCellClass;
  const cell = scouterCellClass;

  return (
    <div className="space-y-2">
      <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
        <div className="flex items-center justify-between border-b border-border/40 px-2 py-1.5">
          <h2 className="text-xs font-semibold">Buffs</h2>
          <label className="flex min-h-11 items-center gap-2 px-1 text-xs font-medium">
            <input
              type="checkbox"
              className="size-4 accent-[var(--accent)]"
              checked={allBuffsOn}
              onChange={toggleSelectAllBuffs}
            />
            Select All
          </label>
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {BUFF_DEFS.map((b) => {
            const st = buffs[b.id] ?? { on: false, level: 0 };
            const active = b.control === "check" ? st.on : st.level > 0;
            const tip = `${b.label} — ${b.bonus}`;
            const cardClass = `flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded border p-1.5 ${
              active
                ? "border-accent bg-accent-soft/40"
                : "border-border/40 bg-background"
            }`;
            if (b.control === "check") {
              return (
                <label
                  key={b.id}
                  title={tip}
                  className={`${cardClass} cursor-pointer touch-manipulation`}
                >
                  <ScouterCdnIcon src={b.icon} alt={b.label} size={24} />
                  <span className="line-clamp-2 max-w-full text-center text-xs leading-tight opacity-80">
                    {b.label}
                  </span>
                  <input
                    type="checkbox"
                    className="pointer-events-none size-4 accent-[var(--accent)]"
                    checked={st.on}
                    onChange={(e) => setBuffChecked(b.id, e.target.checked)}
                  />
                </label>
              );
            }
            const max = b.maxLevel ?? 99;
            return (
              <div
                key={b.id}
                title={tip}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={`${b.label}: ${active ? "on" : "off"}`}
                className={`${cardClass} cursor-pointer touch-manipulation`}
                onClick={() => toggleLevelBuff(b.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleLevelBuff(b.id);
                  }
                }}
              >
                <ScouterCdnIcon src={b.icon} alt={b.label} size={24} />
                <span className="line-clamp-2 max-w-full text-center text-xs leading-tight opacity-80">
                  {b.label}
                </span>
                <div
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <ScouterLevelInput
                    value={st.level}
                    max={max}
                    title={tip}
                    onChange={(level) => {
                      setBuffs((prev) => ({
                        ...prev,
                        [b.id]: { on: level > 0, level },
                      }));
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
        <div className="border-b border-border/40 px-2 py-1.5">
          <h2 className="text-xs font-semibold">Links/Legion</h2>
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {LINK_DEFS.map((l) => {
            const tip = `${l.label} — ${l.bonus}`;
            return (
              <div
                key={l.id}
                className="flex min-h-11 flex-col items-center gap-0.5 rounded border border-border/40 bg-background p-1.5"
              >
                <span title={tip} className="cursor-help">
                  <ScouterCdnIcon
                    src={l.icon}
                    alt={l.label}
                    fallback={l.short}
                    size={24}
                  />
                </span>
                <span className="line-clamp-2 max-w-full text-center text-xs leading-tight opacity-80">
                  {l.label}
                </span>
                <ScouterLevelInput
                  value={links[l.id] ?? 0}
                  max={l.maxLevel}
                  title={tip}
                  onChange={(capped) => {
                    setLinks((prev) => ({ ...prev, [l.id]: capped }));
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-[1fr_4.5rem] border-t border-border/30">
          <div className={`${labelCell} !py-1 text-xs`}>Wild Hunter Legion</div>
          <ScouterNumInput
            value={input.wildHunterLegion}
            onChange={(wildHunterLegion) => patch({ wildHunterLegion })}
            className="!py-1 text-xs"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
        <div className="border-b border-border/40 px-2 py-1.5">
          <h2 className="text-xs font-semibold">HEXA Enhancement</h2>
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-2 sm:grid-cols-6 md:grid-cols-7">
          {hexaSlots.map((slot, i) => {
            const locked = !!slot.unavailableInGms;
            return (
              <div
                key={slot.id}
                title={
                  locked
                    ? `${slot.label} (not available in GMS)`
                    : slot.label
                }
                className={`flex min-h-11 flex-col items-center gap-0.5 rounded border border-border/40 p-1.5 ${
                  locked
                    ? "bg-surface-muted/40 opacity-40 grayscale"
                    : "bg-background"
                }`}
              >
                <ScouterCdnIcon
                  src={slot.iconSuffix}
                  alt={slot.label}
                  fallback={slot.label.slice(0, 3)}
                  size={24}
                />
                <span className="line-clamp-2 max-w-full text-center text-xs leading-tight opacity-80">
                  {slot.label}
                </span>
                <ScouterLevelInput
                  value={locked ? 0 : (hexa[i] ?? 0)}
                  max={HEXA_MAX_LEVEL}
                  title={
                    locked
                      ? `${slot.label} (not available in GMS)`
                      : slot.label
                  }
                  disabled={locked}
                  onChange={(level) => {
                    if (locked) return;
                    setHexa((prev) => {
                      const next = [...prev];
                      next[i] = level;
                      return clampHexaForGms(next);
                    });
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
        <div className="border-b border-border/40 px-2 py-1.5">
          <h2 className="text-xs font-semibold">Legion Artifact</h2>
        </div>
        <div className="space-y-1.5 p-2">
          <label className="flex min-h-11 items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="size-4 accent-[var(--accent)]"
              checked={input.legionArtifactAdditionalExp}
              onChange={(e) =>
                patch({ legionArtifactAdditionalExp: e.target.checked })
              }
            />
            Additional EXP (+1 Mob Targeted)
          </label>
          <div className="grid grid-cols-[1fr_4.5rem]">
            <div className={`${labelCell} !py-1 text-xs`}>Final Attack</div>
            <ScouterNumInput
              value={input.legionArtifactFinalAttack}
              onChange={(legionArtifactFinalAttack) =>
                patch({
                  legionArtifactFinalAttack: Math.min(
                    40,
                    Math.max(0, legionArtifactFinalAttack),
                  ),
                })
              }
              className="!py-1 text-xs"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
        <div className="border-b border-border/40 px-2 py-1.5">
          <h2 className="text-xs font-semibold">Special Inner Ability</h2>
        </div>
        <div className="flex flex-col gap-1 p-2 text-xs">
          {INNER_ABILITY_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className="flex min-h-11 items-center gap-2"
            >
              <input
                type="radio"
                name="specialInnerAbility"
                className="size-4 accent-[var(--accent)]"
                checked={input.specialInnerAbility === opt.id}
                onChange={() => patch({ specialInnerAbility: opt.id })}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
        <div className="border-b border-border/40 px-2 py-1.5">
          <h2 className="text-xs font-semibold">Oz Ring</h2>
        </div>
        <div className="space-y-1.5 p-2">
          <label className="flex flex-col gap-0.5 text-xs">
            Continuous Use Status
            <select
              className={`${cell} w-full !py-1 text-xs`}
              value={input.ozContinuousStatus}
              onChange={(e) => {
                const ozContinuousStatus = e.target.value as "noUse" | "use";
                if (ozContinuousStatus === "use") {
                  patch({
                    ozContinuousStatus,
                    ozRestraintLevel: 0,
                    ozWeaponJumpLevel: 0,
                    ozRingOfSumLevel: 0,
                  });
                } else {
                  patch({
                    ozContinuousStatus,
                    ozContinuousLevel: 0,
                  });
                }
              }}
            >
              {OZ_CONTINUOUS_STATUS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div
            className={`grid gap-1.5 ${
              input.ozContinuousStatus === "use"
                ? "grid-cols-1 max-w-[5.5rem]"
                : "grid-cols-3"
            }`}
          >
            {getVisibleOzRings(input.ozContinuousStatus).map((ring) => (
              <div
                key={ring.id}
                title={ring.label}
                className="flex min-h-11 flex-col items-center gap-0.5 rounded border border-border/40 bg-background p-1.5"
              >
                <ScouterCdnIcon src={ring.icon} alt={ring.label} size={24} />
                <span className="line-clamp-2 text-center text-xs leading-tight opacity-80">
                  {ring.label}
                </span>
                <ScouterLevelInput
                  value={input[ring.field]}
                  max={OZ_RING_MAX}
                  title={ring.label}
                  onChange={(capped) => {
                    patch({ [ring.field]: capped });
                  }}
                />
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded border border-border/40">
            <div className="grid grid-cols-[1fr_4.5rem]">
              <div className={`${labelCell} !py-1 text-xs`}>
                Weapon Total {ozWeaponLabel}
              </div>
              <ScouterNumInput
                value={input.ozWeaponTotalAtt}
                onChange={(ozWeaponTotalAtt) => patch({ ozWeaponTotalAtt })}
                className="!py-1 text-xs"
              />
            </div>
            {ozStatKeys.slice(0, 2).map((key, i) => {
              const value =
                i === 0 ? input.ozPrimaryStat : input.ozSecondaryStat;
              const onChange =
                i === 0
                  ? (ozPrimaryStat: number) => patch({ ozPrimaryStat })
                  : (ozSecondaryStat: number) => patch({ ozSecondaryStat });
              return (
                <div key={key} className="grid grid-cols-[1fr_4.5rem]">
                  <div className={`${labelCell} !py-1 text-xs`}>
                    {STAT_LABELS[key]}
                  </div>
                  <ScouterNumInput
                    value={value}
                    onChange={onChange}
                    className="!py-1 text-xs"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
