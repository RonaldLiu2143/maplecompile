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

const inputClass =
  "rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent";

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

function NumField({
  label,
  value,
  onChange,
  wide,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  wide?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type="number"
        className={`${inputClass} ${wide ? "w-28" : "w-24"}`}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </label>
  );
}

function TripleRow({
  label,
  value,
  onChange,
  highlight,
}: {
  label: string;
  value: StatTriple;
  onChange: (next: StatTriple) => void;
  highlight?: boolean;
}) {
  return (
    <tr className={`border-b border-border/20 ${highlight ? "bg-accent-soft/30" : ""}`}>
      <td className="py-1.5 pr-3 text-sm font-medium">{label}</td>
      <td className="px-1 py-1">
        <input
          type="number"
          className={`${inputClass} w-full min-w-[5rem]`}
          value={value.base}
          onChange={(e) =>
            onChange({ ...value, base: Number(e.target.value) || 0 })
          }
        />
      </td>
      <td className="px-1 py-1">
        <input
          type="number"
          className={`${inputClass} w-full min-w-[5rem]`}
          value={value.percent}
          onChange={(e) =>
            onChange({ ...value, percent: Number(e.target.value) || 0 })
          }
        />
      </td>
      <td className="px-1 py-1">
        <input
          type="number"
          className={`${inputClass} w-full min-w-[5rem]`}
          value={value.flat}
          onChange={(e) =>
            onChange({ ...value, flat: Number(e.target.value) || 0 })
          }
        />
      </td>
    </tr>
  );
}

