"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BOSS_PDR_PRESETS,
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
  OZ_RINGS,
  resolveMainSecondary,
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
}: {
  src: string | null;
  alt: string;
  fallback?: string;
}) {
  if (!src) {
    return (
      <div
        className="flex size-8 items-center justify-center rounded bg-surface-muted text-[9px] font-bold tracking-tight"
        title={alt}
      >
        {fallback ?? alt.slice(0, 3).toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${SCOUTER_CDN}${src}`}
      alt={alt}
      width={32}
      height={32}
      className="size-8 object-contain"
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
  const [pdrPreset, setPdrPreset] = useState("normal");
  const [showResult, setShowResult] = useState(true);
  const [presetMsg, setPresetMsg] = useState<string | null>(null);

  const classValue = `${input.jobType}:${input.charType}`;
  const { mainKeys, secondaryKeys, isXenon, isDa } = useMemo(
    () => resolveMainSecondary(input),
    [input],
  );
  const result = useMemo(() => calculateScouter(input), [input]);
  const hexaSlots = useMemo(
    () => getHexaSlots(input.charType),
    [input.charType],
  );
  const attackPowerTotal = useMemo(
    () => Math.round(applyTriple(input.attack)),
    [input.attack],
  );
  const magicAttackTotal = useMemo(
    () => Math.round(applyTriple(input.magicAttack)),
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
    setInput((prev) =>
      prev.finalDamagePercent === computedFinalDamage
        ? prev
        : { ...prev, finalDamagePercent: computedFinalDamage },
    );
  }, [computedFinalDamage]);

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

  const onPdrPreset = (id: string) => {
    setPdrPreset(id);
    const preset = BOSS_PDR_PRESETS.find((p) => p.id === id);
    if (preset && preset.value >= 0) patch({ bossPdrPercent: preset.value });
  };

  const allBuffsOn = BUFF_DEFS.every((b) =>
    b.control === "check" ? buffs[b.id]?.on : (buffs[b.id]?.level ?? 0) > 0,
  );

  const toggleSelectAllBuffs = () => {
    const nextOn = !allBuffsOn;
    setBuffs((prev) => {
      const next = { ...prev };
      for (const b of BUFF_DEFS) {
        if (b.control === "check") {
          next[b.id] = { ...next[b.id], on: nextOn };
        } else if (b.control === "level") {
          next[b.id] = {
            on: nextOn,
            level: nextOn ? (b.defaultLevel ?? b.maxLevel ?? 1) : 0,
          };
        }
      }
      return next;
    });
  };

  const savePreset = () => {
    try {
      localStorage.setItem(
        PRESET_KEY,
        JSON.stringify({ input, buffs, links, hexa, pdrPreset }),
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
        pdrPreset?: string;
      };
      if (data.input) setInput(data.input);
      if (data.buffs) setBuffs(data.buffs);
      if (data.links) setLinks(data.links);
      if (data.hexa) setHexa(data.hexa);
      if (data.pdrPreset) setPdrPreset(data.pdrPreset);
      setPresetMsg("Preset loaded");
      setTimeout(() => setPresetMsg(null), 2000);
    } catch {
      setPresetMsg("Could not load");
    }
  };

  const resetSoft = () => {
    setInput((prev) => ({
      ...defaultScouterInput(prev.jobType, prev.charType),
      level: prev.level,
      jobType: prev.jobType,
      charType: prev.charType,
      useMagicAttack: prev.useMagicAttack,
      stats: prev.stats,
      attack: prev.attack,
      magicAttack: prev.magicAttack,
      reboot: prev.reboot,
      liberation: prev.liberation,
      mugongSoul: prev.mugongSoul,
    }));
    setShowResult(false);
  };

  const resetHard = () => {
    setInput(defaultScouterInput(DEFAULT_JOB, DEFAULT_CHAR));
    setBuffs(defaultBuffState());
    setLinks(defaultLinkState());
    setHexa(defaultHexaLevels());
    setPdrPreset("normal");
    setShowResult(false);
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
              <FieldCell label="Damage Range">
                <NumInput
                  value={input.generalRange || Math.round(result.displayedMax)}
                  onChange={(generalRange) => patch({ generalRange })}
                />
              </FieldCell>
              <FieldCell label="Damage">
                <NumInput
                  value={input.damagePercent}
                  onChange={(damagePercent) => patch({ damagePercent })}
                />
              </FieldCell>
              <FieldCell label="Final Damage">
                <NumInput value={input.finalDamagePercent} readOnly />
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
                <NumInput
                  value={input.normalEnemyDamagePercent}
                  onChange={(normalEnemyDamagePercent) =>
                    patch({ normalEnemyDamagePercent })
                  }
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

          <div className="grid border-t border-border/30 sm:grid-cols-2">
            <FieldCell label="Mastery">
              <NumInput
                value={input.masteryPercent}
                onChange={(masteryPercent) => patch({ masteryPercent })}
              />
            </FieldCell>
            <FieldCell label="Boss PDR">
              <select
                className={`${cell} w-full`}
                value={pdrPreset}
                onChange={(e) => onPdrPreset(e.target.value)}
              >
                {BOSS_PDR_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </FieldCell>
          </div>
        </section>

        {/* —— Right: Buffs / Links / HEXA —— */}
        <div className="space-y-4">
          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
              <h2 className="text-sm font-semibold">Buffs</h2>
              <label className="flex items-center gap-1.5 text-xs font-medium">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[var(--accent)]"
                  checked={allBuffsOn}
                  onChange={toggleSelectAllBuffs}
                />
                Select All
              </label>
            </div>
            <div className="grid grid-cols-5 gap-2 p-3 sm:grid-cols-6">
              {BUFF_DEFS.map((b) => {
                const st = buffs[b.id] ?? { on: false, level: 0 };
                const active =
                  b.control === "check"
                    ? st.on
                    : b.control === "champion"
                      ? st.level > 0
                      : st.level > 0;
                return (
                  <div
                    key={b.id}
                    title={b.label}
                    className={`flex flex-col items-center gap-1 rounded border p-1.5 ${
                      active
                        ? "border-accent bg-accent-soft/40"
                        : "border-border/40 bg-background"
                    }`}
                  >
                    <CdnIcon src={b.icon} alt={b.label} />
                    {b.control === "check" ? (
                      <input
                        type="checkbox"
                        className="size-3.5 accent-[var(--accent)]"
                        checked={st.on}
                        onChange={(e) =>
                          setBuffs((prev) => ({
                            ...prev,
                            [b.id]: { ...st, on: e.target.checked },
                          }))
                        }
                      />
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={b.maxLevel ?? 99}
                        className="w-full rounded border border-border/40 bg-background px-0.5 py-0.5 text-center text-[11px] tabular-nums outline-none focus:border-accent"
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
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-3 py-2">
              <h2 className="text-sm font-semibold">Links/Legion</h2>
            </div>
            <div className="grid grid-cols-4 gap-2 p-3 sm:grid-cols-5">
              {LINK_DEFS.map((l) => (
                <div
                  key={l.id}
                  title={l.label}
                  className="flex flex-col items-center gap-1 rounded border border-border/40 bg-background p-1.5"
                >
                  <CdnIcon src={l.icon} alt={l.label} fallback={l.short} />
                  <input
                    type="number"
                    min={0}
                    max={l.maxLevel}
                    className="w-full rounded border border-border/40 bg-background px-0.5 py-0.5 text-center text-[11px] tabular-nums outline-none focus:border-accent"
                    value={links[l.id] ?? 0}
                    onChange={(e) => {
                      const raw = Number(e.target.value) || 0;
                      const capped = Math.min(Math.max(0, raw), l.maxLevel);
                      setLinks((prev) => ({ ...prev, [l.id]: capped }));
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_5rem] border-t border-border/30">
              <div className={labelCell}>Wild Hunter Legion</div>
              <NumInput
                value={input.wildHunterLegion}
                onChange={(wildHunterLegion) => patch({ wildHunterLegion })}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-3 py-2">
              <h2 className="text-sm font-semibold">HEXA Enhancement</h2>
            </div>
            {(
              [
                ["mastery", "HEXA Mastery Core"],
                ["reinforcement", "Reinforcement Core"],
                ["skill", "Skill Core"],
                ["common", "Common Core"],
              ] as const
            ).map(([group, title]) => {
              const slots = hexaSlots
                .map((slot, i) => ({ slot, i }))
                .filter(({ slot }) => slot.group === group);
              return (
                <div key={group} className="border-b border-border/30 last:border-b-0">
                  <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide opacity-60">
                    {title}
                  </p>
                  <div className="grid grid-cols-4 gap-2 p-3 sm:grid-cols-6">
                    {slots.map(({ slot, i }) => (
                      <div
                        key={slot.id}
                        title={slot.label}
                        className="flex flex-col items-center gap-1 rounded border border-border/40 bg-background p-1.5"
                      >
                        <CdnIcon
                          src={slot.iconSuffix}
                          alt={slot.label}
                          fallback={slot.label.slice(0, 3)}
                        />
                        <input
                          type="number"
                          min={0}
                          max={HEXA_MAX_LEVEL}
                          className="w-full rounded border border-border/40 bg-background px-0.5 py-0.5 text-center text-[11px] tabular-nums outline-none focus:border-accent"
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
                </div>
              );
            })}
          </section>

          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-3 py-2">
              <h2 className="text-sm font-semibold">Legion Artifact</h2>
            </div>
            <div className="space-y-2 p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[var(--accent)]"
                  checked={input.legionArtifactAdditionalExp}
                  onChange={(e) =>
                    patch({ legionArtifactAdditionalExp: e.target.checked })
                  }
                />
                Additional EXP (+1 Mob Targeted)
              </label>
              <div className="grid grid-cols-[1fr_5rem]">
                <div className={labelCell}>Final Attack</div>
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
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-3 py-2">
              <h2 className="text-sm font-semibold">Special Inner Ability</h2>
            </div>
            <div className="flex flex-col gap-2 p-3 text-sm">
              {INNER_ABILITY_OPTIONS.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="specialInnerAbility"
                    className="size-3.5 accent-[var(--accent)]"
                    checked={input.specialInnerAbility === opt.id}
                    onChange={() => patch({ specialInnerAbility: opt.id })}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
            <div className="border-b border-border/40 px-3 py-2">
              <h2 className="text-sm font-semibold">Oz Ring</h2>
            </div>
            <div className="space-y-3 p-3">
              <label className="flex flex-col gap-1 text-sm">
                Continuous Use Status
                <select
                  className={`${cell} w-full`}
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

              <div className="grid grid-cols-3 gap-2">
                {OZ_RINGS.map((ring) => (
                  <div
                    key={ring.id}
                    title={ring.label}
                    className="flex flex-col items-center gap-1 rounded border border-border/40 bg-background p-1.5"
                  >
                    <CdnIcon src={ring.icon} alt={ring.label} />
                    <input
                      type="number"
                      min={0}
                      max={ring.max}
                      className="w-full rounded border border-border/40 bg-background px-0.5 py-0.5 text-center text-[11px] tabular-nums outline-none focus:border-accent"
                      value={input[ring.field]}
                      onChange={(e) => {
                        const raw = Number(e.target.value) || 0;
                        const capped = Math.min(Math.max(0, raw), ring.max);
                        patch({ [ring.field]: capped });
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded border border-border/40">
                <div className="grid grid-cols-[1fr_5.5rem]">
                  <div className={labelCell}>Weapon Total ATT</div>
                  <NumInput
                    value={input.ozWeaponTotalAtt}
                    onChange={(ozWeaponTotalAtt) =>
                      patch({ ozWeaponTotalAtt })
                    }
                  />
                </div>
                <div className="grid grid-cols-[1fr_5.5rem]">
                  <div className={labelCell}>
                    {isDa
                      ? "Max HP"
                      : isXenon
                        ? "STR"
                        : STAT_LABELS[mainKeys[0] ?? "str"]}
                  </div>
                  <NumInput
                    value={input.ozPrimaryStat}
                    onChange={(ozPrimaryStat) => patch({ ozPrimaryStat })}
                  />
                </div>
                <div className="grid grid-cols-[1fr_5.5rem]">
                  <div className={labelCell}>
                    {isXenon
                      ? "DEX"
                      : isDa
                        ? "STR"
                        : STAT_LABELS[secondaryKeys[0] ?? "dex"]}
                  </div>
                  <NumInput
                    value={input.ozSecondaryStat}
                    onChange={(ozSecondaryStat) => patch({ ozSecondaryStat })}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:text-zinc-900"
          onClick={() => setShowResult(true)}
        >
          Result
        </button>
        <button
          type="button"
          className="rounded-md border border-border/60 bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-surface-muted"
          onClick={resetSoft}
        >
          Reset
        </button>
        <button
          type="button"
          className="rounded-md border border-border/60 bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-surface-muted"
          onClick={resetHard}
        >
          Hard Reset
        </button>
      </div>

      {showResult ? (
        <section className="space-y-4 overflow-hidden rounded-lg border border-border/60 bg-surface/90 p-4">
          <div className="text-center">
            <p className="text-sm font-medium opacity-70">Converted Main Stat</p>
            <p className="font-display mt-1 text-4xl font-bold tracking-tight text-accent tabular-nums sm:text-5xl">
              {formatNum(result.convertedMain, 1)}
            </p>
            <p className="mt-2 text-xs opacity-60">
              vs {input.bossPdrPercent}% boss PDR · buff toggles are UI for now;
              converted stat uses entered damage options
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-md border border-border/40 sm:grid-cols-2">
            {(
              [
                ["General Range (calc max)", formatNum(result.displayedMax)],
                ["General Range (calc min)", formatNum(result.displayedMin)],
                ["Expected (boss)", formatNum(result.expectedBoss)],
                ["Expected (normal)", formatNum(result.expectedNormal)],
                ["Total main", formatNum(result.totalMain, 1)],
                ["Final ATT / MATT", formatNum(result.attackFinal, 1)],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 bg-background px-3 py-2 text-sm"
              >
                <span className="opacity-70">{label}</span>
                <span className="font-semibold tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
