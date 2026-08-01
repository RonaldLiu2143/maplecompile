"use client";

import { useMemo, useState } from "react";
import {
  BOSS_PDR_PRESETS,
  calculateScouter,
  defaultScouterInput,
  resolveMainSecondary,
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

const cell =
  "border border-border/50 bg-background px-2 py-1.5 text-sm outline-none focus:relative focus:z-10 focus:border-accent";
const labelCell =
  "border border-border/50 bg-surface-muted/60 px-2 py-1.5 text-sm font-medium";
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
  readOnly,
  className = "",
}: {
  value: number;
  onChange?: (n: number) => void;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <input
      type="number"
      readOnly={readOnly}
      className={`${cell} w-full min-w-0 text-right tabular-nums ${
        readOnly ? "bg-surface-muted/40 text-foreground/80" : ""
      } ${className}`}
      value={Number.isFinite(value) ? value : 0}
      onChange={
        onChange
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
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: number;
  onChange?: (n: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(7rem,1.1fr)_minmax(4.5rem,0.9fr)]">
      <div className={labelCell}>{label}</div>
      <NumInput value={value} onChange={onChange} readOnly={readOnly} />
    </div>
  );
}

export default function ScouterPage() {
  const [input, setInput] = useState<ScouterInput>(() =>
    defaultScouterInput(DEFAULT_JOB, DEFAULT_CHAR),
  );
  const [pdrPreset, setPdrPreset] = useState("normal");
  const [showResult, setShowResult] = useState(true);

  const classValue = `${input.jobType}:${input.charType}`;
  const { mainKeys, secondaryKeys, isXenon, isDa } = useMemo(
    () => resolveMainSecondary(input),
    [input],
  );
  const result = useMemo(() => calculateScouter(input), [input]);

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
    }));
  };

  const onPdrPreset = (id: string) => {
    setPdrPreset(id);
    const preset = BOSS_PDR_PRESETS.find((p) => p.id === id);
    if (preset && preset.value >= 0) {
      patch({ bossPdrPercent: preset.value });
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
    }));
    setShowResult(false);
  };

  const resetHard = () => {
    setInput(defaultScouterInput(DEFAULT_JOB, DEFAULT_CHAR));
    setPdrPreset("normal");
    setShowResult(false);
  };

  /** MapleScouter order: secondary first, then primary, then Attack */
  const tripleRows: { label: string; key?: StatKey; kind?: "att" | "matt" }[] =
    (() => {
      if (isDa) {
        return [
          { label: "STR", key: "str" as StatKey },
          { label: "Max HP", key: "hp" as StatKey },
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
      const sec = secondaryKeys.map((k) => ({
        label: STAT_LABELS[k],
        key: k,
      }));
      const pri = mainKeys.map((k) => ({ label: STAT_LABELS[k], key: k }));
      return [
        ...sec,
        ...pri,
        {
          label: input.useMagicAttack ? "M.Attack" : "Attack",
          kind: input.useMagicAttack ? ("matt" as const) : ("att" as const),
        },
      ];
    })();

  const singleFields: {
    label: string;
    value: number;
    onChange?: (n: number) => void;
    readOnly?: boolean;
  }[] = [
    {
      label: "General Range",
      value: Math.round(result.displayedMax),
      readOnly: true,
    },
    {
      label: "Damage",
      value: input.damagePercent,
      onChange: (damagePercent) => patch({ damagePercent }),
    },
    {
      label: "Final Damage",
      value: input.finalDamagePercent,
      onChange: (finalDamagePercent) => patch({ finalDamagePercent }),
    },
    {
      label: "Boss Damage",
      value: input.bossDamagePercent,
      onChange: (bossDamagePercent) => patch({ bossDamagePercent }),
    },
    {
      label: "Ignore Enemy Defense",
      value: input.ignoreDefensePercent,
      onChange: (ignoreDefensePercent) => patch({ ignoreDefensePercent }),
    },
    {
      label: "Normal Enemy Damage",
      value: input.normalEnemyDamagePercent,
      onChange: (normalEnemyDamagePercent) =>
        patch({ normalEnemyDamagePercent }),
    },
    {
      label: "Attack",
      value: Math.round(applyTriple(input.attack)),
      readOnly: true,
    },
    {
      label: "Critical Rate",
      value: input.criticalRatePercent,
      onChange: (criticalRatePercent) => patch({ criticalRatePercent }),
    },
    {
      label: "M.Attack",
      value: Math.round(applyTriple(input.magicAttack)),
      readOnly: true,
    },
    {
      label: "Critical Damage",
      value: input.criticalDamagePercent,
      onChange: (criticalDamagePercent) => patch({ criticalDamagePercent }),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Scouter
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Enter character stats directly (same layout as MapleScouter) to
          calculate converted main stat (환산주스탯).
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-border/60 bg-surface/80">
        {/* Level / Class */}
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

        <p className="border-b border-border/40 px-3 py-2 text-xs leading-relaxed opacity-65">
          General: no temporary buffs; links equipped (no stacks); Oz ring on;
          summons on; Combat Orders / Sharp Eyes on. Class: Maple Warrior and
          class blessings as applicable.
        </p>

        {/* Base / % / Flat header + stat triples */}
        <div className="grid grid-cols-4">
          <div className={`${headCell} rounded-none`} />
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

        {/* MapleScouter-style 2-column damage / option fields */}
        <div className="grid sm:grid-cols-2">
          {singleFields.map((f) => (
            <FieldCell
              key={f.label}
              label={f.label}
              value={f.value}
              onChange={f.onChange}
              readOnly={f.readOnly}
            />
          ))}
        </div>

        {/* Extra options MapleScouter shows — kept compact */}
        <div className="grid sm:grid-cols-2">
          <FieldCell
            label="Mastery"
            value={input.masteryPercent}
            onChange={(masteryPercent) => patch({ masteryPercent })}
          />
          <div className="grid min-w-0 grid-cols-[minmax(7rem,1.1fr)_minmax(4.5rem,0.9fr)]">
            <div className={labelCell}>Boss PDR</div>
            <select
              className={`${cell} w-full min-w-0`}
              value={pdrPreset}
              onChange={(e) => onPdrPreset(e.target.value)}
            >
              {BOSS_PDR_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {pdrPreset === "custom" ? (
            <FieldCell
              label="Custom PDR %"
              value={input.bossPdrPercent}
              onChange={(bossPdrPercent) => patch({ bossPdrPercent })}
            />
          ) : (
            <FieldCell
              label="PDR %"
              value={input.bossPdrPercent}
              readOnly
            />
          )}
          <div className="grid min-w-0 grid-cols-[minmax(7rem,1.1fr)_minmax(4.5rem,0.9fr)]">
            <div className={labelCell}>Use Magic ATT</div>
            <label
              className={`${cell} flex cursor-pointer items-center justify-end gap-2`}
            >
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={input.useMagicAttack}
                onChange={(e) =>
                  patch({ useMagicAttack: e.target.checked })
                }
              />
            </label>
          </div>
        </div>
      </div>

      {/* Actions — MapleScouter: Challenge Verification / Result / Reset / Hard Reset */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-border/60 bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-surface-muted"
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
        <section className="space-y-4 overflow-hidden rounded-lg border border-border/60 bg-surface/80 p-4">
          <div className="text-center">
            <p className="text-sm font-medium opacity-70">환산주스탯</p>
            <p className="font-display mt-1 text-4xl font-bold tracking-tight text-accent tabular-nums sm:text-5xl">
              {formatNum(result.convertedMain, 1)}
            </p>
            <p className="mt-2 text-xs opacity-60">
              vs {input.bossPdrPercent}% boss PDR
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-md border border-border/40 sm:grid-cols-2">
            {(
              [
                ["General Range (max)", formatNum(result.displayedMax)],
                ["General Range (min)", formatNum(result.displayedMin)],
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

          <div>
            <h3 className="mb-2 text-sm font-semibold opacity-80">
              Stat equivalences (+1 ≈ main)
            </h3>
            <div className="grid gap-px overflow-hidden rounded-md border border-border/40 sm:grid-cols-2">
              {(
                [
                  ["Attack", result.equiv.oneAttack],
                  ["Boss Damage", result.equiv.oneBossPercent],
                  ["Critical Damage", result.equiv.oneCritDamage],
                  ["Final Damage", result.equiv.oneFinalDamage],
                  ["Ignore Enemy Defense", result.equiv.oneIedPercent],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 bg-background px-3 py-2 text-sm"
                >
                  <span className="opacity-70">{label}</span>
                  <span className="tabular-nums">{formatNum(value, 2)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <p className="text-xs opacity-60">
        Format matched to{" "}
        <a
          href="https://maplescouter.com/en/input"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline"
        >
          MapleScouter
        </a>
        . Math is a simplified GMS model; class-specific edge cases may differ.
      </p>
    </div>
  );
}