export default function ScouterPage() {
  const [input, setInput] = useState<ScouterInput>(() =>
    defaultScouterInput(DEFAULT_JOB, DEFAULT_CHAR),
  );
  const [pdrPreset, setPdrPreset] = useState("normal");

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

  const visibleStatKeys: StatKey[] = isDa
    ? ["hp", "str", "dex"]
    : isXenon
      ? ["str", "dex", "luk"]
      : Array.from(new Set([...mainKeys, ...secondaryKeys]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Scouter
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-75">
          Enter character stats to estimate range, expected damage, and converted
          main stat (환산 주스탯). Layout inspired by MapleScouter; math follows
          community damage formulas.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
        <h2 className="font-display text-lg font-semibold">1) Character</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Class
            <select
              className={`${inputClass} min-w-[12rem]`}
              value={classValue}
              onChange={(e) => onClassChange(e.target.value)}
            >
              {CLASS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.name}
                </option>
              ))}
            </select>
          </label>
          <NumField
            label="Level"
            value={input.level}
            onChange={(level) => patch({ level })}
          />
          <label className="flex items-end gap-2 pb-1 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--accent)]"
              checked={input.useMagicAttack}
              onChange={(e) => patch({ useMagicAttack: e.target.checked })}
            />
            Use Magic ATT
          </label>
        </div>
        <p className="text-xs opacity-60">
          Primary:{" "}
          {isDa
            ? "HP"
            : isXenon
              ? "STR + DEX + LUK"
              : mainKeys.map((k) => STAT_LABELS[k]).join(", ")}
          {!isXenon && !isDa && secondaryKeys.length > 0
            ? ` · Secondary: ${secondaryKeys.map((k) => STAT_LABELS[k]).join(", ")}`
            : null}
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
        <h2 className="font-display text-lg font-semibold">2) Stats</h2>
        <p className="text-sm opacity-70">
          Base receives %, flat does not. Highlighted rows are primary for your
          class.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left">
                <th className="py-1.5 pr-3">Stat</th>
                <th className="px-1 py-1.5">Base</th>
                <th className="px-1 py-1.5">% Value</th>
                <th className="px-1 py-1.5">Flat (no %)</th>
              </tr>
            </thead>
            <tbody>
              {visibleStatKeys.map((key) => (
                <TripleRow
                  key={key}
                  label={STAT_LABELS[key]}
                  value={input.stats[key]}
                  onChange={(t) => setStat(key, t)}
                  highlight={mainKeys.includes(key) || (isDa && key === "hp")}
                />
              ))}
              <TripleRow
                label="Attack"
                value={input.attack}
                onChange={(attack) => patch({ attack })}
              />
              <TripleRow
                label="M.Attack"
                value={input.magicAttack}
                onChange={(magicAttack) => patch({ magicAttack })}
              />
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
        <h2 className="font-display text-lg font-semibold">3) Damage options</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <NumField
            label="Damage %"
            value={input.damagePercent}
            onChange={(damagePercent) => patch({ damagePercent })}
          />
          <NumField
            label="Boss Damage %"
            value={input.bossDamagePercent}
            onChange={(bossDamagePercent) => patch({ bossDamagePercent })}
          />
          <NumField
            label="Normal Enemy Dmg %"
            value={input.normalEnemyDamagePercent}
            onChange={(normalEnemyDamagePercent) =>
              patch({ normalEnemyDamagePercent })
            }
          />
          <NumField
            label="Final Damage %"
            value={input.finalDamagePercent}
            onChange={(finalDamagePercent) => patch({ finalDamagePercent })}
          />
          <NumField
            label="IED %"
            value={input.ignoreDefensePercent}
            onChange={(ignoreDefensePercent) =>
              patch({ ignoreDefensePercent })
            }
          />
          <NumField
            label="Crit Rate %"
            value={input.criticalRatePercent}
            onChange={(criticalRatePercent) =>
              patch({ criticalRatePercent })
            }
          />
          <NumField
            label="Crit Damage %"
            value={input.criticalDamagePercent}
            onChange={(criticalDamagePercent) =>
              patch({ criticalDamagePercent })
            }
          />
          <NumField
            label="Mastery %"
            value={input.masteryPercent}
            onChange={(masteryPercent) => patch({ masteryPercent })}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3 border-t border-border/30 pt-3 text-sm">
          <label className="flex flex-col gap-1">
            Boss PDR preset
            <select
              className={`${inputClass} min-w-[12rem]`}
              value={pdrPreset}
              onChange={(e) => onPdrPreset(e.target.value)}
            >
              {BOSS_PDR_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <NumField
            label="Boss PDR %"
            value={input.bossPdrPercent}
            onChange={(bossPdrPercent) => {
              setPdrPreset("custom");
              patch({ bossPdrPercent });
            }}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-4">
        <div>
          <h2 className="font-display text-lg font-semibold">4) Results</h2>
          <p className="mt-1 text-sm opacity-70">
            Converted main stat folds boss damage, crit, final damage, and IED
            into one comparable number.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left">
                <th className="py-1.5 pr-3 font-semibold">Metric</th>
                <th className="px-2 py-1.5 text-right font-semibold">Value</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Total main (after %)", formatNum(result.totalMain, 1)],
                  ["Total secondary", formatNum(result.totalSecondary, 1)],
                  ["Final ATT / MATT", formatNum(result.attackFinal, 1)],
                  ["Displayed max range", formatNum(result.displayedMax)],
                  ["Displayed min range", formatNum(result.displayedMin)],
                  [
                    "Expected damage (boss)",
                    formatNum(result.expectedBoss),
                  ],
                  [
                    "Expected damage (normal)",
                    formatNum(result.expectedNormal),
                  ],
                  [
                    "Converted main stat",
                    formatNum(result.convertedMain, 1),
                  ],
                ] as const
              ).map(([label, value]) => (
                <tr key={label} className="border-b border-border/20">
                  <td
                    className={`py-1.5 pr-3 ${
                      label === "Converted main stat"
                        ? "font-semibold text-accent"
                        : "opacity-80"
                    }`}
                  >
                    {label}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto pt-2">
          <h3 className="mb-2 text-sm font-semibold opacity-80">
            Rough equivalences (at current stats)
          </h3>
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left">
                <th className="py-1.5 pr-3 font-semibold">+1 of…</th>
                <th className="px-2 py-1.5 text-right font-semibold">
                  ≈ Main stat
                </th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Attack", result.equiv.oneAttack],
                  ["Boss Damage %", result.equiv.oneBossPercent],
                  ["Crit Damage %", result.equiv.oneCritDamage],
                  ["Final Damage %", result.equiv.oneFinalDamage],
                  ["IED %", result.equiv.oneIedPercent],
                ] as const
              ).map(([label, value]) => (
                <tr key={label} className="border-b border-border/20">
                  <td className="py-1.5 pr-3 opacity-80">{label}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatNum(value, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs opacity-60">
        Reference UI:{" "}
        <a
          href="https://maplescouter.com/en/input"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline"
        >
          MapleScouter
        </a>
        . This remake uses a simplified GMS damage model and will not match every
        class-specific MapleScouter edge case.
      </p>
    </div>
  );
}
