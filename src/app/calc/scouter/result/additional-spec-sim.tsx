"use client";

import { useMemo, useState, type ReactNode } from "react";
import { resolveMainSecondary } from "@/lib/scouter/calc";
import {
  BUFF_DEFS,
  defaultBuffState,
  defaultHexaLevels,
  defaultLinkState,
  defaultScouterInput,
  getHexaSlots,
  getVisibleOzRings,
  HEXA_MAX_LEVEL,
  OZ_CONTINUOUS_STATUS,
  OZ_RING_MAX,
  SCOUTER_CDN,
  type BuffState,
  type OzContinuousStatus,
  type OzRingField,
} from "@/lib/scouter";
import { storage } from "@/lib/storage";
import type { MapleScouterCalculatedData } from "@/lib/scouter/to-user-stat";
import type { ScouterInput, StatKey } from "@/lib/scouter/types";

const STAT_LABEL: Record<StatKey, string> = {
  str: "STR",
  dex: "DEX",
  int: "INT",
  luk: "LUK",
  hp: "HP",
};

export type SpecSimFields = {
  finalDmg: string;
  bossDmg: string;
  atk: string;
  atkPer: string;
  criDmg: string;
  ignoreGuard: string;
  mainStat: string;
  mainStatPer: string;
  subStat: string;
  subStatPer: string;
  criRate: string;
  allStatPer: string;
  coolTimeReduce: string;
  buffDuration: string;
  resetCoolDown: string;
  weaponAtk: string;
  arcane: string;
  authentic: string;
  levelChange: string;
};

export const EMPTY_SPEC_SIM: SpecSimFields = {
  finalDmg: "",
  bossDmg: "",
  atk: "",
  atkPer: "",
  criDmg: "",
  ignoreGuard: "",
  mainStat: "",
  mainStatPer: "",
  subStat: "",
  subStatPer: "",
  criRate: "",
  allStatPer: "",
  coolTimeReduce: "",
  buffDuration: "",
  resetCoolDown: "",
  weaponAtk: "",
  arcane: "",
  authentic: "",
  levelChange: "",
};

type SimOzState = {
  ozContinuousStatus: OzContinuousStatus;
  ozContinuousLevel: number;
  ozRestraintLevel: number;
  ozWeaponJumpLevel: number;
  ozRingOfSumLevel: number;
};

function loadDraftMeta() {
  const last = storage.getScouterLast();
  const job = last?.input?.jobType || "warrior";
  const char = last?.input?.charType || "adele";
  const input = {
    ...defaultScouterInput(job, char),
    ...(last?.input ?? {}),
  };
  const { mainKeys, secondaryKeys } = resolveMainSecondary(input);
  return {
    input,
    buffs: structuredClone(last?.buffs ?? defaultBuffState()),
    links: last?.links ?? defaultLinkState(),
    hexa: [...(last?.hexa ?? defaultHexaLevels())],
    mainLabel: STAT_LABEL[mainKeys[0] ?? "str"],
    subLabel: STAT_LABEL[secondaryKeys[0] ?? "dex"],
    atkLabel: input.useMagicAttack ? "MATT" : "ATT",
  };
}

function ozFromInput(input: ScouterInput): SimOzState {
  return {
    ozContinuousStatus: input.ozContinuousStatus,
    ozContinuousLevel: input.ozContinuousLevel,
    ozRestraintLevel: input.ozRestraintLevel,
    ozWeaponJumpLevel: input.ozWeaponJumpLevel,
    ozRingOfSumLevel: input.ozRingOfSumLevel,
  };
}

