"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BUFF_DEFS,
  calculateScouter,
  computeClassFinalDamage,
  defaultBuffState,
  defaultHexaLevels,
  defaultLinkState,
  defaultScouterInput,
  getHexaSlots,
  HEXA_MAX_LEVEL,
  INNER_ABILITY_OPTIONS,
  LINK_DEFS,
  OZ_CONTINUOUS_STATUS,
  OZ_RING_MAX,
  getVisibleOzRings,
  resolveMainSecondary,
  resolveOzRingStats,
  SCOUTER_CDN,
  type BuffState,
  type LinkState,
  type ScouterInput,
  type StatKey,
  type StatTriple,
} from "@/lib/scouter";
import {
  CLASS_OPTIONS,
  DEFAULT_CHAR,
  DEFAULT_JOB,
  parseClassValue,
} from "@/lib/jobs";
import { storage } from "@/lib/storage";

const PRESET_KEY = "maplehub-scouter-preset";

const cell =
  "border border-border/50 bg-background px-2 py-1.5 text-sm outline-none focus:relative focus:z-10 focus:border-accent";
const labelCell =
  "border border-border/50 bg-surface-muted/50 px-2 py-1.5 text-sm font-medium";
const headCell =
  "border border-border/50 bg-surface-muted px-2 py-1.5 text-sm font-medium";

const STAT_LABELS: Record<StatKey, string> = {
  str: "STR",
  dex: "DEX",
  int: "INT",
  luk: "LUK",
  hp: "Max HP",
};

function formatNum(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function applyTriple(t: StatTriple): number {
  return t.base * (1 + t.percent / 100) + t.flat;
}

function NumInput({
  value,
  onChange,
  className = "",
  placeholder,
  readOnly,
}: {
  value: number;
  onChange?: (n: number) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type="number"
      readOnly={readOnly}
      placeholder={placeholder}
      className={`${cell} w-full min-w-0 text-right tabular-nums ${
        readOnly ? "bg-surface-muted/40 text-foreground/70" : ""
      } ${className}`}
      value={Number.isFinite(value) ? value : 0}
      onChange={
        !readOnly && onChange
          ? (e) => onChange(Number(e.target.value) || 0)
          : undefined
      }
    />
  );
}

function TripleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StatTriple;
  onChange: (next: StatTriple) => void;
}) {
  return (
    <div className="grid grid-cols-4">
      <div className={labelCell}>{label}</div>
      <NumInput
        value={value.base}
        onChange={(base) => onChange({ ...value, base })}
      />
      <NumInput
        value={value.percent}
        onChange={(percent) => onChange({ ...value, percent })}
      />
      <NumInput
        value={value.flat}
        onChange={(flat) => onChange({ ...value, flat })}
      />
    </div>
  );
}

function FieldCell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(6.5rem,1.15fr)_minmax(4rem,0.85fr)]">
      <div className={labelCell}>{label}</div>
      {children}
    </div>
  );
}

