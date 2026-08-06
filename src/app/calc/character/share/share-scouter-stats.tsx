"use client";

import { useMemo, type ReactNode } from "react";
import { getCharName } from "@/lib/jobs";
import {
  calculateScouter,
  computeClassFinalDamage,
  resolveMainSecondary,
  supportsOneHandSword,
  type ScouterInput,
  type StatKey,
  type StatTriple,
} from "@/lib/scouter";

const cell =
  "border border-border/50 bg-surface-muted/40 px-2 py-1.5 text-sm text-right tabular-nums text-foreground/80";
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

function applyTriple(t: StatTriple): number {
  return t.base * (1 + t.percent / 100) + t.flat;
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

function StatValue({
  value,
  suffix = "",
  className = "",
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={`${cell} ${className}`}>
      {formatNum(value)}
      {suffix}
    </div>
  );
}

function TripleRowReadonly({
  label,
  value,
}: {
  label: string;
  value: StatTriple;
}) {
  return (
    <div className="grid grid-cols-4">
      <div className={labelCell}>{label}</div>
      <StatValue value={value.base} />
      <StatValue value={value.percent} />
      <StatValue value={value.flat} />
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
      <div className={`${labelCell} min-w-0 truncate`} title={label}>
        {label}
      </div>
      {children}
    </div>
  );
}

/** Read-only Character Stats panel matching Scouter layout. */
export function ShareScouterStatsPanel({ input }: { input: ScouterInput }) {
  const { mainKeys, secondaryKeys } = useMemo(
    () => resolveMainSecondary(input),
    [input],
  );
  const result = useMemo(() => calculateScouter(input), [input]);
  const attackPowerTotal = useMemo(
    () =>
      input.useMagicAttack
        ? 0
        : Math.floor(Number(applyTriple(input.attack).toFixed(10))),
    [input.attack, input.useMagicAttack],
  );
  const magicAttackTotal = useMemo(
    () =>
      input.useMagicAttack
        ? Math.floor(Number(applyTriple(input.magicAttack).toFixed(10)))
        : 0,
    [input.magicAttack, input.useMagicAttack],
  );
  const displayedFinalDamage = useMemo(
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

  const tripleRows = useMemo(() => {
    const pri = mainKeys.map((k) => ({ label: STAT_LABELS[k], key: k as StatKey }));
    const sec = secondaryKeys.map((k) => ({
      label: STAT_LABELS[k],
      key: k as StatKey,
    }));
    return [
      ...pri,
      ...sec,
      {
        label: input.useMagicAttack ? "M.Attack" : "Attack",
        kind: input.useMagicAttack ? ("matt" as const) : ("att" as const),
      },
    ];
  }, [mainKeys, secondaryKeys, input.useMagicAttack]);

  const classLabel = getCharName(input.jobType, input.charType);

  return (
    <section className="overflow-hidden rounded-lg border border-border/60 bg-surface/90">
      <div className="border-b border-border/40 px-3 py-2.5">
        <h2 className="text-sm font-semibold">Character Stats</h2>
        <p className="mt-0.5 text-xs opacity-60">
          Read-only snapshot from the shared scouter loadout.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4">
        <div className={labelCell}>Level</div>
        <StatValue value={input.level} />
        <div className={labelCell}>Class</div>
        <div className={`${cell} text-left`}>{classLabel || "—"}</div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border/40 px-3 py-2 text-sm">
        {(
          [
            ["Reboot", input.reboot],
            ["Liberation", input.liberation],
            ["Mugong Soul", input.mugongSoul],
          ] as const
        ).map(([label, on]) => (
          <span
            key={label}
            className={`inline-flex items-center gap-1.5 ${on ? "" : "opacity-45"}`}
          >
            <span
              className={`inline-block size-3.5 rounded-sm border ${
                on
                  ? "border-accent bg-accent"
                  : "border-border/60 bg-background"
              }`}
              aria-hidden
            />
            {label}
          </span>
        ))}
        {supportsOneHandSword(input.charType) ? (
          <span className="opacity-80">
            {input.oneHandSword ? "One-handed" : "Two-handed"}
          </span>
        ) : null}
      </div>

      <div className="m-2 overflow-hidden rounded-md border border-border/50">
        <div className="grid grid-cols-4">
          <div className={headCell} />
          <div className={headCell}>Base Value</div>
          <div className={headCell}>% Value</div>
          <div className={headCell}>% Value Not Applied</div>
        </div>
        {tripleRows.map((row) => {
          if ("key" in row && row.key) {
            return (
              <TripleRowReadonly
                key={row.key}
                label={row.label}
                value={input.stats[row.key]}
              />
            );
          }
          if ("kind" in row && row.kind === "matt") {
            return (
              <TripleRowReadonly
                key="matt"
                label={row.label}
                value={input.magicAttack}
              />
            );
          }
          return (
            <TripleRowReadonly
              key="att"
              label={row.label}
              value={input.attack}
            />
          );
        })}
      </div>

      <div className="mx-2 mb-2 overflow-hidden rounded-md border border-border/50">
        <div className="grid sm:grid-cols-2">
          <FieldCell label="General Range">
            <StatValue value={result.displayedMax} />
          </FieldCell>
          <FieldCell label="Damage">
            <StatValue value={input.damagePercent} />
          </FieldCell>
          <FieldCell label="Final Damage">
            <StatValue value={displayedFinalDamage} />
          </FieldCell>
          <FieldCell label="Boss Damage">
            <StatValue value={input.bossDamagePercent} />
          </FieldCell>
          <FieldCell label="Ignore Defense">
            <StatValue value={input.ignoreDefensePercent} />
          </FieldCell>
          <FieldCell label="Normal Enemy Damage">
            <div
              className={`${cell} cursor-default text-foreground/40`}
              aria-hidden
            />
          </FieldCell>
          <FieldCell label="Attack Power">
            <StatValue value={attackPowerTotal} />
          </FieldCell>
          <FieldCell label="Critical Rate">
            <StatValue value={input.criticalRatePercent} />
          </FieldCell>
          <FieldCell label="Magic Att">
            <StatValue value={magicAttackTotal} />
          </FieldCell>
          <FieldCell label="Critical Damage">
            <StatValue value={input.criticalDamagePercent} />
          </FieldCell>
          <FieldCell label="Cooldown Reduction">
            <div className="flex min-w-0">
              <StatValue
                value={input.cooldownReductionSeconds}
                className="border-r-0"
              />
              <span
                className={`${labelCell} flex shrink-0 items-center px-1 text-xs`}
              >
                sec
              </span>
              <StatValue value={input.cooldownReductionPercent} />
              <span
                className={`${labelCell} flex shrink-0 items-center px-1 text-xs`}
              >
                %
              </span>
            </div>
          </FieldCell>
          <FieldCell label="Buff Duration">
            <StatValue value={input.buffDurationPercent} />
          </FieldCell>
          <FieldCell label="Cooldown Not Applied">
            <StatValue value={input.cooldownSkipPercent} />
          </FieldCell>
          <FieldCell label="Ignore Elemental Resistance">
            <StatValue value={input.ignoreElementalResistancePercent} />
          </FieldCell>
          <FieldCell label="Additional Status Damage">
            <StatValue value={input.additionalStatusDamagePercent} />
          </FieldCell>
          <FieldCell label="Summons Duration Increase">
            <StatValue value={input.summonDurationPercent} />
          </FieldCell>
        </div>
      </div>

      <div className="mx-2 mb-2 overflow-hidden rounded-md border border-border/50">
        <div className="grid sm:grid-cols-2">
          <FieldCell label="Arcane Force">
            <StatValue value={input.arcaneForce} />
          </FieldCell>
          <FieldCell label="Sacred Force">
            <StatValue value={input.sacredForce} />
          </FieldCell>
        </div>
      </div>
    </section>
  );
}