function num(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function stackIed(current: number, add: number): number {
  if (!add) return current;
  const a = Math.min(Math.max(current, 0), 99.999) / 100;
  const b = Math.min(Math.max(add, 0), 99.999) / 100;
  return Math.min(99.999999, (1 - (1 - a) * (1 - b)) * 100);
}

export function applySpecSimToInput(
  base: ScouterInput,
  sim: SpecSimFields,
): ScouterInput {
  const next: ScouterInput = structuredClone(base);
  const { mainKeys, secondaryKeys } = resolveMainSecondary(next);

  next.finalDamagePercent += num(sim.finalDmg);
  next.bossDamagePercent += num(sim.bossDmg);
  next.criticalDamagePercent += num(sim.criDmg);
  next.criticalRatePercent += num(sim.criRate);
  next.ignoreDefensePercent = stackIed(
    next.ignoreDefensePercent,
    num(sim.ignoreGuard),
  );
  next.cooldownReductionSeconds += num(sim.coolTimeReduce);
  next.buffDurationPercent += num(sim.buffDuration);
  next.cooldownSkipPercent += num(sim.resetCoolDown);
  next.arcaneForce += num(sim.arcane);
  next.sacredForce += num(sim.authentic);
  next.level += num(sim.levelChange);

  const atkKey = next.useMagicAttack ? "magicAttack" : "attack";
  next[atkKey] = {
    ...next[atkKey],
    base: next[atkKey].base + num(sim.atk),
    percent: next[atkKey].percent + num(sim.atkPer),
  };
  next.ozWeaponTotalAtt += num(sim.weaponAtk);

  const allPer = num(sim.allStatPer);
  for (const key of mainKeys) {
    next.stats[key] = {
      ...next.stats[key],
      base: next.stats[key].base + num(sim.mainStat),
      percent: next.stats[key].percent + num(sim.mainStatPer) + allPer,
    };
  }
  for (const key of secondaryKeys) {
    next.stats[key] = {
      ...next.stats[key],
      base: next.stats[key].base + num(sim.subStat),
      percent: next.stats[key].percent + num(sim.subStatPer) + allPer,
    };
  }
  if (allPer) {
    for (const key of ["str", "dex", "int", "luk"] as StatKey[]) {
      if (mainKeys.includes(key) || secondaryKeys.includes(key)) continue;
      next.stats[key] = {
        ...next.stats[key],
        percent: next.stats[key].percent + allPer,
      };
    }
  }

  return next;
}

function formatSigned(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return abs;
}

function formatFdPercent(n: number): string {
  if (!Number.isFinite(n)) return "0.000%";
  return `${n.toLocaleString(undefined, {
    maximumFractionDigits: 3,
    minimumFractionDigits: 3,
  })}%`;
}

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

function SimMetric({
  label,
  value,
  delta,
  emphasize,
}: {
  label: string;
  value: string;
  delta: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-md border border-border/30 bg-background/50 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-55">
        {label}
      </p>
      <p
        className={`mt-0.5 font-display text-base font-bold tabular-nums ${
          emphasize ? "text-accent" : ""
        }`}
      >
        {value}
      </p>
      <p className="text-[11px] tabular-nums opacity-60">({delta})</p>
    </div>
  );
}

function SimField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-[11px] font-medium opacity-70">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder="0"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "" || /^-?\d*\.?\d*$/.test(v)) onChange(v);
        }}
        className="h-8 rounded-md border border-border/50 bg-surface px-2 text-sm tabular-nums outline-none focus:border-accent"
      />
    </label>
  );
}

function Accordion({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-lg border border-border/40">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <span className="opacity-50">{open ? "▴" : "▾"}</span>
      </button>
      {open ? <div className="border-t border-border/30 p-3">{children}</div> : null}
    </div>
  );
}

type Props = {
  baseline: MapleScouterCalculatedData;
};