function CdnIcon({
  src,
  alt,
  fallback,
  size = 32,
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

export default function ScouterPage() {
  const [input, setInput] = useState<ScouterInput>(() =>
    defaultScouterInput(DEFAULT_JOB, DEFAULT_CHAR),
  );
  const [buffs, setBuffs] = useState<BuffState>(() => defaultBuffState());
  const [links, setLinks] = useState<LinkState>(() => defaultLinkState());
  const [hexa, setHexa] = useState<number[]>(() => defaultHexaLevels());
  const [presetMsg, setPresetMsg] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  const classValue = `${input.jobType}:${input.charType}`;
  const { mainKeys, secondaryKeys, isXenon, isDa } = useMemo(
    () => resolveMainSecondary(input),
    [input],
  );
  const { keys: ozStatKeys, weaponLabel: ozWeaponLabel } = useMemo(
    () => resolveOzRingStats(input),
    [input],
  );
  const result = useMemo(() => calculateScouter(input), [input]);
  const hexaSlots = useMemo(
    () => getHexaSlots(input.charType),
    [input.charType],
  );
  const attackPowerTotal = useMemo(
    () => Math.floor(Number(applyTriple(input.attack).toFixed(10))),
    [input.attack],
  );
  const magicAttackTotal = useMemo(
    () => Math.floor(Number(applyTriple(input.magicAttack).toFixed(10))),
    [input.magicAttack],
  );

  const computedFinalDamage = useMemo(
    () =>
      computeClassFinalDamage(input.charType, {
        level: input.level,
        reboot: input.reboot,
        liberation: input.liberation,
        passiveSkillPlus1: input.specialInnerAbility === "passivePlus1",
      }),
    [
      input.charType,
      input.level,
      input.reboot,
      input.liberation,
      input.specialInnerAbility,
    ],
  );

  useEffect(() => {
    const last = storage.getScouterLast();
    if (last?.input) {
      const job = last.input.jobType || DEFAULT_JOB;
      const char = last.input.charType || DEFAULT_CHAR;
      setInput({ ...defaultScouterInput(job, char), ...last.input });
    }
    if (last?.buffs) setBuffs(last.buffs);
    if (last?.links) setLinks(last.links);
    if (last?.hexa) setHexa(last.hexa);
    setDraftReady(true);
  }, []);

  useEffect(() => {
    setInput((prev) =>
      prev.finalDamagePercent === computedFinalDamage
        ? prev
        : { ...prev, finalDamagePercent: computedFinalDamage },
    );
  }, [computedFinalDamage]);

  useEffect(() => {
    if (!draftReady) return;
    storage.setScouterLast({ input, buffs, links, hexa });
  }, [input, buffs, links, hexa, draftReady]);

  const patch = (partial: Partial<ScouterInput>) =>
    setInput((prev) => ({ ...prev, ...partial }));

  const setStat = (key: StatKey, triple: StatTriple) =>
    setInput((prev) => ({
      ...prev,
      stats: { ...prev.stats, [key]: triple },
    }));

  const onClassChange = (value: string) => {
    const parsed = parseClassValue(value);
    if (!parsed) return;
    setInput((prev) => ({
      ...prev,
      jobType: parsed.jobType,
      charType: parsed.charType,
      useMagicAttack: parsed.jobType === "magician",
      finalDamagePercent: computeClassFinalDamage(parsed.charType, {
        level: prev.level,
        reboot: prev.reboot,
        liberation: prev.liberation,
        passiveSkillPlus1: prev.specialInnerAbility === "passivePlus1",
      }),
    }));
    setHexa(defaultHexaLevels());
  };

  const allBuffsOn = BUFF_DEFS.filter((b) => !b.mutexGroup).every((b) =>
    b.control === "check"
      ? buffs[b.id]?.on
      : (buffs[b.id]?.level ?? 0) > 0,
  );

  const toggleSelectAllBuffs = () => {
    const nextOn = !allBuffsOn;
    setBuffs((prev) => {
      const next = { ...prev };
      for (const b of BUFF_DEFS) {
        if (b.control === "check") {
          // Don't auto-enable mutually exclusive consumables together
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
    setBuffs((prev) => {
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

  const savePreset = () => {
    try {
      localStorage.setItem(
        PRESET_KEY,
        JSON.stringify({ input, buffs, links, hexa }),
      );
      setPresetMsg("Preset saved");
      setTimeout(() => setPresetMsg(null), 2000);
    } catch {
      setPresetMsg("Could not save");
    }
  };

  const recallPreset = () => {
    try {
      const raw = localStorage.getItem(PRESET_KEY);
      if (!raw) {
        setPresetMsg("No saved preset");
        setTimeout(() => setPresetMsg(null), 2000);
        return;
      }
      const data = JSON.parse(raw) as {
        input: ScouterInput;
        buffs: BuffState;
        links: LinkState;
        hexa: number[];
      };
      if (data.input) setInput(data.input);
      if (data.buffs) setBuffs(data.buffs);
      if (data.links) setLinks(data.links);
      if (data.hexa) setHexa(data.hexa);
      setPresetMsg("Preset loaded");
      setTimeout(() => setPresetMsg(null), 2000);
    } catch {
      setPresetMsg("Could not load");
    }
  };

  const tripleRows: { label: string; key?: StatKey; kind?: "att" | "matt" }[] =
    (() => {
      if (isDa) {
        return [
          { label: "Max HP", key: "hp" as StatKey },
          { label: "STR", key: "str" as StatKey },
          { label: "Attack", kind: "att" as const },
        ];
      }
      if (isXenon) {
        return [
          { label: "STR", key: "str" as StatKey },
          { label: "DEX", key: "dex" as StatKey },
          { label: "LUK", key: "luk" as StatKey },
          { label: "Attack", kind: "att" as const },
        ];
      }
      const pri = mainKeys.map((k) => ({ label: STAT_LABELS[k], key: k }));
      const sec = secondaryKeys.map((k) => ({
        label: STAT_LABELS[k],
        key: k,
      }));
      return [
        ...pri,
        ...sec,
        {
          label: input.useMagicAttack ? "M.Attack" : "Attack",
          kind: input.useMagicAttack ? ("matt" as const) : ("att" as const),
        },
      ];
    })();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Scouter
          </h1>
          <p className="mt-1 max-w-2xl text-sm opacity-75">
            Same layout as MapleScouter — stats on the left, buffs / links /
            HEXA on the right.
          </p>
        </div>
        {presetMsg ? (
          <span className="text-sm font-medium text-accent">{presetMsg}</span>
        ) : null}
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
        {/* —— Left: Enter Directly —— */}
        <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-3 py-2">
            <h2 className="text-sm font-semibold">
              Enter Directly (Character Stats Changes)
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={recallPreset}
                className="rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted"
              >
                Recall Saved Preset
              </button>
              <button
                type="button"
                onClick={savePreset}
                className="rounded border border-border/50 bg-background px-2.5 py-1 text-xs font-semibold transition hover:bg-surface-muted"
              >
                Save Preset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4">
            <div className={labelCell}>Level</div>
            <NumInput
              value={input.level}
              onChange={(level) => patch({ level })}
            />
            <div className={labelCell}>Class</div>
            <select
              className={`${cell} w-full min-w-0`}
              value={classValue}
              onChange={(e) => onClassChange(e.target.value)}
            >
              {CLASS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          <p className="border-b border-border/40 bg-accent-soft/25 px-3 py-2 text-xs leading-relaxed text-accent">
            General Requirements: No Buffs, Link Equipped (No Stacks), Oz Ring
            Equipped / Summons On / (Decent) Combat Orders, Sharp Eyes On /
            Soul Gauge 0/1000 / Familiars On. Class Specific: Maple Warrior,
            Ancient Warding, Elvish Blessing, 0 Stacks.
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border/40 px-3 py-2 text-sm">
            {(
              [
                ["reboot", "Reboot", input.reboot],
                ["liberation", "Liberation", input.liberation],
                ["mugongSoul", "Mugong Soul", input.mugongSoul],
              ] as const
            ).map(([key, label, checked]) => (
              <label key={key} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[var(--accent)]"
                  checked={checked}
                  onChange={(e) => patch({ [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>

          {/* Top: main / sub / attack (character window style) */}
          <div className="m-2 overflow-hidden rounded-md border border-border/50">
            <div className="grid grid-cols-4">
              <div className={headCell} />
              <div className={headCell}>Base Value</div>
              <div className={headCell}>% Value</div>
              <div className={headCell}>% Value Not Applied</div>
            </div>
            {tripleRows.map((row) => {
              if (row.key) {
                return (
                  <TripleRow
                    key={row.key}
                    label={row.label}
                    value={input.stats[row.key]}
                    onChange={(t) => setStat(row.key!, t)}
                  />
                );
              }
              if (row.kind === "matt") {
                return (
                  <TripleRow
                    key="matt"
                    label={row.label}
                    value={input.magicAttack}
                    onChange={(magicAttack) => patch({ magicAttack })}
                  />
                );
              }
              return (
                <TripleRow
                  key="att"
                  label={row.label}
                  value={input.attack}
                  onChange={(attack) => patch({ attack })}
                />
              );
            })}
          </div>

          {/* Middle: combat stats — MapleStory character window order */}
          <div className="mx-2 mb-2 overflow-hidden rounded-md border border-border/50">
            <div className="grid sm:grid-cols-2">
              <FieldCell label="General Range">
                <NumInput value={result.displayedMax} readOnly />
              </FieldCell>
              <FieldCell label="Damage">
                <NumInput
                  value={input.damagePercent}
                  onChange={(damagePercent) => patch({ damagePercent })}
                />
              </FieldCell>
              <FieldCell label="Final Damage">
                <NumInput
                  value={Math.round(input.finalDamagePercent * 100) / 100}
                  readOnly
                />
              </FieldCell>
              <FieldCell label="Boss Damage">
                <NumInput
                  value={input.bossDamagePercent}
                  onChange={(bossDamagePercent) =>
                    patch({ bossDamagePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Ignore Defense">
                <NumInput
                  value={input.ignoreDefensePercent}
                  onChange={(ignoreDefensePercent) =>
                    patch({ ignoreDefensePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Normal Enemy Damage">
                <input
                  type="text"
                  readOnly
                  disabled
                  value=""
                  className={`${cell} w-full min-w-0 cursor-not-allowed bg-surface-muted/40 text-right text-foreground/40`}
                />
              </FieldCell>
              <FieldCell label="Attack Power">
                <NumInput value={attackPowerTotal} readOnly />
              </FieldCell>
              <FieldCell label="Critical Rate">
                <NumInput
                  value={input.criticalRatePercent}
                  onChange={(criticalRatePercent) =>
                    patch({ criticalRatePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Magic Att">
                <NumInput value={magicAttackTotal} readOnly />
              </FieldCell>
              <FieldCell label="Critical Damage">
                <NumInput
                  value={input.criticalDamagePercent}
                  onChange={(criticalDamagePercent) =>
                    patch({ criticalDamagePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Cooldown Reduction">
                <div className="flex min-w-0">
                  <NumInput
                    value={input.cooldownReductionSeconds}
                    onChange={(cooldownReductionSeconds) =>
                      patch({ cooldownReductionSeconds })
                    }
                    className="border-r-0"
                  />
                  <span
                    className={`${labelCell} flex shrink-0 items-center px-1 text-xs`}
                  >
                    sec
                  </span>
                  <NumInput
                    value={input.cooldownReductionPercent}
                    onChange={(cooldownReductionPercent) =>
                      patch({ cooldownReductionPercent })
                    }
                  />
                  <span
                    className={`${labelCell} flex shrink-0 items-center px-1 text-xs`}
                  >
                    %
                  </span>
                </div>
              </FieldCell>
              <FieldCell label="Buff Duration">
                <NumInput
                  value={input.buffDurationPercent}
                  onChange={(buffDurationPercent) =>
                    patch({ buffDurationPercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Cooldown Not Applied">
                <NumInput
                  value={input.cooldownSkipPercent}
                  onChange={(cooldownSkipPercent) =>
                    patch({ cooldownSkipPercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Ignore Elemental Resistance">
                <NumInput
                  value={input.ignoreElementalResistancePercent}
                  onChange={(ignoreElementalResistancePercent) =>
                    patch({ ignoreElementalResistancePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Additional Status Damage">
                <NumInput
                  value={input.additionalStatusDamagePercent}
                  onChange={(additionalStatusDamagePercent) =>
                    patch({ additionalStatusDamagePercent })
                  }
                />
              </FieldCell>
              <FieldCell label="Summons Duration Increase">
                <NumInput
                  value={input.summonDurationPercent}
                  onChange={(summonDurationPercent) =>
                    patch({ summonDurationPercent })
                  }
                />
              </FieldCell>
            </div>
          </div>

          {/* Bottom: Arcane / Sacred only */}
          <div className="mx-2 mb-2 overflow-hidden rounded-md border border-border/50">
            <div className="grid sm:grid-cols-2">
              <FieldCell label="Arcane Force">
                <NumInput
                  value={input.arcaneForce}
                  onChange={(arcaneForce) => patch({ arcaneForce })}
                />
              </FieldCell>
              <FieldCell label="Sacred Force">
                <NumInput
                  value={input.sacredForce}
                  onChange={(sacredForce) => patch({ sacredForce })}
                />
              </FieldCell>
            </div>
          </div>

          <div className="border-t border-border/40 px-3 py-4 text-center">
            <p className="text-sm font-medium opacity-70">Combat Power</p>
            <p className="font-display mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
              {formatNum(result.combatPower)}
            </p>
          </div>
        </section>

        {/* —— Right: Buffs / Links / HEXA —— */}
        <div className="space-y-2">
          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="flex items-center justify-between border-b border-border/40 px-2 py-1">
              <h2 className="text-xs font-semibold">Buffs</h2>
              <label className="flex items-center gap-1 text-[11px] font-medium">
                <input
                  type="checkbox"
                  className="size-3 accent-[var(--accent)]"
                  checked={allBuffsOn}
                  onChange={toggleSelectAllBuffs}
                />
                Select All
              </label>
            </div>
            <div className="grid grid-cols-8 gap-1 p-1.5 sm:grid-cols-10">
              {BUFF_DEFS.map((b) => {
                const st = buffs[b.id] ?? { on: false, level: 0 };
                const active =
                  b.control === "check" ? st.on : st.level > 0;
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
                        className="pointer-events-none size-3 accent-[var(--accent)]"
                        checked={st.on}
                        onChange={(e) =>
                          setBuffChecked(b.id, e.target.checked)
                        }
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
                        setBuffs((prev) => ({
                          ...prev,
                          [b.id]: { on: true, level: capped },
                        }));
                      }}
                    />
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
                const tip = `${l.label} — ${l.bonus}`;
                return (
                  <div
                    key={l.id}
                    className="flex flex-col items-center gap-0.5 rounded border border-border/40 bg-background p-1"
                  >
                    <span title={tip} className="cursor-help">
                      <CdnIcon
                        src={l.icon}
                        alt={l.label}
                        fallback={l.short}
                        size={24}
                      />
                    </span>
                    <input
                      type="number"
                      title={tip}
                      min={0}
                      max={l.maxLevel}
                      className="w-full rounded border border-border/40 bg-background px-0 py-0 text-center text-[10px] tabular-nums outline-none focus:border-accent"
                      value={links[l.id] ?? 0}
                      onChange={(e) => {
                        const raw = Number(e.target.value) || 0;
                        const capped = Math.min(Math.max(0, raw), l.maxLevel);
                        setLinks((prev) => ({ ...prev, [l.id]: capped }));
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-[1fr_4.5rem] border-t border-border/30">
              <div className={`${labelCell} !py-1 text-xs`}>
                Wild Hunter Legion
              </div>
              <NumInput
                value={input.wildHunterLegion}
                onChange={(wildHunterLegion) => patch({ wildHunterLegion })}
                className="!py-1 text-xs"
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-2 py-1">
              <h2 className="text-xs font-semibold">HEXA Enhancement</h2>
            </div>
            <div className="grid grid-cols-6 gap-1 p-1.5 sm:grid-cols-7">
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
                    value={hexa[i] ?? 0}
                    onChange={(e) => {
                      const raw = Number(e.target.value) || 0;
                      const capped = Math.min(
                        Math.max(0, raw),
                        HEXA_MAX_LEVEL,
                      );
                      setHexa((prev) => {
                        const next = [...prev];
                        next[i] = capped;
                        return next;
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-2 py-1">
              <h2 className="text-xs font-semibold">Legion Artifact</h2>
            </div>
            <div className="space-y-1.5 p-1.5">
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  className="size-3 accent-[var(--accent)]"
                  checked={input.legionArtifactAdditionalExp}
                  onChange={(e) =>
                    patch({ legionArtifactAdditionalExp: e.target.checked })
                  }
                />
                Additional EXP (+1 Mob Targeted)
              </label>
              <div className="grid grid-cols-[1fr_4.5rem]">
                <div className={`${labelCell} !py-1 text-xs`}>Final Attack</div>
                <NumInput
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
            <div className="border-b border-border/40 px-2 py-1">
              <h2 className="text-xs font-semibold">Special Inner Ability</h2>
            </div>
            <div className="flex flex-col gap-1 p-1.5 text-xs">
              {INNER_ABILITY_OPTIONS.map((opt) => (
                <label key={opt.id} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="specialInnerAbility"
                    className="size-3 accent-[var(--accent)]"
                    checked={input.specialInnerAbility === opt.id}
                    onChange={() => patch({ specialInnerAbility: opt.id })}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-2 py-1">
              <h2 className="text-xs font-semibold">Oz Ring</h2>
            </div>
            <div className="space-y-1.5 p-1.5">
              <label className="flex flex-col gap-0.5 text-xs">
                Continuous Use Status
                <select
                  className={`${cell} w-full !py-1 text-xs`}
                  value={input.ozContinuousStatus}
                  onChange={(e) =>
                    patch({
                      ozContinuousStatus: e.target.value as "noUse" | "use",
                    })
                  }
                >
                  {OZ_CONTINUOUS_STATUS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-3 gap-1">
                {getVisibleOzRings(input.ozContinuousStatus).map((ring) => (
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
                      value={input[ring.field]}
                      onChange={(e) => {
                        const raw = Number(e.target.value) || 0;
                        const capped = Math.min(Math.max(0, raw), OZ_RING_MAX);
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
                  <NumInput
                    value={input.ozWeaponTotalAtt}
                    onChange={(ozWeaponTotalAtt) =>
                      patch({ ozWeaponTotalAtt })
                    }
                    className="!py-1 text-xs"
                  />
                </div>
                {ozStatKeys.slice(0, 2).map((key, i) => {
                  const value =
                    i === 0 ? input.ozPrimaryStat : input.ozSecondaryStat;
                  const onChange =
                    i === 0
                      ? (ozPrimaryStat: number) => patch({ ozPrimaryStat })
                      : (ozSecondaryStat: number) =>
                          patch({ ozSecondaryStat });
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-[1fr_4.5rem]"
                    >
                      <div className={`${labelCell} !py-1 text-xs`}>
                        {STAT_LABELS[key]}
                      </div>
                      <NumInput
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
      </div>

      <p className="text-xs opacity-60">
        Layout matched to{" "}
        <a
          href="https://maplescouter.com/en/input"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline"
        >
          MapleScouter
        </a>
        . Buff / link / HEXA icons load from their CDN for visual parity.
      </p>
    </div>
  );
}
