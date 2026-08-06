import { resolveMainSecondary } from "./calc";
import type { ScouterInput, StatKey, StatTriple } from "./types";

const STAT_LABELS: Record<StatKey, string> = {
  str: "STR",
  dex: "DEX",
  int: "INT",
  luk: "LUK",
  hp: "Max HP",
};

export type MissingScouterField = {
  /** Matches `data-scouter-field` on the form control. */
  id: string;
  label: string;
};

function tripleEmpty(t: StatTriple): boolean {
  return !(t.base || t.percent || t.flat);
}

/**
 * Required character-window fields that must be filled before scouting.
 * Empty defaults produce silent zero / nonsense Combat Power.
 */
export function getMissingRequiredScouterFields(
  input: ScouterInput,
): MissingScouterField[] {
  const missing: MissingScouterField[] = [];
  const { mainKeys, secondaryKeys, isXenon, isDa } =
    resolveMainSecondary(input);

  if (!input.level || input.level <= 0) {
    missing.push({ id: "level", label: "Level" });
  }

  const pushStat = (key: StatKey) => {
    if (tripleEmpty(input.stats[key])) {
      missing.push({ id: `stat-${key}`, label: STAT_LABELS[key] });
    }
  };

  if (isDa) {
    pushStat("hp");
    pushStat("str");
  } else if (isXenon) {
    pushStat("str");
    pushStat("dex");
    pushStat("luk");
  } else {
    for (const key of mainKeys) pushStat(key);
    for (const key of secondaryKeys) pushStat(key);
  }

  if (input.useMagicAttack) {
    if (tripleEmpty(input.magicAttack)) {
      missing.push({ id: "matt", label: "Magic Att" });
    }
  } else if (tripleEmpty(input.attack)) {
    missing.push({ id: "att", label: "Attack" });
  }

  if (!input.bossDamagePercent) {
    missing.push({ id: "boss-damage", label: "Boss Damage" });
  }
  if (!input.ignoreDefensePercent) {
    missing.push({ id: "ied", label: "Ignore Defense" });
  }
  if (!input.criticalDamagePercent) {
    missing.push({ id: "crit-damage", label: "Critical Damage" });
  }

  return missing;
}

/** Focus the first matching scouter field control, if present. */
export function focusScouterField(fieldId: string): void {
  if (typeof document === "undefined") return;
  const el = document.querySelector<HTMLElement>(
    `[data-scouter-field="${fieldId}"]`,
  );
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus();
}