export function AdditionalSpecSimulation({ baseline }: Props) {
  const draftMeta = useMemo(() => loadDraftMeta(), []);
  const hexaSlots = useMemo(
    () => getHexaSlots(draftMeta.input.charType),
    [draftMeta.input.charType],
  );

  const [sim, setSim] = useState<SpecSimFields>(EMPTY_SPEC_SIM);
  const [simBuffs, setSimBuffs] = useState<BuffState>(() =>
    structuredClone(draftMeta.buffs),
  );
  const [simHexa, setSimHexa] = useState<number[]>(() => [...draftMeta.hexa]);
  const [simOz, setSimOz] = useState<SimOzState>(() =>
    ozFromInput(draftMeta.input),
  );
  const [simEnabled, setSimEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MapleScouterCalculatedData | null>(null);

  const setField = (key: keyof SpecSimFields, value: string) => {
    setSim((prev) => ({ ...prev, [key]: value }));
  };

  const allBuffsOn = BUFF_DEFS.filter((b) => !b.mutexGroup).every((b) =>
    b.control === "check"
      ? simBuffs[b.id]?.on
      : (simBuffs[b.id]?.level ?? 0) > 0,
  );

  const toggleSelectAllBuffs = () => {
    const nextOn = !allBuffsOn;
    setSimBuffs((prev) => {
      const next = { ...prev };
      for (const b of BUFF_DEFS) {
        if (b.control === "check") {
          const enable = nextOn && !b.mutexGroup;
          next[b.id] = { ...next[b.id], on: enable };
        } else {
          next[b.id] = {
            on: nextOn,
            level: nextOn ? (b.defaultLevel ?? b.maxLevel ?? 1) : 0,
          };
        }
      }
      return next;
    });
  };

  const setBuffChecked = (id: string, on: boolean) => {
    setSimBuffs((prev) => {
      const def = BUFF_DEFS.find((b) => b.id === id);
      const next = { ...prev, [id]: { ...(prev[id] ?? { level: 0 }), on } };
      if (on && def?.mutexGroup) {
        for (const other of BUFF_DEFS) {
          if (
            other.id !== id &&
            other.mutexGroup === def.mutexGroup &&
            next[other.id]
          ) {
            next[other.id] = { ...next[other.id], on: false };
          }
        }
      }
      return next;
    });
  };

  const setOzLevel = (field: OzRingField, level: number) => {
    const capped = Math.min(Math.max(0, level), OZ_RING_MAX);
    setSimOz((prev) => ({ ...prev, [field]: capped }));
  };

  const applied = simEnabled && result != null;

  const metrics = useMemo(() => {
    const base = baseline;
    const cur = applied ? result! : baseline;
    const dmg300Base = Number(base.calculatedHexaDamage_300 ?? 0);
    const dmg380Base = Number(base.calculatedHexaDamage_380 ?? 0);
    const dmg300 = Number(cur.calculatedHexaDamage_300 ?? 0);
    const dmg380 = Number(cur.calculatedHexaDamage_380 ?? 0);
    const fd300 = dmg300Base > 0 ? (dmg300 / dmg300Base - 1) * 100 : 0;
    const fd380 = dmg380Base > 0 ? (dmg380 / dmg380Base - 1) * 100 : 0;

    const item300 = Number(cur.boss300_stat ?? 0);
    const hexa300 = Number(cur.boss300_hexaStat ?? 0);
    const item380 = Number(cur.boss380_stat ?? 0);
    const hexa380 = Number(cur.boss380_hexaStat ?? 0);
    const item300Base = Number(base.boss300_stat ?? 0);
    const hexa300Base = Number(base.boss300_hexaStat ?? 0);
    const item380Base = Number(base.boss380_stat ?? 0);
    const hexa380Base = Number(base.boss380_hexaStat ?? 0);

    return {
      fd300,
      fd380,
      item300,
      hexa300,
      item380,
      hexa380,
      dItem300: item300 - item300Base,
      dHexa300: hexa300 - hexa300Base,
      dItem380: item380 - item380Base,
      dHexa380: hexa380 - hexa380Base,
      combat: Number(cur.combatPower ?? 0),
      dCombat: Number(cur.combatPower ?? 0) - Number(base.combatPower ?? 0),
      exchange: Number(cur.exchangePower ?? 0),
      dExchange:
        Number(cur.exchangePower ?? 0) - Number(base.exchangePower ?? 0),
      exchangeHexa: Number(cur.exchangePowerHexa ?? 0),
      dExchangeHexa:
        Number(cur.exchangePowerHexa ?? 0) -
        Number(base.exchangePowerHexa ?? 0),
    };
  }, [applied, baseline, result]);

  const onApply = async () => {
    setLoading(true);
    setError(null);
    try {
      const input = {
        ...applySpecSimToInput(draftMeta.input, sim),
        ...simOz,
      };
      const res = await fetch("/api/scouter/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          buffs: simBuffs,
          links: draftMeta.links,
          hexa: simHexa,
        }),
      });
      const json = (await res.json()) as {
        calculatedData?: MapleScouterCalculatedData | null;
        error?: string;
      };
      if (!res.ok || !json.calculatedData) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }
      setResult(json.calculatedData);
      setSimEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const onReset = () => {
    setSim(EMPTY_SPEC_SIM);
    setSimBuffs(structuredClone(draftMeta.buffs));
    setSimHexa([...draftMeta.hexa]);
    setSimOz(ozFromInput(draftMeta.input));
    setResult(null);
    setError(null);
  };

  return (
    <section className="rounded-xl border border-border/50 bg-surface/95 p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight sm:text-lg">
            Additional Spec Simulation
          </h2>
          <p className="mt-0.5 text-xs opacity-60">
            Adjust buffs, fundamentals, and stats, then Apply to see Boss
            300/380 gains.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/50 bg-surface px-3 py-1.5 text-xs font-semibold">
          <input
            type="checkbox"
            className="size-3.5 accent-[var(--accent,#c2410c)]"
            checked={simEnabled}
            onChange={(e) => setSimEnabled(e.target.checked)}
          />
          Show simulation
        </label>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border border-border/40 bg-background/40 p-3">
          <p className="mb-2 text-sm font-semibold">Boss 300</p>
          <div className="grid grid-cols-3 gap-2">
            <SimMetric
              label="FD %"
              value={formatFdPercent(applied ? metrics.fd300 : 0)}
              delta={applied ? formatSigned(metrics.fd300, 3) : "—"}
              emphasize={applied && metrics.fd300 > 0}
            />
            <SimMetric
              label="ITEM STAT"
              value={
                applied
                  ? Math.round(metrics.item300).toLocaleString()
                  : "0"
              }
              delta={applied ? formatSigned(Math.round(metrics.dItem300)) : "—"}
            />
            <SimMetric
              label="HEXA STAT"
              value={
                applied
                  ? Math.round(metrics.hexa300).toLocaleString()
                  : "0"
              }
              delta={applied ? formatSigned(Math.round(metrics.dHexa300)) : "—"}
              emphasize
            />
          </div>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/40 p-3">
          <p className="mb-2 text-sm font-semibold">Boss 380</p>
          <div className="grid grid-cols-3 gap-2">
            <SimMetric
              label="FD %"
              value={formatFdPercent(applied ? metrics.fd380 : 0)}
              delta={applied ? formatSigned(metrics.fd380, 3) : "—"}
              emphasize={applied && metrics.fd380 > 0}
            />
            <SimMetric
              label="ITEM STAT"
              value={
                applied
                  ? Math.round(metrics.item380).toLocaleString()
                  : "0"
              }
              delta={applied ? formatSigned(Math.round(metrics.dItem380)) : "—"}
            />
            <SimMetric
              label="HEXA STAT"
              value={
                applied
                  ? Math.round(metrics.hexa380).toLocaleString()
                  : "0"
              }
              delta={applied ? formatSigned(Math.round(metrics.dHexa380)) : "—"}
              emphasize
            />
          </div>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/40 p-3 sm:col-span-2 xl:col-span-1">
          <p className="mb-2 text-sm font-semibold">Combat Power</p>
          <div className="grid grid-cols-3 gap-2">
            <SimMetric
              label="Combat Power"
              value={
                applied ? Math.round(metrics.combat).toLocaleString() : "0"
              }
              delta={applied ? formatSigned(Math.round(metrics.dCombat)) : "—"}
            />
            <SimMetric
              label="Converted CP"
              value={
                applied ? Math.round(metrics.exchange).toLocaleString() : "0"
              }
              delta={
                applied ? formatSigned(Math.round(metrics.dExchange)) : "—"
              }
            />
            <SimMetric
              label="HEXA CP"
              value={
                applied
                  ? Math.round(metrics.exchangeHexa).toLocaleString()
                  : "0"
              }
              delta={
                applied
                  ? formatSigned(Math.round(metrics.dExchangeHexa))
                  : "—"
              }
              emphasize
            />
          </div>
        </div>
      </div>

      <p className="mb-3 text-xs text-sky-700 dark:text-sky-300">
        ※ Turn on Show simulation and press Apply to reflect buffs,
        fundamentals, and input changes in the cards above.
      </p>

      <div className="space-y-2">
        <Accordion title="Buffs">
          <div className="mb-2 flex items-center justify-end">
            <label className="flex items-center gap-1.5 text-xs font-medium">
              <input
                type="checkbox"
                className="size-3 accent-[var(--accent,#c2410c)]"
                checked={allBuffsOn}
                onChange={toggleSelectAllBuffs}
              />
              Select All
            </label>
          </div>
          <div className="grid grid-cols-8 gap-1 sm:grid-cols-10 lg:grid-cols-12">
            {BUFF_DEFS.map((b) => {
              const st = simBuffs[b.id] ?? { on: false, level: 0 };
              const active = b.control === "check" ? st.on : st.level > 0;
              const tip = `${b.label} — ${b.bonus}`;
              const cardClass = `flex flex-col items-center gap-0.5 rounded border p-1 ${
                active
                  ? "border-accent bg-accent-soft/40"
                  : "border-border/40 bg-background"
              }`;
              if (b.control === "check") {
                return (
                  <label
                    key={b.id}
                    title={tip}
                    className={`${cardClass} cursor-pointer`}
                  >
                    <CdnIcon src={b.icon} alt={b.label} size={24} />
                    <input
                      type="checkbox"
                      className="pointer-events-none size-3 accent-[var(--accent,#c2410c)]"
                      checked={st.on}
                      onChange={(e) => setBuffChecked(b.id, e.target.checked)}
                    />
                  </label>
                );
              }
              return (
                <div key={b.id} title={tip} className={cardClass}>
                  <CdnIcon src={b.icon} alt={b.label} size={24} />
                  <input
                    type="number"
                    min={0}
                    max={b.maxLevel ?? 99}
                    className="w-full rounded border border-border/40 bg-background px-0 py-0 text-center text-[10px] tabular-nums outline-none focus:border-accent"
                    value={st.level}
                    onChange={(e) => {
                      const raw = Number(e.target.value) || 0;
                      const capped = Math.min(
                        Math.max(0, raw),
                        b.maxLevel ?? 99,
                      );
                      setSimBuffs((prev) => ({
                        ...prev,
                        [b.id]: { on: true, level: capped },
                      }));
                    }}
                  />
                </div>
              );
            })}
          </div>
        </Accordion>

        <Accordion title="Character Fundamentals">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold opacity-70">Oz Ring</p>
              <label className="mb-2 flex max-w-xs flex-col gap-1 text-xs">
                Continuous Use Status
                <select
                  className="h-8 rounded-md border border-border/50 bg-surface px-2 text-sm outline-none focus:border-accent"
                  value={simOz.ozContinuousStatus}
                  onChange={(e) =>
                    setSimOz((prev) => ({
                      ...prev,
                      ozContinuousStatus: e.target.value as OzContinuousStatus,
                    }))
                  }
                >
                  {OZ_CONTINUOUS_STATUS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-3 gap-1 sm:max-w-xs">
                {getVisibleOzRings(simOz.ozContinuousStatus).map((ring) => (
                  <div
                    key={ring.id}
                    title={ring.label}
                    className="flex flex-col items-center gap-0.5 rounded border border-border/40 bg-background p-1"
                  >
                    <CdnIcon src={ring.icon} alt={ring.label} size={24} />
                    <input
                      type="number"
                      title={ring.label}
                      min={0}
                      max={OZ_RING_MAX}
                      className="w-full rounded border border-border/40 bg-background px-0 py-0 text-center text-[10px] tabular-nums outline-none focus:border-accent"
                      value={simOz[ring.field]}
                      onChange={(e) =>
                        setOzLevel(ring.field, Number(e.target.value) || 0)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold opacity-70">
                HEXA Enhancement
              </p>
              <div className="grid grid-cols-6 gap-1 sm:grid-cols-7 lg:grid-cols-8">
                {hexaSlots.map((slot, i) => (
                  <div
                    key={slot.id}
                    title={slot.label}
                    className="flex flex-col items-center gap-0.5 rounded border border-border/40 bg-background p-1"
                  >
                    <CdnIcon
                      src={slot.iconSuffix}
                      alt={slot.label}
                      fallback={slot.label.slice(0, 3)}
                      size={24}
                    />
                    <input
                      type="number"
                      min={0}
                      max={HEXA_MAX_LEVEL}
                      className="w-full rounded border border-border/40 bg-background px-0 py-0 text-center text-[10px] tabular-nums outline-none focus:border-accent"
                      value={simHexa[i] ?? 0}
                      onChange={(e) => {
                        const raw = Number(e.target.value) || 0;
                        const capped = Math.min(
                          Math.max(0, raw),
                          HEXA_MAX_LEVEL,
                        );
                        setSimHexa((prev) => {
                          const next = [...prev];
                          next[i] = capped;
                          return next;
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Accordion>

        <Accordion title="Input" defaultOpen>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <SimField
              label="Final Damage %"
              value={sim.finalDmg}
              onChange={(v) => setField("finalDmg", v)}
            />
            <SimField
              label="Boss Damage %"
              value={sim.bossDmg}
              onChange={(v) => setField("bossDmg", v)}
            />
            <SimField
              label={draftMeta.atkLabel}
              value={sim.atk}
              onChange={(v) => setField("atk", v)}
            />
            <SimField
              label={`${draftMeta.atkLabel} %`}
              value={sim.atkPer}
              onChange={(v) => setField("atkPer", v)}
            />
            <SimField
              label="Crit Damage %"
              value={sim.criDmg}
              onChange={(v) => setField("criDmg", v)}
            />
            <SimField
              label="IED %"
              value={sim.ignoreGuard}
              onChange={(v) => setField("ignoreGuard", v)}
            />
            <SimField
              label={draftMeta.mainLabel}
              value={sim.mainStat}
              onChange={(v) => setField("mainStat", v)}
            />
            <SimField
              label={`${draftMeta.mainLabel} %`}
              value={sim.mainStatPer}
              onChange={(v) => setField("mainStatPer", v)}
            />
            <SimField
              label={draftMeta.subLabel}
              value={sim.subStat}
              onChange={(v) => setField("subStat", v)}
            />
            <SimField
              label={`${draftMeta.subLabel} %`}
              value={sim.subStatPer}
              onChange={(v) => setField("subStatPer", v)}
            />
            <SimField
              label="Crit Rate %"
              value={sim.criRate}
              onChange={(v) => setField("criRate", v)}
            />
            <SimField
              label="All Stat %"
              value={sim.allStatPer}
              onChange={(v) => setField("allStatPer", v)}
            />
            <SimField
              label="CDR (sec)"
              value={sim.coolTimeReduce}
              onChange={(v) => setField("coolTimeReduce", v)}
            />
            <SimField
              label="Buff Duration %"
              value={sim.buffDuration}
              onChange={(v) => setField("buffDuration", v)}
            />
            <SimField
              label="Cooldown Skip %"
              value={sim.resetCoolDown}
              onChange={(v) => setField("resetCoolDown", v)}
            />
            <SimField
              label="Weapon ATT/MATT"
              value={sim.weaponAtk}
              onChange={(v) => setField("weaponAtk", v)}
            />
            <SimField
              label="+ Arcane Force"
              value={sim.arcane}
              onChange={(v) => setField("arcane", v)}
            />
            <SimField
              label="+ Sacred Force"
              value={sim.authentic}
              onChange={(v) => setField("authentic", v)}
            />
            <SimField
              label="+ Level"
              value={sim.levelChange}
              onChange={(v) => setField("levelChange", v)}
            />
          </div>
        </Accordion>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            disabled={loading}
            onClick={() => void onApply()}
          >
            {loading ? "Applying…" : "Apply"}
          </button>
          <button
            type="button"
            className="rounded-md border border-border/50 bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-60"
            disabled={loading}
            onClick={onReset}
          >
            Reset
          </button>
        </div>
        {error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        ) : null}
      </div>
    </section>
  );
}
